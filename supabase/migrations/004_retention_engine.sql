alter table public.user_progress
  add column if not exists journey_phase text not null default 'ignite' check (journey_phase in ('ignite', 'build', 'identity', 'mastery')),
  add column if not exists burnout_risk numeric(5,2) not null default 0,
  add column if not exists variety_score numeric(5,2) not null default 0,
  add column if not exists recovery_advice text not null default 'Train as planned.';

create table if not exists public.achievement_chains (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  milestone_target int not null,
  xp_reward int not null,
  tier_index int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_chain_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  chain_id uuid not null references public.achievement_chains(id) on delete cascade,
  progress_value int not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'claimed')),
  completed_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, chain_id)
);

create index if not exists idx_user_chain_progress_user on public.user_chain_progress(user_id, updated_at desc);

create or replace function public.fn_sync_achievement_chains(p_user_id uuid)
returns int
language plpgsql
security definer
as $$
declare
  total_workouts int := 0;
  completed_count int := 0;
  row_chain record;
begin
  select count(*)::int
  into total_workouts
  from public.workouts w
  where w.user_id = p_user_id
    and w.status = 'completed';

  for row_chain in
    select ac.id, ac.milestone_target
    from public.achievement_chains ac
    where ac.is_active = true
    order by ac.tier_index asc
  loop
    insert into public.user_chain_progress(user_id, chain_id)
    values (p_user_id, row_chain.id)
    on conflict (user_id, chain_id) do nothing;

    update public.user_chain_progress ucp
    set progress_value = least(total_workouts, row_chain.milestone_target),
        status = case
          when total_workouts >= row_chain.milestone_target and ucp.status = 'active' then 'completed'
          else ucp.status
        end,
        completed_at = case
          when total_workouts >= row_chain.milestone_target and ucp.completed_at is null then now()
          else ucp.completed_at
        end,
        updated_at = now()
    where ucp.user_id = p_user_id
      and ucp.chain_id = row_chain.id;
  end loop;

  select count(*)::int
  into completed_count
  from public.user_chain_progress ucp
  where ucp.user_id = p_user_id
    and ucp.status = 'completed';

  return completed_count;
end;
$$;

create or replace function public.fn_claim_achievement_chain(p_user_id uuid, p_user_chain_progress_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  reward_xp int;
  row_status text;
begin
  select ac.xp_reward, ucp.status
  into reward_xp, row_status
  from public.user_chain_progress ucp
  join public.achievement_chains ac on ac.id = ucp.chain_id
  where ucp.id = p_user_chain_progress_id
    and ucp.user_id = p_user_id
  for update;

  if row_status is null then
    raise exception 'Achievement chain row not found';
  end if;

  if row_status <> 'completed' then
    raise exception 'Achievement chain is not claimable';
  end if;

  update public.user_chain_progress
  set status = 'claimed',
      claimed_at = now(),
      updated_at = now()
  where id = p_user_chain_progress_id;

  update public.user_progress up
  set xp_total = up.xp_total + reward_xp,
      level = public.fn_level_from_xp(up.xp_total + reward_xp),
      updated_at = now()
  where up.user_id = p_user_id;

  insert into public.xp_ledger(user_id, source_type, source_id, xp_amount)
  values (p_user_id, 'achievement_chain', p_user_chain_progress_id, reward_xp);

  return jsonb_build_object('xp', reward_xp);
end;
$$;

create or replace function public.fn_refresh_retention_state(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  workouts_7d int := 0;
  workouts_14d int := 0;
  distinct_muscles_14d int := 0;
  streak_days int := 0;
  account_level int := 1;
  days_since_signup int := 0;
  journey text := 'ignite';
  risk numeric := 0;
  variety numeric := 0;
  advice text := 'Train as planned.';
begin
  select count(*)::int
  into workouts_7d
  from public.workouts w
  where w.user_id = p_user_id
    and w.status = 'completed'
    and w.started_at >= now() - interval '7 day';

  select count(*)::int
  into workouts_14d
  from public.workouts w
  where w.user_id = p_user_id
    and w.status = 'completed'
    and w.started_at >= now() - interval '14 day';

  select count(distinct e.primary_muscle)::int
  into distinct_muscles_14d
  from public.workouts w
  join public.workout_exercises we on we.workout_id = w.id
  join public.exercises e on e.id = we.exercise_id
  where w.user_id = p_user_id
    and w.status = 'completed'
    and w.started_at >= now() - interval '14 day';

  select up.streak_days, up.level
  into streak_days, account_level
  from public.user_progress up
  where up.user_id = p_user_id;

  select greatest(0, (current_date - (u.created_at at time zone 'utc')::date)::int)
  into days_since_signup
  from public.users u
  where u.id = p_user_id;

  if days_since_signup <= 7 then
    journey := 'ignite';
  elsif days_since_signup <= 30 then
    journey := 'build';
  elsif days_since_signup <= 90 then
    journey := 'identity';
  else
    journey := 'mastery';
  end if;

  variety := least(100, greatest(0, (distinct_muscles_14d::numeric / 6.0) * 100));

  risk :=
    least(
      100,
      greatest(
        0,
        (case when workouts_7d = 0 then 40 else 0 end) +
        (case when workouts_7d >= 6 then 25 else 0 end) +
        (case when distinct_muscles_14d <= 2 then 25 else 0 end) +
        (case when streak_days >= 28 and workouts_7d >= 5 then 15 else 0 end)
      )
    );

  if risk >= 60 then
    advice := 'Recovery protocol: deload session or mobility day recommended.';
  elsif variety < 35 then
    advice := 'Low variety detected: train a different muscle group next session.';
  elsif workouts_7d <= 1 then
    advice := 'Minimum consistency target: 2 sessions this week.';
  elsif workouts_7d >= 5 then
    advice := 'Strong pace. Keep one active recovery day to avoid burnout.';
  else
    advice := 'Momentum stable. Continue progressive overload next session.';
  end if;

  update public.user_progress up
  set journey_phase = journey,
      burnout_risk = round(risk, 2),
      variety_score = round(variety, 2),
      recovery_advice = advice,
      updated_at = now()
  where up.user_id = p_user_id;

  return jsonb_build_object(
    'journeyPhase', journey,
    'burnoutRisk', round(risk, 2),
    'varietyScore', round(variety, 2),
    'advice', advice,
    'workouts7d', workouts_7d,
    'workouts14d', workouts_14d,
    'distinctMuscles14d', distinct_muscles_14d,
    'level', account_level,
    'streakDays', streak_days
  );
end;
$$;

alter table public.achievement_chains enable row level security;
alter table public.user_chain_progress enable row level security;

drop policy if exists "achievement_chains_read" on public.achievement_chains;
create policy "achievement_chains_read" on public.achievement_chains
for select using (is_active = true);

drop policy if exists "user_chain_progress_own" on public.user_chain_progress;
create policy "user_chain_progress_own" on public.user_chain_progress
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant execute on function public.fn_sync_achievement_chains(uuid) to authenticated;
grant execute on function public.fn_claim_achievement_chain(uuid, uuid) to authenticated;
grant execute on function public.fn_refresh_retention_state(uuid) to authenticated;

insert into public.achievement_chains(code, name, description, milestone_target, xp_reward, tier_index, is_active)
values
  ('consistency_7', 'Consistency Chain I', 'Complete 7 workouts to lock in your first habit loop.', 7, 300, 1, true),
  ('consistency_21', 'Consistency Chain II', 'Complete 21 workouts to cross the habit threshold.', 21, 650, 2, true),
  ('consistency_60', 'Consistency Chain III', 'Complete 60 workouts to establish training identity.', 60, 1200, 3, true),
  ('consistency_120', 'Consistency Chain IV', 'Complete 120 workouts for long-term mastery momentum.', 120, 2500, 4, true)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    milestone_target = excluded.milestone_target,
    xp_reward = excluded.xp_reward,
    tier_index = excluded.tier_index,
    is_active = excluded.is_active;

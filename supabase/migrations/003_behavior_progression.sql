alter table public.user_progress
  add column if not exists attendance_7d int not null default 0,
  add column if not exists momentum_score numeric(5,2) not null default 0;

create table if not exists public.attendance_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  workout_date date not null,
  source text not null default 'gym_checkin',
  xp_awarded int not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, workout_id)
);

create table if not exists public.user_challenge_state (
  user_id uuid primary key references public.users(id) on delete cascade,
  difficulty_band text not null default 'balanced' check (difficulty_band in ('recovery', 'balanced', 'push')),
  miss_count int not null default 0,
  last_evaluated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boss_weekly_modifiers (
  id uuid primary key default gen_random_uuid(),
  boss_id uuid not null references public.bosses(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  modifier_code text not null,
  modifier_name text not null,
  modifier_description text,
  score_multiplier numeric(5,2) not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(boss_id, week_start)
);

alter table public.boss_progress
  add column if not exists progress_meter numeric(6,2) not null default 0;

create index if not exists idx_attendance_log_user_date on public.attendance_log(user_id, workout_date desc);
create index if not exists idx_boss_modifiers_week on public.boss_weekly_modifiers(boss_id, week_start desc);

create or replace function public.fn_award_attendance_floor(
  p_user_id uuid,
  p_workout_id uuid,
  p_workout_date date default current_date
)
returns int
language plpgsql
security definer
as $$
declare
  awarded int := 60;
  already_count int := 0;
  attendance_days int := 0;
begin
  select count(*) into already_count
  from public.attendance_log al
  where al.user_id = p_user_id
    and al.workout_id = p_workout_id;

  if already_count > 0 then
    return 0;
  end if;

  insert into public.attendance_log(user_id, workout_id, workout_date, xp_awarded)
  values (p_user_id, p_workout_id, p_workout_date, awarded);

  update public.user_progress up
  set xp_total = up.xp_total + awarded,
      level = public.fn_level_from_xp(up.xp_total + awarded),
      updated_at = now()
  where up.user_id = p_user_id;

  insert into public.xp_ledger(user_id, workout_id, source_type, source_id, xp_amount)
  values (p_user_id, p_workout_id, 'attendance', p_workout_id, awarded);

  select count(distinct al.workout_date)
  into attendance_days
  from public.attendance_log al
  where al.user_id = p_user_id
    and al.workout_date >= p_workout_date - 6;

  update public.user_progress up
  set attendance_7d = attendance_days,
      updated_at = now()
  where up.user_id = p_user_id;

  return awarded;
end;
$$;

create or replace function public.fn_refresh_momentum_score(p_user_id uuid)
returns numeric
language plpgsql
security definer
as $$
declare
  v_streak int := 0;
  v_attendance int := 0;
  v_weekly_points int := 0;
  v_score numeric := 0;
begin
  select up.streak_days, up.attendance_7d
  into v_streak, v_attendance
  from public.user_progress up
  where up.user_id = p_user_id;

  select coalesce(sum(uwp.points), 0)
  into v_weekly_points
  from public.user_weekly_progress uwp
  join public.weekly_challenges wc on wc.id = uwp.weekly_challenge_id
  where uwp.user_id = p_user_id
    and current_date between wc.week_start and wc.week_end;

  v_score := least(
    100,
    (least(v_attendance, 7) * 8) +
    (least(v_streak, 21) * 2) +
    least(v_weekly_points / 4.0, 30)
  );

  update public.user_progress up
  set momentum_score = round(v_score, 2),
      updated_at = now()
  where up.user_id = p_user_id;

  return round(v_score, 2);
end;
$$;

create or replace function public.fn_apply_adaptive_challenge_band(p_user_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_streak int := 0;
  v_attendance int := 0;
  v_band text := 'balanced';
begin
  select up.streak_days, up.attendance_7d
  into v_streak, v_attendance
  from public.user_progress up
  where up.user_id = p_user_id;

  if v_attendance <= 1 or v_streak = 0 then
    v_band := 'recovery';
  elsif v_attendance >= 4 and v_streak >= 5 then
    v_band := 'push';
  else
    v_band := 'balanced';
  end if;

  insert into public.user_challenge_state(user_id, difficulty_band)
  values (p_user_id, v_band)
  on conflict (user_id)
  do update set
    difficulty_band = excluded.difficulty_band,
    last_evaluated_at = now(),
    updated_at = now();

  return v_band;
end;
$$;

create or replace function public.fn_assign_micro_quest(p_user_id uuid, p_for_date date default current_date)
returns int
language plpgsql
security definer
as $$
declare
  assigned int := 0;
begin
  insert into public.user_micro_quests(user_id, micro_quest_id, assigned_date)
  select p_user_id, mq.id, p_for_date
  from public.micro_quests mq
  where mq.is_active = true
    and not exists (
      select 1
      from public.user_micro_quests umq
      where umq.user_id = p_user_id
        and umq.assigned_date = p_for_date
    )
  order by random()
  limit 1
  on conflict (user_id, micro_quest_id, assigned_date) do nothing;

  get diagnostics assigned = row_count;
  return assigned;
end;
$$;

create or replace function public.fn_claim_micro_quest(p_user_id uuid, p_user_micro_quest_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  reward_xp int;
  q_status text;
begin
  select mq.xp_reward, umq.status
  into reward_xp, q_status
  from public.user_micro_quests umq
  join public.micro_quests mq on mq.id = umq.micro_quest_id
  where umq.id = p_user_micro_quest_id
    and umq.user_id = p_user_id
  for update;

  if q_status is null then
    raise exception 'Micro quest not found';
  end if;

  if q_status <> 'completed' then
    raise exception 'Micro quest is not claimable';
  end if;

  update public.user_micro_quests
  set status = 'claimed',
      claimed_at = now()
  where id = p_user_micro_quest_id
    and status = 'completed';

  update public.user_progress up
  set xp_total = up.xp_total + reward_xp,
      level = public.fn_level_from_xp(up.xp_total + reward_xp),
      updated_at = now()
  where up.user_id = p_user_id;

  insert into public.xp_ledger(user_id, source_type, source_id, xp_amount)
  values (p_user_id, 'micro_quest', p_user_micro_quest_id, reward_xp);

  return jsonb_build_object('xp', reward_xp);
end;
$$;

create or replace function public.fn_get_weekly_recap(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_workouts int := 0;
  v_points int := 0;
  v_avg_score numeric := 0;
  v_best_muscle text := 'core';
begin
  select count(*)
  into v_workouts
  from public.workouts w
  where w.user_id = p_user_id
    and w.status = 'completed'
    and w.started_at >= date_trunc('week', now());

  select coalesce(sum(uwp.points), 0)
  into v_points
  from public.user_weekly_progress uwp
  join public.weekly_challenges wc on wc.id = uwp.weekly_challenge_id
  where uwp.user_id = p_user_id
    and current_date between wc.week_start and wc.week_end;

  select coalesce(avg(bp.best_score), 0)
  into v_avg_score
  from public.boss_progress bp
  where bp.user_id = p_user_id
    and bp.last_attempt_at >= date_trunc('week', now());

  select ms.muscle_group
  into v_best_muscle
  from public.muscle_stats ms
  where ms.user_id = p_user_id
  order by ms.level desc, ms.xp_total desc
  limit 1;

  return jsonb_build_object(
    'workouts', v_workouts,
    'weeklyPoints', v_points,
    'avgBossScore', round(v_avg_score, 2),
    'bestMuscle', v_best_muscle
  );
end;
$$;

create or replace function public.fn_attempt_boss(p_user_id uuid, p_boss_progress_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_boss_id uuid;
  boss_status text;
  diff int;
  reward int;
  score int;
  defeated boolean := false;
  progress_delta numeric := 0;
  current_meter numeric := 0;
  modifier_name text;
  modifier_mult numeric := 1;
begin
  select bp.boss_id, bp.status, bp.progress_meter, b.difficulty, b.reward_xp
  into v_boss_id, boss_status, current_meter, diff, reward
  from public.boss_progress bp
  join public.bosses b on b.id = bp.boss_id
  where bp.id = p_boss_progress_id
    and bp.user_id = p_user_id
  for update;

  if boss_status is null then
    raise exception 'Boss progress not found';
  end if;

  if boss_status = 'locked' then
    raise exception 'Boss is locked';
  end if;

  select bwm.modifier_name, bwm.score_multiplier
  into modifier_name, modifier_mult
  from public.boss_weekly_modifiers bwm
  where bwm.boss_id = v_boss_id
    and bwm.is_active = true
    and current_date between bwm.week_start and bwm.week_end
  order by bwm.week_start desc
  limit 1;

  score := floor((random() * 40)::numeric) + 60;
  score := least(100, floor(score * coalesce(modifier_mult, 1))::int);

  defeated := score >= greatest(60, 92 - diff * 4);
  progress_delta := case when defeated then 100 else greatest(8, floor(score / 5)::numeric) end;

  update public.boss_progress
  set status = case when defeated then 'defeated' else 'attempted' end,
      attempt_count = attempt_count + 1,
      best_score = greatest(coalesce(best_score, 0), score),
      progress_meter = case when defeated then 100 else least(95, progress_meter + progress_delta) end,
      last_attempt_at = now(),
      defeated_at = case when defeated then now() else defeated_at end
  where id = p_boss_progress_id;

  if defeated then
    update public.user_progress
    set xp_total = xp_total + reward,
        level = public.fn_level_from_xp(xp_total + reward),
        updated_at = now()
    where user_id = p_user_id;

    insert into public.xp_ledger(user_id, source_type, source_id, xp_amount)
    values (p_user_id, 'boss', v_boss_id, reward);
  end if;

  return jsonb_build_object(
    'score', score,
    'defeated', defeated,
    'xpAwarded', case when defeated then reward else 0 end,
    'progressMeterDelta', progress_delta,
    'progressMeter', case when defeated then 100 else least(95, current_meter + progress_delta) end,
    'modifierName', coalesce(modifier_name, 'No Modifier')
  );
end;
$$;

alter table public.attendance_log enable row level security;
alter table public.user_challenge_state enable row level security;
alter table public.boss_weekly_modifiers enable row level security;

drop policy if exists "attendance_log_own" on public.attendance_log;
create policy "attendance_log_own" on public.attendance_log
for select using (auth.uid() = user_id);

drop policy if exists "challenge_state_own" on public.user_challenge_state;
create policy "challenge_state_own" on public.user_challenge_state
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "boss_weekly_modifiers_read" on public.boss_weekly_modifiers;
create policy "boss_weekly_modifiers_read" on public.boss_weekly_modifiers
for select using (is_active = true);

grant execute on function public.fn_award_attendance_floor(uuid, uuid, date) to authenticated;
grant execute on function public.fn_refresh_momentum_score(uuid) to authenticated;
grant execute on function public.fn_apply_adaptive_challenge_band(uuid) to authenticated;
grant execute on function public.fn_assign_micro_quest(uuid, date) to authenticated;
grant execute on function public.fn_claim_micro_quest(uuid, uuid) to authenticated;
grant execute on function public.fn_get_weekly_recap(uuid) to authenticated;
grant execute on function public.fn_attempt_boss(uuid, uuid) to authenticated;

insert into public.boss_weekly_modifiers(
  boss_id,
  week_start,
  week_end,
  modifier_code,
  modifier_name,
  modifier_description,
  score_multiplier,
  is_active
)
select
  b.id,
  date_trunc('week', now())::date,
  (date_trunc('week', now())::date + 6),
  'iron_storm',
  'Iron Storm',
  'Boss score is amplified this week.',
  1.05,
  true
from public.bosses b
where b.is_active = true
  and not exists (
    select 1
    from public.boss_weekly_modifiers bwm
    where bwm.boss_id = b.id
      and bwm.week_start = date_trunc('week', now())::date
  );

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  primary_muscle text not null,
  secondary_muscles text[] not null default '{}',
  xp_base int not null default 10,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  status text not null check (status in ('draft', 'completed', 'canceled')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  order_index int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_number int not null,
  reps int,
  weight_kg numeric(6,2),
  duration_sec int,
  distance_m int,
  rpe numeric(3,1),
  is_warmup boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id uuid primary key references public.users(id) on delete cascade,
  xp_total bigint not null default 0,
  level int not null default 1,
  streak_days int not null default 0,
  best_streak_days int not null default 0,
  last_workout_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.muscle_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  muscle_group text not null,
  xp_total bigint not null default 0,
  level int not null default 1,
  rank text not null default 'E',
  fatigue_score numeric(5,2) not null default 0,
  last_trained_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, muscle_group)
);

create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  source_type text not null,
  source_id uuid,
  xp_amount int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  quest_type text not null check (quest_type in ('daily', 'weekly', 'arc')),
  goal_type text not null,
  goal_value numeric(10,2) not null,
  xp_reward int not null,
  loot_table text,
  active_from timestamptz,
  active_to timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.quest_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  quest_id uuid not null references public.quests(id),
  progress_value numeric(10,2) not null default 0,
  completed_at timestamptz,
  claimed_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'claimed')),
  created_at timestamptz not null default now(),
  unique(user_id, quest_id)
);

create table if not exists public.bosses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  unlock_level int not null,
  unlock_requirements jsonb not null,
  reward_xp int not null,
  difficulty int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.boss_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  boss_id uuid not null references public.bosses(id),
  status text not null default 'locked' check (status in ('locked', 'unlocked', 'attempted', 'defeated')),
  attempt_count int not null default 0,
  best_score numeric(10,2),
  last_attempt_at timestamptz,
  defeated_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, boss_id)
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  criteria jsonb not null,
  xp_reward int not null default 0,
  is_secret boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id),
  unlocked_at timestamptz not null default now(),
  claimed_at timestamptz,
  unique(user_id, achievement_id)
);

create index if not exists idx_workouts_user_started on public.workouts(user_id, started_at desc);
create index if not exists idx_workouts_user_status_started on public.workouts(user_id, status, started_at desc);
create index if not exists idx_workout_exercises_workout on public.workout_exercises(workout_id, order_index);
create index if not exists idx_sets_workout_exercise on public.sets(workout_exercise_id, set_number);
create index if not exists idx_xp_ledger_user_created on public.xp_ledger(user_id, created_at desc);
create index if not exists idx_xp_ledger_user_source_created on public.xp_ledger(user_id, source_type, created_at desc);
create index if not exists idx_quest_progress_user_status on public.quest_progress(user_id, status);
create index if not exists idx_boss_progress_user_status on public.boss_progress(user_id, status);
create index if not exists idx_user_achievements_user_unlocked on public.user_achievements(user_id, unlocked_at desc);

create index if not exists idx_quest_progress_active on public.quest_progress(status) where status = 'active';
create index if not exists idx_boss_progress_open on public.boss_progress(status) where status in ('unlocked', 'attempted');

create or replace function public.fn_level_from_xp(total_xp bigint)
returns int
language plpgsql
immutable
as $$
declare
  lvl int := 1;
  needed bigint;
  acc bigint := 0;
begin
  if total_xp <= 0 then
    return 1;
  end if;

  while lvl < 200 loop
    if lvl < 10 then
      needed := 120 + (lvl * 30);
    elsif lvl < 40 then
      needed := 500 + (lvl * lvl * 4);
    else
      needed := floor(2800 + power(lvl, 1.45) * 40);
    end if;

    exit when acc + needed > total_xp;
    acc := acc + needed;
    lvl := lvl + 1;
  end loop;

  return lvl;
end;
$$;

create or replace function public.fn_level_from_xp(total_xp numeric)
returns int
language sql
immutable
as $$
  select public.fn_level_from_xp(floor(greatest(total_xp, 0))::bigint);
$$;

create or replace function public.fn_rank_from_level(p_level int)
returns text
language sql
immutable
as $$
  select case
    when p_level < 5 then 'E'
    when p_level < 10 then 'D'
    when p_level < 18 then 'C'
    when p_level < 28 then 'B'
    when p_level < 40 then 'A'
    when p_level < 55 then 'S'
    when p_level < 75 then 'SS'
    else 'SSS'
  end;
$$;

create or replace function public.fn_update_streak(p_user_id uuid, p_workout_date date)
returns void
language plpgsql
as $$
declare
  prev_date date;
  current_streak int;
  best_streak int;
begin
  select last_workout_date, streak_days, best_streak_days
  into prev_date, current_streak, best_streak
  from public.user_progress
  where user_id = p_user_id
  for update;

  if prev_date is null then
    current_streak := 1;
  elsif prev_date = p_workout_date then
    return;
  elsif prev_date = p_workout_date - 1 then
    current_streak := current_streak + 1;
  else
    current_streak := 1;
  end if;

  best_streak := greatest(best_streak, current_streak);

  update public.user_progress
  set streak_days = current_streak,
      best_streak_days = best_streak,
      last_workout_date = p_workout_date,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

create or replace function public.fn_update_quest_progress(p_user_id uuid, p_workout_count int)
returns void
language plpgsql
as $$
begin
  update public.quest_progress qp
  set progress_value = qp.progress_value + p_workout_count,
      completed_at = case when qp.progress_value + p_workout_count >= q.goal_value then now() else qp.completed_at end,
      status = case when qp.progress_value + p_workout_count >= q.goal_value then 'completed' else qp.status end
  from public.quests q
  where qp.quest_id = q.id
    and qp.user_id = p_user_id
    and qp.status = 'active'
    and q.goal_type = 'workouts_count';
end;
$$;

create or replace function public.fn_evaluate_boss_unlocks(p_user_id uuid)
returns void
language plpgsql
as $$
declare
  player_level int;
begin
  select level into player_level from public.user_progress where user_id = p_user_id;

  update public.boss_progress bp
  set status = 'unlocked'
  from public.bosses b
  where bp.user_id = p_user_id
    and bp.boss_id = b.id
    and bp.status = 'locked'
    and player_level >= b.unlock_level;
end;
$$;

create or replace function public.fn_apply_workout_rewards(p_user_id uuid, p_workout_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  workout_xp int := 0;
  total_volume numeric := 0;
  streak_multiplier numeric := 1;
  v_streak_days int := 0;
  new_level int;
  old_level int;
  set_row record;
  exercise_row record;
  daily_date date := (now() at time zone 'utc')::date;
begin
  select coalesce(sum(s.reps * coalesce(s.weight_kg, 0)), 0)
  into total_volume
  from public.sets s
  join public.workout_exercises we on we.id = s.workout_exercise_id
  where we.workout_id = p_workout_id;

  workout_xp := greatest(100, least(1200, floor(100 + total_volume / 50)));

  perform public.fn_update_streak(p_user_id, daily_date);

  select up.streak_days into v_streak_days from public.user_progress up where up.user_id = p_user_id;
  streak_multiplier := least(1.20, 1 + (v_streak_days * 0.01));

  workout_xp := floor(workout_xp * streak_multiplier);

  select level into old_level from public.user_progress where user_id = p_user_id;

  update public.user_progress
  set xp_total = xp_total + workout_xp,
      level = public.fn_level_from_xp(xp_total + workout_xp),
      updated_at = now()
  where user_id = p_user_id;

  select level into new_level from public.user_progress where user_id = p_user_id;

  insert into public.xp_ledger(user_id, workout_id, source_type, source_id, xp_amount)
  values (p_user_id, p_workout_id, 'workout', p_workout_id, workout_xp);

  for set_row in
    select s.reps, coalesce(s.weight_kg, 0) as weight_kg, we.exercise_id
    from public.sets s
    join public.workout_exercises we on we.id = s.workout_exercise_id
    where we.workout_id = p_workout_id
  loop
    select e.primary_muscle, e.secondary_muscles into exercise_row
    from public.exercises e
    where e.id = set_row.exercise_id;

    update public.muscle_stats
    set xp_total = xp_total + floor((set_row.reps * set_row.weight_kg) / 10 + 8)::bigint,
      level = public.fn_level_from_xp(xp_total + floor((set_row.reps * set_row.weight_kg) / 10 + 8)::bigint),
      rank = public.fn_rank_from_level(public.fn_level_from_xp(xp_total + floor((set_row.reps * set_row.weight_kg) / 10 + 8)::bigint)),
        fatigue_score = least(100, fatigue_score + 5),
        last_trained_at = now(),
        updated_at = now()
    where user_id = p_user_id
      and muscle_group = exercise_row.primary_muscle;

    if array_length(exercise_row.secondary_muscles, 1) is not null then
      update public.muscle_stats
        set xp_total = xp_total + floor((set_row.reps * set_row.weight_kg) / 20 + 3)::bigint,
          level = public.fn_level_from_xp(xp_total + floor((set_row.reps * set_row.weight_kg) / 20 + 3)::bigint),
          rank = public.fn_rank_from_level(public.fn_level_from_xp(xp_total + floor((set_row.reps * set_row.weight_kg) / 20 + 3)::bigint)),
          fatigue_score = least(100, fatigue_score + 2),
          updated_at = now()
      where user_id = p_user_id
        and muscle_group = any(exercise_row.secondary_muscles);
    end if;
  end loop;

  perform public.fn_update_quest_progress(p_user_id, 1);
  perform public.fn_evaluate_boss_unlocks(p_user_id);

  return jsonb_build_object(
    'xp', workout_xp,
    'streakDays', v_streak_days,
    'leveledUp', (new_level > old_level),
    'newLevel', new_level
  );
end;
$$;

create or replace function public.fn_claim_quest(p_user_id uuid, p_quest_progress_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  reward_xp int;
  quest_status text;
begin
  select q.xp_reward, qp.status
  into reward_xp, quest_status
  from public.quest_progress qp
  join public.quests q on q.id = qp.quest_id
  where qp.id = p_quest_progress_id
    and qp.user_id = p_user_id
  for update;

  if quest_status is null then
    raise exception 'Quest progress not found';
  end if;

  if quest_status <> 'completed' then
    raise exception 'Quest is not claimable';
  end if;

  update public.quest_progress
  set status = 'claimed',
      claimed_at = now()
  where id = p_quest_progress_id;

  update public.user_progress
  set xp_total = xp_total + reward_xp,
      level = public.fn_level_from_xp(xp_total + reward_xp),
      updated_at = now()
  where user_id = p_user_id;

  insert into public.xp_ledger(user_id, source_type, source_id, xp_amount)
  values (p_user_id, 'quest', p_quest_progress_id, reward_xp);

  return jsonb_build_object('xp', reward_xp);
end;
$$;

create or replace function public.fn_attempt_boss(p_user_id uuid, p_boss_progress_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  boss_id uuid;
  boss_status text;
  diff int;
  reward int;
  score int;
  defeated boolean := false;
begin
  select bp.boss_id, bp.status, b.difficulty, b.reward_xp
  into boss_id, boss_status, diff, reward
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

  score := floor((random() * 40)::numeric) + 60;
  defeated := score >= greatest(60, 92 - diff * 4);

  update public.boss_progress
  set status = case when defeated then 'defeated' else 'attempted' end,
      attempt_count = attempt_count + 1,
      best_score = greatest(coalesce(best_score, 0), score),
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
    values (p_user_id, 'boss', boss_id, reward);
  end if;

  return jsonb_build_object('score', score, 'defeated', defeated, 'xpAwarded', case when defeated then reward else 0 end);
end;
$$;

create or replace function public.fn_grant_initial_content(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.quest_progress(user_id, quest_id)
  select p_user_id, q.id
  from public.quests q
  where q.is_active = true
  on conflict (user_id, quest_id) do nothing;

  insert into public.boss_progress(user_id, boss_id)
  select p_user_id, b.id
  from public.bosses b
  where b.is_active = true
  on conflict (user_id, boss_id) do nothing;
end;
$$;

insert into public.exercises(name, category, primary_muscle, secondary_muscles, xp_base)
values
  ('Barbell Bench Press', 'strength', 'chest', array['arms','shoulders'], 14),
  ('Squat', 'strength', 'quads', array['glutes','core'], 16),
  ('Deadlift', 'strength', 'hamstrings', array['glutes','back'], 18),
  ('Pull Up', 'strength', 'back', array['arms','core'], 12),
  ('Overhead Press', 'strength', 'shoulders', array['arms','core'], 12)
on conflict (name) do nothing;

insert into public.quests(code, name, description, quest_type, goal_type, goal_value, xp_reward, is_active)
values
  ('daily_1', 'Daily Iron', 'Complete 1 workout today.', 'daily', 'workouts_count', 1, 80, true),
  ('weekly_4', 'Weekly Vanguard', 'Complete 4 workouts this week.', 'weekly', 'workouts_count', 4, 320, true)
on conflict (code) do nothing;

insert into public.bosses(code, name, description, unlock_level, unlock_requirements, reward_xp, difficulty, is_active)
values
  ('stone_golem', 'Stone Golem', 'Defeat the first gatekeeper.', 3, '{"type":"level","value":3}', 200, 2, true),
  ('abyss_knight', 'Abyss Knight', 'An advanced progression check.', 8, '{"type":"level","value":8}', 450, 5, true)
on conflict (code) do nothing;

insert into public.achievements(code, name, description, criteria, xp_reward, is_active)
values
  ('first_workout', 'First Blood', 'Complete your first workout.', '{"type":"workout_count","value":1}', 50, true),
  ('streak_7', 'Relentless', 'Reach a 7-day streak.', '{"type":"streak_days","value":7}', 120, true)
on conflict (code) do nothing;

alter table public.users enable row level security;
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.sets enable row level security;
alter table public.user_progress enable row level security;
alter table public.muscle_stats enable row level security;
alter table public.xp_ledger enable row level security;
alter table public.quests enable row level security;
alter table public.quest_progress enable row level security;
alter table public.bosses enable row level security;
alter table public.boss_progress enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

drop policy if exists "users_select_self" on public.users;
create policy "users_select_self" on public.users
for select using (auth.uid() = id);

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self" on public.users
for update using (auth.uid() = id);

drop policy if exists "users_insert_self" on public.users;
create policy "users_insert_self" on public.users
for insert with check (auth.uid() = id);

drop policy if exists "workouts_own" on public.workouts;
create policy "workouts_own" on public.workouts
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "workout_exercises_own" on public.workout_exercises;
create policy "workout_exercises_own" on public.workout_exercises
for all using (
  exists (
    select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()
  )
);

drop policy if exists "sets_own" on public.sets;
create policy "sets_own" on public.sets
for all using (
  exists (
    select 1
    from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_exercise_id and w.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_exercise_id and w.user_id = auth.uid()
  )
);

drop policy if exists "user_progress_own" on public.user_progress;
create policy "user_progress_own" on public.user_progress
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "muscle_stats_own" on public.muscle_stats;
create policy "muscle_stats_own" on public.muscle_stats
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "xp_ledger_own" on public.xp_ledger;
create policy "xp_ledger_own" on public.xp_ledger
for select using (auth.uid() = user_id);

drop policy if exists "quest_progress_own" on public.quest_progress;
create policy "quest_progress_own" on public.quest_progress
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "boss_progress_own" on public.boss_progress;
create policy "boss_progress_own" on public.boss_progress
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_achievements_own" on public.user_achievements;
create policy "user_achievements_own" on public.user_achievements
for select using (auth.uid() = user_id);

drop policy if exists "public_exercises_read" on public.exercises;
create policy "public_exercises_read" on public.exercises
for select using (true);

drop policy if exists "public_quests_read" on public.quests;
create policy "public_quests_read" on public.quests
for select using (is_active = true);

drop policy if exists "public_bosses_read" on public.bosses;
create policy "public_bosses_read" on public.bosses
for select using (is_active = true);

drop policy if exists "public_achievements_read" on public.achievements;
create policy "public_achievements_read" on public.achievements
for select using (is_active = true);

grant execute on function public.fn_apply_workout_rewards(uuid, uuid) to authenticated;
grant execute on function public.fn_claim_quest(uuid, uuid) to authenticated;
grant execute on function public.fn_attempt_boss(uuid, uuid) to authenticated;
grant execute on function public.fn_grant_initial_content(uuid) to authenticated;

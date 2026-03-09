alter table public.users
  add column if not exists bodyweight_kg numeric(5,2) not null default 75
  check (bodyweight_kg >= 35 and bodyweight_kg <= 300);

alter table public.muscle_stats
  add column if not exists recovery_ready_at timestamptz,
  add column if not exists plateau_score numeric(5,2) not null default 0,
  add column if not exists adaptation_score numeric(5,2) not null default 50,
  add column if not exists frequency_7d int not null default 0,
  add column if not exists overload_index numeric(6,2) not null default 0,
  add column if not exists strength_ratio numeric(6,3) not null default 0,
  add column if not exists best_e1rm_kg numeric(7,2) not null default 0,
  add column if not exists recent_e1rm_kg numeric(7,2) not null default 0;

create table if not exists public.muscle_training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  muscle_group text not null,
  session_date date not null,
  total_volume numeric(10,2) not null default 0,
  hard_sets int not null default 0,
  e1rm_estimate_kg numeric(7,2) not null default 0,
  fatigue_delta numeric(6,2) not null default 0,
  xp_awarded int not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, workout_id, muscle_group)
);

create index if not exists idx_muscle_training_sessions_user_muscle_date
  on public.muscle_training_sessions(user_id, muscle_group, session_date desc);

alter table public.muscle_training_sessions enable row level security;

drop policy if exists "muscle_training_sessions_own" on public.muscle_training_sessions;
create policy "muscle_training_sessions_own" on public.muscle_training_sessions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.fn_muscle_rank_from_ratio(p_muscle text, p_ratio numeric)
returns text
language plpgsql
immutable
as $$
declare
  adjusted numeric := greatest(coalesce(p_ratio, 0), 0);
begin
  adjusted := adjusted * case
    when p_muscle in ('arms', 'shoulders') then 1.12
    when p_muscle in ('calves', 'core') then 1.18
    when p_muscle in ('hamstrings', 'glutes') then 1.05
    else 1
  end;

  return case
    when adjusted < 0.50 then 'E'
    when adjusted < 0.75 then 'D'
    when adjusted < 1.00 then 'C'
    when adjusted < 1.25 then 'B'
    when adjusted < 1.50 then 'A'
    when adjusted < 1.85 then 'S'
    else 'SS'
  end;
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
  daily_date date := (now() at time zone 'utc')::date;
  loot_payload jsonb := '{}'::jsonb;
  active_season_id uuid;
  muscle_row record;
  v_user_bodyweight numeric := 75;
  v_last_trained_at timestamptz;
  v_prev_fatigue numeric := 0;
  v_prev_plateau numeric := 0;
  v_prev_adaptation numeric := 50;
  v_prev_recent_e1rm numeric := 0;
  v_prev_best_e1rm numeric := 0;
  v_hours_since_last numeric := 999;
  v_frequency_7d int := 0;
  v_recovery_factor numeric := 1;
  v_frequency_factor numeric := 1;
  v_overload_pct numeric := 0;
  v_overload_factor numeric := 1;
  v_volume_factor numeric := 1;
  v_deload_bonus numeric := 1;
  v_plateau_factor numeric := 1;
  v_muscle_xp int := 0;
  v_new_fatigue numeric := 0;
  v_new_plateau numeric := 0;
  v_new_adaptation numeric := 0;
  v_recovery_hours numeric := 24;
  v_strength_ratio numeric := 0;
  v_recent_e1rm numeric := 0;
  v_best_e1rm numeric := 0;
  muscle_summaries jsonb := '[]'::jsonb;
begin
  select coalesce(u.bodyweight_kg, 75) into v_user_bodyweight
  from public.users u
  where u.id = p_user_id;

  v_user_bodyweight := greatest(v_user_bodyweight, 35);

  -- Passive recovery for muscles not trained recently.
  update public.muscle_stats ms
  set fatigue_score = greatest(0, ms.fatigue_score - 6),
      updated_at = now()
  where ms.user_id = p_user_id
    and ms.last_trained_at is not null
    and ms.last_trained_at < now() - interval '48 hours';

  select coalesce(sum(s.reps * coalesce(s.weight_kg, 0)), 0)
  into total_volume
  from public.sets s
  join public.workout_exercises we on we.id = s.workout_exercise_id
  where we.workout_id = p_workout_id
    and coalesce(s.is_warmup, false) = false;

  workout_xp := greatest(100, least(1200, floor(100 + total_volume / 50)));

  perform public.fn_update_streak(p_user_id, daily_date);

  select up.streak_days into v_streak_days
  from public.user_progress up
  where up.user_id = p_user_id;

  streak_multiplier := least(1.20, 1 + (v_streak_days * 0.01));
  workout_xp := floor(workout_xp * streak_multiplier);

  select level into old_level
  from public.user_progress
  where user_id = p_user_id;

  update public.user_progress
  set xp_total = xp_total + workout_xp,
      level = public.fn_level_from_xp(xp_total + workout_xp),
      updated_at = now()
  where user_id = p_user_id;

  select level into new_level
  from public.user_progress
  where user_id = p_user_id;

  insert into public.xp_ledger(user_id, workout_id, source_type, source_id, xp_amount)
  values (p_user_id, p_workout_id, 'workout', p_workout_id, workout_xp);

  for muscle_row in
    with primary_load as (
      select
        e.primary_muscle as muscle_group,
        sum((s.reps * coalesce(s.weight_kg, 0))::numeric) as volume,
        count(*) filter (where coalesce(s.rpe, 7) >= 7 and coalesce(s.is_warmup, false) = false) as hard_sets,
        max((coalesce(s.weight_kg, 0) * (1 + s.reps::numeric / 30.0))::numeric) as e1rm_estimate
      from public.sets s
      join public.workout_exercises we on we.id = s.workout_exercise_id
      join public.exercises e on e.id = we.exercise_id
      where we.workout_id = p_workout_id
        and coalesce(s.is_warmup, false) = false
      group by e.primary_muscle
    ),
    secondary_load as (
      select
        sm.muscle_group,
        sum((s.reps * coalesce(s.weight_kg, 0))::numeric * 0.35) as volume,
        count(*) filter (where coalesce(s.rpe, 7) >= 8 and coalesce(s.is_warmup, false) = false) as hard_sets,
        max((coalesce(s.weight_kg, 0) * (1 + s.reps::numeric / 30.0) * 0.35)::numeric) as e1rm_estimate
      from public.sets s
      join public.workout_exercises we on we.id = s.workout_exercise_id
      join public.exercises e on e.id = we.exercise_id
      cross join lateral unnest(coalesce(e.secondary_muscles, '{}')) sm(muscle_group)
      where we.workout_id = p_workout_id
        and coalesce(s.is_warmup, false) = false
      group by sm.muscle_group
    ),
    merged as (
      select * from primary_load
      union all
      select * from secondary_load
    )
    select
      m.muscle_group,
      greatest(sum(m.volume), 0)::numeric as volume,
      greatest(sum(m.hard_sets), 1)::int as hard_sets,
      greatest(max(m.e1rm_estimate), 0)::numeric as e1rm_estimate
    from merged m
    group by m.muscle_group
  loop
    insert into public.muscle_stats(user_id, muscle_group)
    values (p_user_id, muscle_row.muscle_group)
    on conflict (user_id, muscle_group) do nothing;

    select
      ms.last_trained_at,
      coalesce(ms.fatigue_score, 0),
      coalesce(ms.plateau_score, 0),
      coalesce(ms.adaptation_score, 50),
      coalesce(ms.recent_e1rm_kg, 0),
      coalesce(ms.best_e1rm_kg, 0)
    into
      v_last_trained_at,
      v_prev_fatigue,
      v_prev_plateau,
      v_prev_adaptation,
      v_prev_recent_e1rm,
      v_prev_best_e1rm
    from public.muscle_stats ms
    where ms.user_id = p_user_id
      and ms.muscle_group = muscle_row.muscle_group
    for update;

    select count(*)::int
    into v_frequency_7d
    from public.muscle_training_sessions mts
    where mts.user_id = p_user_id
      and mts.muscle_group = muscle_row.muscle_group
      and mts.session_date >= daily_date - 6;

    if v_last_trained_at is not null then
      v_hours_since_last := extract(epoch from (now() - v_last_trained_at)) / 3600.0;
    else
      v_hours_since_last := 999;
    end if;

    v_recovery_factor := case
      when v_hours_since_last < 24 then 0.55
      when v_hours_since_last < 48 then 0.75
      when v_hours_since_last < 72 then 0.90
      else 1.08
    end;

    v_frequency_factor := case
      when v_frequency_7d >= 4 then 0.70
      when v_frequency_7d = 3 then 0.85
      when v_frequency_7d = 2 then 0.95
      else 1.05
    end;

    if v_prev_recent_e1rm > 0 then
      v_overload_pct := (muscle_row.e1rm_estimate - v_prev_recent_e1rm) / v_prev_recent_e1rm;
    else
      v_overload_pct := 0.02;
    end if;

    v_overload_factor := case
      when v_overload_pct >= 0.03 then 1.20
      when v_overload_pct >= 0.01 then 1.10
      when v_overload_pct > -0.01 then 1.00
      else 0.88
    end;

    v_volume_factor := case
      when muscle_row.hard_sets between 4 and 10 then 1.00
      when muscle_row.hard_sets between 11 and 14 then 0.93
      when muscle_row.hard_sets > 14 then 0.82
      else 0.85
    end;

    v_new_plateau := least(
      100,
      greatest(
        0,
        v_prev_plateau + case
          when v_overload_pct < 0.005 and v_frequency_7d >= 3 then 6
          when v_overload_pct >= 0.01 then -5
          else -2
        end
      )
    );

    v_plateau_factor := greatest(0.50, 1 - (v_new_plateau / 200.0));

    v_deload_bonus := case
      when v_hours_since_last >= 96 and v_prev_fatigue >= 55 then 1.12
      else 1
    end;

    v_muscle_xp := greatest(
      8,
      floor(
        (
          (muscle_row.volume / 18.0) +
          (muscle_row.hard_sets * 6.0) +
          least(muscle_row.e1rm_estimate, 240) * 0.35
        ) *
        v_recovery_factor *
        v_frequency_factor *
        v_overload_factor *
        v_volume_factor *
        v_plateau_factor *
        v_deload_bonus
      )::int
    );

    v_new_fatigue := least(
      100,
      greatest(
        0,
        v_prev_fatigue +
        (muscle_row.hard_sets * 4) +
        (case when v_hours_since_last < 24 then 12 when v_hours_since_last < 48 then 6 else 0 end) -
        (case when v_hours_since_last >= 72 then 8 else 0 end)
      )
    );

    v_new_adaptation := least(
      100,
      greatest(
        0,
        v_prev_adaptation +
        (case when v_overload_pct >= 0.01 then 4 when v_overload_pct <= -0.03 then -3 else 1 end) -
        (case when v_new_fatigue > 75 then 3 else 0 end)
      )
    );

    v_recovery_hours := greatest(18, 24 + (v_new_fatigue * 0.8));
    v_recent_e1rm := round((v_prev_recent_e1rm * 0.7) + (muscle_row.e1rm_estimate * 0.3), 2);
    v_best_e1rm := greatest(v_prev_best_e1rm, round(muscle_row.e1rm_estimate, 2));
    v_strength_ratio := round((v_best_e1rm / v_user_bodyweight)::numeric, 3);

    update public.muscle_stats ms
    set xp_total = ms.xp_total + v_muscle_xp,
        level = public.fn_level_from_xp(ms.xp_total + v_muscle_xp),
        rank = public.fn_muscle_rank_from_ratio(muscle_row.muscle_group, v_strength_ratio),
        fatigue_score = round(v_new_fatigue, 2),
        last_trained_at = now(),
        recovery_ready_at = now() + make_interval(hours => ceil(v_recovery_hours)::int),
        plateau_score = round(v_new_plateau, 2),
        adaptation_score = round(v_new_adaptation, 2),
        frequency_7d = least(7, v_frequency_7d + 1),
        overload_index = round(v_overload_pct * 100, 2),
        strength_ratio = v_strength_ratio,
        best_e1rm_kg = v_best_e1rm,
        recent_e1rm_kg = v_recent_e1rm,
        updated_at = now()
    where ms.user_id = p_user_id
      and ms.muscle_group = muscle_row.muscle_group;

    insert into public.muscle_training_sessions(
      user_id,
      workout_id,
      muscle_group,
      session_date,
      total_volume,
      hard_sets,
      e1rm_estimate_kg,
      fatigue_delta,
      xp_awarded
    )
    values (
      p_user_id,
      p_workout_id,
      muscle_row.muscle_group,
      daily_date,
      round(muscle_row.volume, 2),
      muscle_row.hard_sets,
      round(muscle_row.e1rm_estimate, 2),
      round(v_new_fatigue - v_prev_fatigue, 2),
      v_muscle_xp
    )
    on conflict (user_id, workout_id, muscle_group) do nothing;

    muscle_summaries := muscle_summaries || jsonb_build_array(
      jsonb_build_object(
        'muscle', muscle_row.muscle_group,
        'xp', v_muscle_xp,
        'fatigue', round(v_new_fatigue, 2),
        'overloadPct', round(v_overload_pct * 100, 2),
        'plateau', round(v_new_plateau, 2),
        'ratio', v_strength_ratio,
        'rank', public.fn_muscle_rank_from_ratio(muscle_row.muscle_group, v_strength_ratio)
      )
    );
  end loop;

  perform public.fn_update_quest_progress(p_user_id, 1);
  perform public.fn_evaluate_boss_unlocks(p_user_id);

  perform public.fn_assign_daily_quests(p_user_id, daily_date);
  perform public.fn_update_daily_quest_progress(p_user_id, 1, daily_date);
  perform public.fn_update_weekly_progress(p_user_id, greatest(10, floor(workout_xp / 25)::int));

  select s.id into active_season_id
  from public.seasons s
  where s.is_active = true
    and now() between s.start_at and s.end_at
  order by s.start_at desc
  limit 1;

  if active_season_id is not null then
    insert into public.season_user_progress(user_id, season_id)
    values (p_user_id, active_season_id)
    on conflict (user_id, season_id) do nothing;

    update public.season_user_progress sup
    set season_xp = sup.season_xp + workout_xp,
        tier = greatest(1, floor((sup.season_xp + workout_xp) / 2500)::int + 1),
        updated_at = now()
    where sup.user_id = p_user_id
      and sup.season_id = active_season_id;
  end if;

  loot_payload := public.fn_roll_workout_loot(p_user_id, p_workout_id, streak_multiplier);

  return jsonb_build_object(
    'xp', workout_xp,
    'streakDays', v_streak_days,
    'leveledUp', (new_level > old_level),
    'newLevel', new_level,
    'muscleSummary', muscle_summaries,
    'loot', loot_payload
  );
end;
$$;

grant execute on function public.fn_muscle_rank_from_ratio(text, numeric) to authenticated;
grant execute on function public.fn_apply_workout_rewards(uuid, uuid) to authenticated;

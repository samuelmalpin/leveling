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

  while lvl < 100 loop
    needed := floor(120 * power(lvl::numeric, 1.7))::bigint;

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

create or replace function public.fn_muscle_level_from_xp(total_xp bigint)
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

  while lvl < 100 loop
    needed := floor(80 * power(lvl::numeric, 1.8))::bigint;

    exit when acc + needed > total_xp;
    acc := acc + needed;
    lvl := lvl + 1;
  end loop;

  return lvl;
end;
$$;

create or replace function public.fn_muscle_level_from_xp(total_xp numeric)
returns int
language sql
immutable
as $$
  select public.fn_muscle_level_from_xp(floor(greatest(total_xp, 0))::bigint);
$$;

create or replace function public.fn_rank_from_level(p_level int)
returns text
language sql
immutable
as $$
  select case
    when p_level < 5 then 'E'
    when p_level < 15 then 'D'
    when p_level < 30 then 'C'
    when p_level < 50 then 'B'
    when p_level < 70 then 'A'
    when p_level < 80 then 'S'
    when p_level < 90 then 'SS'
    else 'SSS'
  end;
$$;

create or replace function public.fn_muscle_weekly_xp_multiplier(p_sessions int)
returns numeric
language sql
immutable
as $$
  select case
    when coalesce(p_sessions, 0) <= 1 then 1.00
    when p_sessions = 2 then 0.90
    when p_sessions = 3 then 0.75
    when p_sessions = 4 then 0.60
    else 0.40
  end::numeric;
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
  week_start date := date_trunc('week', (now() at time zone 'utc'))::date;
  loot_payload jsonb := '{}'::jsonb;
  active_season_id uuid;
  muscle_row record;
  weekly_sessions int := 0;
  fatigue_multiplier numeric := 1;
  raw_muscle_xp numeric := 0;
  awarded_muscle_xp bigint := 0;
begin
  select coalesce(sum(coalesce(s.reps, 0) * coalesce(s.weight_kg, 0)), 0)
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

  for muscle_row in
    with muscle_xp_source as (
      select
        e.primary_muscle as muscle_group,
        (coalesce(s.weight_kg, 0)::numeric * coalesce(s.reps, 0)::numeric) as xp_gain
      from public.sets s
      join public.workout_exercises we on we.id = s.workout_exercise_id
      join public.exercises e on e.id = we.exercise_id
      where we.workout_id = p_workout_id

      union all

      select
        sec.muscle_group as muscle_group,
        (coalesce(s.weight_kg, 0)::numeric * coalesce(s.reps, 0)::numeric) as xp_gain
      from public.sets s
      join public.workout_exercises we on we.id = s.workout_exercise_id
      join public.exercises e on e.id = we.exercise_id
      join lateral unnest(e.secondary_muscles) as sec(muscle_group) on true
      where we.workout_id = p_workout_id
    )
    select muscle_group, coalesce(sum(xp_gain), 0) as raw_xp
    from muscle_xp_source
    group by muscle_group
  loop
    select count(distinct w.id)
    into weekly_sessions
    from public.workouts w
    join public.workout_exercises we on we.workout_id = w.id
    join public.exercises e on e.id = we.exercise_id
    where w.user_id = p_user_id
      and w.status = 'completed'
      and (w.started_at at time zone 'utc')::date >= week_start
      and (w.started_at at time zone 'utc')::date < (week_start + 7)
      and (
        e.primary_muscle = muscle_row.muscle_group
        or muscle_row.muscle_group = any(e.secondary_muscles)
      );

    fatigue_multiplier := public.fn_muscle_weekly_xp_multiplier(weekly_sessions);
    raw_muscle_xp := coalesce(muscle_row.raw_xp, 0);
    awarded_muscle_xp := greatest(0, floor(raw_muscle_xp * fatigue_multiplier))::bigint;

    update public.muscle_stats ms
    set xp_total = ms.xp_total + awarded_muscle_xp,
        level = public.fn_muscle_level_from_xp(ms.xp_total + awarded_muscle_xp),
        rank = public.fn_rank_from_level(public.fn_muscle_level_from_xp(ms.xp_total + awarded_muscle_xp)),
        fatigue_score = least(100, greatest(0, ms.fatigue_score + ((1 - fatigue_multiplier) * 20))),
        last_trained_at = now(),
        updated_at = now()
    where ms.user_id = p_user_id
      and ms.muscle_group = muscle_row.muscle_group;
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
    'loot', loot_payload
  );
end;
$$;

grant execute on function public.fn_level_from_xp(bigint) to authenticated;
grant execute on function public.fn_level_from_xp(numeric) to authenticated;
grant execute on function public.fn_muscle_level_from_xp(bigint) to authenticated;
grant execute on function public.fn_muscle_level_from_xp(numeric) to authenticated;
grant execute on function public.fn_rank_from_level(int) to authenticated;
grant execute on function public.fn_muscle_weekly_xp_multiplier(int) to authenticated;
grant execute on function public.fn_apply_workout_rewards(uuid, uuid) to authenticated;

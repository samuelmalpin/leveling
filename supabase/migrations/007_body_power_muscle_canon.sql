create or replace function public.fn_expand_muscle_group(p_group text)
returns text[]
language sql
immutable
as $$
  select case
    when p_group is null then '{}'::text[]
    when lower(trim(p_group)) = 'arms' then array['biceps', 'triceps']::text[]
    when lower(trim(p_group)) = 'core' then array['abs']::text[]
    when lower(trim(p_group)) = 'quads' then array['quadriceps']::text[]
    else array[lower(trim(p_group))]::text[]
  end;
$$;

update public.exercises
set primary_muscle = case
  when primary_muscle = 'quads' then 'quadriceps'
  when primary_muscle = 'core' then 'abs'
  when primary_muscle = 'arms' then 'biceps'
  else primary_muscle
end
where primary_muscle in ('quads', 'core', 'arms');

update public.exercises e
set secondary_muscles = (
  select coalesce(array_agg(distinct mg.mapped_group order by mg.mapped_group), '{}'::text[])
  from unnest(coalesce(e.secondary_muscles, '{}'::text[])) as raw_group(group_name)
  join lateral unnest(public.fn_expand_muscle_group(raw_group.group_name)) as mg(mapped_group) on true
);

with legacy_rows as (
  select
    ms.user_id,
    ms.muscle_group,
    ms.xp_total,
    ms.level,
    ms.fatigue_score,
    ms.last_trained_at,
    ms.updated_at,
    public.fn_expand_muscle_group(ms.muscle_group) as mapped_groups
  from public.muscle_stats ms
  where ms.muscle_group in ('arms', 'core', 'quads')
), expanded as (
  select
    lr.user_id,
    mg.mapped_group as muscle_group,
    floor(lr.xp_total::numeric / greatest(array_length(lr.mapped_groups, 1), 1))::bigint as xp_total,
    lr.level,
    lr.fatigue_score,
    lr.last_trained_at,
    lr.updated_at
  from legacy_rows lr
  join lateral unnest(lr.mapped_groups) as mg(mapped_group) on true
)
insert into public.muscle_stats(
  id,
  user_id,
  muscle_group,
  xp_total,
  level,
  rank,
  fatigue_score,
  last_trained_at,
  updated_at
)
select
  gen_random_uuid(),
  e.user_id,
  e.muscle_group,
  e.xp_total,
  e.level,
  public.fn_rank_from_level(e.level),
  e.fatigue_score,
  e.last_trained_at,
  coalesce(e.updated_at, now())
from expanded e
on conflict (user_id, muscle_group)
do update
set xp_total = public.muscle_stats.xp_total + excluded.xp_total,
    level = greatest(public.muscle_stats.level, excluded.level),
    rank = public.fn_rank_from_level(greatest(public.muscle_stats.level, excluded.level)),
    fatigue_score = greatest(public.muscle_stats.fatigue_score, excluded.fatigue_score),
    last_trained_at = case
      when public.muscle_stats.last_trained_at is null then excluded.last_trained_at
      when excluded.last_trained_at is null then public.muscle_stats.last_trained_at
      else greatest(public.muscle_stats.last_trained_at, excluded.last_trained_at)
    end,
    updated_at = now();

delete from public.muscle_stats where muscle_group in ('arms', 'core', 'quads');

insert into public.muscle_stats(id, user_id, muscle_group)
select
  gen_random_uuid(),
  u.id,
  m.muscle_group
from public.users u
cross join unnest(
  array[
    'chest',
    'biceps',
    'triceps',
    'shoulders',
    'back',
    'abs',
    'glutes',
    'quadriceps',
    'hamstrings',
    'calves'
  ]::text[]
) as m(muscle_group)
on conflict (user_id, muscle_group) do nothing;

update public.muscle_stats ms
set level = public.fn_muscle_level_from_xp(ms.xp_total),
    rank = public.fn_rank_from_level(public.fn_muscle_level_from_xp(ms.xp_total)),
    updated_at = now()
where ms.muscle_group = any(
  array[
    'chest',
    'biceps',
    'triceps',
    'shoulders',
    'back',
    'abs',
    'glutes',
    'quadriceps',
    'hamstrings',
    'calves'
  ]::text[]
);

create or replace function public.fn_get_weekly_recap(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_workouts int := 0;
  v_points int := 0;
  v_avg_score numeric := 0;
  v_best_muscle text := 'abs';
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

grant execute on function public.fn_expand_muscle_group(text) to authenticated;
grant execute on function public.fn_get_weekly_recap(uuid) to authenticated;

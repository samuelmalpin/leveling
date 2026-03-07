create or replace function public.fn_attempt_boss(p_user_id uuid, p_boss_progress_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_boss_id uuid;
  v_boss_status text;
  v_diff int;
  v_reward int;
  v_score int;
  v_defeated boolean := false;
  v_progress_delta numeric := 0;
  v_current_meter numeric := 0;
  v_modifier_name text;
  v_modifier_mult numeric := 1;
begin
  select bp.boss_id, bp.status, bp.progress_meter, b.difficulty, b.reward_xp
  into v_boss_id, v_boss_status, v_current_meter, v_diff, v_reward
  from public.boss_progress bp
  join public.bosses b on b.id = bp.boss_id
  where bp.id = p_boss_progress_id
    and bp.user_id = p_user_id
  for update;

  if v_boss_status is null then
    raise exception 'Boss progress not found';
  end if;

  if v_boss_status = 'locked' then
    raise exception 'Boss is locked';
  end if;

  select bwm.modifier_name, bwm.score_multiplier
  into v_modifier_name, v_modifier_mult
  from public.boss_weekly_modifiers bwm
  where bwm.boss_id = v_boss_id
    and bwm.is_active = true
    and current_date between bwm.week_start and bwm.week_end
  order by bwm.week_start desc
  limit 1;

  v_score := floor((random() * 40)::numeric) + 60;
  v_score := least(100, floor(v_score * coalesce(v_modifier_mult, 1))::int);

  v_defeated := v_score >= greatest(60, 92 - v_diff * 4);
  v_progress_delta := case when v_defeated then 100 else greatest(8, floor(v_score / 5)::numeric) end;

  update public.boss_progress
  set status = case when v_defeated then 'defeated' else 'attempted' end,
      attempt_count = attempt_count + 1,
      best_score = greatest(coalesce(best_score, 0), v_score),
      progress_meter = case when v_defeated then 100 else least(95, progress_meter + v_progress_delta) end,
      last_attempt_at = now(),
      defeated_at = case when v_defeated then now() else defeated_at end
  where id = p_boss_progress_id;

  if v_defeated then
    update public.user_progress
    set xp_total = xp_total + v_reward,
        level = public.fn_level_from_xp(xp_total + v_reward),
        updated_at = now()
    where user_id = p_user_id;

    insert into public.xp_ledger(user_id, source_type, source_id, xp_amount)
    values (p_user_id, 'boss', v_boss_id, v_reward);
  end if;

  return jsonb_build_object(
    'score', v_score,
    'defeated', v_defeated,
    'xpAwarded', case when v_defeated then v_reward else 0 end,
    'progressMeterDelta', v_progress_delta,
    'progressMeter', case when v_defeated then 100 else least(95, v_current_meter + v_progress_delta) end,
    'modifierName', coalesce(v_modifier_name, 'No Modifier')
  );
end;
$$;

grant execute on function public.fn_attempt_boss(uuid, uuid) to authenticated;

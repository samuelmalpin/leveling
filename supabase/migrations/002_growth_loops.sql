create table if not exists public.loot_tables (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.loot_entries (
  id uuid primary key default gen_random_uuid(),
  loot_table_id uuid not null references public.loot_tables(id) on delete cascade,
  item_code text not null,
  item_name text not null,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  weight int not null check (weight > 0),
  min_qty int not null default 1 check (min_qty > 0),
  max_qty int not null default 1 check (max_qty >= min_qty),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.loot_drops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  source_type text not null check (source_type in ('workout', 'quest', 'weekly', 'boss')),
  item_code text not null,
  item_name text not null,
  rarity text not null,
  quantity int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.user_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_code text not null,
  item_name text not null,
  rarity text not null,
  quantity bigint not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_id, item_code)
);

create table if not exists public.pity_counters (
  user_id uuid primary key references public.users(id) on delete cascade,
  loot_table_code text not null default 'workout_standard',
  misses_since_rare int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_quest_pool (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  goal_type text not null,
  goal_value numeric(10,2) not null,
  xp_reward int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_daily_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  quest_pool_id uuid not null references public.daily_quest_pool(id),
  assigned_date date not null,
  progress_value numeric(10,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'claimed', 'expired')),
  completed_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, quest_pool_id, assigned_date)
);

create table if not exists public.weekly_challenges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  week_start date not null,
  week_end date not null,
  target_points int not null,
  reward_xp int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_weekly_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  weekly_challenge_id uuid not null references public.weekly_challenges(id),
  points int not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'claimed')),
  completed_at timestamptz,
  claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, weekly_challenge_id)
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.season_user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  season_xp bigint not null default 0,
  tier int not null default 1,
  updated_at timestamptz not null default now(),
  unique(user_id, season_id)
);

create table if not exists public.leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_type text not null,
  period_key text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  score numeric(12,2) not null,
  rank int,
  created_at timestamptz not null default now(),
  unique(snapshot_type, period_key, user_id)
);

create table if not exists public.squads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  max_members int not null default 8,
  created_at timestamptz not null default now()
);

create table if not exists public.squad_members (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.squads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  unique(squad_id, user_id)
);

create table if not exists public.share_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  card_type text not null check (card_type in ('power_scan', 'muscle_rank', 'achievement')),
  title text not null,
  payload jsonb not null default '{}',
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.streak_shields (
  user_id uuid primary key references public.users(id) on delete cascade,
  charges int not null default 1,
  last_grant_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.micro_quests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  xp_reward int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_micro_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  micro_quest_id uuid not null references public.micro_quests(id),
  assigned_date date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'claimed', 'expired')),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, micro_quest_id, assigned_date)
);

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  event_name text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_loot_drops_user_created on public.loot_drops(user_id, created_at desc);
create index if not exists idx_user_daily_quests_user_date on public.user_daily_quests(user_id, assigned_date desc);
create index if not exists idx_user_weekly_progress_user on public.user_weekly_progress(user_id, updated_at desc);
create index if not exists idx_season_user_progress_user on public.season_user_progress(user_id, updated_at desc);
create index if not exists idx_leaderboard_period on public.leaderboard_snapshots(snapshot_type, period_key, score desc);
create index if not exists idx_squad_members_user on public.squad_members(user_id, joined_at desc);
create index if not exists idx_share_cards_user_created on public.share_cards(user_id, created_at desc);
create index if not exists idx_product_events_event_created on public.product_events(event_name, created_at desc);
create index if not exists idx_product_events_user_created on public.product_events(user_id, created_at desc);

create or replace function public.fn_assign_daily_quests(p_user_id uuid, p_for_date date default current_date)
returns int
language plpgsql
security definer
as $$
declare
  assigned_count int := 0;
begin
  with picked as (
    select dqp.id
    from public.daily_quest_pool dqp
    where dqp.is_active = true
      and not exists (
        select 1
        from public.user_daily_quests udq
        where udq.user_id = p_user_id
          and udq.quest_pool_id = dqp.id
          and udq.assigned_date = p_for_date
      )
    order by random()
    limit 3
  )
  insert into public.user_daily_quests(user_id, quest_pool_id, assigned_date)
  select p_user_id, p.id, p_for_date
  from picked p
  on conflict (user_id, quest_pool_id, assigned_date) do nothing;

  get diagnostics assigned_count = row_count;
  return assigned_count;
end;
$$;

create or replace function public.fn_update_daily_quest_progress(
  p_user_id uuid,
  p_workouts_done int,
  p_for_date date default current_date
)
returns void
language plpgsql
security definer
as $$
begin
  update public.user_daily_quests udq
  set progress_value = udq.progress_value + p_workouts_done,
      completed_at = case
        when udq.progress_value + p_workouts_done >= dqp.goal_value then now()
        else udq.completed_at
      end,
      status = case
        when udq.progress_value + p_workouts_done >= dqp.goal_value then 'completed'
        else udq.status
      end
  from public.daily_quest_pool dqp
  where udq.quest_pool_id = dqp.id
    and udq.user_id = p_user_id
    and udq.assigned_date = p_for_date
    and udq.status = 'active'
    and dqp.goal_type = 'workout_complete';
end;
$$;

create or replace function public.fn_claim_daily_quest(p_user_id uuid, p_daily_quest_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  reward_xp int;
  q_status text;
begin
  select dqp.xp_reward, udq.status
  into reward_xp, q_status
  from public.user_daily_quests udq
  join public.daily_quest_pool dqp on dqp.id = udq.quest_pool_id
  where udq.id = p_daily_quest_id
    and udq.user_id = p_user_id
  for update;

  if q_status is null then
    raise exception 'Daily quest not found';
  end if;

  if q_status <> 'completed' then
    raise exception 'Daily quest is not claimable';
  end if;

  update public.user_daily_quests
  set status = 'claimed',
      claimed_at = now()
  where id = p_daily_quest_id;

  update public.user_progress
  set xp_total = xp_total + reward_xp,
      level = public.fn_level_from_xp(xp_total + reward_xp),
      updated_at = now()
  where user_id = p_user_id;

  insert into public.xp_ledger(user_id, source_type, source_id, xp_amount)
  values (p_user_id, 'daily_quest', p_daily_quest_id, reward_xp);

  return jsonb_build_object('xp', reward_xp);
end;
$$;

create or replace function public.fn_update_weekly_progress(p_user_id uuid, p_points int)
returns void
language plpgsql
security definer
as $$
declare
  wc record;
begin
  for wc in
    select id, target_points
    from public.weekly_challenges
    where is_active = true
      and current_date between week_start and week_end
  loop
    insert into public.user_weekly_progress(user_id, weekly_challenge_id)
    values (p_user_id, wc.id)
    on conflict (user_id, weekly_challenge_id) do nothing;

    update public.user_weekly_progress uwp
    set points = uwp.points + p_points,
        status = case when uwp.points + p_points >= wc.target_points then 'completed' else uwp.status end,
        completed_at = case when uwp.points + p_points >= wc.target_points then now() else uwp.completed_at end,
        updated_at = now()
    where uwp.user_id = p_user_id
      and uwp.weekly_challenge_id = wc.id;
  end loop;
end;
$$;

create or replace function public.fn_claim_weekly_challenge(p_user_id uuid, p_user_weekly_progress_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  reward_xp int;
  challenge_status text;
begin
  select wc.reward_xp, uwp.status
  into reward_xp, challenge_status
  from public.user_weekly_progress uwp
  join public.weekly_challenges wc on wc.id = uwp.weekly_challenge_id
  where uwp.id = p_user_weekly_progress_id
    and uwp.user_id = p_user_id
  for update;

  if challenge_status is null then
    raise exception 'Weekly challenge not found';
  end if;

  if challenge_status <> 'completed' then
    raise exception 'Weekly challenge is not claimable';
  end if;

  update public.user_weekly_progress
  set status = 'claimed',
      claimed_at = now(),
      updated_at = now()
  where id = p_user_weekly_progress_id;

  update public.user_progress
  set xp_total = xp_total + reward_xp,
      level = public.fn_level_from_xp(xp_total + reward_xp),
      updated_at = now()
  where user_id = p_user_id;

  insert into public.xp_ledger(user_id, source_type, source_id, xp_amount)
  values (p_user_id, 'weekly_challenge', p_user_weekly_progress_id, reward_xp);

  return jsonb_build_object('xp', reward_xp);
end;
$$;

create or replace function public.fn_generate_share_card(p_user_id uuid, p_card_type text)
returns jsonb
language plpgsql
security definer
as $$
declare
  p record;
  m record;
  muscles_payload jsonb := '[]'::jsonb;
  new_card_id uuid;
  new_title text;
  new_payload jsonb;
begin
  select up.level, up.xp_total, up.streak_days
  into p
  from public.user_progress up
  where up.user_id = p_user_id;

  if p.level is null then
    raise exception 'User progression missing';
  end if;

  if p_card_type = 'power_scan' then
    select coalesce(jsonb_agg(jsonb_build_object('muscle', ms.muscle_group, 'level', ms.level, 'rank', ms.rank) order by ms.level desc), '[]'::jsonb)
    into muscles_payload
    from public.muscle_stats ms
    where ms.user_id = p_user_id;

    new_title := format('Power Scan L%s', p.level);
    new_payload := jsonb_build_object(
      'level', p.level,
      'xp', p.xp_total,
      'streakDays', p.streak_days,
      'muscles', muscles_payload
    );
  elsif p_card_type = 'muscle_rank' then
    select ms.muscle_group, ms.rank, ms.level
    into m
    from public.muscle_stats ms
    where ms.user_id = p_user_id
    order by ms.level desc, ms.xp_total desc
    limit 1;

    new_title := format('Top Muscle %s %s', coalesce(m.muscle_group, 'core'), coalesce(m.rank, 'E'));
    new_payload := jsonb_build_object(
      'muscle', coalesce(m.muscle_group, 'core'),
      'rank', coalesce(m.rank, 'E'),
      'level', coalesce(m.level, 1),
      'accountLevel', p.level
    );
  elsif p_card_type = 'achievement' then
    new_title := format('Achievement Hunter L%s', p.level);
    new_payload := jsonb_build_object(
      'level', p.level,
      'streakDays', p.streak_days,
      'xp', p.xp_total
    );
  else
    raise exception 'Unsupported card type';
  end if;

  insert into public.share_cards(user_id, card_type, title, payload)
  values (p_user_id, p_card_type, new_title, new_payload)
  returning id into new_card_id;

  return jsonb_build_object('id', new_card_id, 'cardType', p_card_type, 'title', new_title, 'payload', new_payload);
end;
$$;

create or replace function public.fn_roll_workout_loot(
  p_user_id uuid,
  p_workout_id uuid,
  p_quality numeric default 1
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_table_id uuid;
  v_misses int;
  v_rare_chance numeric;
  v_roll numeric;
  v_pick record;
  v_qty int;
  v_rare_hit boolean := false;
begin
  select lt.id into v_table_id
  from public.loot_tables lt
  where lt.code = 'workout_standard'
    and lt.is_active = true
  limit 1;

  if v_table_id is null then
    return jsonb_build_object('awarded', false, 'reason', 'loot_table_missing');
  end if;

  insert into public.pity_counters(user_id, loot_table_code)
  values (p_user_id, 'workout_standard')
  on conflict (user_id) do nothing;

  select pc.misses_since_rare
  into v_misses
  from public.pity_counters pc
  where pc.user_id = p_user_id
  for update;

  v_rare_chance := least(0.40, 0.08 + (greatest(p_quality, 0.5) * 0.04) + (least(v_misses, 12) * 0.02));
  v_roll := random();
  v_rare_hit := v_roll <= v_rare_chance;

  if v_rare_hit then
    select le.* into v_pick
    from public.loot_entries le
    where le.loot_table_id = v_table_id
      and le.rarity in ('rare', 'epic', 'legendary')
    order by random() * le.weight desc
    limit 1;
  end if;

  if v_pick is null then
    select le.* into v_pick
    from public.loot_entries le
    where le.loot_table_id = v_table_id
      and le.rarity = 'common'
    order by random() * le.weight desc
    limit 1;
  end if;

  if v_pick is null then
    return jsonb_build_object('awarded', false, 'reason', 'loot_entry_missing');
  end if;

  v_qty := floor(random() * (v_pick.max_qty - v_pick.min_qty + 1) + v_pick.min_qty)::int;

  insert into public.loot_drops(user_id, workout_id, source_type, item_code, item_name, rarity, quantity)
  values (p_user_id, p_workout_id, 'workout', v_pick.item_code, v_pick.item_name, v_pick.rarity, v_qty);

  insert into public.user_inventory(user_id, item_code, item_name, rarity, quantity)
  values (p_user_id, v_pick.item_code, v_pick.item_name, v_pick.rarity, v_qty)
  on conflict (user_id, item_code)
  do update
    set quantity = public.user_inventory.quantity + excluded.quantity,
        item_name = excluded.item_name,
        rarity = excluded.rarity,
        updated_at = now();

  update public.pity_counters
  set misses_since_rare = case when v_pick.rarity in ('rare', 'epic', 'legendary') then 0 else misses_since_rare + 1 end,
      updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object(
    'awarded', true,
    'itemCode', v_pick.item_code,
    'itemName', v_pick.item_name,
    'rarity', v_pick.rarity,
    'quantity', v_qty,
    'rareChance', round(v_rare_chance * 100, 2)
  );
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
  loot_payload jsonb := '{}'::jsonb;
  active_season_id uuid;
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

alter table public.loot_tables enable row level security;
alter table public.loot_entries enable row level security;
alter table public.loot_drops enable row level security;
alter table public.user_inventory enable row level security;
alter table public.pity_counters enable row level security;
alter table public.daily_quest_pool enable row level security;
alter table public.user_daily_quests enable row level security;
alter table public.weekly_challenges enable row level security;
alter table public.user_weekly_progress enable row level security;
alter table public.seasons enable row level security;
alter table public.season_user_progress enable row level security;
alter table public.leaderboard_snapshots enable row level security;
alter table public.squads enable row level security;
alter table public.squad_members enable row level security;
alter table public.share_cards enable row level security;
alter table public.streak_shields enable row level security;
alter table public.micro_quests enable row level security;
alter table public.user_micro_quests enable row level security;
alter table public.product_events enable row level security;

drop policy if exists "public_loot_tables_read" on public.loot_tables;
create policy "public_loot_tables_read" on public.loot_tables
for select using (is_active = true);

drop policy if exists "public_loot_entries_read" on public.loot_entries;
create policy "public_loot_entries_read" on public.loot_entries
for select using (true);

drop policy if exists "loot_drops_own" on public.loot_drops;
create policy "loot_drops_own" on public.loot_drops
for select using (auth.uid() = user_id);

drop policy if exists "inventory_own" on public.user_inventory;
create policy "inventory_own" on public.user_inventory
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "pity_counter_own" on public.pity_counters;
create policy "pity_counter_own" on public.pity_counters
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "daily_quest_pool_read" on public.daily_quest_pool;
create policy "daily_quest_pool_read" on public.daily_quest_pool
for select using (is_active = true);

drop policy if exists "user_daily_quests_own" on public.user_daily_quests;
create policy "user_daily_quests_own" on public.user_daily_quests
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "weekly_challenges_read" on public.weekly_challenges;
create policy "weekly_challenges_read" on public.weekly_challenges
for select using (is_active = true);

drop policy if exists "user_weekly_progress_own" on public.user_weekly_progress;
create policy "user_weekly_progress_own" on public.user_weekly_progress
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "seasons_read" on public.seasons;
create policy "seasons_read" on public.seasons
for select using (is_active = true);

drop policy if exists "season_user_progress_own" on public.season_user_progress;
create policy "season_user_progress_own" on public.season_user_progress
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "leaderboards_read" on public.leaderboard_snapshots;
create policy "leaderboards_read" on public.leaderboard_snapshots
for select using (true);

drop policy if exists "squads_owner_manage" on public.squads;
create policy "squads_owner_manage" on public.squads
for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists "squads_member_read" on public.squads;
create policy "squads_member_read" on public.squads
for select using (
  exists (
    select 1
    from public.squad_members sm
    where sm.squad_id = squads.id
      and sm.user_id = auth.uid()
  )
);

drop policy if exists "squad_members_own_manage" on public.squad_members;
create policy "squad_members_own_manage" on public.squad_members
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "share_cards_own" on public.share_cards;
create policy "share_cards_own" on public.share_cards
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "streak_shields_own" on public.streak_shields;
create policy "streak_shields_own" on public.streak_shields
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "micro_quests_read" on public.micro_quests;
create policy "micro_quests_read" on public.micro_quests
for select using (is_active = true);

drop policy if exists "user_micro_quests_own" on public.user_micro_quests;
create policy "user_micro_quests_own" on public.user_micro_quests
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "product_events_insert_own" on public.product_events;
create policy "product_events_insert_own" on public.product_events
for insert with check (auth.uid() = user_id);

drop policy if exists "product_events_select_own" on public.product_events;
create policy "product_events_select_own" on public.product_events
for select using (auth.uid() = user_id);

grant execute on function public.fn_assign_daily_quests(uuid, date) to authenticated;
grant execute on function public.fn_update_daily_quest_progress(uuid, int, date) to authenticated;
grant execute on function public.fn_claim_daily_quest(uuid, uuid) to authenticated;
grant execute on function public.fn_update_weekly_progress(uuid, int) to authenticated;
grant execute on function public.fn_claim_weekly_challenge(uuid, uuid) to authenticated;
grant execute on function public.fn_roll_workout_loot(uuid, uuid, numeric) to authenticated;
grant execute on function public.fn_generate_share_card(uuid, text) to authenticated;
grant execute on function public.fn_apply_workout_rewards(uuid, uuid) to authenticated;

insert into public.loot_tables(code, name, is_active)
values ('workout_standard', 'Workout Standard Loot', true)
on conflict (code) do update
set name = excluded.name,
    is_active = excluded.is_active;

insert into public.loot_entries(loot_table_id, item_code, item_name, rarity, weight, min_qty, max_qty)
select lt.id, x.item_code, x.item_name, x.rarity, x.weight, x.min_qty, x.max_qty
from public.loot_tables lt
join (
  values
    ('protein_shard', 'Protein Shard', 'common', 55, 1, 3),
    ('focus_rune', 'Focus Rune', 'common', 30, 1, 2),
    ('discipline_token', 'Discipline Token', 'rare', 12, 1, 1),
    ('mythic_badge_fragment', 'Mythic Badge Fragment', 'epic', 5, 1, 1),
    ('sovereign_emblem', 'Sovereign Emblem', 'legendary', 1, 1, 1)
) as x(item_code, item_name, rarity, weight, min_qty, max_qty)
  on true
where lt.code = 'workout_standard'
  and not exists (
    select 1
    from public.loot_entries le
    where le.loot_table_id = lt.id
      and le.item_code = x.item_code
  );

insert into public.daily_quest_pool(code, title, description, goal_type, goal_value, xp_reward, is_active)
values
  ('dq_workout_1', 'Daily Iron', 'Complete one workout session.', 'workout_complete', 1, 90, true),
  ('dq_workout_2', 'Double Shift', 'Complete two sessions today.', 'workout_complete', 2, 180, true),
  ('dq_early_hunter', 'Early Hunter', 'Complete today''s first workout.', 'workout_complete', 1, 80, true),
  ('dq_consistency', 'Consistency Pulse', 'Log at least one quality workout.', 'workout_complete', 1, 100, true),
  ('dq_stamina', 'Stamina Check', 'Finish a workout and preserve streak.', 'workout_complete', 1, 95, true)
on conflict (code) do update
set title = excluded.title,
    description = excluded.description,
    goal_type = excluded.goal_type,
    goal_value = excluded.goal_value,
    xp_reward = excluded.xp_reward,
    is_active = excluded.is_active;

insert into public.weekly_challenges(code, title, description, week_start, week_end, target_points, reward_xp, is_active)
values (
  'weekly_foundation',
  'Foundation Week',
  'Accumulate 120 weekly points through consistent workouts.',
  date_trunc('week', now())::date,
  (date_trunc('week', now())::date + 6),
  120,
  500,
  true
)
on conflict (code) do update
set week_start = excluded.week_start,
    week_end = excluded.week_end,
    target_points = excluded.target_points,
    reward_xp = excluded.reward_xp,
    is_active = excluded.is_active;

insert into public.seasons(code, name, start_at, end_at, is_active)
values (
  'season_founders',
  'Founders Season',
  now() - interval '7 days',
  now() + interval '70 days',
  true
)
on conflict (code) do update
set name = excluded.name,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
    is_active = excluded.is_active;

insert into public.streak_shields(user_id, charges)
select u.id, 1
from public.users u
on conflict (user_id) do nothing;

insert into public.micro_quests(code, title, description, xp_reward, is_active)
values
  ('mq_walk_10', 'Micro Walk', 'Walk for 10 minutes to preserve momentum.', 35, true),
  ('mq_mobility_5', 'Mobility Pulse', 'Perform 5 minutes of mobility work.', 30, true),
  ('mq_plank_2', 'Core Anchor', 'Hold plank for 2 minutes total.', 40, true)
on conflict (code) do update
set title = excluded.title,
    description = excluded.description,
    xp_reward = excluded.xp_reward,
    is_active = excluded.is_active;

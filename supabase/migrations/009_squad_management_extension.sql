alter table public.squads
  add column if not exists description text;

alter table public.squads
  alter column max_members set default 10;

create table if not exists public.squad_invites (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.squads(id) on delete cascade,
  invited_by_user_id uuid not null references public.users(id) on delete cascade,
  invited_user_id uuid references public.users(id) on delete cascade,
  invite_code text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_squad_invites_squad_status on public.squad_invites(squad_id, status, created_at desc);
create index if not exists idx_squad_invites_invited_user on public.squad_invites(invited_user_id, status, created_at desc);
create index if not exists idx_squad_invites_code on public.squad_invites(invite_code);

alter table public.squad_invites enable row level security;

drop policy if exists "squad_invites_owner_manage" on public.squad_invites;
create policy "squad_invites_owner_manage" on public.squad_invites
for all using (
  exists (
    select 1
    from public.squads s
    where s.id = squad_invites.squad_id
      and s.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.squads s
    where s.id = squad_invites.squad_id
      and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "squad_invites_recipient_read" on public.squad_invites;
create policy "squad_invites_recipient_read" on public.squad_invites
for select using (invited_user_id = auth.uid());

drop policy if exists "squad_invites_recipient_update" on public.squad_invites;
create policy "squad_invites_recipient_update" on public.squad_invites
for update using (invited_user_id = auth.uid())
with check (invited_user_id = auth.uid());

drop policy if exists "squad_members_squad_read" on public.squad_members;
create policy "squad_members_squad_read" on public.squad_members
for select using (
  exists (
    select 1
    from public.squad_members sm
    where sm.squad_id = squad_members.squad_id
      and sm.user_id = auth.uid()
  )
);

drop policy if exists "users_squad_member_read" on public.users;
create policy "users_squad_member_read" on public.users
for select using (
  auth.uid() = id
  or exists (
    select 1
    from public.squad_members viewer
    join public.squad_members teammate on teammate.squad_id = viewer.squad_id
    where viewer.user_id = auth.uid()
      and teammate.user_id = users.id
  )
);

drop policy if exists "user_progress_squad_read" on public.user_progress;
create policy "user_progress_squad_read" on public.user_progress
for select using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.squad_members viewer
    join public.squad_members teammate on teammate.squad_id = viewer.squad_id
    where viewer.user_id = auth.uid()
      and teammate.user_id = user_progress.user_id
  )
);

drop policy if exists "user_weekly_progress_squad_read" on public.user_weekly_progress;
create policy "user_weekly_progress_squad_read" on public.user_weekly_progress
for select using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.squad_members viewer
    join public.squad_members teammate on teammate.squad_id = viewer.squad_id
    where viewer.user_id = auth.uid()
      and teammate.user_id = user_weekly_progress.user_id
  )
);

drop policy if exists "squad_members_owner_remove" on public.squad_members;
create policy "squad_members_owner_remove" on public.squad_members
for delete using (
  exists (
    select 1
    from public.squads s
    where s.id = squad_members.squad_id
      and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "squad_members_owner_update" on public.squad_members;
create policy "squad_members_owner_update" on public.squad_members
for update using (
  exists (
    select 1
    from public.squads s
    where s.id = squad_members.squad_id
      and s.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.squads s
    where s.id = squad_members.squad_id
      and s.owner_user_id = auth.uid()
  )
);

create or replace function public.fn_get_squad_leaderboard(p_limit int default 20)
returns table (
  squad_id uuid,
  squad_name text,
  member_count int,
  squad_world_score numeric,
  squad_weekly_challenge_points numeric
)
language sql
security definer
as $$
  with bounded_limit as (
    select greatest(1, least(coalesce(p_limit, 20), 100)) as lim
  ),
  current_week_points as (
    select
      uwp.user_id,
      coalesce(sum(uwp.points), 0)::numeric as points
    from public.user_weekly_progress uwp
    join public.weekly_challenges wc on wc.id = uwp.weekly_challenge_id
    where current_date between wc.week_start and wc.week_end
    group by uwp.user_id
  )
  select
    s.id as squad_id,
    s.name as squad_name,
    count(sm.user_id)::int as member_count,
    coalesce(round(avg(coalesce(up.level, 1)::numeric + (coalesce(up.momentum_score, 0)::numeric / 100)), 2), 0) as squad_world_score,
    coalesce(sum(cwp.points), 0)::numeric as squad_weekly_challenge_points
  from public.squads s
  left join public.squad_members sm on sm.squad_id = s.id
  left join public.user_progress up on up.user_id = sm.user_id
  left join current_week_points cwp on cwp.user_id = sm.user_id
  group by s.id, s.name, s.created_at
  order by squad_world_score desc, squad_weekly_challenge_points desc, member_count desc, s.created_at asc
  limit (select lim from bounded_limit);
$$;

grant execute on function public.fn_get_squad_leaderboard(int) to authenticated;

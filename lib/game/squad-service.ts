import type { User, SupabaseClient } from "@supabase/supabase-js";

export class SquadServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SquadServiceError";
    this.status = status;
  }
}

type Supabase = SupabaseClient<any, "public", any>;

type SquadRow = {
  id: string;
  name: string;
  description?: string | null;
  invite_code: string;
  owner_user_id: string;
  max_members: number;
  created_at: string;
};

type SquadMemberRow = {
  id: string;
  squad_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
};

export type SquadMemberView = {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  role: "owner" | "member";
  joinedAt: string;
  level: number;
  xpTotal: number;
  momentumScore: number;
  worldScore: number;
};

export type SquadOverview = {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  ownerUserId: string;
  maxMembers: number;
  memberCount: number;
  squadWorldScore: number;
  squadWeeklyChallengePoints: number;
  createdAt: string;
};

export type SquadMembersPayload = {
  squad: SquadOverview;
  members: SquadMemberView[];
  currentUserRole: "owner" | "member";
};

export type SquadLeaderboardEntry = {
  squadId: string;
  squadName: string;
  memberCount: number;
  squadWorldScore: number;
  squadWeeklyChallengePoints: number;
};

type SquadMemberQueryRow = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  users: { username?: string; display_name?: string | null } | { username?: string; display_name?: string | null }[] | null;
};

type UserProgressQueryRow = {
  user_id: string;
  level?: number;
  xp_total?: number;
  momentum_score?: number;
};

type WeeklyProgressQueryRow = {
  points?: number;
  weekly_challenges: { week_start?: string; week_end?: string } | { week_start?: string; week_end?: string }[] | null;
};

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function buildInviteCode(length = 8): string {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase();
}

async function ensureProfile(supabase: Supabase, user: User): Promise<void> {
  const fallbackUsername = user.email?.split("@")[0] || `hunter_${user.id.slice(0, 8)}`;
  const profilePayload = {
    id: user.id,
    username: (user.user_metadata?.username as string) || fallbackUsername,
    display_name: user.email
  };

  const { error } = await supabase.from("users").upsert(profilePayload, { onConflict: "id" });

  if (error) {
    throw new SquadServiceError(`Unable to initialize profile: ${error.message}`, 400);
  }
}

async function getCurrentMembership(
  supabase: Supabase,
  userId: string
): Promise<
  | {
      id: string;
      role: "owner" | "member";
      squad: SquadRow;
    }
  | null
> {
  const { data, error } = await supabase
    .from("squad_members")
    .select("id, role, squad_id, squads(id, name, description, invite_code, owner_user_id, max_members, created_at)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new SquadServiceError(error.message, 400);
  }

  if (!data) {
    return null;
  }

  const squad = asSingle(data.squads) as SquadRow | null;
  if (!squad) {
    return null;
  }

  return {
    id: data.id,
    role: (data.role as "owner" | "member") || "member",
    squad
  };
}

async function countSquadMembers(supabase: Supabase, squadId: string): Promise<number> {
  const { count, error } = await supabase
    .from("squad_members")
    .select("id", { count: "exact", head: true })
    .eq("squad_id", squadId);

  if (error) {
    throw new SquadServiceError(error.message, 400);
  }

  return count ?? 0;
}

async function insertInviteWithRetries(
  supabase: Supabase,
  payload: {
    squad_id: string;
    invited_by_user_id: string;
    invited_user_id?: string | null;
    expires_at?: string | null;
    status?: "pending" | "accepted" | "revoked" | "expired";
  }
): Promise<{ id: string; invite_code: string }> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = buildInviteCode();
    const { data, error } = await supabase
      .from("squad_invites")
      .insert({
        ...payload,
        invite_code: inviteCode,
        status: payload.status ?? "pending"
      })
      .select("id, invite_code")
      .single();

    if (!error && data) {
      return data;
    }

    const isUniqueConflict = error?.message.toLowerCase().includes("duplicate") || error?.message.toLowerCase().includes("unique");
    if (!isUniqueConflict) {
      throw new SquadServiceError(error?.message ?? "Unable to create invite", 400);
    }
  }

  throw new SquadServiceError("Unable to generate unique invite code", 500);
}

export async function createSquad(params: {
  supabase: Supabase;
  user: User;
  name: string;
  description?: string;
}): Promise<SquadOverview> {
  const { supabase, user } = params;
  const name = params.name.trim();
  const description = params.description?.trim() || null;

  if (name.length < 3 || name.length > 40) {
    throw new SquadServiceError("Squad name must be between 3 and 40 characters.", 400);
  }

  await ensureProfile(supabase, user);

  const existingMembership = await getCurrentMembership(supabase, user.id);
  if (existingMembership) {
    throw new SquadServiceError("You are already in a squad. Leave current squad before creating another.", 400);
  }

  let squad: SquadRow | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = buildInviteCode();

    const { data, error } = await supabase
      .from("squads")
      .insert({
        name,
        description,
        max_members: 10,
        invite_code: inviteCode,
        owner_user_id: user.id
      })
      .select("id, name, description, invite_code, owner_user_id, max_members, created_at")
      .single();

    if (!error && data) {
      squad = data as SquadRow;
      break;
    }

    const isUniqueConflict = error?.message.toLowerCase().includes("duplicate") || error?.message.toLowerCase().includes("unique");
    if (!isUniqueConflict) {
      throw new SquadServiceError(error?.message ?? "Unable to create squad", 400);
    }
  }

  if (!squad) {
    throw new SquadServiceError("Unable to create squad due to invite code collisions.", 500);
  }

  const { error: memberError } = await supabase.from("squad_members").insert({
    squad_id: squad.id,
    user_id: user.id,
    role: "owner"
  });

  if (memberError) {
    await supabase.from("squads").delete().eq("id", squad.id).eq("owner_user_id", user.id);
    throw new SquadServiceError(memberError.message, 400);
  }

  await supabase.from("squad_invites").upsert(
    {
      squad_id: squad.id,
      invited_by_user_id: user.id,
      invited_user_id: null,
      invite_code: squad.invite_code,
      status: "pending"
    },
    { onConflict: "invite_code" }
  );

  return {
    id: squad.id,
    name: squad.name,
    description: squad.description ?? null,
    inviteCode: squad.invite_code,
    ownerUserId: squad.owner_user_id,
    maxMembers: squad.max_members,
    memberCount: 1,
    squadWorldScore: 1,
    squadWeeklyChallengePoints: 0,
    createdAt: squad.created_at
  };
}

export async function joinSquad(params: {
  supabase: Supabase;
  user: User;
  inviteCode: string;
}): Promise<SquadOverview> {
  const { supabase, user } = params;
  const inviteCode = params.inviteCode.trim().toUpperCase();

  if (inviteCode.length < 4 || inviteCode.length > 16) {
    throw new SquadServiceError("Invite code format is invalid.", 400);
  }

  await ensureProfile(supabase, user);

  const existingMembership = await getCurrentMembership(supabase, user.id);
  if (existingMembership) {
    throw new SquadServiceError("You are already in a squad. Leave current squad before joining another.", 400);
  }

  const { data: inviteData, error: inviteLookupError } = await supabase
    .from("squad_invites")
    .select(
      "id, squad_id, invited_user_id, status, expires_at, squads(id, name, description, invite_code, owner_user_id, max_members, created_at)"
    )
    .eq("invite_code", inviteCode)
    .eq("status", "pending")
    .maybeSingle();

  if (inviteLookupError) {
    throw new SquadServiceError(inviteLookupError.message, 400);
  }

  let squad = asSingle(inviteData?.squads) as SquadRow | null;

  if (inviteData?.invited_user_id && inviteData.invited_user_id !== user.id) {
    throw new SquadServiceError("This invite is intended for another player.", 403);
  }

  if (inviteData?.expires_at && new Date(inviteData.expires_at).getTime() < Date.now()) {
    throw new SquadServiceError("This invite has expired.", 400);
  }

  if (!squad) {
    const { data: openSquad, error: openSquadError } = await supabase
      .from("squads")
      .select("id, name, description, invite_code, owner_user_id, max_members, created_at")
      .eq("invite_code", inviteCode)
      .single();

    if (openSquadError || !openSquad) {
      throw new SquadServiceError("Squad not found for this invite code.", 404);
    }

    squad = openSquad as SquadRow;
  }

  const memberCount = await countSquadMembers(supabase, squad.id);
  if (memberCount >= squad.max_members) {
    throw new SquadServiceError("Squad is full.", 400);
  }

  const { error: joinError } = await supabase.from("squad_members").insert({
    squad_id: squad.id,
    user_id: user.id,
    role: "member"
  });

  if (joinError) {
    throw new SquadServiceError(joinError.message, 400);
  }

  if (inviteData?.id) {
    await supabase
      .from("squad_invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString()
      })
      .eq("id", inviteData.id);
  }

  return {
    id: squad.id,
    name: squad.name,
    description: squad.description ?? null,
    inviteCode: squad.invite_code,
    ownerUserId: squad.owner_user_id,
    maxMembers: squad.max_members,
    memberCount: memberCount + 1,
    squadWorldScore: 0,
    squadWeeklyChallengePoints: 0,
    createdAt: squad.created_at
  };
}

export async function leaveSquad(params: {
  supabase: Supabase;
  userId: string;
}): Promise<{ disbanded: boolean; transferredToUserId: string | null }> {
  const { supabase, userId } = params;

  const membership = await getCurrentMembership(supabase, userId);
  if (!membership) {
    throw new SquadServiceError("You are not in a squad.", 404);
  }

  const squadId = membership.squad.id;

  if (membership.role === "owner") {
    const { data: nextMemberRows, error: nextMemberError } = await supabase
      .from("squad_members")
      .select("id, user_id")
      .eq("squad_id", squadId)
      .neq("user_id", userId)
      .order("joined_at", { ascending: true })
      .limit(1);

    if (nextMemberError) {
      throw new SquadServiceError(nextMemberError.message, 400);
    }

    const nextMember = nextMemberRows?.[0] as { id: string; user_id: string } | undefined;

    if (!nextMember) {
      const { error: deleteSquadError } = await supabase.from("squads").delete().eq("id", squadId).eq("owner_user_id", userId);
      if (deleteSquadError) {
        throw new SquadServiceError(deleteSquadError.message, 400);
      }

      return { disbanded: true, transferredToUserId: null };
    }

    const { error: promoteError } = await supabase.from("squad_members").update({ role: "owner" }).eq("id", nextMember.id);
    if (promoteError) {
      throw new SquadServiceError(promoteError.message, 400);
    }

    const { error: transferError } = await supabase
      .from("squads")
      .update({ owner_user_id: nextMember.user_id })
      .eq("id", squadId)
      .eq("owner_user_id", userId);

    if (transferError) {
      throw new SquadServiceError(transferError.message, 400);
    }

    const { error: leaveError } = await supabase.from("squad_members").delete().eq("id", membership.id).eq("user_id", userId);
    if (leaveError) {
      throw new SquadServiceError(leaveError.message, 400);
    }

    return { disbanded: false, transferredToUserId: nextMember.user_id };
  }

  const { error: leaveError } = await supabase.from("squad_members").delete().eq("id", membership.id).eq("user_id", userId);

  if (leaveError) {
    throw new SquadServiceError(leaveError.message, 400);
  }

  return { disbanded: false, transferredToUserId: null };
}

export async function invitePlayer(params: {
  supabase: Supabase;
  userId: string;
  username: string;
}): Promise<{ inviteId: string; inviteCode: string; invitedUserId: string }> {
  const { supabase, userId } = params;
  const username = params.username.trim();

  if (username.length < 2) {
    throw new SquadServiceError("Username is too short.", 400);
  }

  const membership = await getCurrentMembership(supabase, userId);
  if (!membership) {
    throw new SquadServiceError("You are not in a squad.", 404);
  }

  if (membership.squad.owner_user_id !== userId) {
    throw new SquadServiceError("Only squad owners can invite players.", 403);
  }

  const { data: invitedUser, error: invitedUserError } = await supabase
    .from("users")
    .select("id, username")
    .ilike("username", username)
    .limit(1)
    .maybeSingle();

  if (invitedUserError) {
    throw new SquadServiceError(invitedUserError.message, 400);
  }

  if (!invitedUser) {
    throw new SquadServiceError("Player not found.", 404);
  }

  if (invitedUser.id === userId) {
    throw new SquadServiceError("You cannot invite yourself.", 400);
  }

  const { data: alreadyMemberRows, error: alreadyMemberError } = await supabase
    .from("squad_members")
    .select("id")
    .eq("squad_id", membership.squad.id)
    .eq("user_id", invitedUser.id)
    .limit(1);

  if (alreadyMemberError) {
    throw new SquadServiceError(alreadyMemberError.message, 400);
  }

  if ((alreadyMemberRows ?? []).length > 0) {
    throw new SquadServiceError("This player is already in your squad.", 400);
  }

  const invite = await insertInviteWithRetries(supabase, {
    squad_id: membership.squad.id,
    invited_by_user_id: userId,
    invited_user_id: invitedUser.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending"
  });

  return {
    inviteId: invite.id,
    inviteCode: invite.invite_code,
    invitedUserId: invitedUser.id
  };
}

export async function removePlayer(params: {
  supabase: Supabase;
  ownerUserId: string;
  targetUserId: string;
}): Promise<void> {
  const { supabase, ownerUserId, targetUserId } = params;

  if (ownerUserId === targetUserId) {
    throw new SquadServiceError("Use leave squad to leave as owner.", 400);
  }

  const membership = await getCurrentMembership(supabase, ownerUserId);
  if (!membership) {
    throw new SquadServiceError("You are not in a squad.", 404);
  }

  if (membership.squad.owner_user_id !== ownerUserId) {
    throw new SquadServiceError("Only squad owners can remove members.", 403);
  }

  const { data: targetMembershipRows, error: targetMembershipError } = await supabase
    .from("squad_members")
    .select("id")
    .eq("squad_id", membership.squad.id)
    .eq("user_id", targetUserId)
    .limit(1);

  if (targetMembershipError) {
    throw new SquadServiceError(targetMembershipError.message, 400);
  }

  const targetMembership = targetMembershipRows?.[0] as { id: string } | undefined;
  if (!targetMembership) {
    throw new SquadServiceError("Member not found in your squad.", 404);
  }

  const { error: deleteError } = await supabase.from("squad_members").delete().eq("id", targetMembership.id);
  if (deleteError) {
    throw new SquadServiceError(deleteError.message, 400);
  }
}

export async function getSquadMembers(params: {
  supabase: Supabase;
  userId: string;
}): Promise<SquadMembersPayload | null> {
  const { supabase, userId } = params;

  const membership = await getCurrentMembership(supabase, userId);
  if (!membership) {
    return null;
  }

  const { data: memberRows, error: memberRowsError } = await supabase
    .from("squad_members")
    .select("id, user_id, role, joined_at, users(username, display_name)")
    .eq("squad_id", membership.squad.id)
    .order("joined_at", { ascending: true });

  if (memberRowsError) {
    throw new SquadServiceError(memberRowsError.message, 400);
  }

  const typedMemberRows = (memberRows ?? []) as SquadMemberQueryRow[];
  const memberIds = typedMemberRows.map((row) => row.user_id);

  const { data: progressRows, error: progressRowsError } = await supabase
    .from("user_progress")
    .select("user_id, level, xp_total, momentum_score")
    .in("user_id", memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"]);

  if (progressRowsError) {
    throw new SquadServiceError(progressRowsError.message, 400);
  }

  const progressByUserId = new Map<string, UserProgressQueryRow>();
  for (const row of (progressRows ?? []) as UserProgressQueryRow[]) {
    progressByUserId.set(row.user_id, row);
  }

  const members: SquadMemberView[] = typedMemberRows.map((row) => {
    const user = asSingle(row.users) as { username?: string; display_name?: string | null } | null;
    const progress = progressByUserId.get(row.user_id) ?? null;
    const level = Number(progress?.level ?? 1);
    const xpTotal = Number(progress?.xp_total ?? 0);
    const momentumScore = Number(progress?.momentum_score ?? 0);
    const worldScore = roundTo(level + momentumScore / 100, 2);

    return {
      id: row.id,
      userId: row.user_id,
      username: user?.username ?? "Hunter",
      displayName: user?.display_name ?? null,
      role: (row.role as "owner" | "member") || "member",
      joinedAt: row.joined_at,
      level,
      xpTotal,
      momentumScore,
      worldScore
    };
  });

  const memberCount = members.length;
  const squadWorldScore = memberCount > 0 ? roundTo(members.reduce((sum, row) => sum + row.worldScore, 0) / memberCount) : 0;

  const squadMemberUserIds = members.map((row) => row.userId);
  let squadWeeklyChallengePoints = 0;

  if (squadMemberUserIds.length > 0) {
    const { data: weeklyRows, error: weeklyRowsError } = await supabase
      .from("user_weekly_progress")
      .select("points, weekly_challenges(week_start, week_end)")
      .in("user_id", squadMemberUserIds);

    if (weeklyRowsError) {
      throw new SquadServiceError(weeklyRowsError.message, 400);
    }

    const today = new Date().toISOString().slice(0, 10);
    const typedWeeklyRows = (weeklyRows ?? []) as WeeklyProgressQueryRow[];
    squadWeeklyChallengePoints = typedWeeklyRows.reduce((sum: number, row: WeeklyProgressQueryRow) => {
      const challenge = asSingle(row.weekly_challenges) as { week_start?: string; week_end?: string } | null;
      const isCurrentWeek = !!challenge?.week_start && !!challenge?.week_end && today >= challenge.week_start && today <= challenge.week_end;
      return isCurrentWeek ? sum + Number(row.points ?? 0) : sum;
    }, 0);
  }

  return {
    squad: {
      id: membership.squad.id,
      name: membership.squad.name,
      description: membership.squad.description ?? null,
      inviteCode: membership.squad.invite_code,
      ownerUserId: membership.squad.owner_user_id,
      maxMembers: membership.squad.max_members,
      memberCount,
      squadWorldScore,
      squadWeeklyChallengePoints,
      createdAt: membership.squad.created_at
    },
    members,
    currentUserRole: membership.role
  };
}

export async function getSquadLeaderboard(params: {
  supabase: Supabase;
  limit?: number;
}): Promise<SquadLeaderboardEntry[]> {
  const limit = Math.max(1, Math.min(params.limit ?? 20, 100));

  const { data, error } = await params.supabase.rpc("fn_get_squad_leaderboard", {
    p_limit: limit
  });

  if (error) {
    throw new SquadServiceError(error.message, 400);
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    squadId: String(row.squad_id),
    squadName: String(row.squad_name ?? "Squad"),
    memberCount: Number(row.member_count ?? 0),
    squadWorldScore: Number(row.squad_world_score ?? 0),
    squadWeeklyChallengePoints: Number(row.squad_weekly_challenge_points ?? 0)
  }));
}

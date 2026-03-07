import { NextResponse } from "next/server";
import { z } from "zod";
import { buildBodyPowerAnalysis } from "@/lib/game/body-power";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServer } from "@/lib/supabase/server";

const payloadSchema = z.object({
  username: z.string().trim().min(2).max(40)
});

type MuscleRow = {
  muscle_group: string;
  xp_total: number | null;
  level: number | null;
};

function normalizeMuscles(rows: MuscleRow[]) {
  return rows.map((row) => ({
    muscle_group: row.muscle_group,
    xp_total: Number(row.xp_total ?? 0),
    level: Number(row.level ?? 0)
  }));
}

export async function POST(request: Request) {
  const parsedPayload = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsedPayload.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = await createServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestedUsername = parsedPayload.data.username;

  const { data: playerRows, error: playerRowsError } = await supabase
    .from("muscle_stats")
    .select("muscle_group, xp_total, level")
    .eq("user_id", user.id);

  if (playerRowsError) {
    return NextResponse.json({ error: playerRowsError.message }, { status: 500 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Admin client unavailable" }, { status: 500 });
  }

  const { data: friendUser, error: friendLookupError } = await admin
    .from("users")
    .select("id, username, display_name")
    .ilike("username", requestedUsername)
    .limit(1)
    .maybeSingle();

  if (friendLookupError) {
    return NextResponse.json({ error: friendLookupError.message }, { status: 500 });
  }

  if (!friendUser) {
    return NextResponse.json({ error: "Friend not found" }, { status: 404 });
  }

  if (friendUser.id === user.id) {
    return NextResponse.json({ error: "Choose another player to compare with" }, { status: 400 });
  }

  const { data: friendRows, error: friendRowsError } = await admin
    .from("muscle_stats")
    .select("muscle_group, xp_total, level")
    .eq("user_id", friendUser.id);

  if (friendRowsError) {
    return NextResponse.json({ error: friendRowsError.message }, { status: 500 });
  }

  const playerAnalysis = buildBodyPowerAnalysis(normalizeMuscles((playerRows ?? []) as MuscleRow[]));
  const friendAnalysis = buildBodyPowerAnalysis(normalizeMuscles((friendRows ?? []) as MuscleRow[]));

  return NextResponse.json({
    ok: true,
    player: {
      username: "Player",
      analysis: playerAnalysis
    },
    friend: {
      username: friendUser.username,
      displayName: friendUser.display_name,
      analysis: friendAnalysis
    }
  });
}

import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";
import { buildBodyPowerAnalysis } from "@/lib/game/body-power";

export async function GET() {
  const supabase = await createServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: muscles, error } = await supabase
    .from("muscle_stats")
    .select("muscle_group, xp_total, level")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const analysis = buildBodyPowerAnalysis((muscles ?? []).map((row) => ({
    muscle_group: row.muscle_group,
    xp_total: Number(row.xp_total ?? 0),
    level: Number(row.level ?? 0)
  })));

  return NextResponse.json({ ok: true, analysis });
}

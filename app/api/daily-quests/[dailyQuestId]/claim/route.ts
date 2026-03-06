import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ dailyQuestId: string }> }
) {
  const { dailyQuestId } = await params;
  const supabase = await createServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("fn_claim_daily_quest", {
    p_user_id: user.id,
    p_daily_quest_id: dailyQuestId
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data });
}

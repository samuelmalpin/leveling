import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ questProgressId: string }> }
) {
  const { questProgressId } = await params;
  const supabase = await createServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase.rpc("fn_claim_quest", {
      p_user_id: user.id,
      p_quest_progress_id: questProgressId
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error while claiming quest";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

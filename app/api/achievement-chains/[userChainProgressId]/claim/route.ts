import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ userChainProgressId: string }> }
) {
  const { userChainProgressId } = await params;
  const supabase = await createServer();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("fn_claim_achievement_chain", {
    p_user_id: user.id,
    p_user_chain_progress_id: userChainProgressId
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, ...(data as object) });
}

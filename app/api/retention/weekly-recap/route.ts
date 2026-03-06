import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("fn_get_weekly_recap", {
    p_user_id: user.id
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, recap: data });
}

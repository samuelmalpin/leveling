import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MUSCLE_GROUPS } from "@/lib/constants";

export async function POST() {
  const supabase = await createServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  await admin.from("users").upsert({
    id: user.id,
    username: (user.user_metadata?.username as string) || user.email?.split("@")[0] || "hunter",
    display_name: user.email
  });

  await admin.from("user_progress").upsert({ user_id: user.id });

  await admin.from("muscle_stats").upsert(
    MUSCLE_GROUPS.map((group) => ({
      user_id: user.id,
      muscle_group: group
    }))
  );

  await admin.rpc("fn_grant_initial_content", { p_user_id: user.id });

  return NextResponse.json({ ok: true });
}

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

  const { error: userUpsertError } = await admin.from("users").upsert(
    {
      id: user.id,
      username: (user.user_metadata?.username as string) || user.email?.split("@")[0] || `hunter_${user.id.slice(0, 8)}`,
      display_name: user.email
    },
    { onConflict: "id" }
  );

  if (userUpsertError) {
    return NextResponse.json({ error: userUpsertError.message }, { status: 500 });
  }

  const { error: progressUpsertError } = await admin
    .from("user_progress")
    .upsert({ user_id: user.id }, { onConflict: "user_id" });

  if (progressUpsertError) {
    return NextResponse.json({ error: progressUpsertError.message }, { status: 500 });
  }

  const { error: musclesUpsertError } = await admin.from("muscle_stats").upsert(
    MUSCLE_GROUPS.map((group) => ({
      user_id: user.id,
      muscle_group: group
    })),
    { onConflict: "user_id,muscle_group" }
  );

  if (musclesUpsertError) {
    return NextResponse.json({ error: musclesUpsertError.message }, { status: 500 });
  }

  const { error: initialContentError } = await admin.rpc("fn_grant_initial_content", { p_user_id: user.id });

  if (initialContentError) {
    return NextResponse.json({ error: initialContentError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

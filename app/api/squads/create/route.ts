import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServer } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(3).max(40)
});

function buildInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(request: Request) {
  const supabase = await createServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { error: profileError } = await supabase.from("users").upsert(
    {
      id: user.id,
      username: (user.user_metadata?.username as string) || user.email?.split("@")[0] || `hunter_${user.id.slice(0, 8)}`,
      display_name: user.email
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return NextResponse.json({ error: `Unable to initialize profile: ${profileError.message}` }, { status: 400 });
  }

  const { data: squad, error: squadError } = await supabase
    .from("squads")
    .insert({
      name: parsed.data.name,
      invite_code: buildInviteCode(),
      owner_user_id: user.id
    })
    .select("id, name, invite_code")
    .single();

  if (squadError || !squad) {
    return NextResponse.json({ error: squadError?.message ?? "Failed to create squad" }, { status: 400 });
  }

  const { error: memberError } = await supabase.from("squad_members").insert({
    squad_id: squad.id,
    user_id: user.id,
    role: "owner"
  });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, squad });
}

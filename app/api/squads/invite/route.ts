import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServer } from "@/lib/supabase/server";
import { invitePlayer, SquadServiceError } from "@/lib/game/squad-service";

const schema = z.object({
  username: z.string().min(2).max(40)
});

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

  try {
    const invite = await invitePlayer({
      supabase,
      userId: user.id,
      username: parsed.data.username
    });

    return NextResponse.json({ ok: true, invite });
  } catch (error) {
    if (error instanceof SquadServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unable to create invite" }, { status: 500 });
  }
}

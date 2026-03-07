import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServer } from "@/lib/supabase/server";
import { removePlayer, SquadServiceError } from "@/lib/game/squad-service";

const schema = z.object({
  userId: z.string().uuid()
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
    await removePlayer({
      supabase,
      ownerUserId: user.id,
      targetUserId: parsed.data.userId
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SquadServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unable to remove player" }, { status: 500 });
  }
}

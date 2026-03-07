import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServer } from "@/lib/supabase/server";
import { createSquad, SquadServiceError } from "@/lib/game/squad-service";

const schema = z.object({
  name: z.string().min(3).max(40),
  description: z.string().max(280).optional()
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
    const squad = await createSquad({
      supabase,
      user,
      name: parsed.data.name,
      description: parsed.data.description
    });

    return NextResponse.json({ ok: true, squad });
  } catch (error) {
    if (error instanceof SquadServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to create squad" }, { status: 500 });
  }
}

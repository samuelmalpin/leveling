import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";
import { leaveSquad, SquadServiceError } from "@/lib/game/squad-service";

export async function POST() {
  const supabase = await createServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await leaveSquad({
      supabase,
      userId: user.id
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof SquadServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unable to leave squad" }, { status: 500 });
  }
}

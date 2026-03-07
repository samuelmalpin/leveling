import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";
import { getSquadMembers, SquadServiceError } from "@/lib/game/squad-service";

export async function GET() {
  const supabase = await createServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await getSquadMembers({
      supabase,
      userId: user.id
    });

    return NextResponse.json({ ok: true, squad: payload });
  } catch (error) {
    if (error instanceof SquadServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unable to load squad members" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";
import { getSquadLeaderboard, SquadServiceError } from "@/lib/game/squad-service";

export async function GET(request: Request) {
  const supabase = await createServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedLimit = Number(searchParams.get("limit") ?? 20);

  try {
    const rows = await getSquadLeaderboard({
      supabase,
      limit: Number.isFinite(requestedLimit) ? requestedLimit : 20
    });

    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    if (error instanceof SquadServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unable to load squad leaderboard" }, { status: 500 });
  }
}

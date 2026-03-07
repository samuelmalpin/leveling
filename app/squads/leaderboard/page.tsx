import { requireUser } from "@/lib/auth/require-user";
import { getSquadLeaderboard } from "@/lib/game/squad-service";
import { SquadLeaderboardTable } from "@/components/features/squad-leaderboard-table";

export default async function SquadLeaderboardPage() {
  const { supabase } = await requireUser();
  const rows = await getSquadLeaderboard({ supabase, limit: 25 });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Squad Leaderboard</h2>
      <p className="text-sm text-mutedForeground">Ranking by squad world score and weekly challenge contribution.</p>
      <SquadLeaderboardTable rows={rows} />
    </div>
  );
}

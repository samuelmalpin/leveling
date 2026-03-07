import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type SquadLeaderboardEntry } from "@/lib/game/squad-service";

export function SquadLeaderboardTable({ rows }: { rows: SquadLeaderboardEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Squad Leaderboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? <p className="text-sm text-mutedForeground">No squad ranking data available.</p> : null}

        {rows.map((row, index) => (
          <div key={row.squadId} className="flex items-center justify-between rounded-md border border-border/70 p-3 text-sm">
            <div>
              <p className="font-medium">#{index + 1} {row.squadName}</p>
              <p className="text-xs text-mutedForeground">
                Members: {row.memberCount} · Weekly Points: {row.squadWeeklyChallengePoints}
              </p>
            </div>
            <p className="text-xs text-mutedForeground">World Score {row.squadWorldScore.toFixed(2)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

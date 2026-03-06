import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LeaderboardRow = {
  user_id: string;
  xp_total: number;
  level: number;
  users: { username: string } | { username: string }[] | null;
};

export function LeaderboardTable({ rows, me }: { rows: LeaderboardRow[]; me?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Power Ladder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-mutedForeground">No ranking data yet.</p>
        ) : (
          rows.map((row, index) => {
            const user = Array.isArray(row.users) ? row.users[0] : row.users;
            const isMe = me === row.user_id;

            return (
              <div
                key={row.user_id}
                className={`flex items-center justify-between rounded-md border p-3 text-sm ${isMe ? "border-primary" : "border-border"}`}
              >
                <div>
                  <p className="font-medium">#{index + 1} {user?.username ?? "Hunter"}</p>
                  <p className="text-xs text-mutedForeground">Level {row.level}</p>
                </div>
                <p className="text-xs text-mutedForeground">{row.xp_total} XP</p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

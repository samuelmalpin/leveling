"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type WeeklyChallengeRow = {
  id: string;
  points: number;
  status: "active" | "completed" | "claimed";
  weekly_challenges:
    | {
        title: string;
        target_points: number;
        reward_xp: number;
        week_end: string;
      }
    | {
        title: string;
        target_points: number;
        reward_xp: number;
        week_end: string;
      }[]
    | null;
};

export function WeeklyChallenges({ initialRows }: { initialRows: WeeklyChallengeRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const formatDate = (value: string | undefined) => {
    if (!value) return "-";
    return value.includes("T") ? value.slice(0, 10) : value;
  };

  const claim = async (id: string) => {
    setClaimingId(id);
    const response = await fetch(`/api/weekly-challenges/${id}/claim`, { method: "POST" });

    if (response.ok) {
      setRows((prev: WeeklyChallengeRow[]) =>
        prev.map((r: WeeklyChallengeRow) => (r.id === id ? { ...r, status: "claimed" } : r))
      );
    }

    setClaimingId(null);
  };

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-mutedForeground">No weekly challenge assigned yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row: WeeklyChallengeRow) => {
        const challenge = Array.isArray(row.weekly_challenges) ? row.weekly_challenges[0] : row.weekly_challenges;
        const target = challenge?.target_points ?? 1;
        const pct = Math.min((row.points / target) * 100, 100);

        return (
          <Card key={row.id}>
            <CardHeader>
              <CardTitle>{challenge?.title ?? "Weekly Challenge"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={pct} />
              <p className="text-xs text-mutedForeground">
                {row.points}/{target} points • Reward: {challenge?.reward_xp ?? 0} XP
              </p>
              <p className="text-xs text-mutedForeground">Ends: {formatDate(challenge?.week_end)}</p>
              {row.status === "completed" ? (
                <Button size="sm" onClick={() => claim(row.id)} disabled={claimingId === row.id}>
                  {claimingId === row.id ? "Claiming..." : "Claim Weekly Reward"}
                </Button>
              ) : (
                <p className="text-xs uppercase text-mutedForeground">{row.status}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

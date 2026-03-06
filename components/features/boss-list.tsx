"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BossRow = {
  id: string;
  status: string;
  attempt_count: number;
  best_score: number | null;
  bosses: { name: string; description: string; reward_xp: number; difficulty: number } | null;
};

export function BossList({ initialBosses }: { initialBosses: BossRow[] }) {
  const [rows, setRows] = useState(initialBosses);

  const attemptBoss = async (id: string) => {
    const response = await fetch(`/api/bosses/${id}/attempt`, { method: "POST" });
    if (response.ok) {
      const payload = (await response.json()) as { score: number; defeated: boolean };
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                attempt_count: r.attempt_count + 1,
                best_score: Math.max(r.best_score ?? 0, payload.score),
                status: payload.defeated ? "defeated" : "attempted"
              }
            : r
        )
      );
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((row) => (
        <Card key={row.id}>
          <CardHeader>
            <CardTitle>{row.bosses?.name ?? "Boss"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-mutedForeground">{row.bosses?.description}</p>
            <p>Status: {row.status}</p>
            <p>Attempts: {row.attempt_count}</p>
            <p>Best Score: {row.best_score ?? 0}</p>
            <p>Reward: {row.bosses?.reward_xp ?? 0} XP</p>
            <Button size="sm" onClick={() => attemptBoss(row.id)} disabled={row.status === "locked" || row.status === "defeated"}>
              {row.status === "defeated" ? "Defeated" : "Attempt"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

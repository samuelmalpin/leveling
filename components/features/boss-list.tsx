"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BossRow = {
  id: string;
  status: string;
  attempt_count: number;
  best_score: number | null;
  progress_meter: number;
  bosses: { id: string; name: string; description: string; reward_xp: number; difficulty: number } | null;
};

export function BossList({
  initialBosses,
  weeklyModifiers
}: {
  initialBosses: BossRow[];
  weeklyModifiers: Record<string, { modifier_name: string; modifier_description: string | null }>;
}) {
  const [rows, setRows] = useState(initialBosses);
  const [error, setError] = useState<string | null>(null);

  const attemptBoss = async (id: string) => {
    setError(null);
    const response = await fetch(`/api/bosses/${id}/attempt`, { method: "POST" });
    if (response.ok) {
      const payload = (await response.json()) as { score: number; defeated: boolean; progressMeter: number };
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                attempt_count: r.attempt_count + 1,
                best_score: Math.max(r.best_score ?? 0, payload.score),
                progress_meter: payload.progressMeter,
                status: payload.defeated ? "defeated" : "attempted"
              }
            : r
        )
      );
      return;
    }

    const payload = (await response.json().catch(() => ({ error: "Boss attempt failed" }))) as { error?: string };
    setError(payload.error ?? "Boss attempt failed");
  };

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((row) => {
          const modifier = row.bosses ? weeklyModifiers[row.bosses.id] : undefined;

          return (
            <Card key={row.id}>
              <CardHeader>
                <CardTitle>{row.bosses?.name ?? "Boss"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-mutedForeground">{row.bosses?.description}</p>
                {modifier ? (
                  <div className="rounded-md border border-border p-2 text-xs text-mutedForeground">
                    Weekly Modifier: <span className="font-medium text-foreground">{modifier.modifier_name}</span>
                    {modifier.modifier_description ? ` - ${modifier.modifier_description}` : ""}
                  </div>
                ) : null}
                <p>Status: {row.status}</p>
                <p>Attempts: {row.attempt_count}</p>
                <p>Best Score: {row.best_score ?? 0}</p>
                <p>Boss Meter: {row.progress_meter.toFixed(1)}%</p>
                <p>Reward: {row.bosses?.reward_xp ?? 0} XP</p>
                <Button size="sm" onClick={() => attemptBoss(row.id)} disabled={row.status === "locked" || row.status === "defeated"}>
                  {row.status === "defeated" ? "Defeated" : "Attempt"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

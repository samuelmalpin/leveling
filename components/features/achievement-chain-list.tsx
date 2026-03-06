"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ChainRow = {
  id: string;
  progress_value: number;
  status: "active" | "completed" | "claimed";
  achievement_chains:
    | {
        name: string;
        description: string | null;
        milestone_target: number;
        xp_reward: number;
      }
    | {
        name: string;
        description: string | null;
        milestone_target: number;
        xp_reward: number;
      }[]
    | null;
};

export function AchievementChainList({ initialRows }: { initialRows: ChainRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const claim = async (id: string) => {
    setClaimingId(id);
    setError(null);

    const response = await fetch(`/api/achievement-chains/${id}/claim`, { method: "POST" });

    if (response.ok) {
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status: "claimed" } : row)));
      router.refresh();
      setClaimingId(null);
      return;
    }

    const payload = (await response.json().catch(() => ({ error: "Chain claim failed" }))) as { error?: string };
    setError(payload.error ?? "Chain claim failed");
    setClaimingId(null);
  };

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {rows.map((row) => {
        const chain = Array.isArray(row.achievement_chains) ? row.achievement_chains[0] : row.achievement_chains;
        const target = chain?.milestone_target ?? 1;
        const pct = Math.min(100, (row.progress_value / target) * 100);

        return (
          <div key={row.id} className="rounded-md border border-border p-3 text-sm">
            <p className="font-medium">{chain?.name ?? "Chain"}</p>
            {chain?.description ? <p className="mt-1 text-xs text-mutedForeground">{chain.description}</p> : null}
            <p className="mt-1 text-xs text-mutedForeground">
              Progress: {row.progress_value}/{target} ({pct.toFixed(0)}%)
            </p>
            <p className="mt-1 text-xs text-mutedForeground">Reward: {chain?.xp_reward ?? 0} XP</p>
            {row.status === "completed" ? (
              <Button className="mt-2" size="sm" onClick={() => claim(row.id)} disabled={claimingId === row.id}>
                {claimingId === row.id ? "Claiming..." : "Claim Chain Reward"}
              </Button>
            ) : (
              <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-mutedForeground">{row.status}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

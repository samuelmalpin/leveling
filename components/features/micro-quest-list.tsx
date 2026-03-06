"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type MicroQuestRow = {
  id: string;
  status: "active" | "completed" | "claimed" | "expired";
  micro_quests:
    | {
        title: string;
        description: string | null;
        xp_reward: number;
      }
    | {
        title: string;
        description: string | null;
        xp_reward: number;
      }[]
    | null;
};

export function MicroQuestList({ initialRows }: { initialRows: MicroQuestRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const claim = async (id: string) => {
    setClaimingId(id);
    setError(null);

    const response = await fetch(`/api/micro-quests/${id}/claim`, { method: "POST" });
    if (response.ok) {
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status: "claimed" } : row)));
      router.refresh();
      setClaimingId(null);
      return;
    }

    const payload = (await response.json().catch(() => ({ error: "Micro quest claim failed" }))) as { error?: string };
    setError(payload.error ?? "Micro quest claim failed");
    setClaimingId(null);
  };

  if (rows.length === 0) {
    return <p className="text-sm text-mutedForeground">No micro quest assigned yet. Log a workout to trigger your first one.</p>;
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {rows.map((row) => {
        const quest = Array.isArray(row.micro_quests) ? row.micro_quests[0] : row.micro_quests;

        return (
          <div key={row.id} className="rounded-md border border-border p-3 text-sm">
            <p className="font-medium">{quest?.title ?? "Micro Quest"}</p>
            {quest?.description ? <p className="mt-1 text-xs text-mutedForeground">{quest.description}</p> : null}
            <p className="mt-1 text-xs text-mutedForeground">Reward: {quest?.xp_reward ?? 0} XP</p>
            {row.status === "completed" ? (
              <Button className="mt-2" size="sm" onClick={() => claim(row.id)} disabled={claimingId === row.id}>
                {claimingId === row.id ? "Claiming..." : "Claim"}
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

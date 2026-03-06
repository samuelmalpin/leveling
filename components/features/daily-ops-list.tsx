"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type DailyOp = {
  id: string;
  status: "active" | "completed" | "claimed" | "expired";
  progress_value: number;
  daily_quest_pool: { title: string; goal_value: number; xp_reward: number } | { title: string; goal_value: number; xp_reward: number }[] | null;
};

export function DailyOpsList({ initialOps }: { initialOps: DailyOp[] }) {
  const [ops, setOps] = useState(initialOps);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const router = useRouter();

  const claim = async (id: string) => {
    setClaimingId(id);
    const response = await fetch(`/api/daily-quests/${id}/claim`, { method: "POST" });

    if (response.ok) {
      setOps((prev) => prev.map((q) => (q.id === id ? { ...q, status: "claimed" } : q)));
      router.refresh();
    }

    setClaimingId(null);
  };

  if (ops.length === 0) {
    return (
      <p className="text-sm text-mutedForeground">
        No daily quests assigned yet. Complete a workout to initialize daily operations.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {ops.map((q) => {
        const quest = Array.isArray(q.daily_quest_pool) ? q.daily_quest_pool[0] : q.daily_quest_pool;

        return (
          <div key={q.id} className="rounded-md border border-border p-3 text-sm">
            <p>{quest?.title ?? "Daily Quest"}</p>
            <p className="mt-1 text-xs text-mutedForeground">
              {q.progress_value}/{quest?.goal_value ?? 1} • Reward: {quest?.xp_reward ?? 0} XP
            </p>
            {q.status === "completed" ? (
              <Button className="mt-2" type="button" size="sm" onClick={() => claim(q.id)} disabled={claimingId === q.id}>
                {claimingId === q.id ? "Claiming..." : "Claim"}
              </Button>
            ) : (
              <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-mutedForeground">{q.status}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

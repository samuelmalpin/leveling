"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type QuestRow = {
  id: string;
  progress_value: number;
  completed_at: string | null;
  claimed_at: string | null;
  status: string;
  quests: { name: string; description: string; goal_value: number; xp_reward: number } | null;
};

export function QuestList({ initialQuests }: { initialQuests: QuestRow[] }) {
  const [quests, setQuests] = useState(initialQuests);

  const claim = async (id: string) => {
    const response = await fetch(`/api/quests/${id}/claim`, { method: "POST" });
    if (response.ok) {
      setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, status: "claimed", claimed_at: new Date().toISOString() } : q)));
    }
  };

  return (
    <div className="space-y-4">
      {quests.map((item) => {
        const quest = item.quests;
        const goal = quest?.goal_value ?? 1;
        const pct = Math.min((item.progress_value / goal) * 100, 100);

        return (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle>{quest?.name ?? "Quest"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-mutedForeground">{quest?.description}</p>
              <Progress value={pct} />
              <p className="text-xs text-mutedForeground">
                {item.progress_value}/{goal} - Reward: {quest?.xp_reward ?? 0} XP
              </p>
              {item.status === "completed" && !item.claimed_at ? (
                <Button size="sm" onClick={() => claim(item.id)}>
                  Claim Reward
                </Button>
              ) : (
                <p className="text-xs text-mutedForeground uppercase">{item.status}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import { BodyPowerDiagram } from "@/components/features/body-power-diagram";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type BodyPowerAnalysis } from "@/lib/game/body-power";

type FriendComparisonPayload = {
  ok?: boolean;
  error?: string;
  friend?: {
    username: string;
    displayName: string | null;
    analysis: BodyPowerAnalysis;
  };
};

export function BodyPowerComparison({ playerAnalysis }: { playerAnalysis: BodyPowerAnalysis }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [friendAnalysis, setFriendAnalysis] = useState<FriendComparisonPayload["friend"] | null>(null);

  const compare = async () => {
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/body-power/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });

    const payload = (await response.json().catch(() => ({ error: "Compare request failed" }))) as FriendComparisonPayload;
    setLoading(false);

    if (!response.ok || !payload.friend) {
      setFriendAnalysis(null);
      setMessage(payload.error ?? "Unable to compare with friend");
      return;
    }

    setFriendAnalysis(payload.friend);
  };

  return (
    <div className="space-y-3 rounded-md border border-border/70 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-mutedForeground">Compare With Friend</p>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Friend username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="max-w-xs"
        />
        <Button type="button" variant="secondary" onClick={compare} disabled={loading || username.trim().length < 2}>
          {loading ? "Comparing..." : "Compare"}
        </Button>
      </div>

      {message ? <p className="text-xs text-mutedForeground">{message}</p> : null}

      {friendAnalysis ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
          <BodyPowerDiagram
            title="Player Body Map"
            bodyModel={playerAnalysis.bodyModel}
            bodyPowerScore={playerAnalysis.bodyPowerScore}
            showMuscleList={false}
            compact
            enableViewToggle={false}
          />

          <div className="self-center rounded-md border border-border/70 px-3 py-2 text-xs font-semibold tracking-[0.14em] text-mutedForeground">
            VS
          </div>

          <BodyPowerDiagram
            title={`${friendAnalysis.displayName ?? friendAnalysis.username} Body Map`}
            bodyModel={friendAnalysis.analysis.bodyModel}
            bodyPowerScore={friendAnalysis.analysis.bodyPowerScore}
            showMuscleList={false}
            compact
            enableViewToggle={false}
          />
        </div>
      ) : null}
    </div>
  );
}

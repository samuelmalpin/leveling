"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type JoinSquadPayload = {
  error?: string;
};

export function JoinSquadForm() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/squads/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode })
    });

    const payload = (await response.json().catch(() => ({ error: "Join request failed" }))) as JoinSquadPayload;

    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to join squad");
      return;
    }

    router.push("/squads");
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <Input
        placeholder="Invite code"
        value={inviteCode}
        onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
      />
      <Button type="button" variant="secondary" onClick={submit} disabled={loading || inviteCode.trim().length < 4}>
        {loading ? "Joining..." : "Join Squad"}
      </Button>
      {message ? <p className="text-xs text-mutedForeground">{message}</p> : null}
    </div>
  );
}

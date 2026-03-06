"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SocialControls() {
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const createSquad = async () => {
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/squads/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: createName })
    });
    const payload = (await response.json().catch(() => ({ error: "Request failed" }))) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to create squad");
      return;
    }

    setCreateName("");
    setMessage("Squad created successfully.");
    router.refresh();
  };

  const joinSquad = async () => {
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/squads/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: joinCode })
    });
    const payload = (await response.json().catch(() => ({ error: "Request failed" }))) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to join squad");
      return;
    }

    setJoinCode("");
    setMessage("Squad joined successfully.");
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input placeholder="Create squad name" value={createName} onChange={(e) => setCreateName(e.target.value)} />
        <Button type="button" onClick={createSquad} disabled={loading || createName.length < 3}>
          Create Squad
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input placeholder="Join with invite code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
        <Button type="button" variant="secondary" onClick={joinSquad} disabled={loading || joinCode.length < 4}>
          Join Squad
        </Button>
      </div>

      {message ? <p className="text-xs text-mutedForeground">{message}</p> : null}
    </div>
  );
}

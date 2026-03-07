"use client";

import { type ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InvitePlayerModalProps = {
  onInvited?: () => void;
};

export function InvitePlayerModal({ onInvited }: InvitePlayerModalProps) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sendInvite = async () => {
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/squads/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });

    const payload = (await response.json().catch(() => ({ error: "Invite request failed" }))) as {
      error?: string;
      invite?: { inviteCode?: string };
    };

    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to send invite");
      return;
    }

    setMessage(`Invite created: ${payload.invite?.inviteCode ?? "code unavailable"}`);
    setUsername("");
    onInvited?.();
  };

  return (
    <div className="space-y-2">
      <Button type="button" onClick={() => setOpen((prev: boolean) => !prev)} variant="secondary">
        {open ? "Close Invite Panel" : "Invite Player"}
      </Button>

      {open ? (
        <div className="rounded-md border border-border/70 p-3 space-y-2">
          <Input
            placeholder="Player username"
            value={username}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setUsername(event.target.value)}
          />
          <Button type="button" onClick={sendInvite} disabled={loading || username.trim().length < 2}>
            {loading ? "Sending..." : "Send Invite"}
          </Button>
          {message ? <p className="text-xs text-mutedForeground">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

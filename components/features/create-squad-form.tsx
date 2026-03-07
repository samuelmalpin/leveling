"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CreateSquadPayload = {
  error?: string;
};

export function CreateSquadForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/squads/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description })
    });

    const payload = (await response.json().catch(() => ({ error: "Create request failed" }))) as CreateSquadPayload;

    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to create squad");
      return;
    }

    router.push("/squads");
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <Input placeholder="Squad name" value={name} onChange={(event) => setName(event.target.value)} />
      <Input
        placeholder="Optional description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <Button type="button" onClick={submit} disabled={loading || name.trim().length < 3}>
        {loading ? "Creating..." : "Create Squad"}
      </Button>
      {message ? <p className="text-xs text-mutedForeground">{message}</p> : null}
    </div>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BodyweightForm({ initialKg }: { initialKg: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(initialKg));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 35 || numeric > 300) {
      setError("Bodyweight must be between 35 and 300 kg.");
      setSaving(false);
      return;
    }

    const response = await fetch("/api/profile/bodyweight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bodyweightKg: numeric })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: "Update failed" }))) as { error?: string };
      setError(payload.error ?? "Update failed");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
  };

  return (
    <form className="space-y-2" onSubmit={submit}>
      <Label htmlFor="bodyweight">Bodyweight (kg)</Label>
      <div className="flex gap-2">
        <Input
          id="bodyweight"
          type="number"
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}

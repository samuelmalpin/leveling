"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ShareCard = {
  id: string;
  card_type: "power_scan" | "muscle_rank" | "achievement";
  title: string;
  payload: Record<string, unknown>;
  created_at?: string;
};

export function ShareStudio({ initialCards }: { initialCards: ShareCard[] }) {
  const [cards, setCards] = useState(initialCards);
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const formatTimestamp = (value?: string) => {
    if (!value) return "unknown-time";
    return value.includes("T") ? value.replace("T", " ").slice(0, 16) : value;
  };

  const generate = async (cardType: ShareCard["card_type"]) => {
    setLoadingType(cardType);
    const response = await fetch("/api/share-cards/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardType })
    });

    if (response.ok) {
      const payload = (await response.json()) as { data: ShareCard };
      if (payload.data) {
        setCards((prev: ShareCard[]) => [payload.data, ...prev]);
      }
    }

    setLoadingType(null);
  };

  const copySummary = async (card: ShareCard) => {
    const summary = `${card.title} | ${card.card_type} | ${formatTimestamp(card.created_at)}`;

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setMessage("Copy to clipboard is not supported in this browser");
      return;
    }

    try {
      await navigator.clipboard.writeText(summary);
      setMessage("Share text copied");
    } catch {
      setMessage("Copy failed. Please copy manually.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share Studio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => generate("power_scan")} disabled={loadingType === "power_scan"}>
            {loadingType === "power_scan" ? "Generating..." : "Body Power Scan"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => generate("muscle_rank")} disabled={loadingType === "muscle_rank"}>
            {loadingType === "muscle_rank" ? "Generating..." : "Muscle Rank Card"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => generate("achievement")} disabled={loadingType === "achievement"}>
            {loadingType === "achievement" ? "Generating..." : "Achievement Card"}
          </Button>
        </div>

        <div className="space-y-2">
          {cards.length === 0 ? (
            <p className="text-sm text-mutedForeground">No cards generated yet.</p>
          ) : (
            cards.map((card: ShareCard) => (
              <div key={card.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">{card.title}</p>
                <p className="text-xs uppercase text-mutedForeground">{card.card_type}</p>
                <p className="mt-1 text-xs text-mutedForeground">{formatTimestamp(card.created_at)}</p>
                <Button className="mt-2" size="sm" variant="outline" onClick={() => copySummary(card)}>
                  Copy Share Text
                </Button>
              </div>
            ))
          )}
        </div>
        {message ? <p className="text-xs text-mutedForeground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

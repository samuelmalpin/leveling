"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type SquadMemberView } from "@/lib/game/squad-service";

type MemberListProps = {
  members: SquadMemberView[];
  currentUserId: string;
  ownerUserId: string;
};

export function MemberList({ members, currentUserId, ownerUserId }: MemberListProps) {
  const router = useRouter();
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isOwner = currentUserId === ownerUserId;

  const removeMember = async (userId: string) => {
    setLoadingUserId(userId);
    setMessage(null);

    const response = await fetch("/api/squads/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });

    const payload = (await response.json().catch(() => ({ error: "Remove request failed" }))) as { error?: string };

    setLoadingUserId(null);

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to remove member");
      return;
    }

    setMessage("Member removed.");
    router.refresh();
  };

  const leaveSquad = async () => {
    setLeaving(true);
    setMessage(null);

    const response = await fetch("/api/squads/leave", {
      method: "POST"
    });

    const payload = (await response.json().catch(() => ({ error: "Leave request failed" }))) as { error?: string };

    setLeaving(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to leave squad");
      return;
    }

    setMessage("You left the squad.");
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Squad Members</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {members.length === 0 ? <p className="text-sm text-mutedForeground">No members found.</p> : null}

        {members.map((member) => {
          const canRemove = isOwner && member.userId !== currentUserId;

          return (
            <div key={member.id} className="flex items-center justify-between rounded-md border border-border/70 p-3 text-sm">
              <div>
                <p className="font-medium">
                  {member.username} {member.userId === currentUserId ? "(You)" : ""}
                </p>
                <p className="text-xs text-mutedForeground">
                  {member.role.toUpperCase()} · Level {member.level} · World Score {member.worldScore.toFixed(2)}
                </p>
              </div>

              {canRemove ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => removeMember(member.userId)}
                  disabled={loadingUserId === member.userId}
                >
                  {loadingUserId === member.userId ? "Removing..." : "Remove"}
                </Button>
              ) : null}
            </div>
          );
        })}

        <div className="pt-2">
          <Button type="button" variant="secondary" onClick={leaveSquad} disabled={leaving}>
            {leaving ? "Leaving..." : "Leave Squad"}
          </Button>
        </div>

        {message ? <p className="text-xs text-mutedForeground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type SquadOverview } from "@/lib/game/squad-service";

export function SquadCard({ squad }: { squad: SquadOverview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{squad.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {squad.description ? <p className="text-mutedForeground">{squad.description}</p> : null}
        <p>Invite Code: <span className="font-semibold">{squad.inviteCode}</span></p>
        <p>Members: {squad.memberCount}/{squad.maxMembers}</p>
        <p>Squad World Score: {squad.squadWorldScore.toFixed(2)}</p>
        <p>Weekly Challenge Points: {squad.squadWeeklyChallengePoints}</p>
      </CardContent>
    </Card>
  );
}

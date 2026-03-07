import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { getSquadLeaderboard, getSquadMembers } from "@/lib/game/squad-service";
import { SquadCard } from "@/components/features/squad-card";
import { MemberList } from "@/components/features/member-list";
import { InvitePlayerModal } from "@/components/features/invite-player-modal";
import { SquadLeaderboardTable } from "@/components/features/squad-leaderboard-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SquadsPage() {
  const { supabase, user } = await requireUser();

  const [squadPayload, leaderboardRows] = await Promise.all([
    getSquadMembers({ supabase, userId: user.id }),
    getSquadLeaderboard({ supabase, limit: 5 })
  ]);

  if (!squadPayload) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Squad Management</h2>
        <Card>
          <CardHeader>
            <CardTitle>No Squad Joined</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-mutedForeground">Create a squad or join one to unlock group progression.</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/squads/create">
                <Button type="button">Create Squad</Button>
              </Link>
              <Link href="/squads/join">
                <Button type="button" variant="secondary">Join Squad</Button>
              </Link>
              <Link href="/squads/leaderboard">
                <Button type="button" variant="outline">Open Squad Leaderboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <SquadLeaderboardTable rows={leaderboardRows} />
      </div>
    );
  }

  const isOwner = squadPayload.squad.ownerUserId === user.id;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Squad Management</h2>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <SquadCard squad={squadPayload.squad} />

          <Card>
            <CardHeader>
              <CardTitle>Squad Gameplay</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-mutedForeground">
              <p>Squad World Score = average member world score.</p>
              <p>Weekly Challenges = sum of current-week member challenge points.</p>
              <p>Leaderboard ranking uses world score first, then weekly challenge points.</p>
            </CardContent>
          </Card>

          <MemberList
            members={squadPayload.members}
            currentUserId={user.id}
            ownerUserId={squadPayload.squad.ownerUserId}
          />
        </div>

        <div className="space-y-4">
          {isOwner ? <InvitePlayerModal /> : null}

          <Card>
            <CardHeader>
              <CardTitle>Squad Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/squads/leaderboard" className="block text-sm text-mutedForeground hover:text-foreground">
                Open full squad leaderboard
              </Link>
              <Link href="/social" className="block text-sm text-mutedForeground hover:text-foreground">
                Back to social arena
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <SquadLeaderboardTable rows={leaderboardRows} />
    </div>
  );
}

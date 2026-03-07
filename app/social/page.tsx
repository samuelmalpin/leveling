import { requireUser } from "@/lib/auth/require-user";
import Link from "next/link";
import { LeaderboardTable } from "@/components/features/leaderboard-table";
import { SocialControls } from "@/components/features/social-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SocialPage() {
  const { supabase, user } = await requireUser();

  const { data: leaderboard } = await supabase
    .from("user_progress")
    .select("user_id, xp_total, level, users(username)")
    .order("xp_total", { ascending: false })
    .limit(20);

  const { data: squadMembership } = await supabase
    .from("squad_members")
    .select("id, role, squads(name, invite_code)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const squad = squadMembership?.squads;
  const squadData = Array.isArray(squad) ? squad[0] : squad;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Social Arena</h2>
      <p className="text-sm text-mutedForeground">Compete in weekly rankings and share progression identity.</p>

      <LeaderboardTable rows={(leaderboard ?? []) as never[]} me={user.id} />

      <Card>
        <CardHeader>
          <CardTitle>Squad Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <SocialControls />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Squad</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {squadData ? (
            <>
              <p>Name: {squadData.name}</p>
              <p className="text-mutedForeground">Invite Code: {squadData.invite_code}</p>
              <div className="mt-3">
                <Link href="/squads">
                  <Button type="button" size="sm" variant="secondary">Open Squad Management</Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-mutedForeground">No squad joined yet.</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/squads/create">
                  <Button type="button" size="sm">Create Squad</Button>
                </Link>
                <Link href="/squads/join">
                  <Button type="button" size="sm" variant="secondary">Join Squad</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { requireUser } from "@/lib/auth/require-user";
import { LeaderboardTable } from "@/components/features/leaderboard-table";
import { SocialControls } from "@/components/features/social-controls";
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
            </>
          ) : (
            <p className="text-mutedForeground">No squad joined yet. Squad management API is now enabled in database tables for next UI phase.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

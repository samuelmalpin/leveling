import { requireUser } from "@/lib/auth/require-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();

  const [{ data: profile }, { data: progress }, { data: achievements }] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase.from("user_progress").select("*").eq("user_id", user.id).single(),
    supabase
      .from("user_achievements")
      .select("id, unlocked_at, achievements(name, code)")
      .eq("user_id", user.id)
      .order("unlocked_at", { ascending: false })
      .limit(12)
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hunter Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Username: {profile?.username ?? user.email}</p>
          <p>Email: {user.email}</p>
          <p>Level: {progress?.level ?? 1}</p>
          <p>Total XP: {progress?.xp_total ?? 0}</p>
          <p>Streak: {progress?.streak_days ?? 0} days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(achievements ?? []).length === 0 ? (
            <p className="text-sm text-mutedForeground">No achievements unlocked yet.</p>
          ) : (
            achievements?.map((entry) => {
              const achievement = Array.isArray(entry.achievements)
                ? (entry.achievements[0] as { name: string; code: string } | undefined)
                : (entry.achievements as { name: string; code: string } | null);
              return (
                <Badge key={entry.id} variant="secondary" className="px-3 py-1">
                  {achievement?.name ?? achievement?.code ?? "Achievement"}
                </Badge>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

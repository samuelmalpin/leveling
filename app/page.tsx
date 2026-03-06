import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { StatCard } from "@/components/features/stat-card";
import { MuscleGrid } from "@/components/features/muscle-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  const [progressRes, musclesRes, questsRes] = await Promise.all([
    supabase.from("user_progress").select("*").eq("user_id", user.id).single(),
    supabase.from("muscle_stats").select("*").eq("user_id", user.id).order("muscle_group"),
    supabase
      .from("quest_progress")
      .select("id, status, quests(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(3)
  ]);

  const progress = progressRes.data;
  const muscles = musclesRes.data ?? [];
  const activeQuests = questsRes.data ?? [];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Level" value={progress?.level ?? 1} hint="Account progression" />
        <StatCard title="Total XP" value={progress?.xp_total ?? 0} hint="Lifetime earned" />
        <StatCard title="Current Streak" value={`${progress?.streak_days ?? 0} days`} hint="Discipline bonus active" />
        <StatCard title="Best Streak" value={`${progress?.best_streak_days ?? 0} days`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Muscle Progression</h2>
          <MuscleGrid muscles={muscles} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Live Objectives</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeQuests.length === 0 ? (
              <p className="text-sm text-mutedForeground">No active quests. Accept quests to continue progression.</p>
            ) : (
              activeQuests.map((q) => (
                <div key={q.id} className="rounded-md border border-border p-3 text-sm">
                  {(Array.isArray(q.quests) ? q.quests[0] : q.quests as { name: string } | null)?.name ?? "Quest"}
                </div>
              ))
            )}
            <Link href="/workouts/new">
              <Button className="mt-2 w-full">Start Workout</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

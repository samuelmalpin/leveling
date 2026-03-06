import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { StatCard } from "@/components/features/stat-card";
import { MuscleGrid } from "@/components/features/muscle-grid";
import { DailyOpsList } from "@/components/features/daily-ops-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DailyOpsRow = {
  id: string;
  status: "active" | "completed" | "claimed" | "expired";
  progress_value: number;
  daily_quest_pool: { title: string; goal_value: number; xp_reward: number } | { title: string; goal_value: number; xp_reward: number }[] | null;
};

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const today = new Date().toISOString().slice(0, 10);

  const [progressRes, musclesRes, questsRes, dailyQuestsRes, seasonRes] = await Promise.all([
    supabase.from("user_progress").select("*").eq("user_id", user.id).single(),
    supabase.from("muscle_stats").select("*").eq("user_id", user.id).order("muscle_group"),
    supabase
      .from("quest_progress")
      .select("id, status, quests(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(3),
    supabase
      .from("user_daily_quests")
      .select("id, status, progress_value, daily_quest_pool(title, goal_value, xp_reward)")
      .eq("user_id", user.id)
      .eq("assigned_date", today)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("season_user_progress")
      .select("season_xp, tier, seasons(name)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const progress = progressRes.data;
  const muscles = musclesRes.data ?? [];
  const activeQuests = questsRes.data ?? [];
  const dailyOps = dailyQuestsRes.data ?? [];
  const season = seasonRes.data;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Level" value={progress?.level ?? 1} hint="Account progression" />
        <StatCard title="Total XP" value={progress?.xp_total ?? 0} hint="Lifetime earned" />
        <StatCard title="Current Streak" value={`${progress?.streak_days ?? 0} days`} hint="Discipline bonus active" />
        <StatCard
          title={season ? "Season Tier" : "Best Streak"}
          value={season ? `Tier ${season.tier}` : `${progress?.best_streak_days ?? 0} days`}
          hint={season ? `${(Array.isArray(season.seasons) ? season.seasons[0] : season.seasons as { name: string } | null)?.name ?? "Active Season"}` : undefined}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Muscle Progression</h2>
          <MuscleGrid muscles={muscles} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily Ops</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DailyOpsList initialOps={dailyOps as DailyOpsRow[]} />

            {activeQuests.length > 0 ? (
              <div className="rounded-md border border-border/70 p-3 text-xs text-mutedForeground">
                Active Main Quests: {activeQuests.length}
              </div>
            ) : null}

            <Link href="/workouts/new">
              <Button className="mt-2 w-full">Start Workout</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { StatCard } from "@/components/features/stat-card";
import { MuscleGrid } from "@/components/features/muscle-grid";
import { DailyOpsList } from "@/components/features/daily-ops-list";
import { MicroQuestList } from "@/components/features/micro-quest-list";
import { RetentionPanel } from "@/components/features/retention-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DailyOpsRow = {
  id: string;
  status: "active" | "completed" | "claimed" | "expired";
  progress_value: number;
  daily_quest_pool: { title: string; goal_value: number; xp_reward: number } | { title: string; goal_value: number; xp_reward: number }[] | null;
};

type MicroQuestRow = {
  id: string;
  status: "active" | "completed" | "claimed" | "expired";
  micro_quests:
    | { title: string; description: string | null; xp_reward: number }
    | { title: string; description: string | null; xp_reward: number }[]
    | null;
};

type WeeklyRecap = {
  workouts: number;
  weeklyPoints: number;
  avgBossScore: number;
  bestMuscle: string;
};

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const today = new Date().toISOString().slice(0, 10);

  const [progressRes, musclesRes, questsRes, dailyQuestsRes, seasonRes, microQuestRes, challengeStateRes, weeklyRecapRes] = await Promise.all([
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
      .maybeSingle(),
    supabase
      .from("user_micro_quests")
      .select("id, status, micro_quests(title, description, xp_reward)")
      .eq("user_id", user.id)
      .eq("assigned_date", today)
      .order("created_at", { ascending: false }),
    supabase.from("user_challenge_state").select("difficulty_band").eq("user_id", user.id).maybeSingle(),
    supabase.rpc("fn_get_weekly_recap", { p_user_id: user.id })
  ]);

  const progress = progressRes.data;
  const muscles = musclesRes.data ?? [];
  const activeQuests = questsRes.data ?? [];
  const dailyOps = dailyQuestsRes.data ?? [];
  const season = seasonRes.data;
  const microQuests = microQuestRes.data ?? [];
  const challengeBand = challengeStateRes.data?.difficulty_band ?? "balanced";
  const weeklyRecap = (weeklyRecapRes.data as WeeklyRecap | null) ?? null;

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
        <StatCard title="Momentum" value={Number(progress?.momentum_score ?? 0).toFixed(1)} hint="0-100 consistency score" />
        <StatCard title="7-Day Attendance" value={`${progress?.attendance_7d ?? 0}/7`} hint="Session consistency floor" />
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

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Adaptive Challenge Band</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="rounded-md border border-border/70 px-3 py-2 text-xs uppercase tracking-[0.12em] text-mutedForeground">
              Current Band: <span className="font-semibold text-foreground">{challengeBand}</span>
            </p>
            <p className="text-mutedForeground">
              Recovery lowers pressure when momentum drops, Balanced keeps steady progression, and Push increases your challenge
              ceiling when consistency is high.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Recap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-mutedForeground">
            <p>Workouts: {weeklyRecap?.workouts ?? 0}</p>
            <p>Weekly Challenge Points: {weeklyRecap?.weeklyPoints ?? 0}</p>
            <p>Average Boss Score: {weeklyRecap?.avgBossScore ?? 0}</p>
            <p>Top Muscle: {weeklyRecap?.bestMuscle ?? "core"}</p>
          </CardContent>
        </Card>
      </section>

      <section>
        <RetentionPanel
          data={{
            journey_phase: progress?.journey_phase,
            burnout_risk: Number(progress?.burnout_risk ?? 0),
            variety_score: Number(progress?.variety_score ?? 0),
            recovery_advice: progress?.recovery_advice
          }}
        />
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Micro Quests</CardTitle>
          </CardHeader>
          <CardContent>
            <MicroQuestList initialRows={microQuests as MicroQuestRow[]} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

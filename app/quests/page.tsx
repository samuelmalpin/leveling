import { requireUser } from "@/lib/auth/require-user";
import { QuestList } from "@/components/features/quest-list";
import { WeeklyChallenges } from "@/components/features/weekly-challenges";
import { MicroQuestList } from "@/components/features/micro-quest-list";

export default async function QuestsPage() {
  const { supabase, user } = await requireUser();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: mainQuests }, { data: weeklyRows }, { data: microRows }] = await Promise.all([
    supabase
      .from("quest_progress")
      .select("id, progress_value, completed_at, claimed_at, status, quests(name, description, goal_value, xp_reward)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_weekly_progress")
      .select("id, points, status, weekly_challenges(title, target_points, reward_xp, week_end)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("user_micro_quests")
      .select("id, status, micro_quests(title, description, xp_reward)")
      .eq("user_id", user.id)
      .eq("assigned_date", today)
      .order("created_at", { ascending: false })
  ]);

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Quests</h2>
      <p className="text-sm text-mutedForeground">Daily and weekly missions keep your progression loop active.</p>
      <WeeklyChallenges initialRows={(weeklyRows ?? []) as never[]} />
      <MicroQuestList initialRows={(microRows ?? []) as never[]} />
      <QuestList initialQuests={(mainQuests ?? []) as never[]} />
    </div>
  );
}

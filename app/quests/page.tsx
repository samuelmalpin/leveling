import { requireUser } from "@/lib/auth/require-user";
import { QuestList } from "@/components/features/quest-list";

export default async function QuestsPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("quest_progress")
    .select("id, progress_value, completed_at, claimed_at, status, quests(name, description, goal_value, xp_reward)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Quests</h2>
      <p className="text-sm text-mutedForeground">Daily and weekly missions keep your progression loop active.</p>
      <QuestList initialQuests={(data ?? []) as never[]} />
    </div>
  );
}

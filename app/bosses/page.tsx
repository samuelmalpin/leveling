import { requireUser } from "@/lib/auth/require-user";
import { BossList } from "@/components/features/boss-list";

export default async function BossesPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("boss_progress")
    .select("id, status, attempt_count, best_score, bosses(name, description, reward_xp, difficulty)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Boss Challenges</h2>
      <p className="text-sm text-mutedForeground">Milestone combat checks for progression rewards.</p>
      <BossList initialBosses={(data ?? []) as never[]} />
    </div>
  );
}

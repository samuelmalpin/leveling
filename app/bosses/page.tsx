import { requireUser } from "@/lib/auth/require-user";
import { BossList } from "@/components/features/boss-list";

type BossModifierRow = {
  boss_id: string;
  modifier_name: string;
  modifier_description: string | null;
};

export default async function BossesPage() {
  const { supabase, user } = await requireUser();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: rows }, { data: modifiers }] = await Promise.all([
    supabase
      .from("boss_progress")
      .select("id, status, attempt_count, best_score, progress_meter, bosses(id, name, description, reward_xp, difficulty)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("boss_weekly_modifiers")
      .select("boss_id, modifier_name, modifier_description")
      .lte("week_start", today)
      .gte("week_end", today)
      .eq("is_active", true)
  ]);

  const weeklyModifiers = Object.fromEntries(
    ((modifiers ?? []) as BossModifierRow[]).map((row) => [
      row.boss_id,
      { modifier_name: row.modifier_name, modifier_description: row.modifier_description }
    ])
  );

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Boss Challenges</h2>
      <p className="text-sm text-mutedForeground">Milestone combat checks for progression rewards.</p>
      <BossList initialBosses={(rows ?? []) as never[]} weeklyModifiers={weeklyModifiers} />
    </div>
  );
}

import { requireUser } from "@/lib/auth/require-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InventoryList } from "@/components/features/inventory-list";
import { ShareStudio } from "@/components/features/share-studio";

type AchievementRow = {
  id: string;
  achievements: { name: string; code: string } | { name: string; code: string }[] | null;
};

type InventoryRow = {
  id: string;
  item_name: string;
  rarity: string;
  quantity: number;
};

type ShareCardRow = {
  id: string;
  card_type: "power_scan" | "muscle_rank" | "achievement";
  title: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();

  const [{ data: profile }, { data: progress }, { data: achievements }, { data: inventory }, { data: shareCards }] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase.from("user_progress").select("*").eq("user_id", user.id).single(),
    supabase
      .from("user_achievements")
      .select("id, unlocked_at, achievements(name, code)")
      .eq("user_id", user.id)
      .order("unlocked_at", { ascending: false })
      .limit(12),
    supabase
      .from("user_inventory")
      .select("id, item_name, rarity, quantity")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("share_cards")
      .select("id, card_type, title, payload, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
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
            (achievements as AchievementRow[] | null)?.map((entry) => {
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

      <InventoryList items={(inventory ?? []) as InventoryRow[]} />
      <ShareStudio initialCards={(shareCards ?? []) as ShareCardRow[]} />
    </div>
  );
}

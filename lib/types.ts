export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "arms"
  | "core";

export interface UserProgress {
  user_id: string;
  xp_total: number;
  level: number;
  streak_days: number;
  best_streak_days: number;
  last_workout_date: string | null;
}

export interface MuscleStat {
  id: string;
  user_id: string;
  muscle_group: MuscleGroup;
  xp_total: number;
  level: number;
  rank: string;
  fatigue_score: number;
  last_trained_at: string | null;
  recovery_ready_at?: string | null;
  plateau_score?: number;
  adaptation_score?: number;
  frequency_7d?: number;
  overload_index?: number;
  strength_ratio?: number;
  best_e1rm_kg?: number;
  recent_e1rm_kg?: number;
}

export interface QuestProgress {
  id: string;
  user_id: string;
  quest_id: string;
  progress_value: number;
  completed_at: string | null;
  claimed_at: string | null;
  status: "active" | "completed" | "claimed";
}

export interface DailyQuest {
  id: string;
  user_id: string;
  assigned_date: string;
  progress_value: number;
  status: "active" | "completed" | "claimed" | "expired";
}

export interface LootDrop {
  id: string;
  user_id: string;
  source_type: "workout" | "quest" | "weekly" | "boss";
  item_code: string;
  item_name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  quantity: number;
  created_at: string;
}

export interface SeasonProgress {
  user_id: string;
  season_id: string;
  season_xp: number;
  tier: number;
}

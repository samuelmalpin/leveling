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

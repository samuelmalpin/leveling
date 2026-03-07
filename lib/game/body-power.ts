import { type MuscleStat } from "@/lib/types";

export const TRACKED_MUSCLES = [
  "chest",
  "biceps",
  "triceps",
  "shoulders",
  "back",
  "abs",
  "glutes",
  "quadriceps",
  "hamstrings",
  "calves"
] as const;

export const PLAYER_RANKS = ["E", "D", "C", "B", "A", "S", "SS", "SSS"] as const;

export type BodyMuscle = (typeof TRACKED_MUSCLES)[number];
export type PlayerRank = (typeof PLAYER_RANKS)[number];

export type MuscleColor =
  | "gray"
  | "light green"
  | "green"
  | "blue"
  | "purple"
  | "orange"
  | "red"
  | "gold";

export type AuraEffect =
  | "none"
  | "light glow"
  | "blue aura"
  | "orange aura"
  | "red energy aura"
  | "golden legendary aura";

export type BodyEvolutionStage =
  | "Beginner"
  | "Fit"
  | "Athletic"
  | "Muscular"
  | "Elite"
  | "Legendary Physique";

export type BodyEvolutionTier = "skinny" | "fit" | "athletic" | "muscular" | "elite" | "titan";

export type SymmetryRank = "Poor" | "Weak" | "Average" | "Balanced" | "Elite" | "Perfect Physique";

export type BodyModelMuscle = {
  level: number;
  xp: number;
  rank: PlayerRank;
  color: MuscleColor;
};

export type BodyModel = Record<BodyMuscle, BodyModelMuscle>;

export type MuscleAnalysisItem = {
  muscle: BodyMuscle;
  level: number;
  gapFromStrongest: number;
};

export type MotivationPayload = {
  dailyGoal: string;
  trainingSuggestion: string;
  weakMuscleFocus: BodyMuscle[];
  progressFeedback: string;
  reason: string;
  reward: string;
};

export type BodyPowerAnalysis = {
  bodyModel: BodyModel;
  bodyPowerScore: number;
  bodyPowerRank: PlayerRank;
  symmetryScore: number;
  symmetryRank: SymmetryRank;
  strongestMuscles: MuscleAnalysisItem[];
  weakestMuscles: MuscleAnalysisItem[];
  recommendedTraining: string[];
  auraEffect: AuraEffect;
  bodyEvolutionStage: BodyEvolutionStage;
  bodyEvolutionTier: BodyEvolutionTier;
  motivation: MotivationPayload;
};

type MuscleProgressSource = Pick<MuscleStat, "xp_total" | "level"> & {
  muscle_group: string;
};

const LEVEL_CAP = 100;
const MAX_STANDARD_DEVIATION = 50;

const TRAINING_SUGGESTIONS: Record<BodyMuscle, string> = {
  chest: "Push work: bench press, incline dumbbell press, controlled push-ups.",
  biceps: "Pull focus: chin-ups, curls, controlled eccentric reps.",
  triceps: "Press finishers: dips, close-grip press, cable extensions.",
  shoulders: "Overhead work: presses, lateral raises, rear-delt balance.",
  back: "Posterior strength: rows, pull-ups, deadlift variations.",
  abs: "Core control: planks, hanging raises, anti-rotation work.",
  glutes: "Hip drive: hip thrusts, split squats, Romanian deadlifts.",
  quadriceps: "Knee-dominant volume: squats, lunges, leg press.",
  hamstrings: "Posterior chain: RDLs, curls, tempo hinges.",
  calves: "High-frequency calf work: raises, pauses, full ROM reps."
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeLevel(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return clamp(Math.floor(level), 0, LEVEL_CAP);
}

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toCanonicalMuscles(muscleGroup: string): BodyMuscle[] {
  const normalized = muscleGroup.trim().toLowerCase();

  if (normalized === "quads") return ["quadriceps"];
  if (normalized === "core") return ["abs"];
  if (normalized === "arms") return ["biceps", "triceps"];

  if (TRACKED_MUSCLES.includes(normalized as BodyMuscle)) {
    return [normalized as BodyMuscle];
  }

  return [];
}

export function getRank(level: number): PlayerRank {
  const normalized = normalizeLevel(level);

  if (normalized < 5) return "E";
  if (normalized < 15) return "D";
  if (normalized < 30) return "C";
  if (normalized < 50) return "B";
  if (normalized < 70) return "A";
  if (normalized < 80) return "S";
  if (normalized < 90) return "SS";
  return "SSS";
}

export function getMuscleColor(rank: PlayerRank): MuscleColor {
  switch (rank) {
    case "E":
      return "gray";
    case "D":
      return "light green";
    case "C":
      return "green";
    case "B":
      return "blue";
    case "A":
      return "purple";
    case "S":
      return "orange";
    case "SS":
      return "red";
    case "SSS":
      return "gold";
  }
}

export function xpRequiredForLevel(level: number): number {
  const normalized = normalizeLevel(level);
  if (normalized <= 0) return 0;
  return Math.floor(120 * normalized ** 1.7);
}

export function muscleXpRequiredForLevel(level: number): number {
  const normalized = normalizeLevel(level);
  if (normalized <= 0) return 0;
  return Math.floor(80 * normalized ** 1.8);
}

export function calculateMuscleXp(weight: number, reps: number, sets: number): number {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || !Number.isFinite(sets)) return 0;
  return Math.max(0, Math.floor(weight * reps * sets));
}

export function createBodyModel(muscleRows: MuscleProgressSource[]): BodyModel {
  const bodyModel = Object.fromEntries(
    TRACKED_MUSCLES.map((muscle) => {
      const level = 0;
      const rank = getRank(level);
      return [muscle, { level, xp: 0, rank, color: getMuscleColor(rank) }];
    })
  ) as BodyModel;

  for (const row of muscleRows) {
    const mappedMuscles = toCanonicalMuscles(row.muscle_group);
    if (mappedMuscles.length === 0) continue;

    const level = normalizeLevel(row.level);
    const xpShare = Math.max(0, Math.floor(row.xp_total / mappedMuscles.length));

    for (const muscle of mappedMuscles) {
      const current = bodyModel[muscle];
      const nextLevel = Math.max(current.level, level);
      const nextXp = current.xp + xpShare;
      const nextRank = getRank(nextLevel);

      bodyModel[muscle] = {
        level: nextLevel,
        xp: nextXp,
        rank: nextRank,
        color: getMuscleColor(nextRank)
      };
    }
  }

  return bodyModel;
}

export function getBodyPowerScore(bodyModel: BodyModel): number {
  const levels = TRACKED_MUSCLES.map((muscle) => bodyModel[muscle].level);
  const average = levels.reduce((acc, value) => acc + value, 0) / levels.length;
  return roundTo(average);
}

export function getSymmetryScore(bodyModel: BodyModel): number {
  const levels = TRACKED_MUSCLES.map((muscle) => bodyModel[muscle].level);
  const mean = levels.reduce((acc, value) => acc + value, 0) / levels.length;
  const variance = levels.reduce((acc, value) => acc + (value - mean) ** 2, 0) / levels.length;
  const standardDeviation = Math.sqrt(variance);
  const normalizedImbalance = clamp(standardDeviation / MAX_STANDARD_DEVIATION, 0, 1);
  return roundTo((1 - normalizedImbalance) * 100);
}

export function getSymmetryRank(symmetryScore: number): SymmetryRank {
  const score = clamp(roundTo(symmetryScore), 0, 100);

  if (score <= 20) return "Poor";
  if (score <= 40) return "Weak";
  if (score <= 60) return "Average";
  if (score <= 80) return "Balanced";
  if (score <= 90) return "Elite";
  return "Perfect Physique";
}

export function getAuraEffect(bodyPowerRank: PlayerRank): AuraEffect {
  if (bodyPowerRank === "B") return "light glow";
  if (bodyPowerRank === "A") return "blue aura";
  if (bodyPowerRank === "S") return "orange aura";
  if (bodyPowerRank === "SS") return "red energy aura";
  if (bodyPowerRank === "SSS") return "golden legendary aura";
  return "none";
}

export function getBodyEvolutionStage(bodyPowerScore: number): BodyEvolutionStage {
  const score = clamp(roundTo(bodyPowerScore), 0, 100);

  if (score <= 10) return "Beginner";
  if (score <= 30) return "Fit";
  if (score <= 50) return "Athletic";
  if (score <= 70) return "Muscular";
  if (score <= 85) return "Elite";
  return "Legendary Physique";
}

export function getBodyEvolutionTier(bodyPowerScore: number): BodyEvolutionTier {
  const score = clamp(roundTo(bodyPowerScore), 0, 100);

  if (score >= 100) return "titan";
  if (score >= 80) return "elite";
  if (score >= 60) return "muscular";
  if (score >= 40) return "athletic";
  if (score >= 20) return "fit";
  return "skinny";
}

export function getBodySilhouetteScale(bodyPowerScore: number): number {
  const score = clamp(roundTo(bodyPowerScore), 0, 100);
  const normalized = score / 100;
  return roundTo(0.86 + normalized * 0.34, 3);
}

export function analyzeMuscleBalance(bodyModel: BodyModel): {
  strongestMuscles: MuscleAnalysisItem[];
  weakestMuscles: MuscleAnalysisItem[];
  recommendedTraining: string[];
} {
  const entries = TRACKED_MUSCLES.map((muscle) => ({ muscle, level: bodyModel[muscle].level }));
  const strongestLevel = Math.max(...entries.map((entry) => entry.level), 0);

  const strongestMuscles = entries
    .filter((entry) => entry.level === strongestLevel)
    .map((entry) => ({ ...entry, gapFromStrongest: 0 }));

  const weakestMuscles = entries
    .map((entry) => ({
      ...entry,
      gapFromStrongest: Math.max(0, strongestLevel - entry.level)
    }))
    .filter((entry) => entry.gapFromStrongest >= 15)
    .sort((a, b) => b.gapFromStrongest - a.gapFromStrongest || a.muscle.localeCompare(b.muscle));

  const recommendedTraining = (weakestMuscles.length > 0 ? weakestMuscles : strongestMuscles)
    .slice(0, 3)
    .map((entry) => TRAINING_SUGGESTIONS[entry.muscle]);

  return {
    strongestMuscles,
    weakestMuscles,
    recommendedTraining
  };
}

export function buildMotivationEngine(params: {
  bodyPowerScore: number;
  bodyPowerRank: PlayerRank;
  symmetryScore: number;
  symmetryRank: SymmetryRank;
  strongestMuscles: MuscleAnalysisItem[];
  weakestMuscles: MuscleAnalysisItem[];
}): MotivationPayload {
  const { bodyPowerScore, bodyPowerRank, symmetryScore, symmetryRank, weakestMuscles, strongestMuscles } = params;

  const focusMuscles = (weakestMuscles.length > 0 ? weakestMuscles : strongestMuscles).slice(0, 3);
  const weakMuscleFocus = focusMuscles.map((entry) => entry.muscle);
  const dailyGoal = weakMuscleFocus.length > 0 ? `Train ${weakMuscleFocus.join(" and ")}` : "Complete one balanced full-body session";

  const maxGap = weakestMuscles.length > 0 ? weakestMuscles[0].gapFromStrongest : 0;

  const reason =
    weakestMuscles.length > 0
      ? `These muscles are up to ${maxGap} levels behind your strongest muscle.`
      : "Your body is balanced. Keep reinforcing your strongest pattern while maintaining symmetry.";

  const trainingSuggestion = focusMuscles.map((entry) => TRAINING_SUGGESTIONS[entry.muscle]).join(" ");

  const progressFeedback = `Body Power ${bodyPowerRank} (${bodyPowerScore.toFixed(1)}) • Symmetry ${symmetryRank} (${symmetryScore.toFixed(
    1
  )}). Keep consistency to unlock stronger aura stages.`;

  return {
    dailyGoal,
    trainingSuggestion,
    weakMuscleFocus,
    progressFeedback,
    reason,
    reward: "+25% XP bonus for focused weak-muscle training today."
  };
}

export function buildBodyPowerAnalysis(muscleRows: MuscleProgressSource[]): BodyPowerAnalysis {
  const bodyModel = createBodyModel(muscleRows);
  const bodyPowerScore = getBodyPowerScore(bodyModel);
  const bodyPowerRank = getRank(bodyPowerScore);
  const symmetryScore = getSymmetryScore(bodyModel);
  const symmetryRank = getSymmetryRank(symmetryScore);
  const { strongestMuscles, weakestMuscles, recommendedTraining } = analyzeMuscleBalance(bodyModel);

  const motivation = buildMotivationEngine({
    bodyPowerScore,
    bodyPowerRank,
    symmetryScore,
    symmetryRank,
    strongestMuscles,
    weakestMuscles
  });

  return {
    bodyModel,
    bodyPowerScore,
    bodyPowerRank,
    symmetryScore,
    symmetryRank,
    strongestMuscles,
    weakestMuscles,
    recommendedTraining,
    auraEffect: getAuraEffect(bodyPowerRank),
    bodyEvolutionStage: getBodyEvolutionStage(bodyPowerScore),
    bodyEvolutionTier: getBodyEvolutionTier(bodyPowerScore),
    motivation
  };
}

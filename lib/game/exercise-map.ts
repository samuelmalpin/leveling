import { MuscleGroup } from "@/lib/types";

export const EXERCISE_MUSCLE_MAP: Record<
  string,
  { primary: MuscleGroup; secondary?: MuscleGroup[] }
> = {
  "Barbell Bench Press": { primary: "chest", secondary: ["triceps", "shoulders"] },
  "Incline Dumbbell Press": { primary: "chest", secondary: ["shoulders", "triceps"] },
  "Pull Up": { primary: "back", secondary: ["biceps", "abs"] },
  Row: { primary: "back", secondary: ["biceps", "triceps"] },
  Squat: { primary: "quadriceps", secondary: ["glutes", "abs"] },
  Deadlift: { primary: "hamstrings", secondary: ["glutes", "back"] },
  "Overhead Press": { primary: "shoulders", secondary: ["triceps", "abs"] },
  Lunge: { primary: "quadriceps", secondary: ["glutes", "hamstrings"] },
  Plank: { primary: "abs" },
  CalfRaise: { primary: "calves" }
};

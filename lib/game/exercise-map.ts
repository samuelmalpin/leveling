import { MuscleGroup } from "@/lib/types";

export const EXERCISE_MUSCLE_MAP: Record<
  string,
  { primary: MuscleGroup; secondary?: MuscleGroup[] }
> = {
  "Barbell Bench Press": { primary: "chest", secondary: ["arms", "shoulders"] },
  "Incline Dumbbell Press": { primary: "chest", secondary: ["shoulders", "arms"] },
  "Pull Up": { primary: "back", secondary: ["arms", "core"] },
  Row: { primary: "back", secondary: ["arms"] },
  Squat: { primary: "quads", secondary: ["glutes", "core"] },
  Deadlift: { primary: "hamstrings", secondary: ["glutes", "back"] },
  "Overhead Press": { primary: "shoulders", secondary: ["arms", "core"] },
  Lunge: { primary: "quads", secondary: ["glutes", "hamstrings"] },
  Plank: { primary: "core" },
  CalfRaise: { primary: "calves" }
};

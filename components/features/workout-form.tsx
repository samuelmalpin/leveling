"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ExerciseInput {
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  rpe: number;
}

interface WorkoutRewards {
  xp: number;
  streakDays: number;
  leveledUp: boolean;
  newLevel: number;
  attendanceXp?: number;
  momentumScore?: number;
  challengeBand?: string;
  loot?: { awarded?: boolean; itemName?: string; rarity?: string; quantity?: number };
}

export function WorkoutForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [victory, setVictory] = useState<WorkoutRewards | null>(null);
  const [note, setNote] = useState("");
  const [exercises, setExercises] = useState<ExerciseInput[]>([
    { name: "Barbell Bench Press", sets: 3, reps: 8, weightKg: 60, rpe: 8 }
  ]);

  const addExercise = () => {
    setExercises((prev) => [...prev, { name: "Squat", sets: 3, reps: 8, weightKg: 80, rpe: 8 }]);
  };

  const updateExercise = (index: number, patch: Partial<ExerciseInput>) => {
    setExercises((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/workouts/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: note,
        exercises
      })
    });

    setSaving(false);

    if (response.ok) {
      const payload = (await response.json()) as { rewards?: WorkoutRewards };
      if (payload.rewards) {
        setVictory(payload.rewards);
      } else {
        router.push("/");
        router.refresh();
      }
      return;
    }

    const payload = (await response.json().catch(() => ({ error: "Workout failed" }))) as { error?: string };
    setError(payload.error ?? "Workout failed");
  };

  return (
    <form className="space-y-5" onSubmit={submit}>
      {victory ? (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle>Victory Screen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>XP Earned: {victory.xp}</p>
            <p>Attendance XP: {victory.attendanceXp ?? 0}</p>
            <p>Streak: {victory.streakDays} days</p>
            <p>New Level: {victory.newLevel}</p>
            <p>Momentum: {(victory.momentumScore ?? 0).toFixed(1)}</p>
            <p>Challenge Band: {victory.challengeBand ?? "balanced"}</p>
            <p>{victory.leveledUp ? "Level Up Unlocked" : "Progress Recorded"}</p>
            {victory.loot?.awarded ? (
              <p>
                Loot: {victory.loot.itemName} ({victory.loot.rarity}) x{victory.loot.quantity}
              </p>
            ) : (
              <p>Loot: no drop this run</p>
            )}
            <div className="flex gap-2 pt-2">
              <Button type="button" onClick={() => router.push("/")}>Back to Dashboard</Button>
              <Button type="button" variant="secondary" onClick={() => setVictory(null)}>Log Another Workout</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Session Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" value={note} onChange={(e) => setNote(e.target.value)} placeholder="How did this session feel?" />
        </CardContent>
      </Card>

      {exercises.map((exercise, index) => (
        <Card key={`${exercise.name}-${index}`}>
          <CardHeader>
            <CardTitle>Exercise {index + 1}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={exercise.name} onChange={(e) => updateExercise(index, { name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Sets</Label>
              <Input type="number" value={exercise.sets} onChange={(e) => updateExercise(index, { sets: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Reps</Label>
              <Input type="number" value={exercise.reps} onChange={(e) => updateExercise(index, { reps: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Weight (kg)</Label>
              <Input type="number" value={exercise.weightKg} onChange={(e) => updateExercise(index, { weightKg: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>RPE</Label>
              <Input type="number" step="0.5" value={exercise.rpe} onChange={(e) => updateExercise(index, { rpe: Number(e.target.value) })} />
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={addExercise}>
          Add Exercise
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Complete Workout"}
        </Button>
      </div>
    </form>
  );
}

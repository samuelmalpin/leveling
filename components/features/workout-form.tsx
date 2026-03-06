"use client";

import { useState } from "react";
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

export function WorkoutForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

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
      router.push("/");
      router.refresh();
    }
  };

  return (
    <form className="space-y-5" onSubmit={submit}>
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

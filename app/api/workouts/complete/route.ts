import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const exerciseInput = z.object({
  name: z.string().min(1),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(100),
  weightKg: z.number().min(0).max(1000),
  rpe: z.number().min(1).max(10)
});

const payloadSchema = z.object({
  notes: z.string().max(1000).optional(),
  exercises: z.array(exerciseInput).min(1)
});

export async function POST(request: Request) {
  const supabase = await createServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { notes, exercises } = parsed.data;
  const admin = createAdminClient();

  const { data: workout, error: workoutError } = await admin
    .from("workouts")
    .insert({
      user_id: user.id,
      started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      status: "completed",
      notes: notes ?? null
    })
    .select("id")
    .single();

  if (workoutError || !workout) {
    return NextResponse.json({ error: "Workout creation failed" }, { status: 500 });
  }

  for (let idx = 0; idx < exercises.length; idx += 1) {
    const row = exercises[idx];

    const { data: exerciseCatalog } = await admin
      .from("exercises")
      .select("id")
      .eq("name", row.name)
      .maybeSingle();

    let exerciseId = exerciseCatalog?.id as string | undefined;

    if (!exerciseId) {
      const { data: createdExercise, error: insertExerciseError } = await admin
        .from("exercises")
        .insert({
          name: row.name,
          category: "strength",
          primary_muscle: "chest",
          secondary_muscles: ["arms"]
        })
        .select("id")
        .single();

      if (insertExerciseError || !createdExercise) {
        return NextResponse.json({ error: "Exercise creation failed" }, { status: 500 });
      }

      exerciseId = createdExercise.id;
    }

    const { data: workoutExercise, error: workoutExerciseError } = await admin
      .from("workout_exercises")
      .insert({
        workout_id: workout.id,
        exercise_id: exerciseId,
        order_index: idx
      })
      .select("id")
      .single();

    if (workoutExerciseError || !workoutExercise) {
      return NextResponse.json({ error: "Workout exercise insert failed" }, { status: 500 });
    }

    const setRows = Array.from({ length: row.sets }).map((_, setIndex) => ({
      workout_exercise_id: workoutExercise.id,
      set_number: setIndex + 1,
      reps: row.reps,
      weight_kg: row.weightKg,
      rpe: row.rpe,
      is_warmup: false
    }));

    const { error: setError } = await admin.from("sets").insert(setRows);

    if (setError) {
      return NextResponse.json({ error: "Set insert failed" }, { status: 500 });
    }
  }

  const { data: rewards, error: rewardsError } = await admin.rpc("fn_apply_workout_rewards", {
    p_user_id: user.id,
    p_workout_id: workout.id
  });

  if (rewardsError) {
    return NextResponse.json({ error: "Reward pipeline failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rewards, workoutId: workout.id });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServer } from "@/lib/supabase/server";
import { MUSCLE_GROUPS } from "@/lib/constants";

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
  // Self-heal user bootstrap state in case signup callback/bootstrap was skipped.
  const profilePayload = {
    id: user.id,
    username: (user.user_metadata?.username as string) || user.email?.split("@")[0] || `hunter_${user.id.slice(0, 8)}`,
    display_name: user.email
  };

  const { error: userUpsertError } = await supabase.from("users").upsert(
    {
      ...profilePayload
    },
    { onConflict: "id" }
  );

  if (userUpsertError) {
    return NextResponse.json({ error: `Profile bootstrap failed: ${userUpsertError.message}` }, { status: 500 });
  }

  const { error: progressUpsertError } = await supabase
    .from("user_progress")
    .upsert({ user_id: user.id }, { onConflict: "user_id" });

  if (progressUpsertError) {
    return NextResponse.json({ error: `Progress bootstrap failed: ${progressUpsertError.message}` }, { status: 500 });
  }

  const { error: muscleUpsertError } = await supabase.from("muscle_stats").upsert(
    MUSCLE_GROUPS.map((group) => ({
      user_id: user.id,
      muscle_group: group
    })),
    { onConflict: "user_id,muscle_group" }
  );

  if (muscleUpsertError) {
    return NextResponse.json({ error: `Muscle bootstrap failed: ${muscleUpsertError.message}` }, { status: 500 });
  }

  const { error: contentBootstrapError } = await supabase.rpc("fn_grant_initial_content", { p_user_id: user.id });

  if (contentBootstrapError) {
    return NextResponse.json({ error: `Initial content bootstrap failed: ${contentBootstrapError.message}` }, { status: 500 });
  }

  const { data: workout, error: workoutError } = await supabase
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
    return NextResponse.json({ error: workoutError?.message || "Workout creation failed" }, { status: 500 });
  }

  for (let idx = 0; idx < exercises.length; idx += 1) {
    const row = exercises[idx];

    const { data: exerciseCatalog } = await supabase
      .from("exercises")
      .select("id")
      .eq("name", row.name)
      .maybeSingle();

    const exerciseId = exerciseCatalog?.id as string | undefined;

    if (!exerciseId) {
      return NextResponse.json(
        { error: `Unknown exercise: ${row.name}. Please use a seeded exercise from the catalog.` },
        { status: 400 }
      );
    }

    const { data: workoutExercise, error: workoutExerciseError } = await supabase
      .from("workout_exercises")
      .insert({
        workout_id: workout.id,
        exercise_id: exerciseId,
        order_index: idx
      })
      .select("id")
      .single();

    if (workoutExerciseError || !workoutExercise) {
      return NextResponse.json({ error: workoutExerciseError?.message || "Workout exercise insert failed" }, { status: 500 });
    }

    const setRows = Array.from({ length: row.sets }).map((_, setIndex) => ({
      workout_exercise_id: workoutExercise.id,
      set_number: setIndex + 1,
      reps: row.reps,
      weight_kg: row.weightKg,
      rpe: row.rpe,
      is_warmup: false
    }));

    const { error: setError } = await supabase.from("sets").insert(setRows);

    if (setError) {
      return NextResponse.json({ error: setError.message || "Set insert failed" }, { status: 500 });
    }
  }

  const { data: rewards, error: rewardsError } = await supabase.rpc("fn_apply_workout_rewards", {
    p_user_id: user.id,
    p_workout_id: workout.id
  });

  if (rewardsError) {
    return NextResponse.json({ error: `Reward pipeline failed: ${rewardsError.message}` }, { status: 500 });
  }

  await supabase.from("product_events").insert({
    user_id: user.id,
    event_name: "workout_completed",
    payload: {
      workoutId: workout.id,
      exercises: exercises.length,
      reward: rewards
    }
  });

  return NextResponse.json({ ok: true, rewards, workoutId: workout.id });
}

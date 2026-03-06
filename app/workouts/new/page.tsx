import { requireUser } from "@/lib/auth/require-user";
import { WorkoutForm } from "@/components/features/workout-form";

export default async function NewWorkoutPage() {
  await requireUser();

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Log Workout</h2>
      <p className="text-sm text-mutedForeground">Complete your session to earn XP, muscle progression, and quest progress.</p>
      <WorkoutForm />
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MuscleStat } from "@/lib/types";

interface MuscleGridProps {
  muscles: MuscleStat[];
}

export function MuscleGrid({ muscles }: MuscleGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {muscles.map((muscle) => {
        const pct = Math.min((muscle.xp_total % 1000) / 10, 100);
        const recoveryHint = muscle.recovery_ready_at
          ? new Date(muscle.recovery_ready_at).toISOString().slice(0, 16).replace("T", " ")
          : "ready";

        return (
          <Card key={muscle.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="capitalize">{muscle.muscle_group}</CardTitle>
              <Badge>{muscle.rank}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-mutedForeground">Level {muscle.level}</p>
              <Progress value={pct} />
              <p className="text-xs text-mutedForeground">{muscle.xp_total} XP</p>
              <p className="text-xs text-mutedForeground">Fatigue: {Number(muscle.fatigue_score ?? 0).toFixed(1)}%</p>
              <p className="text-xs text-mutedForeground">Overload: {Number(muscle.overload_index ?? 0).toFixed(1)}%</p>
              <p className="text-xs text-mutedForeground">Strength Ratio: {Number(muscle.strength_ratio ?? 0).toFixed(3)}x BW</p>
              <p className="text-xs text-mutedForeground">Recovery Ready: {recoveryHint}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

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

        return (
          <Card key={muscle.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="capitalize">{muscle.muscle_group}</CardTitle>
              <Badge variant="secondary">{muscle.rank}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-mutedForeground">Level {muscle.level}</p>
              <Progress value={pct} />
              <p className="text-xs text-mutedForeground">{muscle.xp_total} XP</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

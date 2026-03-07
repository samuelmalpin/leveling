import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BodyPowerDiagram } from "@/components/features/body-power-diagram";
import { BodyPowerComparison } from "@/components/features/body-power-comparison";
import { type BodyPowerAnalysis, TRACKED_MUSCLES } from "@/lib/game/body-power";

type BodyPowerAnalysisPanelProps = {
  analysis: BodyPowerAnalysis;
};

export function BodyPowerAnalysisPanel({ analysis }: BodyPowerAnalysisPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Body Power Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
          <div className="space-y-3 rounded-xl border border-border/70 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-mutedForeground">Body Heatmap</p>
            <BodyPowerDiagram
              bodyModel={analysis.bodyModel}
              bodyPowerScore={analysis.bodyPowerScore}
              showMuscleList={false}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border/70 p-3">
                <p className="text-xs text-mutedForeground">Body Power Score</p>
                <p className="font-semibold">
                  {analysis.bodyPowerScore.toFixed(1)} · {analysis.bodyPowerRank}
                </p>
              </div>
              <div className="rounded-md border border-border/70 p-3">
                <p className="text-xs text-mutedForeground">Symmetry Score</p>
                <p className="font-semibold">
                  {analysis.symmetryScore.toFixed(1)}% · {analysis.symmetryRank}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2 rounded-xl border border-border/70 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-mutedForeground">Strongest Muscles</p>
              <div className="flex flex-wrap gap-2">
                {analysis.strongestMuscles.length === 0 ? (
                  <span className="text-mutedForeground">No data yet.</span>
                ) : (
                  analysis.strongestMuscles.map((muscle) => (
                    <Badge key={`strong-${muscle.muscle}`} variant="secondary">
                      {muscle.muscle} · Rank {analysis.bodyModel[muscle.muscle].rank}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-border/70 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-mutedForeground">Weakest Muscles</p>
              <div className="flex flex-wrap gap-2">
                {analysis.weakestMuscles.length === 0 ? (
                  <span className="text-mutedForeground">Balanced profile.</span>
                ) : (
                  analysis.weakestMuscles.map((muscle) => (
                    <Badge key={`weak-${muscle.muscle}`} variant="outline">
                      {muscle.muscle} · Rank {analysis.bodyModel[muscle.muscle].rank}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 p-3">
              <p className="text-xs text-mutedForeground">Evolution</p>
              <p className="font-semibold capitalize">{analysis.bodyEvolutionTier}</p>
              <p className="text-xs text-mutedForeground">{analysis.bodyEvolutionStage}</p>
              <p className="mt-2 text-xs text-mutedForeground">Aura: {analysis.auraEffect}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-border/70 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-mutedForeground">Recommended Training</p>
          <ul className="space-y-1 text-mutedForeground">
            {analysis.recommendedTraining.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 rounded-xl border border-border/70 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-mutedForeground">Body Model</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {TRACKED_MUSCLES.map((muscle) => {
              const row = analysis.bodyModel[muscle];
              return (
                <div key={muscle} className="rounded-md border border-border/70 px-3 py-2">
                  <p className="capitalize font-medium">{muscle}</p>
                  <p className="text-xs text-mutedForeground">
                    Lv {row.level} · {row.rank} · {row.color}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-border/70 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-mutedForeground">Motivation Engine</p>
          <p>
            <span className="font-semibold">Daily Goal:</span> {analysis.motivation.dailyGoal}
          </p>
          <p className="text-mutedForeground">{analysis.motivation.reason}</p>
          <p>
            <span className="font-semibold">Training Suggestion:</span> {analysis.motivation.trainingSuggestion}
          </p>
          <p>
            <span className="font-semibold">Reward:</span> {analysis.motivation.reward}
          </p>
          <p className="text-mutedForeground">{analysis.motivation.progressFeedback}</p>
        </div>

        <BodyPowerComparison playerAnalysis={analysis} />
      </CardContent>
    </Card>
  );
}

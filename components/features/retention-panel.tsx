type RetentionSnapshot = {
  journey_phase?: string;
  burnout_risk?: number;
  variety_score?: number;
  recovery_advice?: string;
};

const phaseLabel: Record<string, string> = {
  ignite: "Phase 1: First Week",
  build: "Phase 2: Weeks 2-4",
  identity: "Phase 3: Months 2-3",
  mastery: "Phase 4: Long-Term Mastery"
};

export function RetentionPanel({ data }: { data: RetentionSnapshot | null }) {
  const phase = data?.journey_phase ?? "ignite";
  const burnoutRisk = Number(data?.burnout_risk ?? 0);
  const varietyScore = Number(data?.variety_score ?? 0);

  return (
    <div className="rounded-lg border border-border/70 bg-card p-4 text-sm">
      <h3 className="font-semibold">Retention Engine</h3>
      <p className="mt-2 text-xs text-mutedForeground">{phaseLabel[phase] ?? "Phase 1: First Week"}</p>
      <div className="mt-3 space-y-2 text-mutedForeground">
        <p>Burnout Risk: {burnoutRisk.toFixed(1)}%</p>
        <p>Training Variety: {varietyScore.toFixed(1)}%</p>
        <p className="text-foreground">Coach Advice: {data?.recovery_advice ?? "Train as planned."}</p>
      </div>
    </div>
  );
}

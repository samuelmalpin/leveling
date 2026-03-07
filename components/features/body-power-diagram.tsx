"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  TRACKED_MUSCLES,
  getBodyEvolutionTier,
  getBodyPowerScore,
  getBodySilhouetteScale,
  muscleXpRequiredForLevel,
  type BodyModel,
  type BodyMuscle,
  type MuscleColor,
  type PlayerRank
} from "@/lib/game/body-power";

const MUSCLE_LABELS: Record<BodyMuscle, string> = {
  chest: "Chest",
  biceps: "Biceps",
  triceps: "Triceps",
  shoulders: "Shoulders",
  back: "Back",
  abs: "Abs",
  glutes: "Glutes",
  quadriceps: "Quadriceps",
  hamstrings: "Hamstrings",
  calves: "Calves"
};

const MUSCLE_FILL_CLASS: Record<MuscleColor, string> = {
  gray: "text-slate-500",
  "light green": "text-lime-300",
  green: "text-green-500",
  blue: "text-blue-500",
  purple: "text-purple-500",
  orange: "text-orange-500",
  red: "text-red-500",
  gold: "text-yellow-400"
};

const RANK_GLOW_CLASS: Partial<Record<PlayerRank, string>> = {
  S: "heatmap-glow drop-shadow-[0_0_8px_currentColor]",
  SS: "heatmap-glow drop-shadow-[0_0_11px_currentColor]",
  SSS: "heatmap-glow drop-shadow-[0_0_14px_currentColor]"
};

type BodyView = "front" | "back";

type HoverState = {
  muscle: BodyMuscle;
  level: number;
  rank: PlayerRank;
  xpTotal: number;
  xpIntoLevel: number;
  xpNeededForLevel: number;
  progressPercent: number;
};

type TooltipState = {
  muscle: BodyMuscle;
  x: number;
  y: number;
};

type BodyPowerDiagramProps = {
  bodyModel: BodyModel;
  bodyPowerScore?: number;
  title?: string;
  showMuscleList?: boolean;
  compact?: boolean;
  enableViewToggle?: boolean;
};

const FRONT_REGION_PATHS: Record<BodyMuscle, string[]> = {
  shoulders: [
    "M67 126c8-22 27-35 47-32l-9 30c-15 4-28 13-38 25z",
    "M193 126c-8-22-27-35-47-32l9 30c15 4 28 13 38 25"
  ],
  chest: ["M88 138c0-20 15-33 31-33 9 0 16 4 22 11 6-7 13-11 22-11 16 0 31 13 31 33 0 22-18 40-53 40s-53-18-53-40"],
  biceps: [
    "M49 158c5-18 22-30 37-25 9 3 15 11 16 21 2 14-4 30-19 41-8 6-19 7-28 2-11-7-14-24-6-39",
    "M211 158c-5-18-22-30-37-25-9 3-15 11-16 21-2 14 4 30 19 41 8 6 19 7 28 2 11-7 14-24 6-39"
  ],
  triceps: [
    "M52 212c2-17 13-29 28-31 9-1 18 3 23 11 8 11 8 28 1 42-6 12-16 20-28 20-17 0-29-18-24-42",
    "M208 212c-2-17-13-29-28-31-9-1-18 3-23 11-8 11-8 28-1 42 6 12 16 20 28 20 17 0 29-18 24-42"
  ],
  back: [
    "M84 178c-11 9-18 22-18 38 0 15 7 29 20 38l12-19c-7-5-11-12-11-20 0-8 3-16 9-22",
    "M196 178c11 9 18 22 18 38 0 15-7 29-20 38l-12-19c7-5 11-12 11-20 0-8-3-16-9-22"
  ],
  abs: ["M109 184c0-9 7-16 16-16h30c9 0 16 7 16 16v78c0 9-7 16-16 16h-30c-9 0-16-7-16-16z"],
  glutes: [
    "M97 274c0-14 10-24 22-24s20 10 20 24c0 15-8 26-20 26s-22-11-22-26",
    "M143 274c0-14 10-24 22-24s20 10 20 24c0 15-8 26-20 26s-22-11-22-26"
  ],
  quadriceps: [
    "M86 300c0-20 12-34 29-34s29 14 29 34v86c0 18-12 32-29 32s-29-14-29-32z",
    "M136 300c0-20 12-34 29-34s29 14 29 34v86c0 18-12 32-29 32s-29-14-29-32z"
  ],
  hamstrings: [
    "M82 312c-8 14-10 31-4 47l14 37c3 9 11 16 21 18l4-99z",
    "M178 312c8 14 10 31 4 47l-14 37c-3 9-11 16-21 18l-4-99z"
  ],
  calves: [
    "M94 406c0-16 11-28 25-28s25 12 25 28v57c0 14-11 25-25 25s-25-11-25-25z",
    "M136 406c0-16 11-28 25-28s25 12 25 28v57c0 14-11 25-25 25s-25-11-25-25z"
  ]
};

const BACK_REGION_PATHS: Record<BodyMuscle, string[]> = {
  shoulders: [
    "M63 123c8-23 28-37 49-34l-9 30c-16 4-29 14-40 28z",
    "M197 123c-8-23-28-37-49-34l9 30c16 4 29 14 40 28"
  ],
  chest: [
    "M86 160c0-15 12-25 24-25 8 0 14 4 20 10v16c-6 4-12 6-20 6-12 0-24-10-24-23",
    "M174 160c0-15-12-25-24-25-8 0-14 4-20 10v16c6 4 12 6 20 6 12 0 24-10 24-23"
  ],
  biceps: [
    "M54 166c5-16 19-26 33-22 8 2 13 8 15 17 2 12-4 26-17 35-7 5-16 6-24 2-10-6-12-20-7-32",
    "M206 166c-5-16-19-26-33-22-8 2-13 8-15 17-2 12 4 26 17 35 7 5 16 6 24 2 10-6 12-20 7-32"
  ],
  triceps: [
    "M52 210c2-19 14-33 30-35 10-1 19 3 25 11 8 12 9 30 1 46-6 13-18 22-31 22-19 0-31-19-25-44",
    "M208 210c-2-19-14-33-30-35-10-1-19 3-25 11-8 12-9 30-1 46 6 13 18 22 31 22 19 0 31-19 25-44"
  ],
  back: [
    "M84 136c9-23 27-37 46-37h0c19 0 37 14 46 37l8 23c7 19 4 40-7 57l-16 24c-5 8-14 13-23 14h-16c-9-1-18-6-23-14l-16-24c-11-17-14-38-7-57z"
  ],
  abs: ["M113 252c0-9 7-16 16-16h24c9 0 16 7 16 16v42c0 9-7 16-16 16h-24c-9 0-16-7-16-16z"],
  glutes: [
    "M96 270c0-16 11-28 24-28 12 0 21 12 21 28 0 17-9 29-21 29-13 0-24-12-24-29",
    "M139 270c0-16 11-28 24-28 12 0 21 12 21 28 0 17-9 29-21 29-13 0-24-12-24-29"
  ],
  quadriceps: [
    "M87 305c0-17 12-30 27-30s27 13 27 30v75c0 17-12 30-27 30s-27-13-27-30z",
    "M139 305c0-17 12-30 27-30s27 13 27 30v75c0 17-12 30-27 30s-27-13-27-30z"
  ],
  hamstrings: [
    "M86 309c0-20 13-35 29-35s29 15 29 35v91c0 18-13 32-29 32s-29-14-29-32z",
    "M136 309c0-20 13-35 29-35s29 15 29 35v91c0 18-13 32-29 32s-29-14-29-32z"
  ],
  calves: [
    "M95 408c0-15 11-27 24-27s24 12 24 27v55c0 14-11 25-24 25s-24-11-24-25z",
    "M137 408c0-15 11-27 24-27s24 12 24 27v55c0 14-11 25-24 25s-24-11-24-25z"
  ]
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getXpProgress(level: number, xpTotal: number): {
  xpIntoLevel: number;
  xpNeededForLevel: number;
  progressPercent: number;
} {
  const normalizedLevel = Math.max(0, Math.floor(level));
  if (normalizedLevel >= 100) {
    return {
      xpIntoLevel: 0,
      xpNeededForLevel: 0,
      progressPercent: 100
    };
  }

  const currentLevelThreshold = muscleXpRequiredForLevel(normalizedLevel);
  const nextLevelThreshold = muscleXpRequiredForLevel(normalizedLevel + 1);
  const xpNeededForLevel = Math.max(1, nextLevelThreshold - currentLevelThreshold);
  const xpIntoLevel = clamp(xpTotal - currentLevelThreshold, 0, xpNeededForLevel);
  const progressPercent = clamp((xpIntoLevel / xpNeededForLevel) * 100, 0, 100);

  return {
    xpIntoLevel,
    xpNeededForLevel,
    progressPercent
  };
}

function getMuscleFillClass(color: MuscleColor): string {
  return MUSCLE_FILL_CLASS[color];
}

export function BodyPowerDiagram({
  bodyModel,
  bodyPowerScore,
  title,
  showMuscleList = true,
  compact = false,
  enableViewToggle = true
}: BodyPowerDiagramProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [bodyView, setBodyView] = useState<BodyView>("front");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const resolvedBodyPowerScore = bodyPowerScore ?? getBodyPowerScore(bodyModel);
  const bodyEvolutionTier = getBodyEvolutionTier(resolvedBodyPowerScore);
  const silhouetteScale = getBodySilhouetteScale(resolvedBodyPowerScore);
  const silhouetteTranslateX = 130 * (1 - silhouetteScale);

  const hoverState = useMemo<HoverState | null>(() => {
    if (!tooltip) {
      return null;
    }

    const muscleKey = tooltip.muscle as BodyMuscle;
    const muscle = bodyModel[muscleKey];
    const progress = getXpProgress(muscle.level, muscle.xp);

    return {
      muscle: muscleKey,
      level: muscle.level,
      rank: muscle.rank,
      xpTotal: muscle.xp,
      xpIntoLevel: progress.xpIntoLevel,
      xpNeededForLevel: progress.xpNeededForLevel,
      progressPercent: progress.progressPercent
    };
  }, [bodyModel, tooltip]);

  const regionClass = (muscle: BodyMuscle) => {
    const rank = bodyModel[muscle].rank;
    return [
      "heatmap-region",
      getMuscleFillClass(bodyModel[muscle].color),
      "fill-current",
      "stroke-[hsl(var(--border))]",
      "stroke-[1.2]",
      "transition-[fill,opacity,filter,transform]",
      "duration-500",
      "ease-out",
      RANK_GLOW_CLASS[rank] ?? ""
    ]
      .filter(Boolean)
      .join(" ");
  };

  const handleRegionMove = (event: MouseEvent<SVGPathElement>, muscle: BodyMuscle) => {
    const container = wrapperRef.current;
    if (!container) {
      return;
    }

    const bounds = container.getBoundingClientRect();
    setTooltip({
      muscle,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    });
  };

  const regions = bodyView === "front" ? FRONT_REGION_PATHS : BACK_REGION_PATHS;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {title ? <p className="text-sm font-semibold">{title}</p> : <span />}

        {enableViewToggle ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={bodyView === "front" ? "secondary" : "outline"}
              onClick={() => setBodyView("front")}
              aria-pressed={bodyView === "front"}
            >
              Front View
            </Button>
            <Button
              type="button"
              size="sm"
              variant={bodyView === "back" ? "secondary" : "outline"}
              onClick={() => setBodyView("back")}
              aria-pressed={bodyView === "back"}
            >
              Back View
            </Button>
          </div>
        ) : null}
      </div>

      <div
        ref={wrapperRef}
        className="relative overflow-hidden rounded-xl border border-border/70 bg-card/40 p-3"
        onMouseLeave={() => setTooltip(null)}
      >
        <svg
          viewBox="0 0 260 520"
          className={`mx-auto h-auto w-full ${compact ? "max-w-[18rem]" : "max-w-[25rem]"}`}
          role="img"
          aria-label="Body heatmap diagram"
        >
          <title>Body heatmap visualization</title>
          <defs>
            <linearGradient id="heatmapGloss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.45" />
              <stop offset="45%" stopColor="white" stopOpacity="0.12" />
              <stop offset="100%" stopColor="black" stopOpacity="0.18" />
            </linearGradient>
            <linearGradient id="heatmapEdge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.18" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g transform={`translate(${silhouetteTranslateX} 0) scale(${silhouetteScale} 1)`}>
            <g className="fill-muted/25 stroke-border" strokeWidth="1.2">
              <circle cx="130" cy="44" r="27" />
              <path d="M92 78h76l15 36-9 57-12 20v63l-8 130c-1 13-11 23-24 23h-1c-13 0-23-10-24-23l-8-130v-63l-12-20-9-57z" />
            </g>

            {TRACKED_MUSCLES.flatMap((muscle) =>
              regions[muscle].map((path, index) => (
                <g key={`${bodyView}-${muscle}-${index}`}>
                  <path
                    d={path}
                    id={`${bodyView}-${muscle}-${index}`}
                    className={regionClass(muscle)}
                    onMouseEnter={(event: MouseEvent<SVGPathElement>) => handleRegionMove(event, muscle)}
                    onMouseMove={(event: MouseEvent<SVGPathElement>) => handleRegionMove(event, muscle)}
                  />
                  <path d={path} fill="url(#heatmapGloss)" opacity="0.7" pointerEvents="none" />
                  <path d={path} fill="url(#heatmapEdge)" opacity="0.35" pointerEvents="none" />
                </g>
              ))
            )}
          </g>
        </svg>

        <p className="mt-2 text-center text-xs text-mutedForeground capitalize">
          Evolution Tier: {bodyEvolutionTier} · Body Power {resolvedBodyPowerScore.toFixed(1)}
        </p>

        {hoverState && tooltip ? (
          <div
            className="pointer-events-none absolute z-20 w-44 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs shadow-xl"
            style={{
              left: `${Math.min(Math.max(tooltip.x + 12, 8), 220)}px`,
              top: `${Math.min(Math.max(tooltip.y + 12, 8), 430)}px`
            }}
          >
            <p className="font-semibold">{MUSCLE_LABELS[hoverState.muscle as BodyMuscle]}</p>
            <p className="text-mutedForeground">Level {hoverState.level}</p>
            <p className="text-mutedForeground">Rank {hoverState.rank}</p>
            <p className="text-mutedForeground">
              XP: {hoverState.level >= 100 ? "MAX" : `${hoverState.xpIntoLevel} / ${hoverState.xpNeededForLevel}`}
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${hoverState.progressPercent}%` }} />
            </div>
          </div>
        ) : null}
      </div>

      {showMuscleList ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {TRACKED_MUSCLES.map((muscle) => {
            const row = bodyModel[muscle];
            return (
              <div key={muscle} className="rounded-md border border-border/70 px-3 py-2 text-xs">
                <p className="font-medium">{MUSCLE_LABELS[muscle]}</p>
                <p className="text-mutedForeground">
                  Lv {row.level} · {row.rank}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

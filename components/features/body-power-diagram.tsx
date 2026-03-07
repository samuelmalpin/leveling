"use client";

import { useMemo, useState } from "react";
import {
  TRACKED_MUSCLES,
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

type HoverState = {
  muscle: BodyMuscle;
  level: number;
  rank: PlayerRank;
  xpTotal: number;
  xpIntoLevel: number;
  xpNeededForLevel: number;
  progressPercent: number;
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

export function BodyPowerDiagram({ bodyModel }: { bodyModel: BodyModel }) {
  const [hoveredMuscle, setHoveredMuscle] = useState<BodyMuscle | null>(null);

  const hoverState = useMemo<HoverState | null>(() => {
    if (!hoveredMuscle) {
      return null;
    }

    const muscle = bodyModel[hoveredMuscle];
    const progress = getXpProgress(muscle.level, muscle.xp);

    return {
      muscle: hoveredMuscle,
      level: muscle.level,
      rank: muscle.rank,
      xpTotal: muscle.xp,
      xpIntoLevel: progress.xpIntoLevel,
      xpNeededForLevel: progress.xpNeededForLevel,
      progressPercent: progress.progressPercent
    };
  }, [bodyModel, hoveredMuscle]);

  const regionClass = (muscle: BodyMuscle) =>
    `${getMuscleFillClass(bodyModel[muscle].color)} fill-current transition-opacity duration-150 hover:opacity-90`;

  const onRegionEnter = (muscle: BodyMuscle) => setHoveredMuscle(muscle);

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border/70 bg-card/40 p-3" onMouseLeave={() => setHoveredMuscle(null)}>
        <svg viewBox="0 0 360 430" className="mx-auto h-auto w-full max-w-[30rem]" role="img" aria-label="Body power diagram">
          <title>Body power muscle visualization</title>

          <g className="fill-muted/35 stroke-border" strokeWidth="1.2">
            <circle cx="96" cy="38" r="18" />
            <path d="M68 64 L124 64 L140 120 L126 208 L116 356 L76 356 L66 208 L52 120 Z" />
            <circle cx="266" cy="38" r="18" />
            <path d="M238 64 L294 64 L310 120 L296 208 L286 356 L246 356 L236 208 L222 120 Z" />
          </g>

          <g id="shoulders" className={regionClass("shoulders")} onMouseEnter={() => onRegionEnter("shoulders")}> 
            <path d="M56 78 C62 64, 78 58, 94 64 L90 88 C78 90, 66 92, 56 98 Z" />
            <path d="M98 64 C114 58, 130 64, 136 78 L136 98 C126 92, 114 90, 102 88 Z" />
            <path d="M226 78 C232 64, 248 58, 264 64 L260 88 C248 90, 236 92, 226 98 Z" />
            <path d="M268 64 C284 58, 300 64, 306 78 L306 98 C296 92, 284 90, 272 88 Z" />
          </g>

          <g id="chest" className={regionClass("chest")} onMouseEnter={() => onRegionEnter("chest")}> 
            <path d="M76 98 L116 98 L126 138 L96 148 L66 138 Z" />
          </g>

          <g id="biceps" className={regionClass("biceps")} onMouseEnter={() => onRegionEnter("biceps")}> 
            <rect x="42" y="100" width="18" height="48" rx="9" />
            <rect x="132" y="100" width="18" height="48" rx="9" />
          </g>

          <g id="triceps" className={regionClass("triceps")} onMouseEnter={() => onRegionEnter("triceps")}> 
            <rect x="42" y="150" width="18" height="52" rx="9" />
            <rect x="132" y="150" width="18" height="52" rx="9" />
            <rect x="222" y="112" width="18" height="56" rx="9" />
            <rect x="292" y="112" width="18" height="56" rx="9" />
          </g>

          <g id="abs" className={regionClass("abs")} onMouseEnter={() => onRegionEnter("abs")}> 
            <rect x="80" y="152" width="32" height="70" rx="10" />
          </g>

          <g id="quadriceps" className={regionClass("quadriceps")} onMouseEnter={() => onRegionEnter("quadriceps")}> 
            <rect x="76" y="226" width="17" height="74" rx="8" />
            <rect x="99" y="226" width="17" height="74" rx="8" />
          </g>

          <g id="calves" className={regionClass("calves")} onMouseEnter={() => onRegionEnter("calves")}> 
            <rect x="78" y="306" width="15" height="56" rx="8" />
            <rect x="99" y="306" width="15" height="56" rx="8" />
            <rect x="248" y="306" width="15" height="56" rx="8" />
            <rect x="269" y="306" width="15" height="56" rx="8" />
          </g>

          <g id="back" className={regionClass("back")} onMouseEnter={() => onRegionEnter("back")}> 
            <path d="M246 98 L286 98 L300 174 L266 192 L232 174 Z" />
          </g>

          <g id="glutes" className={regionClass("glutes")} onMouseEnter={() => onRegionEnter("glutes")}> 
            <ellipse cx="256" cy="222" rx="20" ry="16" />
            <ellipse cx="276" cy="222" rx="20" ry="16" />
          </g>

          <g id="hamstrings" className={regionClass("hamstrings")} onMouseEnter={() => onRegionEnter("hamstrings")}> 
            <rect x="246" y="242" width="17" height="64" rx="8" />
            <rect x="269" y="242" width="17" height="64" rx="8" />
          </g>
        </svg>
      </div>

      {hoverState ? (
        <div className="rounded-md border border-border/70 p-3 text-sm">
          <p className="font-semibold">{MUSCLE_LABELS[hoverState.muscle]}</p>
          <p className="text-mutedForeground">
            Level {hoverState.level} · Rank {hoverState.rank}
          </p>
          <p className="text-mutedForeground">
            XP Progress: {hoverState.level >= 100 ? "MAX" : `${hoverState.xpIntoLevel}/${hoverState.xpNeededForLevel}`}
          </p>
          <div className="mt-2 h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${hoverState.progressPercent}%` }} />
          </div>
          <p className="mt-1 text-xs text-mutedForeground">Total XP: {hoverState.xpTotal}</p>
        </div>
      ) : (
        <p className="text-xs text-mutedForeground">Hover a muscle region to view level, rank, and XP progress.</p>
      )}

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
    </div>
  );
}

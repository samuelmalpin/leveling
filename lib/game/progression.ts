const MAX_LEVEL = 100;

export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;

  let level = 1;
  let threshold = 0;

  while (level < MAX_LEVEL) {
    const next = xpForNextLevel(level);
    if (threshold + next > xp) break;
    threshold += next;
    level += 1;
  }

  return level;
}

export function xpForNextLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.floor(120 * Math.pow(level, 1.7));
}

export function muscleLevelFromXp(xp: number): number {
  if (xp <= 0) return 1;

  let level = 1;
  let threshold = 0;

  while (level < MAX_LEVEL) {
    const next = xpForNextMuscleLevel(level);
    if (threshold + next > xp) break;
    threshold += next;
    level += 1;
  }

  return level;
}

export function xpForNextMuscleLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.floor(80 * Math.pow(level, 1.8));
}

export function rankFromLevel(level: number): string {
  if (level < 5) return "E";
  if (level < 15) return "D";
  if (level < 30) return "C";
  if (level < 50) return "B";
  if (level < 70) return "A";
  if (level < 80) return "S";
  if (level < 90) return "SS";
  return "SSS";
}

export function rankFromMuscleLevel(level: number): string {
  return rankFromLevel(level);
}

export function muscleFatigueModifier(sessionsThisWeek: number): number {
  const sessions = Math.max(1, Math.floor(sessionsThisWeek));

  if (sessions === 1) return 1;
  if (sessions === 2) return 0.9;
  if (sessions === 3) return 0.75;
  if (sessions === 4) return 0.6;
  return 0.4;
}

export function streakBonus(streakDays: number): number {
  return Math.min(1 + streakDays * 0.01, 1.2);
}

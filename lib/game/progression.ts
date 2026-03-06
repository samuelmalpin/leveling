export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;

  let level = 1;
  let threshold = 0;

  while (true) {
    const next = xpForNextLevel(level);
    if (threshold + next > xp) break;
    threshold += next;
    level += 1;

    if (level > 200) break;
  }

  return level;
}

export function xpForNextLevel(level: number): number {
  if (level < 10) {
    return 120 + level * 30;
  }

  if (level < 40) {
    return 500 + level * level * 4;
  }

  return Math.floor(2800 + Math.pow(level, 1.45) * 40);
}

export function rankFromMuscleLevel(level: number): string {
  if (level < 5) return "E";
  if (level < 10) return "D";
  if (level < 18) return "C";
  if (level < 28) return "B";
  if (level < 40) return "A";
  if (level < 55) return "S";
  if (level < 75) return "SS";
  return "SSS";
}

export function muscleFatigueModifier(lastTrainedAt?: Date | null): number {
  if (!lastTrainedAt) return 1;

  const elapsedHours = (Date.now() - lastTrainedAt.getTime()) / (1000 * 60 * 60);

  if (elapsedHours < 12) return 0.55;
  if (elapsedHours < 24) return 0.7;
  if (elapsedHours < 36) return 0.85;

  return 1;
}

export function streakBonus(streakDays: number): number {
  return Math.min(1 + streakDays * 0.01, 1.2);
}

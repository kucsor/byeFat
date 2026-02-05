export const XP_PER_LEVEL_CONSTANT = 500;

/**
 * Calculates the level based on total XP.
 * Formula: Level = Math.floor(Math.sqrt(xp / 500)) + 1
 * Level 1 = 0-499 XP
 * Level 2 = 500-1999 XP
 * Level 10 = 50,000 XP
 */
export function calculateLevel(xp: number): number {
  if (xp < 0) return 1;
  return Math.floor(Math.sqrt(xp / XP_PER_LEVEL_CONSTANT)) + 1;
}

/**
 * Calculates the total XP required to reach a specific level.
 * Formula: XP = (Level - 1)^2 * 500
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * XP_PER_LEVEL_CONSTANT;
}

/**
 * Returns progress towards the next level as a percentage (0-100)
 * and the specific XP values.
 */
export function getLevelProgress(xp: number) {
  const currentLevel = calculateLevel(xp);
  const nextLevel = currentLevel + 1;

  const currentLevelBaseXP = xpForLevel(currentLevel);
  const nextLevelXP = xpForLevel(nextLevel);

  const xpInCurrentLevel = xp - currentLevelBaseXP;
  const xpRequiredForNext = nextLevelXP - currentLevelBaseXP;

  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpRequiredForNext) * 100));

  return {
    currentLevel,
    nextLevel,
    currentXP: xp,
    xpInLevel: xpInCurrentLevel,
    xpRequired: xpRequiredForNext,
    progressPercent,
    nextLevelTotalXP: nextLevelXP
  };
}

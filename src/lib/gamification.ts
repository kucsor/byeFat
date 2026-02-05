export const LEVEL_THRESHOLD = 3500; // 3500 kcal = 1 lb of fat = 1 Level

export function calculateLevel(totalDeficit: number) {
  // Ensure deficit is non-negative for calculation
  const safeDeficit = Math.max(0, totalDeficit);

  const level = Math.floor(safeDeficit / LEVEL_THRESHOLD) + 1;
  const currentXP = safeDeficit % LEVEL_THRESHOLD;
  const nextLevelXP = LEVEL_THRESHOLD;
  const progress = (currentXP / nextLevelXP) * 100;

  return {
    level,
    currentXP,
    nextLevelXP,
    progress,
    totalDeficit: safeDeficit
  };
}

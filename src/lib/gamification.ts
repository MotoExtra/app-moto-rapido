// Gamification constants and utilities

export const LEVELS = [
  { level: 1, name: "Novato", minXp: 0, icon: "Zap" },
  { level: 2, name: "Entregador", minXp: 200, icon: "Bike" },
  { level: 3, name: "Profissional", minXp: 600, icon: "Flame" },
  { level: 4, name: "Veterano", minXp: 1200, icon: "Rocket" },
  { level: 5, name: "Lenda", minXp: 2000, icon: "Crown" },
] as const;

export const XP_REWARDS = {
  COMPLETE_EXTRA: 30,
  RATING_5_STARS: 15,
  RATING_4_STARS: 8,
  RATING_BAD: -20,
  STREAK_3: 20,
  STREAK_7: 50,
  STREAK_14: 120,
  STREAK_30: 300,
  DAILY_CHALLENGE: 25,
  WEEKLY_CHALLENGE: 80,
  CANCELLATION: -50,
} as const;

export function getLevelInfo(level: number) {
  return LEVELS.find(l => l.level === level) || LEVELS[0];
}

export function getLevelForXp(xp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

export function getNextLevelInfo(currentLevel: number) {
  const nextLevel = LEVELS.find(l => l.level === currentLevel + 1);
  return nextLevel || null;
}

export function getXpProgress(totalXp: number, currentLevel: number) {
  const currentLevelInfo = getLevelInfo(currentLevel);
  const nextLevelInfo = getNextLevelInfo(currentLevel);
  
  if (!nextLevelInfo) {
    return { current: totalXp, required: totalXp, percentage: 100 };
  }
  
  const xpInCurrentLevel = totalXp - currentLevelInfo.minXp;
  const xpRequiredForNextLevel = nextLevelInfo.minXp - currentLevelInfo.minXp;
  const percentage = Math.min(100, Math.round((xpInCurrentLevel / xpRequiredForNextLevel) * 100));
  
  return {
    current: xpInCurrentLevel,
    required: xpRequiredForNextLevel,
    percentage,
  };
}

export function getCategoryLabel(category: string) {
  switch (category) {
    case 'quality':
      return 'Qualidade';
    case 'consistency':
      return 'Consistência';
    case 'special':
      return 'Especial';
    default:
      return category;
  }
}

export function getCategoryColor(category: string) {
  switch (category) {
    case 'quality':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'consistency':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'special':
      return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

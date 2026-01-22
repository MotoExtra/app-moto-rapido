import { MotoboyStats } from "@/hooks/useGamification";

export interface AchievementProgress {
  current: number;
  target: number;
  percentage: number;
  label: string;
}

interface UnlockCriteria {
  type: string;
  value?: number;
  min_ratings?: number;
}

interface RatingStats {
  rating_5_count: number;
  avg_rating: number;
  total_ratings: number;
  streak_good_rating: number;
}

export function calculateAchievementProgress(
  unlockCriteria: unknown,
  stats: MotoboyStats | null,
  ratingStats: RatingStats | null
): AchievementProgress | null {
  if (!stats && !ratingStats) return null;
  
  const criteria = unlockCriteria as UnlockCriteria;
  if (!criteria || !criteria.type) return null;

  switch (criteria.type) {
    case "rating_5_count": {
      const current = ratingStats?.rating_5_count || 0;
      const target = criteria.value || 1;
      return {
        current,
        target,
        percentage: Math.min((current / target) * 100, 100),
        label: `${current}/${target} avaliações 5★`
      };
    }

    case "avg_rating": {
      const current = ratingStats?.avg_rating || 0;
      const target = criteria.value || 5;
      const minRatings = criteria.min_ratings || 0;
      const hasMinRatings = (ratingStats?.total_ratings || 0) >= minRatings;
      
      if (!hasMinRatings && minRatings > 0) {
        const currentRatings = ratingStats?.total_ratings || 0;
        return {
          current: currentRatings,
          target: minRatings,
          percentage: Math.min((currentRatings / minRatings) * 100, 100),
          label: `${currentRatings}/${minRatings} avaliações necessárias`
        };
      }
      
      return {
        current: parseFloat(current.toFixed(1)),
        target,
        percentage: Math.min((current / target) * 100, 100),
        label: `Média ${current.toFixed(1)}/${target}★`
      };
    }

    case "streak_good_rating": {
      const current = ratingStats?.streak_good_rating || 0;
      const target = criteria.value || 1;
      return {
        current,
        target,
        percentage: Math.min((current / target) * 100, 100),
        label: `${current}/${target} sem avaliação ruim`
      };
    }

    case "streak": {
      const current = stats?.current_streak || 0;
      const target = criteria.value || 1;
      return {
        current,
        target,
        percentage: Math.min((current / target) * 100, 100),
        label: `${current}/${target} dias seguidos`
      };
    }

    case "no_cancel_streak": {
      const current = stats?.extras_without_cancel || 0;
      const target = criteria.value || 1;
      return {
        current,
        target,
        percentage: Math.min((current / target) * 100, 100),
        label: `${current}/${target} extras sem cancelar`
      };
    }

    case "completed_extras": {
      const current = stats?.completed_extras || 0;
      const target = criteria.value || 1;
      return {
        current,
        target,
        percentage: Math.min((current / target) * 100, 100),
        label: `${current}/${target} extras completos`
      };
    }

    case "total_xp": {
      const current = stats?.total_xp || 0;
      const target = criteria.value || 1;
      return {
        current,
        target,
        percentage: Math.min((current / target) * 100, 100),
        label: `${current}/${target} XP`
      };
    }

    default:
      return null;
  }
}

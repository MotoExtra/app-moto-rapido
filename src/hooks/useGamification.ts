import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/useNotificationSound";

export interface MotoboyStats {
  user_id: string;
  total_xp: number;
  current_level: number;
  completed_extras: number;
  total_cancellations: number;
  current_streak: number;
  best_streak: number;
  last_work_date: string | null;
  weekly_xp: number;
  extras_without_cancel: number;
}

export interface RatingStats {
  rating_5_count: number;
  avg_rating: number;
  total_ratings: number;
  streak_good_rating: number;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xp_reward: number;
  unlock_criteria: unknown;
  sort_order: number;
}

export interface UnlockedAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  seen: boolean;
  achievement?: Achievement;
}

export function useGamification(userId?: string) {
  const [stats, setStats] = useState<MotoboyStats | null>(null);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);
  const [levelUpInfo, setLevelUpInfo] = useState<{ show: boolean; newLevel: number }>({ show: false, newLevel: 1 });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { playAchievement } = useNotificationSound();

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch stats
        const { data: statsData, error: statsError } = await supabase
          .from("motoboy_stats")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (statsError) throw statsError;
        
        // If no stats exist, create initial stats
        if (!statsData) {
          const { data: newStats, error: createError } = await supabase
            .from("motoboy_stats")
            .insert({ user_id: userId })
            .select()
            .single();
          
          if (createError) throw createError;
          setStats(newStats);
        } else {
          setStats(statsData);
        }

        // Fetch all achievements
        const { data: achievementsData, error: achievementsError } = await supabase
          .from("achievements")
          .select("*")
          .order("sort_order", { ascending: true });

        if (achievementsError) throw achievementsError;
        setAchievements(achievementsData || []);

        // Fetch unlocked achievements
        const { data: unlockedData, error: unlockedError } = await supabase
          .from("motoboy_achievements")
          .select("*, achievement:achievements(*)")
          .eq("user_id", userId);

        if (unlockedError) throw unlockedError;
        setUnlockedAchievements(unlockedData || []);

        // Fetch rating stats for achievement progress
        const { data: ratingsData } = await supabase
          .from("ratings")
          .select("rating")
          .eq("motoboy_id", userId)
          .eq("rating_type", "restaurant_to_motoboy");

        if (ratingsData && ratingsData.length > 0) {
          const ratings = ratingsData.map(r => r.rating);
          const rating5Count = ratings.filter(r => r === 5).length;
          const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          const totalRatings = ratings.length;
          
          // Calculate streak of good ratings (4 or 5 stars)
          let streakGoodRating = 0;
          for (let i = ratings.length - 1; i >= 0; i--) {
            if (ratings[i] >= 4) {
              streakGoodRating++;
            } else {
              break;
            }
          }

          setRatingStats({
            rating_5_count: rating5Count,
            avg_rating: avgRating,
            total_ratings: totalRatings,
            streak_good_rating: streakGoodRating
          });
        } else {
          setRatingStats({
            rating_5_count: 0,
            avg_rating: 0,
            total_ratings: 0,
            streak_good_rating: 0
          });
        }

      } catch (error) {
        console.error("Error fetching gamification data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Subscribe to stats changes
    const channel = supabase
      .channel(`gamification-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motoboy_stats',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            const newStats = payload.new as MotoboyStats;
            
            // Check for level up
            if (stats && newStats.current_level > stats.current_level) {
              setLevelUpInfo({ show: true, newLevel: newStats.current_level });
            }
            
            setStats(newStats);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'motoboy_achievements',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            // Fetch the achievement details
            supabase
              .from("achievements")
              .select("*")
              .eq("id", (payload.new as any).achievement_id)
              .single()
              .then(({ data }) => {
                if (data) {
                  const newUnlocked = {
                    ...(payload.new as UnlockedAchievement),
                    achievement: data
                  };
                  setUnlockedAchievements(prev => [...prev, newUnlocked]);
                  
                  // Play achievement sound
                  playAchievement();
                  
                  // Trigger haptic vibration
                  if (navigator.vibrate) {
                    navigator.vibrate([50, 30, 100]); // quick celebratory pulse
                  }
                  
                  // Show toast for new achievement
                  toast({
                    title: "🏆 Conquista Desbloqueada!",
                    description: `${data.name} - +${data.xp_reward} XP`,
                  });
                }
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  const refetch = async () => {
    if (!userId) return;
    
    const { data } = await supabase
      .from("motoboy_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (data) setStats(data);
  };

  const dismissLevelUp = () => {
    setLevelUpInfo({ show: false, newLevel: levelUpInfo.newLevel });
  };

  return {
    stats,
    ratingStats,
    achievements,
    unlockedAchievements,
    isLoading,
    refetch,
    levelUpInfo,
    dismissLevelUp,
  };
}

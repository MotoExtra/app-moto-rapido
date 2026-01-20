import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);
  const [levelUpInfo, setLevelUpInfo] = useState<{ show: boolean; newLevel: number }>({ show: false, newLevel: 1 });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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
    achievements,
    unlockedAchievements,
    isLoading,
    refetch,
    levelUpInfo,
    dismissLevelUp,
  };
}

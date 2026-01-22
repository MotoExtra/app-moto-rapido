import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RankingEntry {
  rank_position: number;
  user_id: string;
  name: string;
  avatar_url: string | null;
  total_xp: number;
  current_level: number;
  weekly_xp: number;
  completed_extras: number;
  current_streak: number;
  score: number;
}

export interface RankingReward {
  id: string;
  rank_position: number;
  period_type: string;
  reward_description: string;
}

export function useRanking(limit: number = 50) {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [rewards, setRewards] = useState<RankingReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserPosition, setCurrentUserPosition] = useState<number | null>(null);
  const previousPositionRef = useRef<number | null>(null);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    const fetchRanking = async () => {
      setIsLoading(true);
      try {
        // Fetch ranking using the database function
        const { data: rankingData, error: rankingError } = await supabase
          .rpc("get_weekly_ranking", { p_limit: limit });

        if (rankingError) throw rankingError;
        setRanking(rankingData || []);

        // Get current user's position
        const { data: { user } } = await supabase.auth.getUser();
        if (user && rankingData) {
          const userEntry = rankingData.find((r: RankingEntry) => r.user_id === user.id);
          const newPosition = userEntry ? userEntry.rank_position : null;
          setCurrentUserPosition(newPosition);

          // Check for position improvement and notify
          if (newPosition && !hasCheckedRef.current) {
            hasCheckedRef.current = true;
            
            // Get stored previous position from localStorage
            const storageKey = `ranking_position_${user.id}`;
            const storedPosition = localStorage.getItem(storageKey);
            const oldPosition = storedPosition ? parseInt(storedPosition, 10) : null;
            
            // Update stored position
            localStorage.setItem(storageKey, String(newPosition));
            
            // If position improved, trigger notification
            if (oldPosition && newPosition < oldPosition) {
              console.log(`Ranking improved: ${oldPosition} -> ${newPosition}`);
              
              try {
                await supabase.functions.invoke("notify-ranking-change", {
                  body: {
                    user_id: user.id,
                    old_position: oldPosition,
                    new_position: newPosition,
                  },
                });
              } catch (notifyError) {
                console.error("Error sending ranking change notification:", notifyError);
              }
            }
            
            previousPositionRef.current = newPosition;
          }
        }

        // Fetch rewards
        const { data: rewardsData, error: rewardsError } = await supabase
          .from("ranking_rewards")
          .select("*")
          .eq("is_active", true)
          .eq("period_type", "weekly")
          .order("rank_position", { ascending: true });

        if (rewardsError) throw rewardsError;
        setRewards(rewardsData || []);

      } catch (error) {
        console.error("Error fetching ranking:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRanking();
  }, [limit]);

  return {
    ranking,
    rewards,
    isLoading,
    currentUserPosition,
  };
}

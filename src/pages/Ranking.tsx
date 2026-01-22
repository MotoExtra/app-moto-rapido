import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Package, Clock } from "lucide-react";
import { useRanking } from "@/hooks/useRanking";
import { Skeleton } from "@/components/ui/skeleton";
import { RankingHeader } from "@/components/ranking/RankingHeader";
import { PodiumDisplay } from "@/components/ranking/PodiumDisplay";
import { RankingCard } from "@/components/ranking/RankingCard";
import { useNotificationSound } from "@/hooks/useNotificationSound";

const Ranking = () => {
  const navigate = useNavigate();
  const { playLevelUp } = useNotificationSound();
  const hasTriggeredCelebration = useRef(false);
  const { ranking, rewards, isLoading, currentUserPosition } = useRanking();

  const getRewardForPosition = (position: number) => {
    return rewards.find(r => r.rank_position === position)?.reward_description;
  };

  const topThree = ranking.slice(0, 3);
  const others = ranking.slice(3);
  const topScore = ranking[0]?.score || 0;

  // Get current user id for highlighting
  const getCurrentUserId = () => {
    const userEntry = ranking.find(r => r.rank_position === currentUserPosition);
    return userEntry?.user_id;
  };
  const currentUserId = getCurrentUserId();

  // Celebrate Top 3 entry
  useEffect(() => {
    if (
      !isLoading &&
      currentUserPosition &&
      currentUserPosition <= 3 &&
      !hasTriggeredCelebration.current
    ) {
      const storageKey = `top3_celebrated_${currentUserId}`;
      const alreadyCelebrated = localStorage.getItem(storageKey);

      if (!alreadyCelebrated) {
        hasTriggeredCelebration.current = true;

        // Play celebration sound
        playLevelUp();

        // Trigger haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100, 50, 200, 100, 300]);
        }

        // Fire confetti celebration
        const duration = 3000;
        const animationEnd = Date.now() + duration;

        const fireConfetti = () => {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) return;

          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: ["#f97316", "#fbbf24", "#fcd34d", "#ffffff"],
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: ["#f97316", "#fbbf24", "#fcd34d", "#ffffff"],
          });

          requestAnimationFrame(fireConfetti);
        };

        // Burst at start
        confetti({
          particleCount: 100,
          spread: 100,
          origin: { y: 0.6 },
          colors: ["#f97316", "#fbbf24", "#fcd34d", "#ffffff", "#ea580c"],
        });

        fireConfetti();

        // Mark as celebrated
        localStorage.setItem(storageKey, "true");
      }
    }
  }, [isLoading, currentUserPosition, currentUserId, playLevelUp]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-4">
          <Skeleton className="h-8 w-32 bg-white/30" />
          <Skeleton className="h-20 w-full mt-4 bg-white/30" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-48 w-full" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Header */}
      <RankingHeader currentUserPosition={currentUserPosition} />

      {/* Content */}
      <div className="p-4 space-y-6 pb-28">
        {ranking.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              </motion.div>
              <h3 className="font-bold text-lg text-foreground mb-2">
                Nenhum ranking ainda
              </h3>
              <p className="text-sm text-muted-foreground">
                Complete extras para aparecer no ranking e ganhar prêmios!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Podium Display */}
            {topThree.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gradient-to-br from-primary/5 via-amber-500/5 to-yellow-500/5 rounded-2xl border border-primary/10 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-primary/10 to-amber-500/10 px-4 py-3 border-b border-primary/10">
                  <h2 className="font-bold text-foreground flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary fill-primary" />
                    Pódio da Semana
                  </h2>
                </div>
                <PodiumDisplay 
                  topThree={topThree} 
                  getRewardForPosition={getRewardForPosition} 
                />
              </motion.div>
            )}

            {/* Other Positions */}
            {others.length > 0 && (
              <div>
                <h2 className="font-bold text-foreground mb-3 px-1">
                  Demais Posições
                </h2>
                <div className="space-y-2">
                  {others.map((motoboy, index) => (
                    <RankingCard
                      key={motoboy.user_id}
                      motoboy={motoboy}
                      isCurrentUser={motoboy.user_id === currentUserId}
                      topScore={topScore}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t">
        <div className="flex items-center justify-around p-2">
          <Button
            variant="ghost"
            className="flex-col h-auto py-2"
            onClick={() => navigate("/home")}
          >
            <Package className="w-5 h-5 mb-1" />
            <span className="text-xs">Ofertas</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2"
            onClick={() => navigate("/extras-aceitos")}
          >
            <Clock className="w-5 h-5 mb-1" />
            <span className="text-xs">Meus Turnos</span>
          </Button>
          <Button variant="default" className="flex-col h-auto py-2 relative">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Trophy className="w-5 h-5 mb-1 fill-current" />
            </motion.div>
            <span className="text-xs">Ranking</span>
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default Ranking;

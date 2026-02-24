import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp, Trophy, Zap } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";
import { useRanking } from "@/hooks/useRanking";
import { getXpProgress, getLevelInfo, getLevelForXp } from "@/lib/gamification";

interface HomeStatsCardProps {
  userId?: string;
}

export const HomeStatsCard = ({ userId }: HomeStatsCardProps) => {
  const { stats, isLoading: gamificationLoading } = useGamification(userId);
  const { currentUserPosition, isLoading: rankingLoading } = useRanking();
  
  const isLoading = gamificationLoading || rankingLoading;
  
  const completedThisWeek = stats?.completed_extras ?? 0;
  const totalXp = stats?.total_xp ?? 0;
  const correctedLevel = getLevelForXp(totalXp).level;
  const currentLevel = Math.max(stats?.current_level ?? 1, correctedLevel);
  const xpProgress = getXpProgress(totalXp, currentLevel);
  const levelInfo = getLevelInfo(currentLevel);

  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-4"
      >
        <div className="h-20 rounded-2xl bg-gradient-to-r from-primary/5 via-transparent to-amber-500/5 animate-pulse" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="mx-4 mb-4"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-background to-amber-500/10 border border-primary/10 backdrop-blur-sm">
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/5 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-amber-500/5 blur-2xl" />
        
        <div className="relative p-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Extras completados */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-background/50"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-lg font-bold text-foreground">{completedThisWeek}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Extras semana
              </span>
            </motion.div>

            {/* XP / Nível */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-background/50"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div className="w-full">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-sm">{levelInfo.icon}</span>
                  <span className="text-xs font-medium text-foreground">Nv.{currentLevel}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div 
                    className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress.percentage}%` }}
                    transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {xpProgress.current}/{xpProgress.required} XP
              </span>
            </motion.div>

            {/* Ranking */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-background/50"
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentUserPosition && currentUserPosition <= 3 
                  ? 'bg-amber-500/10' 
                  : 'bg-muted'
              }`}>
                <Trophy className={`w-4 h-4 ${
                  currentUserPosition && currentUserPosition <= 3 
                    ? 'text-amber-500' 
                    : 'text-muted-foreground'
                }`} />
              </div>
              <div className="flex items-center gap-0.5">
                <span className="text-lg font-bold text-foreground">
                  {currentUserPosition ? `#${currentUserPosition}` : '--'}
                </span>
                {currentUserPosition && currentUserPosition <= 10 && (
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Ranking
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

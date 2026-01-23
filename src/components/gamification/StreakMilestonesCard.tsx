import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Gift, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

interface StreakMilestonesCardProps {
  currentStreak: number;
  className?: string;
}

const STREAK_MILESTONES = [
  { days: 3, xp: 20, emoji: "🌟", label: "Iniciante" },
  { days: 7, xp: 50, emoji: "⭐", label: "Dedicado" },
  { days: 14, xp: 120, emoji: "🏅", label: "Consistente" },
  { days: 30, xp: 300, emoji: "🏆", label: "Lendário" },
];

export function StreakMilestonesCard({ currentStreak, className }: StreakMilestonesCardProps) {
  const getNextMilestone = () => {
    return STREAK_MILESTONES.find(m => m.days > currentStreak);
  };

  const nextMilestone = getNextMilestone();
  const progressToNext = nextMilestone 
    ? Math.min(100, (currentStreak / nextMilestone.days) * 100)
    : 100;

  const daysToNext = nextMilestone ? nextMilestone.days - currentStreak : 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
          Bônus de Sequência
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Streak Display */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Flame className="w-6 h-6 text-orange-500 fill-orange-500" />
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground">Sequência atual</p>
              <p className="text-2xl font-black text-foreground">{currentStreak} dias</p>
            </div>
          </div>
          {nextMilestone && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Próximo bônus</p>
              <p className="text-lg font-bold text-primary">+{nextMilestone.xp} XP</p>
              <p className="text-xs text-muted-foreground">em {daysToNext} dia{daysToNext !== 1 ? 's' : ''}</p>
            </div>
          )}
          {!nextMilestone && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-lg font-bold text-emerald-500">Máximo! 🏆</p>
            </div>
          )}
        </div>

        {/* Progress to Next Milestone */}
        {nextMilestone && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso para {nextMilestone.emoji} {nextMilestone.label}</span>
              <span>{currentStreak}/{nextMilestone.days} dias</span>
            </div>
            <Progress value={progressToNext} className="h-2" />
          </div>
        )}

        {/* Milestones Grid */}
        <div className="grid grid-cols-2 gap-2">
          {STREAK_MILESTONES.map((milestone, index) => {
            const isAchieved = currentStreak >= milestone.days;
            const isNext = nextMilestone?.days === milestone.days;
            
            return (
              <motion.div
                key={milestone.days}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "relative p-3 rounded-lg border transition-all",
                  isAchieved 
                    ? "bg-emerald-500/10 border-emerald-500/30" 
                    : isNext
                    ? "bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20"
                    : "bg-muted/30 border-border/50"
                )}
              >
                {/* Achievement Badge */}
                {isAchieved && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                
                {/* Next Badge */}
                {isNext && !isAchieved && (
                  <motion.div 
                    className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Gift className="w-3 h-3 text-white" />
                  </motion.div>
                )}

                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{milestone.emoji}</span>
                  <span className={cn(
                    "text-sm font-semibold",
                    isAchieved ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                  )}>
                    {milestone.days} dias
                  </span>
                </div>
                
                <p className={cn(
                  "text-xs",
                  isAchieved ? "text-emerald-600/80 dark:text-emerald-400/80" : "text-muted-foreground"
                )}>
                  {milestone.label}
                </p>
                
                <p className={cn(
                  "text-sm font-bold mt-1",
                  isAchieved ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                )}>
                  +{milestone.xp} XP
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Motivational Message */}
        <p className="text-xs text-center text-muted-foreground pt-2 border-t">
          {currentStreak === 0 
            ? "Complete seu primeiro extra para começar sua sequência!" 
            : currentStreak < 3 
            ? `Mais ${3 - currentStreak} dia${3 - currentStreak !== 1 ? 's' : ''} para seu primeiro bônus!`
            : nextMilestone
            ? `Continue assim! Você está a ${daysToNext} dia${daysToNext !== 1 ? 's' : ''} do próximo marco.`
            : "Incrível! Você alcançou todos os marcos de sequência! 🎉"
          }
        </p>
      </CardContent>
    </Card>
  );
}

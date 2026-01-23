import { Flame, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface StreakIndicatorProps {
  streak: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showNextBonus?: boolean;
  animate?: boolean;
  className?: string;
}

const STREAK_MILESTONES = [
  { days: 3, xp: 20, emoji: "🌟" },
  { days: 7, xp: 50, emoji: "⭐" },
  { days: 14, xp: 120, emoji: "🏅" },
  { days: 30, xp: 300, emoji: "🏆" },
];

export function StreakIndicator({ 
  streak, 
  size = "md", 
  showLabel = true,
  showNextBonus = false,
  animate = true,
  className 
}: StreakIndicatorProps) {
  const sizeClasses = {
    sm: "text-xs gap-0.5",
    md: "text-sm gap-1",
    lg: "text-base gap-1.5",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const getStreakColor = () => {
    if (streak >= 30) return "text-purple-500";
    if (streak >= 14) return "text-red-500";
    if (streak >= 7) return "text-orange-500";
    if (streak >= 3) return "text-yellow-500";
    return "text-muted-foreground";
  };

  const getNextMilestone = () => {
    return STREAK_MILESTONES.find(m => m.days > streak);
  };

  const getAchievedMilestones = () => {
    return STREAK_MILESTONES.filter(m => m.days <= streak);
  };

  const nextMilestone = getNextMilestone();
  const achievedMilestones = getAchievedMilestones();

  const FlameIcon = animate && streak > 0 ? (
    <motion.div
      animate={{ 
        scale: [1, 1.1, 1],
        rotate: [0, -5, 5, 0]
      }}
      transition={{ 
        duration: 1.5, 
        repeat: Infinity,
        repeatType: "reverse"
      }}
    >
      <Flame className={cn(iconSizes[size], getStreakColor(), streak > 0 && "fill-current")} />
    </motion.div>
  ) : (
    <Flame className={cn(iconSizes[size], getStreakColor(), streak > 0 && "fill-current")} />
  );

  const tooltipContent = (
    <div className="space-y-2 text-xs">
      <div className="font-semibold">Bônus de Sequência</div>
      <div className="space-y-1">
        {STREAK_MILESTONES.map(milestone => {
          const achieved = streak >= milestone.days;
          return (
            <div 
              key={milestone.days} 
              className={cn(
                "flex items-center justify-between gap-4",
                achieved ? "text-emerald-500" : "text-muted-foreground"
              )}
            >
              <span>{milestone.emoji} {milestone.days} dias</span>
              <span className="font-medium">+{milestone.xp} XP</span>
              {achieved && <span>✓</span>}
            </div>
          );
        })}
      </div>
      {nextMilestone && (
        <div className="pt-1 border-t text-muted-foreground">
          Próximo: {nextMilestone.days - streak} dia(s) para +{nextMilestone.xp} XP
        </div>
      )}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center cursor-help", sizeClasses[size], className)}>
          {FlameIcon}
          <span className={cn("font-bold", getStreakColor())}>{streak}</span>
          {showLabel && <span className="text-muted-foreground ml-0.5">dias</span>}
          
          {showNextBonus && nextMilestone && size !== "sm" && (
            <motion.div 
              className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Gift className="w-3 h-3" />
              <span className="text-xs">
                {nextMilestone.days - streak}d → +{nextMilestone.xp}
              </span>
            </motion.div>
          )}
          
          {achievedMilestones.length > 0 && size !== "sm" && (
            <div className="flex items-center gap-0.5 ml-1">
              {achievedMilestones.slice(-2).map(m => (
                <span key={m.days} className="text-xs">{m.emoji}</span>
              ))}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
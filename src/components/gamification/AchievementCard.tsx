import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryLabel, getCategoryColor } from "@/lib/gamification";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { AchievementProgress } from "@/lib/achievementProgress";

interface AchievementCardProps {
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: AchievementProgress | null;
  className?: string;
}

export function AchievementCard({
  name,
  description,
  icon,
  category,
  xpReward,
  isUnlocked,
  progress,
  className,
}: AchievementCardProps) {
  // Get the icon component dynamically
  const IconComponent = (LucideIcons as any)[icon] || LucideIcons.Award;

  return (
    <motion.div
      initial={isUnlocked ? { scale: 0.9, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "relative rounded-xl border p-4 transition-all",
        isUnlocked
          ? "bg-card border-primary/30 shadow-sm"
          : "bg-muted/30 border-border",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
            isUnlocked
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          <IconComponent className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn(
              "font-semibold truncate",
              isUnlocked ? "text-foreground" : "text-muted-foreground"
            )}>{name}</h4>
            {isUnlocked && (
              <LucideIcons.Check className="w-4 h-4 text-primary flex-shrink-0" />
            )}
          </div>
          <p className={cn(
            "text-xs line-clamp-2 mb-2",
            isUnlocked ? "text-muted-foreground" : "text-muted-foreground/70"
          )}>
            {description}
          </p>
          
          {/* Progress bar for locked achievements */}
          {!isUnlocked && progress && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">
                  {progress.label}
                </span>
                <span className="text-[10px] font-medium text-primary">
                  {Math.round(progress.percentage)}%
                </span>
              </div>
              <Progress 
                value={progress.percentage} 
                className="h-1.5 bg-muted"
              />
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px]", getCategoryColor(category))}>
              {getCategoryLabel(category)}
            </Badge>
            <span className={cn(
              "text-xs font-medium",
              isUnlocked ? "text-primary" : "text-muted-foreground"
            )}>+{xpReward} XP</span>
          </div>
        </div>
      </div>

      {!isUnlocked && (
        <div className="absolute top-3 right-3">
          <LucideIcons.Lock className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );
}

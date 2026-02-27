import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryLabel, getCategoryColor } from "@/lib/gamification";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { AchievementProgress } from "@/lib/achievementProgress";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  unlockedAt,
  progress,
  className,
}: AchievementCardProps) {
  const IconComponent = (LucideIcons as any)[icon] || LucideIcons.Award;

  return (
    <motion.div
      initial={isUnlocked ? { scale: 0.9, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "relative rounded-xl border p-4 transition-all overflow-hidden",
        isUnlocked
          ? "bg-gradient-to-br from-primary/5 via-card to-amber-500/5 border-primary/40 shadow-md"
          : "bg-muted/30 border-border",
        className
      )}
    >
      {/* Subtle glow effect for unlocked */}
      {isUnlocked && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -translate-y-8 translate-x-8 pointer-events-none" />
      )}

      <div className="relative flex items-start gap-3">
        <motion.div
          className={cn(
            "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
            isUnlocked
              ? "bg-gradient-to-br from-primary/20 to-amber-500/20 text-primary ring-2 ring-primary/20"
              : "bg-muted text-muted-foreground"
          )}
          animate={isUnlocked ? { rotate: [0, -5, 5, 0] } : undefined}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <IconComponent className="w-6 h-6" />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className={cn(
              "font-bold truncate",
              isUnlocked ? "text-foreground" : "text-muted-foreground"
            )}>{name}</h4>
            {isUnlocked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, delay: 0.3 }}
              >
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <LucideIcons.Check className="w-3 h-3 text-primary-foreground" />
                </div>
              </motion.div>
            )}
          </div>
          <p className={cn(
            "text-xs line-clamp-2",
            isUnlocked ? "text-muted-foreground" : "text-muted-foreground/70"
          )}>
            {description}
          </p>

          {/* Unlocked date */}
          {isUnlocked && unlockedAt && (
            <p className="text-[10px] text-primary/70 mt-1 flex items-center gap-1">
              <LucideIcons.CalendarCheck className="w-3 h-3" />
              Conquistada em {format(new Date(unlockedAt), "dd MMM yyyy", { locale: ptBR })}
            </p>
          )}
          
          {/* Progress bar for locked achievements */}
          {!isUnlocked && progress && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">
                  {progress.label}
                </span>
                <span className="text-[10px] font-medium text-primary">
                  {Math.round(progress.percentage)}%
                </span>
              </div>
              {/* Dual bar for streak: best (orange) + current (green overlay) */}
              {progress.streakBest !== undefined && progress.streakCurrent !== undefined ? (
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  {/* Best streak bar (orange/primary) */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary/40 transition-all"
                    style={{ width: `${Math.min((progress.streakBest / progress.target) * 100, 100)}%` }}
                  />
                  {/* Current streak bar (green, on top) */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min((progress.streakCurrent / progress.target) * 100, 100)}%` }}
                  />
                </div>
              ) : (
                <Progress 
                  value={progress.percentage} 
                  className="h-1.5 bg-muted"
                />
              )}
              {/* Legend for streak dual bar */}
              {progress.streakBest !== undefined && progress.streakCurrent !== undefined && progress.streakBest !== progress.streakCurrent && (
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[9px] text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Atual: {progress.streakCurrent}d
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-primary/70">
                    <span className="w-2 h-2 rounded-full bg-primary/40 inline-block" />
                    Melhor: {progress.streakBest}d
                  </span>
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className={cn("text-[10px]", getCategoryColor(category))}>
              {getCategoryLabel(category)}
            </Badge>
            <span className={cn(
              "text-xs font-semibold",
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

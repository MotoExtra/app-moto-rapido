import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryLabel, getCategoryColor } from "@/lib/gamification";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface AchievementCardProps {
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  className?: string;
}

export function AchievementCard({
  name,
  description,
  icon,
  category,
  xpReward,
  isUnlocked,
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
          : "bg-muted/30 border-border opacity-60 grayscale",
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
            <h4 className="font-semibold text-foreground truncate">{name}</h4>
            {isUnlocked && (
              <LucideIcons.Check className="w-4 h-4 text-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {description}
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px]", getCategoryColor(category))}>
              {getCategoryLabel(category)}
            </Badge>
            <span className="text-xs font-medium text-primary">+{xpReward} XP</span>
          </div>
        </div>
      </div>

      {!isUnlocked && (
        <div className="absolute inset-0 rounded-xl bg-background/50 flex items-center justify-center">
          <LucideIcons.Lock className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );
}

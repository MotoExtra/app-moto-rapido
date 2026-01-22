import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { LevelBadge } from "./LevelBadge";
import { XPProgressBar } from "./XPProgressBar";
import { StreakIndicator } from "./StreakIndicator";
import { useNavigate } from "react-router-dom";

interface GamificationHeaderProps {
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  className?: string;
}

export function GamificationHeader({
  totalXp,
  currentLevel,
  currentStreak,
  className,
}: GamificationHeaderProps) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-3 border border-primary/20 cursor-pointer hover:border-primary/40 transition-colors",
        className
      )}
      onClick={() => navigate("/meu-progresso")}
    >
      <div className="flex items-center gap-3">
        {/* Level Badge */}
        <LevelBadge level={currentLevel} size="lg" />

        {/* XP Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-bold text-foreground">{totalXp} XP</span>
          </div>
          <XPProgressBar
            totalXp={totalXp}
            currentLevel={currentLevel}
            showLabels={false}
            size="sm"
          />
        </div>

        {/* Streak */}
        <div className="flex-shrink-0">
          <StreakIndicator streak={currentStreak} size="md" showLabel={false} />
        </div>
      </div>
    </div>
  );
}

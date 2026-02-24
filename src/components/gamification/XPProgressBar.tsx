import { cn } from "@/lib/utils";
import { getXpProgress, getLevelInfo, getNextLevelInfo, getLevelForXp } from "@/lib/gamification";
import { Progress } from "@/components/ui/progress";

interface XPProgressBarProps {
  totalXp: number;
  currentLevel: number;
  showLabels?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function XPProgressBar({ 
  totalXp, 
  currentLevel, 
  showLabels = true, 
  size = "md",
  className 
}: XPProgressBarProps) {
  // Calculate correct level from XP to handle DB desync
  const correctedLevel = getLevelForXp(totalXp).level;
  const effectiveLevel = Math.max(currentLevel, correctedLevel);
  
  const progress = getXpProgress(totalXp, effectiveLevel);
  const currentLevelInfo = getLevelInfo(effectiveLevel);
  const nextLevelInfo = getNextLevelInfo(effectiveLevel);

  const heightClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div className={cn("w-full", className)}>
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span className="font-medium">{currentLevelInfo.name}</span>
          {nextLevelInfo && (
            <span className="text-primary font-medium">
              {progress.current}/{progress.required} XP
            </span>
          )}
        </div>
      )}
      <Progress 
        value={progress.percentage} 
        className={cn(heightClasses[size], "bg-muted")}
      />
      {showLabels && nextLevelInfo && (
        <div className="flex justify-end mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            Próximo: {nextLevelInfo.name}
          </span>
        </div>
      )}
    </div>
  );
}

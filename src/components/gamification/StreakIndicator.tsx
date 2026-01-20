import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StreakIndicatorProps {
  streak: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animate?: boolean;
  className?: string;
}

export function StreakIndicator({ 
  streak, 
  size = "md", 
  showLabel = true,
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
    if (streak >= 14) return "text-red-500";
    if (streak >= 7) return "text-orange-500";
    if (streak >= 3) return "text-yellow-500";
    return "text-muted-foreground";
  };

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

  return (
    <div className={cn("flex items-center", sizeClasses[size], className)}>
      {FlameIcon}
      <span className={cn("font-bold", getStreakColor())}>{streak}</span>
      {showLabel && <span className="text-muted-foreground ml-0.5">dias</span>}
    </div>
  );
}

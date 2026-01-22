import { Zap, Bike, Flame, Rocket, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLevelInfo } from "@/lib/gamification";
import { motion } from "framer-motion";

interface LevelBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Bike,
  Flame,
  Rocket,
  Crown,
};

// Vibrant, exciting colors that match motoboy energy
const levelStyles: Record<number, { bg: string; icon: string; glow: string; border: string }> = {
  1: {
    bg: "bg-gradient-to-br from-slate-500 to-slate-700",
    icon: "text-white",
    glow: "shadow-lg shadow-slate-500/30",
    border: "ring-2 ring-slate-400/50",
  },
  2: {
    bg: "bg-gradient-to-br from-blue-500 to-indigo-600",
    icon: "text-white",
    glow: "shadow-lg shadow-blue-500/40",
    border: "ring-2 ring-blue-400/50",
  },
  3: {
    bg: "bg-gradient-to-br from-orange-500 to-red-600",
    icon: "text-white",
    glow: "shadow-lg shadow-orange-500/50",
    border: "ring-2 ring-orange-400/50",
  },
  4: {
    bg: "bg-gradient-to-br from-purple-500 to-fuchsia-600",
    icon: "text-white",
    glow: "shadow-lg shadow-purple-500/50",
    border: "ring-2 ring-purple-400/50",
  },
  5: {
    bg: "bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500",
    icon: "text-white drop-shadow-md",
    glow: "shadow-xl shadow-amber-500/60",
    border: "ring-2 ring-yellow-300/70",
  },
};

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
};

const iconSizes = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-7 h-7",
};

const textSizes = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export function LevelBadge({ level, size = "md", showName = false, className }: LevelBadgeProps) {
  const levelInfo = getLevelInfo(level);
  const Icon = iconMap[levelInfo.icon] || Zap;
  const style = levelStyles[level] || levelStyles[1];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1, rotate: level === 5 ? [0, -5, 5, 0] : 0 }}
        transition={{ type: "spring", stiffness: 300 }}
        className={cn(
          "rounded-full flex items-center justify-center",
          sizeClasses[size],
          style.bg,
          style.glow,
          style.border
        )}
      >
        <Icon className={cn(iconSizes[size], style.icon)} />
      </motion.div>
      {showName && (
        <div className="flex flex-col">
          <span className={cn("font-bold leading-tight", textSizes[size])}>
            {levelInfo.name}
          </span>
          <span className={cn("text-muted-foreground leading-tight", size === "lg" ? "text-sm" : "text-xs")}>
            Nível {level}
          </span>
        </div>
      )}
    </div>
  );
}

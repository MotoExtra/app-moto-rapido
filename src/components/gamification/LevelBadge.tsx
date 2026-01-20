import { User, Bike, Star, Award, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLevelInfo } from "@/lib/gamification";

interface LevelBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  User,
  Bike,
  Star,
  Award,
  Crown,
};

const levelColors: Record<number, string> = {
  1: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  2: "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  3: "bg-primary/10 text-primary border-primary/20",
  4: "bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  5: "bg-gradient-to-br from-yellow-100 to-amber-100 text-amber-600 border-amber-300 dark:from-yellow-900/30 dark:to-amber-900/30 dark:text-amber-400 dark:border-amber-700",
};

const sizeClasses = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-12 h-12 text-base",
};

const iconSizes = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-6 h-6",
};

export function LevelBadge({ level, size = "md", showName = false, className }: LevelBadgeProps) {
  const levelInfo = getLevelInfo(level);
  const Icon = iconMap[levelInfo.icon] || User;
  const colorClass = levelColors[level] || levelColors[1];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "rounded-full border flex items-center justify-center",
          sizeClasses[size],
          colorClass
        )}
      >
        <Icon className={iconSizes[size]} />
      </div>
      {showName && (
        <span className={cn("font-medium", size === "lg" ? "text-base" : "text-sm")}>
          {levelInfo.name}
        </span>
      )}
    </div>
  );
}

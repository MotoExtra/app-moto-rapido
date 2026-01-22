import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award, Zap } from "lucide-react";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { RankingEntry } from "@/hooks/useRanking";

interface PodiumDisplayProps {
  topThree: RankingEntry[];
  getRewardForPosition: (position: number) => string | undefined;
}

export function PodiumDisplay({ topThree, getRewardForPosition }: PodiumDisplayProps) {
  // Reorder for podium display: 2nd, 1st, 3rd
  const podiumOrder = [
    topThree.find(m => m.rank_position === 2),
    topThree.find(m => m.rank_position === 1),
    topThree.find(m => m.rank_position === 3),
  ].filter(Boolean) as RankingEntry[];

  const getPodiumConfig = (position: number) => {
    switch (position) {
      case 1:
        return {
          height: "h-32",
          avatarSize: "w-20 h-20",
          iconSize: "w-8 h-8",
          icon: Trophy,
          gradient: "from-yellow-400 via-amber-400 to-orange-500",
          borderColor: "border-yellow-400",
          glowColor: "shadow-yellow-400/50",
          bgGradient: "from-yellow-500/20 to-amber-500/20",
          delay: 0.2,
        };
      case 2:
        return {
          height: "h-24",
          avatarSize: "w-16 h-16",
          iconSize: "w-6 h-6",
          icon: Medal,
          gradient: "from-slate-300 via-gray-400 to-slate-500",
          borderColor: "border-slate-400",
          glowColor: "shadow-slate-400/50",
          bgGradient: "from-slate-400/20 to-gray-500/20",
          delay: 0.4,
        };
      case 3:
        return {
          height: "h-20",
          avatarSize: "w-14 h-14",
          iconSize: "w-5 h-5",
          icon: Award,
          gradient: "from-orange-400 via-amber-600 to-orange-700",
          borderColor: "border-orange-500",
          glowColor: "shadow-orange-400/50",
          bgGradient: "from-orange-500/20 to-amber-600/20",
          delay: 0.6,
        };
      default:
        return {
          height: "h-16",
          avatarSize: "w-12 h-12",
          iconSize: "w-4 h-4",
          icon: Award,
          gradient: "from-gray-400 to-gray-500",
          borderColor: "border-gray-400",
          glowColor: "shadow-gray-400/50",
          bgGradient: "from-gray-400/20 to-gray-500/20",
          delay: 0.8,
        };
    }
  };

  if (podiumOrder.length === 0) return null;

  return (
    <div className="relative py-8">
      {/* Confetti effect behind 1st place */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.3 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="w-40 h-40 rounded-full bg-gradient-radial from-yellow-400/40 to-transparent blur-2xl"
        />
      </div>

      <div className="flex items-end justify-center gap-3 relative z-10">
        {podiumOrder.map((motoboy, index) => {
          const config = getPodiumConfig(motoboy.rank_position);
          const Icon = config.icon;
          const reward = getRewardForPosition(motoboy.rank_position);

          return (
            <motion.div
              key={motoboy.user_id}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ 
                delay: config.delay, 
                duration: 0.5, 
                type: "spring",
                stiffness: 100 
              }}
              className="flex flex-col items-center"
            >
              {/* Avatar and Icon */}
              <div className="relative mb-2">
                <motion.div
                  animate={{ 
                    boxShadow: motoboy.rank_position === 1 
                      ? ["0 0 20px rgba(251, 191, 36, 0.5)", "0 0 40px rgba(251, 191, 36, 0.8)", "0 0 20px rgba(251, 191, 36, 0.5)"]
                      : undefined
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`rounded-full p-1 bg-gradient-to-br ${config.gradient}`}
                >
                  <Avatar className={`${config.avatarSize} border-2 border-background`}>
                    <AvatarImage src={motoboy.avatar_url || undefined} />
                    <AvatarFallback className="text-lg font-bold">
                      {motoboy.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                
                {/* Position Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: config.delay + 0.3, type: "spring" }}
                  className={`absolute -top-2 -right-2 p-1.5 rounded-full bg-gradient-to-br ${config.gradient} shadow-lg ${config.glowColor}`}
                >
                  <Icon className={`${config.iconSize} text-white fill-white`} />
                </motion.div>
              </div>

              {/* Name */}
              <h3 className="font-bold text-sm text-foreground truncate max-w-[80px] text-center">
                {motoboy.name?.split(' ')[0]}
              </h3>

              {/* Score */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <Zap className="w-3 h-3 fill-primary text-primary" />
                <span className="font-semibold">{Math.round(motoboy.score)}</span>
              </div>

              {/* Podium Platform */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                transition={{ delay: config.delay + 0.2, duration: 0.4 }}
                className={`${config.height} w-20 rounded-t-lg bg-gradient-to-b ${config.bgGradient} border-t-2 border-x-2 ${config.borderColor} flex flex-col items-center justify-start pt-2`}
              >
                <span className={`text-2xl font-black bg-gradient-to-br ${config.gradient} bg-clip-text text-transparent`}>
                  #{motoboy.rank_position}
                </span>
                <LevelBadge level={motoboy.current_level} size="sm" />
                {reward && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: config.delay + 0.5 }}
                    className="text-[10px] text-center text-muted-foreground mt-1 px-1 line-clamp-2"
                  >
                    {reward}
                  </motion.p>
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

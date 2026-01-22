import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Zap, Package, TrendingUp } from "lucide-react";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { RankingEntry } from "@/hooks/useRanking";

interface RankingCardProps {
  motoboy: RankingEntry;
  isCurrentUser: boolean;
  topScore: number;
  index: number;
}

export function RankingCard({ motoboy, isCurrentUser, topScore, index }: RankingCardProps) {
  const progressPercentage = topScore > 0 ? (motoboy.score / topScore) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      className="relative"
    >
      {/* Animated border for current user */}
      {isCurrentUser && (
        <motion.div
          className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary via-amber-500 to-primary opacity-75 blur-sm"
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ backgroundSize: "200% 200%" }}
        />
      )}

      <Card className={`overflow-hidden relative ${isCurrentUser ? "border-2 border-primary" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Position Badge */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
              isCurrentUser 
                ? "bg-gradient-to-br from-primary to-amber-500 text-white" 
                : "bg-muted text-muted-foreground"
            }`}>
              #{motoboy.rank_position}
            </div>
            
            {/* Avatar */}
            <Avatar className={`w-10 h-10 ${isCurrentUser ? "ring-2 ring-primary ring-offset-2" : ""}`}>
              <AvatarImage src={motoboy.avatar_url || undefined} />
              <AvatarFallback>{motoboy.name?.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  {motoboy.name}
                </h3>
                {isCurrentUser && (
                  <Badge variant="default" className="shrink-0 text-xs bg-primary/20 text-primary border-primary/30">
                    VOCÊ
                  </Badge>
                )}
              </div>
              
              {/* Stats Row */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                <div className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-primary text-primary" />
                  <span className="font-bold text-foreground">{Math.round(motoboy.score)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  <span>{motoboy.completed_extras}</span>
                </div>
                <LevelBadge level={motoboy.current_level} size="sm" />
              </div>

              {/* Progress Bar */}
              <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ delay: index * 0.05 + 0.3, duration: 0.5 }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-amber-500 rounded-full"
                />
              </div>
            </div>

            {/* Trend indicator */}
            <div className="flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

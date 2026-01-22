import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, ChevronLeft, Star, Crown } from "lucide-react";
import { WeeklyCountdown } from "./WeeklyCountdown";

interface RankingHeaderProps {
  currentUserPosition: number | null;
}

export function RankingHeader({ currentUserPosition }: RankingHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500" />
      
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-yellow-300 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-4 space-y-4">
        {/* Top Bar */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/home")}
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex-1">
            <h1 className="text-2xl font-black text-white drop-shadow-lg">
              Ranking Semanal
            </h1>
            <p className="text-white/80 text-sm">Compete pelos melhores prêmios!</p>
          </div>

          {/* Animated Trophy */}
          <motion.div
            animate={{ 
              rotate: [0, -10, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              repeatDelay: 3
            }}
            className="relative"
          >
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 20px rgba(255, 255, 255, 0.3)",
                  "0 0 40px rgba(255, 255, 255, 0.6)",
                  "0 0 20px rgba(255, 255, 255, 0.3)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="p-3 rounded-full bg-white/20 backdrop-blur-sm"
            >
              <Trophy className="w-8 h-8 text-white fill-white" />
            </motion.div>
          </motion.div>
        </div>

        {/* User Position Card */}
        {currentUserPosition && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="p-2 rounded-full bg-white/30"
                >
                  <Star className="w-6 h-6 text-white fill-white" />
                </motion.div>
                <div>
                  <p className="text-white/80 text-sm">Sua posição atual</p>
                  <p className="text-3xl font-black text-white">
                    #{currentUserPosition}
                  </p>
                </div>
              </div>
              
              {currentUserPosition <= 3 && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="flex items-center gap-1 bg-white/30 px-3 py-1.5 rounded-full"
                >
                  <Crown className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  <span className="text-white text-sm font-bold">Top 3!</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Weekly Countdown */}
        <WeeklyCountdown />
      </div>
    </header>
  );
}

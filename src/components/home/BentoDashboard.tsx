import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle2, Zap, Trophy, TrendingUp, Plus, Bike, 
  Clock, Star, Package 
} from "lucide-react";
import { useGamification } from "@/hooks/useGamification";
import { useRanking } from "@/hooks/useRanking";
import { getXpProgress, getLevelInfo, getLevelForXp } from "@/lib/gamification";

interface BentoDashboardProps {
  userId?: string;
  myExtrasCount: number;
  activeAcceptedCount: number;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export const BentoDashboard = ({ userId, myExtrasCount, activeAcceptedCount }: BentoDashboardProps) => {
  const navigate = useNavigate();
  const { stats, isLoading: gamificationLoading } = useGamification(userId);
  const { currentUserPosition, isLoading: rankingLoading } = useRanking();

  const isLoading = gamificationLoading || rankingLoading;

  const completedThisWeek = stats?.completed_extras ?? 0;
  const totalXp = stats?.total_xp ?? 0;
  const correctedLevel = getLevelForXp(totalXp).level;
  const currentLevel = Math.max(stats?.current_level ?? 1, correctedLevel);
  const xpProgress = getXpProgress(totalXp, currentLevel);
  const levelInfo = getLevelInfo(currentLevel);
  const currentStreak = stats?.current_streak ?? 0;

  if (isLoading) {
    return (
      <div className="px-4 pb-2">
        <div className="grid grid-cols-4 grid-rows-3 gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`rounded-2xl bg-muted/40 animate-pulse ${
                i === 0 ? "col-span-2 row-span-2 h-36" :
                i === 1 ? "col-span-2 h-16" :
                i === 2 ? "col-span-2 h-16" :
                i === 3 ? "col-span-2 h-14" :
                "col-span-2 h-14"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="px-4 pb-2"
    >
      <div className="grid grid-cols-4 gap-3">
        
        {/* ===== XP / Level — Large Cell (2x2) ===== */}
        <motion.div
          variants={item}
          onClick={() => navigate("/meu-progresso")}
          className="col-span-2 row-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-amber-500 p-4 cursor-pointer group shadow-lg shadow-primary/25"
        >
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-xl" />
          <div className="absolute bottom-2 left-2 w-16 h-16 rounded-full bg-amber-400/20 blur-lg" />

          <div className="relative z-10 flex flex-col justify-between h-full min-h-[130px]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-white/80 text-xs font-medium">Nível {currentLevel}</span>
              </div>
              <h3 className="text-white font-bold text-xl leading-tight">{levelInfo.name}</h3>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white/70 text-xs">{xpProgress.current} / {xpProgress.required} XP</span>
                <span className="text-white font-bold text-sm">{xpProgress.percentage}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-white to-amber-200"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress.percentage}%` }}
                  transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <p className="text-white/60 text-[10px] mt-1.5">Total: {totalXp} XP</p>
            </div>
          </div>

          {/* Hover glow */}
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors rounded-2xl" />
        </motion.div>

        {/* ===== Extras Concluídos ===== */}
        <motion.div
          variants={item}
          className="col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3.5 shadow-lg shadow-emerald-500/20"
        >
          <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-emerald-400/30 blur-lg" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white/80 text-xs font-medium">Esta semana</span>
              <div className="flex items-baseline gap-1">
                <span className="text-white font-bold text-2xl leading-none">{completedThisWeek}</span>
                <span className="text-white/60 text-xs">extras</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ===== Ranking ===== */}
        <motion.div
          variants={item}
          onClick={() => navigate("/ranking")}
          className="col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-3.5 cursor-pointer group shadow-lg shadow-amber-500/20"
        >
          <div className="absolute -top-4 -left-4 w-14 h-14 rounded-full bg-yellow-400/30 blur-lg" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-white/80 text-xs font-medium">Ranking</span>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-bold text-2xl leading-none">
                  {currentUserPosition ? `#${currentUserPosition}` : '--'}
                </span>
                {currentUserPosition && currentUserPosition <= 10 && (
                  <TrendingUp className="w-4 h-4 text-yellow-200" />
                )}
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors rounded-2xl" />
        </motion.div>

        {/* ===== Ofertar Extra — Wide CTA ===== */}
        <motion.div
          variants={item}
          onClick={() => navigate("/ofertar-extra")}
          className="col-span-4 relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-4 cursor-pointer group shadow-lg shadow-indigo-500/25"
        >
          {/* Animated shine */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            style={{ width: "50%" }}
          />
          <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-blue-400/20 blur-2xl" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Ofertar Extra</h3>
                <p className="text-white/70 text-xs">Publique para outros motoboys</p>
              </div>
            </div>
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
            >
              <span className="text-white text-lg">→</span>
            </motion.div>
          </div>
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors rounded-2xl" />
        </motion.div>

        {/* ===== Quick Actions Row ===== */}
        {/* Streak */}
        <motion.div
          variants={item}
          onClick={() => navigate("/meu-progresso")}
          className="col-span-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500/15 to-pink-500/10 border border-rose-500/20 p-3 cursor-pointer"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">🔥</span>
            <span className="text-foreground font-bold text-sm">{currentStreak}</span>
            <span className="text-muted-foreground text-[9px] leading-tight text-center">Dias</span>
          </div>
        </motion.div>

        {/* Meus Extras */}
        <motion.div
          variants={item}
          onClick={() => navigate("/meus-extras")}
          className="col-span-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/15 to-cyan-500/10 border border-blue-500/20 p-3 cursor-pointer"
        >
          <div className="flex flex-col items-center gap-1">
            <div className="relative">
              <Bike className="w-5 h-5 text-blue-600" />
              {myExtrasCount > 0 && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {myExtrasCount}
                </span>
              )}
            </div>
            <span className="text-muted-foreground text-[9px] leading-tight text-center">Ofertados</span>
          </div>
        </motion.div>

        {/* Aceitos */}
        <motion.div
          variants={item}
          onClick={() => navigate("/extras-aceitos")}
          className="col-span-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/15 to-emerald-500/10 border border-green-500/20 p-3 cursor-pointer"
        >
          <div className="flex flex-col items-center gap-1">
            <div className="relative">
              <Clock className="w-5 h-5 text-green-600" />
              {activeAcceptedCount > 0 && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-green-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeAcceptedCount}
                </span>
              )}
            </div>
            <span className="text-muted-foreground text-[9px] leading-tight text-center">Aceitos</span>
          </div>
        </motion.div>

        {/* Troca Lanche */}
        <motion.div
          variants={item}
          onClick={() => navigate("/troca-lanche")}
          className="col-span-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/15 to-amber-500/10 border border-orange-500/20 p-3 cursor-pointer"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">🍔</span>
            <span className="text-muted-foreground text-[9px] leading-tight text-center">Lanche</span>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
};

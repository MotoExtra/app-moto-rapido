import { motion } from "framer-motion";
import { Clock, Bike, Archive, Users, TrendingUp } from "lucide-react";

interface RestaurantHeroStatsProps {
  availableCount: number;
  inProgressCount: number;
  historyCount: number;
  uniqueMotoboys: number;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const RestaurantHeroStats = ({
  availableCount,
  inProgressCount,
  historyCount,
  uniqueMotoboys,
  activeTab,
  onTabChange,
}: RestaurantHeroStatsProps) => {
  const stats = [
    {
      id: "available",
      label: "Disponíveis",
      value: availableCount,
      icon: Clock,
      gradient: "from-amber-500/20 to-orange-500/20",
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-600",
      borderColor: "border-amber-500/40",
      activeBorder: "ring-2 ring-amber-500 ring-offset-2 ring-offset-background",
    },
    {
      id: "in_progress",
      label: "Em Andamento",
      value: inProgressCount,
      icon: Bike,
      gradient: "from-emerald-500/20 to-green-500/20",
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-600",
      borderColor: "border-emerald-500/40",
      activeBorder: "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background",
    },
    {
      id: "history",
      label: "Histórico",
      value: historyCount,
      icon: Archive,
      gradient: "from-slate-500/20 to-gray-500/20",
      iconBg: "bg-slate-500/20",
      iconColor: "text-slate-600",
      borderColor: "border-slate-500/40",
      activeBorder: "ring-2 ring-slate-500 ring-offset-2 ring-offset-background",
    },
  ];

  const totalExtras = availableCount + inProgressCount + historyCount;
  const completionRate = totalExtras > 0 ? Math.round((historyCount / totalExtras) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl bg-card border shadow-lg"
    >
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-2xl" />
      </div>

      <div className="relative p-5">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const isActive = activeTab === stat.id;
            
            return (
              <motion.button
                key={stat.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                onClick={() => onTabChange(stat.id)}
                className={`relative p-4 rounded-xl transition-all duration-300 bg-gradient-to-br ${stat.gradient} border ${stat.borderColor} ${
                  isActive ? stat.activeBorder : "hover:scale-[1.02]"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <motion.p
                  key={stat.value}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className={`text-2xl font-bold ${stat.iconColor}`}
                >
                  {stat.value}
                </motion.p>
                <p className="text-[11px] text-muted-foreground font-medium mt-1">
                  {stat.label}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-4" />

        {/* Bottom Stats Row */}
        <div className="flex items-center justify-between gap-4">
          {/* Motoboys Count */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold text-blue-600">{uniqueMotoboys}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Motoboys<br />parceiros
              </p>
            </div>
          </motion.div>

          {/* Completion Rate */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <div className="flex-1 min-w-[100px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">Taxa de conclusão</span>
                <span className="text-xs font-semibold text-primary">{completionRate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                />
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

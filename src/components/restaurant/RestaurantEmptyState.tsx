import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Clock, Bike, Archive, RefreshCw, Wifi } from "lucide-react";

type EmptyStateType = "available" | "in_progress" | "history" | "all";

interface RestaurantEmptyStateProps {
  type: EmptyStateType;
}

const emptyStateConfig = {
  available: {
    icon: Clock,
    emoji: "🍽️",
    title: "Nenhum extra disponível",
    description: "Crie um extra para encontrar motoboys qualificados",
    showButton: true,
    gradient: "from-amber-500/10 to-orange-500/10",
  },
  in_progress: {
    icon: Bike,
    emoji: "🏍️",
    title: "Nenhum extra em andamento",
    description: "Quando um motoboy aceitar seu extra, ele aparecerá aqui",
    showButton: false,
    gradient: "from-emerald-500/10 to-green-500/10",
  },
  history: {
    icon: Archive,
    emoji: "📋",
    title: "Histórico vazio",
    description: "Seus extras finalizados aparecerão aqui",
    showButton: false,
    gradient: "from-slate-500/10 to-gray-500/10",
  },
  all: {
    icon: Plus,
    emoji: "🚀",
    title: "Comece agora!",
    description: "Crie seu primeiro extra e conecte-se com motoboys da região",
    showButton: true,
    gradient: "from-primary/10 to-primary/5",
  },
};

export const RestaurantEmptyState = ({ type }: RestaurantEmptyStateProps) => {
  const navigate = useNavigate();
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradient} border border-border/50 p-8`}
    >
      {/* Radar animation for searching states */}
      {(type === "available" || type === "all") && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute w-32 h-32 rounded-full border border-primary/20"
              initial={{ scale: 0.5, opacity: 0.5 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Animated emoji/icon */}
        <motion.div
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="relative mb-4"
        >
          <div className="w-20 h-20 rounded-2xl bg-card shadow-lg flex items-center justify-center text-4xl">
            {config.emoji}
          </div>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center"
          >
            <Icon className="w-4 h-4 text-primary" />
          </motion.div>
        </motion.div>

        {/* Title and description with typed animation */}
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg font-semibold text-foreground mb-2"
        >
          {config.title}
        </motion.h3>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-muted-foreground max-w-[250px] mb-6"
        >
          {config.description}
        </motion.p>

        {/* CTA Button */}
        {config.showButton && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={() => navigate("/restaurante/criar-extra")}
              className="shadow-lg shadow-primary/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Extra
            </Button>
          </motion.div>
        )}

        {/* Live indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-2 mt-6 px-3 py-1.5 rounded-full bg-card/80 border border-border/50"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-emerald-500"
          />
          <Wifi className="w-3 h-3 text-emerald-600" />
          <span className="text-[10px] text-muted-foreground">
            Conectado • Atualização automática
          </span>
        </motion.div>

        {/* Refresh hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.8 }}
          className="flex items-center gap-1 mt-4"
        >
          <RefreshCw className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            Puxe para atualizar
          </span>
        </motion.div>
      </div>

      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
    </motion.div>
  );
};

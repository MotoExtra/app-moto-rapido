import { motion } from "framer-motion";
import { RefreshCw, Wifi } from "lucide-react";

export const EmptyFeedState = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-amber-500/5 border border-border/50 p-8"
    >
      {/* Animated radar circles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-primary/10"
            style={{ width: 80 + i * 60, height: 80 + i * 60 }}
            initial={{ scale: 0.8, opacity: 0.4 }}
            animate={{ 
              scale: [0.8, 1.2], 
              opacity: [0.4, 0] 
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeOut"
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Animated illustration */}
        <motion.div 
          className="mb-4"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="relative">
            <span className="text-6xl">🏍️</span>
            <motion.span 
              className="absolute -right-2 top-1/2 text-2xl"
              animate={{ x: [0, 10, 0], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              💨
            </motion.span>
          </div>
        </motion.div>

        <motion.h3 
          className="text-lg font-semibold text-foreground mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Tudo tranquilo por aqui! 😎
        </motion.h3>

        <motion.p 
          className="text-sm text-muted-foreground mb-4 max-w-[250px]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Novos extras aparecem em tempo real. Fique ligado!
        </motion.p>

        {/* Live indicator */}
        <motion.div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-emerald-500"
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Conectado • Atualização automática
          </span>
        </motion.div>

        {/* Pull to refresh hint */}
        <motion.div 
          className="flex items-center gap-1.5 mt-4 text-muted-foreground/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <RefreshCw className="w-3 h-3" />
          <span className="text-xs">Puxe para atualizar</span>
        </motion.div>
      </div>

      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-amber-500/5 blur-3xl" />
    </motion.div>
  );
};

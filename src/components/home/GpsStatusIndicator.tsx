import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Loader2, Power, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GpsStatusIndicatorProps {
  error: string | null;
  loading: boolean;
  accuracy: number | null;
  onActivate: () => void;
}

export function GpsStatusIndicator({ error, loading, accuracy, onActivate }: GpsStatusIndicatorProps) {
  // Estado INATIVO (erro/sem permissão)
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="px-4 pt-4"
      >
        <div className="relative overflow-hidden rounded-2xl bg-destructive/5 border border-destructive/20 p-4 backdrop-blur-sm">
          {/* Background decoration */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-destructive/10 rounded-full blur-2xl" />
          
          <div className="relative flex items-center gap-4">
            {/* Animated icon container */}
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-destructive/20 rounded-full blur-md"
              />
              <div className="relative w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <MapPin className="w-6 h-6 text-destructive" />
                </motion.div>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">GPS Desativado</h3>
              <p className="text-sm text-muted-foreground">Ative para ver extras próximos</p>
            </div>
          </div>
          
          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4"
          >
            <Button
              onClick={onActivate}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-destructive to-primary hover:from-destructive/90 hover:to-primary/90 text-white shadow-lg shadow-destructive/25 transition-all flex items-center justify-center gap-2"
            >
              <Power className="w-4 h-4" />
              <span className="font-medium">Ativar Localização</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Estado CARREGANDO
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="px-4 pt-4"
      >
        <div className="relative overflow-hidden rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4 backdrop-blur-sm">
          {/* Background glow */}
          <motion.div 
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl" 
          />
          
          <div className="relative flex items-center gap-4">
            {/* Loading icon */}
            <div className="relative w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-6 h-6 text-amber-500" />
              </motion.div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">Localizando...</h3>
              <p className="text-sm text-muted-foreground">Obtendo sua posição</p>
            </div>
            
            {/* Loading dots */}
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 rounded-full bg-amber-500"
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Estado ATIVO (compacto e elegante)
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="px-4 pt-4"
    >
      <div className="relative overflow-hidden rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-4 py-3 backdrop-blur-sm shadow-[0_0_20px_rgba(16,185,129,0.15)]">
        {/* Subtle glow */}
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-16 h-16 bg-emerald-500/20 rounded-full blur-2xl" />
        
        <div className="relative flex items-center gap-3">
          {/* Radar pulse effect */}
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 2], opacity: [0.4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 bg-emerald-500 rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
              className="absolute inset-0 bg-emerald-500 rounded-full"
            />
            <div className="relative w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          
          {/* Status text */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">GPS ativo</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {Math.round(accuracy || 0)}m precisão
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

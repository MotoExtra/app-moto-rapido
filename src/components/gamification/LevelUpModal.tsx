import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LevelBadge } from "./LevelBadge";
import { getLevelInfo } from "@/lib/gamification";
import confetti from "canvas-confetti";

interface LevelUpModalProps {
  open: boolean;
  onClose: () => void;
  newLevel: number;
}

export function LevelUpModal({ open, onClose, newLevel }: LevelUpModalProps) {
  const levelInfo = getLevelInfo(newLevel);

  useEffect(() => {
    if (open) {
      // Trigger confetti
      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#f97316', '#fb923c', '#fdba74'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#f97316', '#fb923c', '#fdba74'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [open]);

  const levelMessages: Record<number, string> = {
    1: "Você está começando sua jornada!",
    2: "Você já domina as ruas!",
    3: "Você é um profissional de verdade!",
    4: "Sua experiência é impressionante!",
    5: "Você se tornou uma LENDA!",
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md text-center overflow-hidden">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="py-6"
            >
              <motion.div
                initial={{ y: -30, scale: 0 }}
                animate={{ y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="text-7xl mb-4"
              >
                {newLevel === 5 ? "👑" : newLevel === 4 ? "🚀" : newLevel === 3 ? "🔥" : newLevel === 2 ? "🏍️" : "⚡"}
              </motion.div>

              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400 mb-2"
              >
                LEVEL UP!
              </motion.h2>

              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground mb-6"
              >
                {levelMessages[newLevel] || "Você evoluiu!"}
              </motion.p>

              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                className="flex justify-center mb-6"
              >
                <LevelBadge level={newLevel} size="lg" showName />
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  Continue acelerando para alcançar novos patamares! 🏁
                </p>

                <Button onClick={onClose} className="w-full font-bold" size="lg">
                  Bora! 🔥
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

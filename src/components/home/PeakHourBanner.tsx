import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Zap, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PeakHourInfo {
  isPeak: boolean;
  multiplier: number;
  endTime?: string;
}

interface PeakHourBannerProps {
  city?: string | null;
}

const PeakHourBanner = ({ city }: PeakHourBannerProps) => {
  const [peakInfo, setPeakInfo] = useState<PeakHourInfo | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    const checkPeakHour = async () => {
      try {
        const { data, error } = await supabase.rpc("is_peak_hour" as any, {
          p_city: city || null,
        });

        if (!error && data) {
          const results = Array.isArray(data) ? data : [data];
          if (results.length > 0) {
            const result = results[0];
            setPeakInfo({
              isPeak: result.is_peak,
              multiplier: parseFloat(String(result.multiplier)) || 1,
            });
          }
        }
      } catch (err) {
        console.error("Error checking peak hour:", err);
      }
    };

    checkPeakHour();
    const interval = setInterval(checkPeakHour, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [city]);

  useEffect(() => {
    if (!peakInfo?.isPeak) return;

    const updateCountdown = () => {
      const now = new Date();
      const hours = now.getHours();
      
      // Determine which peak period we're in
      let endHour: number;
      if (hours >= 11 && hours < 14) {
        endHour = 14;
      } else if (hours >= 18 && hours < 21) {
        endHour = 21;
      } else {
        setCountdown("");
        return;
      }

      const endTime = new Date();
      endTime.setHours(endHour, 0, 0, 0);
      
      const diff = endTime.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown("");
        return;
      }

      const hours_left = Math.floor(diff / (1000 * 60 * 60));
      const minutes_left = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours_left > 0) {
        setCountdown(`${hours_left}h ${minutes_left}min`);
      } else {
        setCountdown(`${minutes_left}min`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000);
    return () => clearInterval(interval);
  }, [peakInfo?.isPeak]);

  if (!peakInfo?.isPeak) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="relative overflow-hidden rounded-2xl mb-4"
      >
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500"
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ backgroundSize: "200% 200%" }}
        />
        
        {/* Content */}
        <div className="relative z-10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, -10, 10, 0],
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <Flame className="w-6 h-6 text-white" />
            </motion.div>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">
                  HORÁRIO DE PICO
                </span>
                <motion.span
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full"
                >
                  {peakInfo.multiplier}x XP
                </motion.span>
              </div>
              <p className="text-white/90 text-sm">
                Ganhe XP em dobro nos extras agora!
              </p>
            </div>
          </div>

          {countdown && (
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
              <Clock className="w-4 h-4 text-white" />
              <span className="text-white font-semibold text-sm">
                {countdown}
              </span>
            </div>
          )}
        </div>

        {/* Animated particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-yellow-300/50 rounded-full"
              initial={{ 
                x: Math.random() * 100 + "%",
                y: "100%",
                opacity: 0,
              }}
              animate={{
                y: "-20%",
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PeakHourBanner;

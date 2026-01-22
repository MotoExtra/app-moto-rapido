import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Flame } from "lucide-react";

export function WeeklyCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // Get next Sunday at midnight
      const nextSunday = new Date(now);
      const daysUntilSunday = (7 - now.getDay()) % 7;
      nextSunday.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
      nextSunday.setHours(0, 0, 0, 0);

      const diff = nextSunday.getTime() - now.getTime();
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft({ days, hours, minutes });
      setIsUrgent(days === 0 && hours < 24);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-center gap-3 p-3 rounded-xl border ${
        isUrgent 
          ? "bg-destructive/10 border-destructive/30" 
          : "bg-primary/5 border-primary/20"
      }`}
    >
      <motion.div
        animate={isUrgent ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      >
        {isUrgent ? (
          <Flame className="w-5 h-5 text-destructive fill-destructive" />
        ) : (
          <Clock className="w-5 h-5 text-primary" />
        )}
      </motion.div>

      <div className="flex items-center gap-2">
        <TimeUnit value={timeLeft.days} label="dias" isUrgent={isUrgent} />
        <span className="text-muted-foreground">:</span>
        <TimeUnit value={timeLeft.hours} label="hrs" isUrgent={isUrgent} />
        <span className="text-muted-foreground">:</span>
        <TimeUnit value={timeLeft.minutes} label="min" isUrgent={isUrgent} />
      </div>

      <span className={`text-xs font-medium ${isUrgent ? "text-destructive" : "text-muted-foreground"}`}>
        {isUrgent ? "Corra!" : "restantes"}
      </span>
    </motion.div>
  );
}

function TimeUnit({ value, label, isUrgent }: { value: number; label: string; isUrgent: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <motion.span
        key={value}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`text-lg font-bold tabular-nums ${isUrgent ? "text-destructive" : "text-foreground"}`}
      >
        {String(value).padStart(2, '0')}
      </motion.span>
      <span className="text-[10px] text-muted-foreground -mt-1">{label}</span>
    </div>
  );
}

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 500); // Wait for exit animation
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 overflow-hidden"
        >
          {/* Animated background circles */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              initial={{ scale: 0, opacity: 0.3 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut", repeat: Infinity, repeatDelay: 0.5 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-white/20"
            />
            <motion.div
              initial={{ scale: 0, opacity: 0.2 }}
              animate={{ scale: 3.5, opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut", delay: 0.3, repeat: Infinity, repeatDelay: 0.5 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-white/15"
            />
          </div>

          {/* Road lines animation */}
          <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden">
            <motion.div
              initial={{ y: -100 }}
              animate={{ y: 100 }}
              transition={{ duration: 0.5, ease: "linear", repeat: Infinity }}
              className="absolute left-1/2 -translate-x-1/2 flex flex-col gap-4"
            >
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-8 bg-white/30 rounded-full"
                />
              ))}
            </motion.div>
          </div>

          {/* Logo container */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.6, 
              ease: [0.34, 1.56, 0.64, 1], // Spring-like easing
              delay: 0.2 
            }}
            className="relative z-10 flex flex-col items-center"
          >
            {/* Logo with glow */}
            <motion.div
              animate={{ 
                boxShadow: [
                  "0 0 20px rgba(255,255,255,0.3)",
                  "0 0 40px rgba(255,255,255,0.5)",
                  "0 0 20px rgba(255,255,255,0.3)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-48 h-48 rounded-3xl bg-white/95 backdrop-blur-sm flex items-center justify-center p-4 shadow-2xl"
            >
              <img 
                src={logo} 
                alt="MotoExtra" 
                className="w-full h-full object-contain"
              />
            </motion.div>

            {/* App name */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-6 text-3xl font-bold text-white tracking-tight"
            >
              MotoExtra
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="mt-2 text-white/80 text-sm font-medium"
            >
              Extras para Motoboys
            </motion.p>
          </motion.div>

          {/* Motorcycle animation */}
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: "0%", opacity: 1 }}
            transition={{ 
              delay: 0.8,
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1]
            }}
            className="absolute bottom-20 left-0 right-0 flex justify-center"
          >
            <motion.div
              animate={{ 
                y: [0, -3, 0, -2, 0],
                rotate: [0, -1, 0, 1, 0]
              }}
              transition={{ 
                duration: 0.4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-5xl"
            >
              🏍️
            </motion.div>
          </motion.div>

          {/* Loading dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.3 }}
            className="absolute bottom-8 flex gap-2"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 0.6,
                  delay: i * 0.15,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-2 h-2 rounded-full bg-white"
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;

import { useCallback, useRef } from "react";

// Notification sound frequencies for a pleasant chime
const NOTIFICATION_SOUNDS = {
  success: [
    { frequency: 523.25, duration: 100 }, // C5
    { frequency: 659.25, duration: 100 }, // E5
    { frequency: 783.99, duration: 150 }, // G5
  ],
  alert: [
    { frequency: 880, duration: 150 },    // A5
    { frequency: 880, duration: 150 },    // A5
  ],
  newOffer: [
    { frequency: 587.33, duration: 100 }, // D5
    { frequency: 698.46, duration: 100 }, // F5
    { frequency: 880, duration: 100 },    // A5
    { frequency: 1046.5, duration: 200 }, // C6
  ],
  error: [
    { frequency: 220, duration: 200 },    // A3
    { frequency: 196, duration: 300 },    // G3
  ],
};

type SoundType = keyof typeof NOTIFICATION_SOUNDS;

export const useNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, startTime: number) => {
    const audioContext = getAudioContext();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    
    // Smooth envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration / 1000);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration / 1000);
  }, [getAudioContext]);

  const playSound = useCallback((type: SoundType = "success") => {
    try {
      const audioContext = getAudioContext();
      
      // Resume context if suspended (required for user gesture)
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
      
      const notes = NOTIFICATION_SOUNDS[type];
      let currentTime = audioContext.currentTime;
      
      notes.forEach((note) => {
        playTone(note.frequency, note.duration, currentTime);
        currentTime += note.duration / 1000;
      });
    } catch (error) {
      console.warn("Could not play notification sound:", error);
    }
  }, [getAudioContext, playTone]);

  const playSuccess = useCallback(() => playSound("success"), [playSound]);
  const playAlert = useCallback(() => playSound("alert"), [playSound]);
  const playNewOffer = useCallback(() => playSound("newOffer"), [playSound]);
  const playError = useCallback(() => playSound("error"), [playSound]);

  return {
    playSound,
    playSuccess,
    playAlert,
    playNewOffer,
    playError,
  };
};

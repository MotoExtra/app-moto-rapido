import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseTypingIndicatorOptions {
  offerId: string | null;
  userId: string | null;
  contactName: string;
}

export function useTypingIndicator({ offerId, userId, contactName }: UseTypingIndicatorOptions) {
  const [isContactTyping, setIsContactTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBroadcastRef = useRef<number>(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Broadcast typing event (throttled to avoid spamming)
  const broadcastTyping = useCallback(() => {
    if (!offerId || !userId) return;

    const now = Date.now();
    // Throttle: only broadcast every 1 second
    if (now - lastBroadcastRef.current < 1000) return;
    lastBroadcastRef.current = now;

    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId },
    });
  }, [offerId, userId]);

  // Subscribe to typing events
  useEffect(() => {
    if (!offerId || !userId) {
      setIsContactTyping(false);
      return;
    }

    const channel = supabase.channel(`typing-${offerId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const typingUserId = payload.payload?.userId;
        
        // Only show typing indicator for the other user
        if (typingUserId && typingUserId !== userId) {
          setIsContactTyping(true);

          // Clear existing timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }

          // Hide typing indicator after 2 seconds of no typing events
          typingTimeoutRef.current = setTimeout(() => {
            setIsContactTyping(false);
          }, 2000);
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [offerId, userId]);

  return {
    isContactTyping,
    broadcastTyping,
  };
}

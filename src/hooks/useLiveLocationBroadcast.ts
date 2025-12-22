import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseLiveLocationBroadcastOptions {
  userId: string | null;
  offerId: string | null;
  isActive: boolean; // should be true when status === 'in_progress'
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

export function useLiveLocationBroadcast({
  userId,
  offerId,
  isActive,
  latitude,
  longitude,
  accuracy
}: UseLiveLocationBroadcastOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const broadcastLocation = useCallback(async () => {
    if (!userId || !offerId || !latitude || !longitude) {
      console.log('[LiveLocation] Missing data, skipping broadcast');
      return;
    }

    // Throttle updates to at most once every 8 seconds
    const now = Date.now();
    if (now - lastUpdateRef.current < 8000) {
      return;
    }
    lastUpdateRef.current = now;

    try {
      const { error } = await supabase
        .from('motoboy_locations')
        .upsert({
          user_id: userId,
          offer_id: offerId,
          lat: latitude,
          lng: longitude,
          accuracy: accuracy,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,offer_id'
        });

      if (error) {
        console.error('[LiveLocation] Error broadcasting location:', error);
      } else {
        console.log('[LiveLocation] Position broadcasted:', { lat: latitude, lng: longitude });
      }
    } catch (err) {
      console.error('[LiveLocation] Unexpected error:', err);
    }
  }, [userId, offerId, latitude, longitude, accuracy]);

  // Start/stop broadcasting based on isActive
  useEffect(() => {
    if (isActive && userId && offerId) {
      console.log('[LiveLocation] Starting broadcast for offer:', offerId);
      
      // Broadcast immediately
      broadcastLocation();

      // Set up interval for periodic updates
      intervalRef.current = setInterval(() => {
        broadcastLocation();
      }, 10000); // Every 10 seconds

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Clean up location when stopping
        supabase
          .from('motoboy_locations')
          .delete()
          .eq('user_id', userId)
          .eq('offer_id', offerId)
          .then(({ error }) => {
            if (error) {
              console.error('[LiveLocation] Error cleaning up location:', error);
            } else {
              console.log('[LiveLocation] Location cleaned up for offer:', offerId);
            }
          });
      };
    }
  }, [isActive, userId, offerId, broadcastLocation]);

  // Also broadcast when position changes significantly
  useEffect(() => {
    if (isActive && latitude && longitude) {
      broadcastLocation();
    }
  }, [isActive, latitude, longitude, broadcastLocation]);
}

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

// Minimum distance in meters to record a new history point
const MIN_DISTANCE_FOR_HISTORY = 50; // 50 meters

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
  const lastHistoryPositionRef = useRef<{ lat: number; lng: number } | null>(null);

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
      // Update current position (upsert)
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

      // Save to history if moved enough distance
      const lastPos = lastHistoryPositionRef.current;
      let shouldSaveHistory = !lastPos; // Always save first point
      
      if (lastPos) {
        const distance = calculateDistanceMeters(lastPos.lat, lastPos.lng, latitude, longitude);
        shouldSaveHistory = distance >= MIN_DISTANCE_FOR_HISTORY;
      }

      if (shouldSaveHistory) {
        const { error: historyError } = await supabase
          .from('motoboy_location_history')
          .insert({
            user_id: userId,
            offer_id: offerId,
            lat: latitude,
            lng: longitude,
            accuracy: accuracy,
          });

        if (historyError) {
          console.error('[LiveLocation] Error saving to history:', historyError);
        } else {
          console.log('[LiveLocation] Position saved to history');
          lastHistoryPositionRef.current = { lat: latitude, lng: longitude };
        }
      }
    } catch (err) {
      console.error('[LiveLocation] Unexpected error:', err);
    }
  }, [userId, offerId, latitude, longitude, accuracy]);

  // Start/stop broadcasting based on isActive
  useEffect(() => {
    if (isActive && userId && offerId) {
      console.log('[LiveLocation] Starting broadcast for offer:', offerId);
      
      // Reset history tracking when starting
      lastHistoryPositionRef.current = null;
      
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
        
        // Clean up current location when stopping (but keep history)
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

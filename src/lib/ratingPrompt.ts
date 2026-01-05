import { supabase } from "@/integrations/supabase/client";

/**
 * Helper functions for auto-triggering rating modals
 * 3 minutes after the offer end time
 */

/**
 * Checks if the current time is at least 3 minutes past the offer end time
 */
export const isRatingPromptTime = (offerDate: string | null, timeEnd: string): boolean => {
  const now = new Date();
  const today = new Date();
  
  // Use offer date or today
  const date = offerDate ? new Date(offerDate + 'T00:00:00') : today;
  
  const [hours, minutes] = timeEnd.split(':').map(Number);
  
  const endTime = new Date(date);
  endTime.setHours(hours, minutes, 0, 0);
  
  // Add 3 minutes to end time
  const promptTime = new Date(endTime.getTime() + 3 * 60 * 1000);
  
  return now >= promptTime;
};

/**
 * Checks if the rating prompt has already been shown for this offer
 */
export const hasShownRatingPrompt = (offerId: string, userType: 'restaurant' | 'motoboy'): boolean => {
  const key = `rating_prompt_shown_${userType}`;
  try {
    const shown = JSON.parse(localStorage.getItem(key) || '[]');
    return shown.includes(offerId);
  } catch {
    return false;
  }
};

/**
 * Marks the rating prompt as shown for this offer
 */
export const markRatingPromptShown = (offerId: string, userType: 'restaurant' | 'motoboy'): void => {
  const key = `rating_prompt_shown_${userType}`;
  try {
    const shown = JSON.parse(localStorage.getItem(key) || '[]');
    if (!shown.includes(offerId)) {
      shown.push(offerId);
      localStorage.setItem(key, JSON.stringify(shown));
    }
  } catch {
    localStorage.setItem(key, JSON.stringify([offerId]));
  }
};

/**
 * Checks if a push notification has been sent for this rating
 */
export const hasSentRatingPushNotification = (offerId: string, userType: 'restaurant' | 'motoboy'): boolean => {
  const key = `rating_push_sent_${userType}`;
  try {
    const sent = JSON.parse(localStorage.getItem(key) || '[]');
    return sent.includes(offerId);
  } catch {
    return false;
  }
};

/**
 * Marks that a push notification has been sent for this rating
 */
export const markRatingPushNotificationSent = (offerId: string, userType: 'restaurant' | 'motoboy'): void => {
  const key = `rating_push_sent_${userType}`;
  try {
    const sent = JSON.parse(localStorage.getItem(key) || '[]');
    if (!sent.includes(offerId)) {
      sent.push(offerId);
      localStorage.setItem(key, JSON.stringify(sent));
    }
  } catch {
    localStorage.setItem(key, JSON.stringify([offerId]));
  }
};

interface SendRatingPushParams {
  offerId: string;
  restaurantName: string;
  motoboyName?: string;
  targetUserId: string;
  targetType: 'restaurant' | 'motoboy';
}

/**
 * Sends a push notification to remind the user to rate
 */
export const sendRatingPushNotification = async (params: SendRatingPushParams): Promise<boolean> => {
  const { offerId, restaurantName, motoboyName, targetUserId, targetType } = params;

  // Check if notification was already sent
  if (hasSentRatingPushNotification(offerId, targetType)) {
    console.log(`Push de avaliação já enviado para ${targetType} - oferta ${offerId}`);
    return false;
  }

  try {
    const { data, error } = await supabase.functions.invoke('notify-rating-reminder', {
      body: {
        offer_id: offerId,
        restaurant_name: restaurantName,
        motoboy_name: motoboyName,
        target_user_id: targetUserId,
        target_type: targetType,
      },
    });

    if (error) {
      console.error('Erro ao enviar push de avaliação:', error);
      return false;
    }

    // Mark as sent
    markRatingPushNotificationSent(offerId, targetType);
    console.log(`Push de avaliação enviado para ${targetType}:`, data);
    return true;
  } catch (error) {
    console.error('Erro ao chamar função de push:', error);
    return false;
  }
};

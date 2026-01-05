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

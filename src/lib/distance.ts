/**
 * Calculates the distance between two points on Earth using the Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Checks if a position is within a given radius of a target
 * @param userLat User's latitude
 * @param userLon User's longitude
 * @param targetLat Target latitude
 * @param targetLon Target longitude
 * @param radiusKm Radius in kilometers
 * @returns true if within radius
 */
export function isWithinRadius(
  userLat: number,
  userLon: number,
  targetLat: number,
  targetLon: number,
  radiusKm: number
): boolean {
  const distance = calculateDistance(userLat, userLon, targetLat, targetLon);
  return distance <= radiusKm;
}

/**
 * Checks if current time is within a time window before a target time
 * @param offerDate Date of the offer (YYYY-MM-DD)
 * @param timeStart Start time (HH:MM or HH:MM:SS)
 * @param minutesBefore Minutes before the start time to enable
 * @returns true if within the time window
 */
export function isWithinTimeWindow(
  offerDate: string | null,
  timeStart: string,
  minutesBefore: number = 30
): boolean {
  if (!offerDate) return false;

  const now = new Date();
  
  // Parse the offer start datetime
  const [hours, minutes] = timeStart.split(':').map(Number);
  const offerStartDate = new Date(offerDate + 'T00:00:00');
  offerStartDate.setHours(hours, minutes, 0, 0);

  // Calculate the window start (30 minutes before)
  const windowStart = new Date(offerStartDate.getTime() - minutesBefore * 60 * 1000);

  // Check if current time is between windowStart and offerStartDate
  // Also allow if the offer has already started (for latecomers)
  return now >= windowStart;
}

/**
 * Coordinate presence. The parser stores a missing coordinate as 0, so a
 * point is "missing" only when both axes are 0 (null island) or either is
 * not a finite number. A lone 0 on one axis (the equator or the prime
 * meridian) is a valid position and is kept.
 */
export const hasPoint = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

/** True when a trip has usable start and end coordinates. */
export const hasCoordinates = (trip) => Boolean(trip) && hasPoint(trip.startLat, trip.startLng) && hasPoint(trip.endLat, trip.endLng);

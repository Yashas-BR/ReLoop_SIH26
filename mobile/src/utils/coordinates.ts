/**
 * E-Setu Coordinate Utilities
 * Strictly validates geographic coordinates before they reach react-native-maps.
 * Never render NaN or use 0,0 as a fallback.
 */

/**
 * Convert any value to a finite number, returning null if impossible.
 */
export function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** @deprecated Use toFiniteNumber instead */
export function toFiniteCoordinate(
  value: string | number | null | undefined,
): number | null {
  return toFiniteNumber(value);
}

/**
 * Check whether a lat/lng pair constitutes valid, renderable coordinates.
 * Rejects NaN, Infinity, null, and the exact 0,0 origin (common fake fallback).
 *
 * @param latitude  - raw latitude value (accepts string, number, null, undefined)
 * @param longitude - raw longitude value (accepts string, number, null, undefined)
 */
export function hasValidCoordinates(
  latitude: unknown,
  longitude: unknown,
): boolean;
/**
 * Overload: accepts a recycler-shaped object with latitude/longitude fields.
 * Provided for backward compatibility with MatchedRecyclersMap.
 */
export function hasValidCoordinates(recycler: {
  latitude?: string | number;
  longitude?: string | number;
  [key: string]: unknown;
}): boolean;
export function hasValidCoordinates(
  latitudeOrRecycler: unknown,
  longitude?: unknown,
): boolean {
  let lat: unknown;
  let lng: unknown;

  if (
    longitude === undefined &&
    typeof latitudeOrRecycler === 'object' &&
    latitudeOrRecycler !== null
  ) {
    // Object overload
    const obj = latitudeOrRecycler as Record<string, unknown>;
    lat = obj['latitude'];
    lng = obj['longitude'];
  } else {
    lat = latitudeOrRecycler;
    lng = longitude;
  }

  const parsedLat = toFiniteNumber(lat);
  const parsedLng = toFiniteNumber(lng);

  if (parsedLat === null || parsedLng === null) return false;
  if (parsedLat < -90 || parsedLat > 90) return false;
  if (parsedLng < -180 || parsedLng > 180) return false;
  // Reject exact 0,0 (common fallback for missing data)
  if (parsedLat === 0 && parsedLng === 0) return false;

  return true;
}


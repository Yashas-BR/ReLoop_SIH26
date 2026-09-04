/**
 * Lightweight utilities for offline detection and ID generation.
 */

/** Returns true if the browser reports network connectivity. */
export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Generate a stable client-side UUID for idempotency tracking.
 * Uses crypto.randomUUID when available (all modern browsers).
 */
export function generateClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for very old environments
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

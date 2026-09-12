/**
 * E-Setu API Error Utilities
 * Safely extracts user-friendly messages from errors without exposing stack traces.
 */

import { ApiError } from '../api/client';

/**
 * Extract a human-readable error message from any error type.
 * Returns the fallback string if the error cannot be parsed.
 *
 * @param error - Any caught error value (use `unknown` for catch blocks)
 * @param fallback - Fallback message shown to user when error is unrecognizable
 *
 * @example
 * try {
 *   await someApiCall();
 * } catch (err) {
 *   setError(getApiErrorMessage(err, t('common.genericError')));
 * }
 */
export function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof ApiError) {
    return error.message?.trim() || fallback;
  }

  if (error instanceof Error) {
    return error.message?.trim() || fallback;
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return fallback;
}

/**
 * Check if the error is an authentication/authorization error (HTTP 401/403).
 * Useful for deciding whether to navigate to login.
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 401 || error.status === 403;
  }
  return false;
}

/**
 * Check if the error is a network connectivity error.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('network') ||
      msg.includes('failed to fetch') ||
      msg.includes('network request failed')
    );
  }
  return false;
}

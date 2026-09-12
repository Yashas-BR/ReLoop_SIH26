/**
 * E-Setu Status Normalization Utilities
 * Converts raw backend status strings into normalized, translatable values.
 * Never display raw backend strings like 'handed_over' directly in the UI.
 */

import { colors } from '../theme';

/** All known backend status values */
export type KnownStatus =
  | 'available'
  | 'quoted'
  | 'matched'
  | 'accepted'
  | 'confirmed'
  | 'handed_over'
  | 'completed'
  | 'rejected'
  | 'pending'
  | 'authorized'
  | 'unauthorized'
  | 'expired'
  | 'renewal_pending'
  | 'active'
  | 'paid'
  | 'unpaid'
  | 'unknown';

/**
 * Normalize a raw status string from the backend into a consistent lowercase key.
 * Strips whitespace and replaces hyphens with underscores.
 */
export function normalizeStatus(
  status: string | null | undefined,
): string {
  return (
    status?.trim().toLowerCase().replace(/-/g, '_') || 'unknown'
  );
}

/**
 * Map of normalized status → i18n key suffix.
 * Use with t(`status.${getStatusKey(status)}`).
 */
const STATUS_KEYS: Record<string, string> = {
  available: 'available',
  quoted: 'quoted',
  matched: 'matched',
  accepted: 'accepted',
  confirmed: 'confirmed',
  handed_over: 'handedOver',
  completed: 'completed',
  rejected: 'rejected',
  pending: 'pending',
  authorized: 'authorized',
  unauthorized: 'unauthorized',
  expired: 'expired',
  renewal_pending: 'renewalPending',
  active: 'active',
  paid: 'paid',
  unpaid: 'unpaid',
  unknown: 'unknown',
};

/**
 * Get the i18n key suffix for a given raw status.
 * @example getStatusKey('handed_over') → 'handedOver'
 */
export function getStatusKey(status: string | null | undefined): string {
  const normalized = normalizeStatus(status);
  return STATUS_KEYS[normalized] ?? 'unknown';
}

export interface StatusStyle {
  backgroundColor: string;
  color: string;
  borderColor?: string;
}

/**
 * Get consistent color styles for a given status.
 * Replaces repeated getStatusStyle() functions across screens.
 */
export function getStatusStyle(
  status: string | null | undefined,
): StatusStyle {
  const normalized = normalizeStatus(status);

  switch (normalized) {
    case 'completed':
    case 'paid':
    case 'authorized':
    case 'active':
      return {
        backgroundColor: colors.successBg,
        color: colors.successText,
      };

    case 'accepted':
    case 'confirmed':
    case 'handed_over':
      return {
        backgroundColor: '#D1FAE5',
        color: '#065F46',
      };

    case 'quoted':
    case 'matched':
    case 'pending':
    case 'renewal_pending':
      return {
        backgroundColor: colors.warningBg,
        color: colors.warningText,
      };

    case 'rejected':
    case 'unauthorized':
    case 'expired':
      return {
        backgroundColor: colors.dangerBg,
        color: colors.dangerText,
      };

    case 'available':
      return {
        backgroundColor: colors.infoBg,
        color: colors.infoText,
      };

    default:
      return {
        backgroundColor: colors.disabledBg,
        color: colors.disabled,
      };
  }
}

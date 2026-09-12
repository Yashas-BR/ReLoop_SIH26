/**
 * E-Setu Shared Formatters
 * Centralizes all currency, date, weight, and distance formatting.
 * Use these instead of repeating toLocaleString('en-IN') across screens.
 */

/**
 * Format a number as Indian Rupees.
 * Returns '—' if value is null/undefined/NaN.
 *
 * @example formatCurrency(12500) → '₹12,500'
 */
export function formatCurrency(
  value: number | string | null | undefined,
  options?: { decimals?: number },
): string {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';

  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: options?.decimals ?? 0,
    maximumFractionDigits: options?.decimals ?? 0,
  })}`;
}

/**
 * Format a rate as currency per kg.
 * @example formatRate(45) → '₹45/kg'
 */
export function formatRate(
  value: number | string | null | undefined,
): string {
  const base = formatCurrency(value);
  return base === '—' ? '—' : `${base}/kg`;
}

/**
 * Format a weight value in kilograms.
 * @example formatWeight(25.5) → '25.5 kg'
 */
export function formatWeight(
  value: number | string | null | undefined,
  unit = 'kg',
): string {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `${num % 1 === 0 ? num : num.toFixed(1)} ${unit}`;
}

/**
 * Format a distance in kilometers.
 * @example formatDistance(12.3) → '12.3 km'
 */
export function formatDistance(
  value: number | string | null | undefined,
): string {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `${num.toFixed(1)} km`;
}

/**
 * Format a date string into a human-readable date.
 * Falls back to 'en-IN' locale.
 *
 * @example formatDate('2026-09-10T12:00:00Z') → '10 Sep 2026'
 */
export function formatDate(
  value: string | Date | null | undefined,
  locale = 'en-IN',
): string {
  if (!value) return '—';
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Format a date string into a short date + time.
 * @example formatDateTime('2026-09-10T12:30:00Z') → '10 Sep 2026, 6:00 PM'
 */
export function formatDateTime(
  value: string | Date | null | undefined,
  locale = 'en-IN',
): string {
  if (!value) return '—';
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * Compute estimated payout from rate and weight.
 * @example formatPayout(45, 100) → '₹4,500'
 */
export function formatPayout(
  ratePerKg: number | string | null | undefined,
  weightKg: number | null | undefined,
): string {
  if (ratePerKg == null || weightKg == null) return '—';
  const rate = Number(ratePerKg);
  const weight = Number(weightKg);
  if (!Number.isFinite(rate) || !Number.isFinite(weight)) return '—';
  return formatCurrency(rate * weight);
}

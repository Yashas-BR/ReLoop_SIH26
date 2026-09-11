import { VALID_MATERIAL_IDS, getMaterialCategory } from '../constants/materials';
import type { RecyclerIncomingLot } from '../types/recycler-lot';

/**
 * Safely extracts the material ID / category from a lot object.
 */
export function getLotMaterialId(lot: Partial<RecyclerIncomingLot>): string | null {
  return lot.category ?? lot.material_category ?? null;
}

/**
 * Normalizes a raw material ID against the VALID_MATERIAL_IDS.
 * Fallbacks to the trimmed raw string if not matched.
 */
export function getNormalizedMaterialId(rawId: string | null | undefined): string | null {
  if (!rawId) return null;
  const trimmed = rawId.trim();
  const lower = trimmed.toLowerCase();
  const match = VALID_MATERIAL_IDS.find(id => id.toLowerCase() === lower);
  return match ?? trimmed;
}

/**
 * Gets the translated, clean display label for a material ID.
 * Falls back to constants/materials.ts label if translation is missing.
 */
export function getMaterialDisplayLabel(rawId: string | null | undefined, t: any): string {
  const normalized = getNormalizedMaterialId(rawId);
  if (!normalized) return '—';
  
  const translationKey = `materials.${normalized}`;
  const translated = t(translationKey);
  
  if (translated && !translated.includes('materials.')) {
    return translated;
  }
  
  return getMaterialCategory(normalized)?.label ?? normalized;
}

/**
 * Gets the translated, clean display label for a transaction status.
 */
export function getRecyclerStatusLabel(rawStatus: string | null | undefined, t: any): string {
  if (!rawStatus) return '—';
  
  const normalized = rawStatus.toLowerCase().trim();
  
  // Convert snake_case to camelCase for the recyclerActivity keys (e.g. handed_over -> handedOver)
  const camelCase = normalized.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  
  const activityTranslationKey = `recyclerActivity.${camelCase}`;
  const translatedActivity = t(activityTranslationKey);
  if (translatedActivity && !translatedActivity.includes('recyclerActivity.')) {
    return translatedActivity;
  }
  
  const statusTranslationKey = `status.${normalized}`;
  const translatedStatus = t(statusTranslationKey);
  if (translatedStatus && !translatedStatus.includes('status.')) {
    return translatedStatus;
  }
  
  // Ultimate fallback
  return rawStatus.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

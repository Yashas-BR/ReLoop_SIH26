import { humanizeFallback } from './status';

const TRACEABILITY_KEYS: Record<string, string> = {
  LOT_CREATED: 'created',
  IMAGE_UPLOADED: 'imageUploaded',
  COLLECTION_PHOTO_SAVED: 'imageUploaded',
  PRICE_ESTIMATED: 'valued',
  RECYCLER_MATCHED: 'matched',
  QUOTE_REQUESTED: 'quoteReceived',
  QUOTE_OFFERED: 'quoteReceived',
  QUOTE_ACCEPTED: 'quoteAccepted',
  QR_SCANNED: 'qrScanned',
  FINAL_WEIGHT_RECORDED: 'weightRecorded',
  HANDOVER_INITIATED: 'handoverInit',
  HANDOVER_CONFIRMED: 'handoverConfirmed',
  PAYMENT_COMPLETED: 'paymentDone',
  LOT_CANCELLED: 'cancelled',
};

export function getTraceabilityEventLabel(rawEvent: string | null | undefined, t: any): string {
  if (!rawEvent) return '—';
  const eventUpper = String(rawEvent).toUpperCase().trim();
  
  const key = TRACEABILITY_KEYS[eventUpper];
  if (key) {
    // Some keys might be in status namespace (like cancelled), most in traceability.events
    const eventTranslation = t(`traceability.events.${key}`);
    if (eventTranslation && !eventTranslation.includes('traceability.events.')) {
      return eventTranslation;
    }
    const statusTranslation = t(`status.${key}`);
    if (statusTranslation && !statusTranslation.includes('status.')) {
      return statusTranslation;
    }
  }
  
  return humanizeFallback(rawEvent);
}

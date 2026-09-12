import type {
  ParsedReLoopQr,
} from '../types/device';

export function parseReLoopQr(
  rawValue: string,
): ParsedReLoopQr {
  const raw =
    rawValue.trim();

  if (!raw) {
    return {
      type: 'unknown',
      raw,
    };
  }

  // JSON QR format
  try {
    const parsed =
      JSON.parse(raw);

    if (
      parsed &&
      typeof parsed ===
      'object'
    ) {
      const lotId =
        typeof parsed.lot_id ===
          'string'
          ? parsed.lot_id
          : typeof parsed.lotId ===
            'string'
            ? parsed.lotId
            : undefined;

      const reference =
        typeof parsed.handover_reference_number ===
          'string'
          ? parsed.handover_reference_number
          : typeof parsed.reference ===
            'string'
            ? parsed.reference
            : undefined;

      if (lotId) {
        return {
          type: 'lot',
          lotId,
          reference,
          raw,
        };
      }

      if (reference) {
        return {
          type: 'handover',
          reference,
          raw,
        };
      }
    }
  } catch {
    // Continue with plain-text formats.
  }

  // Example:
  // RELOOP:LOT:ABC123
  const lotMatch =
    raw.match(
      /^RELOOP:LOT:(.+)$/i,
    );

  if (lotMatch?.[1]) {
    return {
      type: 'lot',
      lotId:
        lotMatch[1].trim(),
      raw,
    };
  }

  // Example:
  // RELOOP:HANDOVER:XYZ123
  const handoverMatch =
    raw.match(
      /^RELOOP:HANDOVER:(.+)$/i,
    );

  if (
    handoverMatch?.[1]
  ) {
    return {
      type: 'handover',

      reference:
        handoverMatch[1].trim(),

      raw,
    };
  }

  return {
    type: 'unknown',
    raw,
  };
}
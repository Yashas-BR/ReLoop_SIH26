import type { RecyclerIncomingLot } from '../types/recycler-lot';

export function getLotId(lot: RecyclerIncomingLot | any): string | null {
  const value = lot.lot_id ?? lot.id ?? null;

  if (value === null || value === undefined) {
    return null;
  }

  const id = String(value).trim();
  return id || null;
}

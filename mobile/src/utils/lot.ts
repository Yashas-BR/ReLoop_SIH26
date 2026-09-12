type LotWithId = {
  lot_id?: string | number | null;
  id?: string | number | null;
};

export function getLotId(
  lot: LotWithId,
): string | null {
  const value = lot.lot_id ?? lot.id;

  if (value === null || value === undefined) {
    return null;
  }

  const id = String(value).trim();
  return id || null;
}

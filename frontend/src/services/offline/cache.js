/**
 * IndexedDB cache layer for application data.
 *
 * Caches:
 *  - Collector lots list
 *  - Payment history (transactions)
 *  - Earnings summary
 *
 * Each cached record is decorated with _cachedAt so callers can
 * display a staleness indicator if needed.
 *
 * Data hierarchy: backend is always authoritative.
 * IndexedDB is a read-cache + offline fallback only.
 */

import { dbGet, dbPut, dbGetByIndex } from './db.js';

const now = () => new Date().toISOString();

// ── Lots ──────────────────────────────────────────────────────────────────

/**
 * Persist the full lots array for a collector.
 * Each lot is stored individually so it can be looked up by lot_id.
 */
export async function cacheLots(collectorId, lotsArray) {
  if (!Array.isArray(lotsArray)) return;
  const tagged = lotsArray.map((lot) => ({
    ...lot,
    _collectorId: collectorId,
    _cachedAt: now(),
  }));
  // Write in parallel — IndexedDB handles concurrent transactions
  await Promise.all(tagged.map((lot) => dbPut('lots', lot)));
}

/**
 * Retrieve all cached lots for a collector.
 * Returns [] if nothing cached.
 */
export async function getCachedLots(collectorId) {
  try {
    const rows = await dbGetByIndex('lots', 'collector_id', collectorId);
    return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch {
    return [];
  }
}

// ── Transactions / Payment History ────────────────────────────────────────

/**
 * Persist the payment history array for a collector.
 * Rows are stored per lot_id (the natural key from the backend).
 */
export async function cacheTransactions(collectorId, txArray) {
  if (!Array.isArray(txArray)) return;
  const tagged = txArray.map((tx) => ({
    ...tx,
    _collectorId: collectorId,
    _cachedAt: now(),
  }));
  await Promise.all(tagged.map((tx) => dbPut('transactions', tx)));
}

/**
 * Retrieve cached payment history rows for a collector.
 * Returns [] if nothing cached.
 */
export async function getCachedTransactions(collectorId) {
  try {
    const rows = await dbGetByIndex('transactions', 'collector_id', collectorId);
    return rows.sort((a, b) => new Date(b.txn_datetime) - new Date(a.txn_datetime));
  } catch {
    return [];
  }
}

// ── Earnings Summary ──────────────────────────────────────────────────────

/**
 * Persist an earnings summary snapshot.
 * Keyed by collector_id — one row per collector.
 */
export async function cacheEarnings(collectorId, summary) {
  if (!summary) return;
  await dbPut('earnings', {
    ...summary,
    collector_id: collectorId,
    _cachedAt: now(),
  });
}

/**
 * Retrieve the cached earnings summary.
 * Returns null if nothing cached.
 */
export async function getCachedEarnings(collectorId) {
  try {
    return await dbGet('earnings', collectorId);
  } catch {
    return null;
  }
}

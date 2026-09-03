// API Client — wraps all backend calls to http://localhost:3000/v1
// (proxied via Vite to /v1 in dev)
//
// Phase 4: Added offline-aware wrappers that:
//  1. Try the network first when online
//  2. Cache successful responses in IndexedDB
//  3. Fall back to cache when offline
//  4. Queue write operations when offline
//
// Wrappers return { data, fromCache } so UI can show a staleness indicator.

import { isOnline } from '../services/offline/offlineUtils.js';
import {
  cacheLots, getCachedLots,
  cacheTransactions, getCachedTransactions,
  cacheEarnings, getCachedEarnings,
} from '../services/offline/cache.js';
import { enqueue } from '../services/offline/syncQueue.js';

const BASE = import.meta.env.VITE_API_BASE_URL || '/v1';

async function request(path, options = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    
    let json = null;
    const isJson = res.headers.get('content-type')?.includes('application/json');
    if (isJson) {
      json = await res.json();
    }
    
    if (!res.ok) {
      throw new Error(json?.message || `HTTP ${res.status}`);
    }
    return json;
  } catch (err) {
    throw err;
  }
}

// ── Health ──────────────────────────────────────────────────────────────────
export const checkHealth = () => request('/health');

// ── Valuation ───────────────────────────────────────────────────────────────
export const getInstantValuation = ({ category, location, weight }) =>
  request(`/valuation/instant?category=${encodeURIComponent(category)}&location=${encodeURIComponent(location)}&weight=${weight}`);

// ── Recyclers ───────────────────────────────────────────────────────────────
export const getMatchedRecyclers = ({ category, lat, lng, maxDistanceKm }) => {
  let url = `/recyclers/match?category=${encodeURIComponent(category)}&lat=${lat}&lng=${lng}`;
  if (maxDistanceKm) url += `&maxDistanceKm=${maxDistanceKm}`;
  return request(url);
};

export const getAllRecyclers = () => request('/recyclers').then(r => ({
  ...r,
  data: r.data ?? r.recyclers ?? [],
}));
export const getRecycler = (id) => request(`/recyclers/${id}`);
export const updateRecycler = (id, data) =>
  request(`/recyclers/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// ── Price Trends ─────────────────────────────────────────────────────────────
export const getPriceTrends = ({ category, location, days = 90 }) => {
  let url = `/prices/trends?category=${encodeURIComponent(category)}&days=${days}`;
  if (location) url += `&location=${encodeURIComponent(location)}`;
  return request(url);
};

// ── Handover / Lots ──────────────────────────────────────────────────────────
export const createLot = (data) =>
  request('/handover/lots', { method: 'POST', body: JSON.stringify(data) });

/**
 * Initiate a handover.
 *
 * ONLINE  → direct backend call, returns backend response.
 * OFFLINE → operation is enqueued in IndexedDB sync queue.
 *           Returns { queued: true, queueItem } — NOT a confirmed response.
 *
 * The caller MUST check result.queued to show the correct "Saved offline" UX.
 * Never show "Handover completed" when queued === true.
 */
export async function initiateHandover(data) {
  if (!isOnline()) {
    const queueItem = await enqueue({
      operation: 'initiateHandover',
      entity: 'handover',
      entityId: data.lot_id ?? null,
      payload: data,
    });
    return { queued: true, queueItem };
  }
  return request('/handover/initiate', { method: 'POST', body: JSON.stringify(data) });
}

export const confirmHandover = (reference, recycler_id) =>
  request(`/handover/confirm/${reference}`, {
    method: 'POST',
    body: JSON.stringify({ recycler_id }),
  });

export const getHandoverByRef = (reference) => request(`/handover/${reference}`);
export const getHandoversByLot = (lotId) => request(`/handover/lot/${lotId}`);

/**
 * Get all lots for a collector.
 * ONLINE  → fetches from backend, caches result, returns { data, fromCache: false }
 * OFFLINE → returns cached data with { fromCache: true }
 */
export async function getLotsByCollector(collectorId) {
  if (isOnline()) {
    try {
      const res = await request(`/handover/lots/collector/${collectorId}`);
      const lots = Array.isArray(res.data) ? res.data : [];
      // Tag each lot with collector_id for cache indexing
      const tagged = lots.map((l) => ({ ...l, collector_id: collectorId }));
      cacheLots(collectorId, tagged).catch(() => {});
      return { ...res, fromCache: false };
    } catch (err) {
      // Network error while "online" — try cache
      const cached = await getCachedLots(collectorId);
      if (cached.length > 0) return { data: cached, fromCache: true, count: cached.length };
      throw err;
    }
  }

  const cached = await getCachedLots(collectorId);
  return { data: cached, fromCache: true, count: cached.length };
}

// ── Payments ─────────────────────────────────────────────────────────────────

/**
 * Get earnings summary.
 * ONLINE  → fetches, caches, returns { data, fromCache: false }
 * OFFLINE → returns cached snapshot
 */
export async function getEarningsSummary(collectorId) {
  if (isOnline()) {
    try {
      const res = await request(`/payments/earnings/${collectorId}`);
      cacheEarnings(collectorId, res.data).catch(() => {});
      return { ...res, fromCache: false };
    } catch (err) {
      const cached = await getCachedEarnings(collectorId);
      if (cached) return { data: cached, fromCache: true };
      throw err;
    }
  }

  const cached = await getCachedEarnings(collectorId);
  if (cached) return { data: cached, fromCache: true };
  return { data: null, fromCache: true };
}

/**
 * Get payment history (ledger rows).
 * ONLINE  → fetches, caches, returns { data, fromCache: false }
 * OFFLINE → returns cached rows
 */
export async function getPaymentHistory(collectorId) {
  if (isOnline()) {
    try {
      const res = await request(`/payments/history/${collectorId}`);
      const rows = Array.isArray(res.data) ? res.data : [];
      // Tag each row with collector_id for cache indexing
      const tagged = rows.map((r) => ({ ...r, collector_id: collectorId }));
      cacheTransactions(collectorId, tagged).catch(() => {});
      return { ...res, fromCache: false };
    } catch (err) {
      const cached = await getCachedTransactions(collectorId);
      if (cached.length > 0) return { data: cached, fromCache: true };
      throw err;
    }
  }

  const cached = await getCachedTransactions(collectorId);
  return { data: cached, fromCache: true };
}

// ── Defaults ─────────────────────────────────────────────────────────────────
export const DEMO_COLLECTOR_ID = 1;
export const DEMO_RECYCLER_ID = 1;
export const DEFAULT_LOCATION = 'Bengaluru';
export const DEFAULT_LAT = 12.9716;
export const DEFAULT_LNG = 77.5946;

export const MATERIAL_CATEGORIES = [
  { id: 'CRT',    label: 'CRTs',      icon: '', sub: ['Color CRT', 'Monochrome CRT'] },
  { id: 'LCD',    label: 'LCD Panels', icon: '', sub: ['LED Monitor', 'LCD TV', 'Flat Panel'] },
  { id: 'PCB',    label: 'PCBs',      icon: '', sub: ['Motherboard', 'Graphics Card', 'RAM', 'Mixed PCB'] },
  { id: 'Cable',  label: 'Cables',    icon: '', sub: ['Power Cable', 'Data Cable', 'Mixed Cables'] },
  { id: 'Battery', label: 'Batteries', icon: '', sub: ['Li-Ion', 'Lead-Acid', 'NiMH', 'Mixed'] },
  { id: 'Motor',  label: 'Motors',    icon: '', sub: ['Electric Motor', 'Transformer', 'Magnet Assembly'] },
  { id: 'Plastic', label: 'Mixed Plastics', icon: '', sub: ['ABS Plastic', 'PC Plastic', 'Mixed E-Plastic'] },
];

/**
 * ReLoop Mobile API Client
 * TypeScript implementation for React Native / Expo
 */

import {
  MATERIAL_CATEGORIES,
  VALID_MATERIAL_IDS,
  getMaterialCategory,
  getMaterialLabel,
  getMaterialIcon,
  type MaterialCategory,
  type MaterialId,
} from '../constants/materials';

export {
  MATERIAL_CATEGORIES,
  VALID_MATERIAL_IDS,
  getMaterialCategory,
  getMaterialLabel,
  getMaterialIcon,
  type MaterialCategory,
  type MaterialId,
};

// ============================================================
// BASE URL & DEFAULTS
// ============================================================

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (fromEnv && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/+$/, '');
  }

  return 'https://kabadiwala-mh5c.onrender.com/v1';
}

export const BASE = resolveBaseUrl();

const envInt = (value?: string, fallback = 1): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const DEMO_COLLECTOR_ID = envInt(
  process.env.EXPO_PUBLIC_DEMO_COLLECTOR_ID,
  1
);

export const DEMO_RECYCLER_ID = envInt(
  process.env.EXPO_PUBLIC_DEMO_RECYCLER_ID,
  1
);

export const DEFAULT_LOCATION =
  process.env.EXPO_PUBLIC_DEFAULT_LOCATION || 'Bengaluru';

export const DEFAULT_LAT =
  Number(process.env.EXPO_PUBLIC_DEFAULT_LAT) || 12.9716;

export const DEFAULT_LNG =
  Number(process.env.EXPO_PUBLIC_DEFAULT_LNG) || 77.5946;

// ============================================================
// NORMALIZATION HELPERS
// ============================================================

const SKIP_KEYS = new Set([
  'lot_id',
  'handover_reference_number',
  'handover_reference',
  'reference',
  'client_id',
  'category',
  'sub_category',
  'phone',
  'contact',
  'contact_details',
  'name',
  'facility_location',
  'service_area',
  'operating_location',
  'location',
  'address',
  'authorization_number',
  'authorization_details',
  'verification_source',
  'profile_image',
  'image_ref',
  'image_url',
  'description',
  'status',
  'authorization_status',
  'pickup_availability',
  'pincode',
  'postal_code',
]);

function toNumberIfNumeric(value: unknown): unknown {
  if (value === null || value === undefined || value === '') {
    return value;
  }
  const num = Number(value);
  return Number.isNaN(num) ? value : num;
}

function normalize<T>(value: T, key?: string): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item)) as unknown as T;
  }

  if (value && typeof value === 'object' && !(value instanceof FormData)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SKIP_KEYS.has(k) ? v : normalize(v, k);
    }
    return out as T;
  }

  if (typeof value === 'string' && key && !SKIP_KEYS.has(key)) {
    return toNumberIfNumeric(value) as T;
  }

  return value;
}

// ============================================================
// REQUEST HELPER
// ============================================================

/** Timeout in milliseconds for all API requests. */
const TIMEOUT_MS: number = (() => {
  const raw = process.env.EXPO_PUBLIC_API_TIMEOUT_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 15_000;
})();

/**
 * Thrown when an HTTP response indicates a server/client error (4xx/5xx).
 * Always has a `status` code and optionally a parsed `data` body.
 */
export class ApiError extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Thrown when the request cannot reach the server at all.
 * Typical causes: no internet, DNS failure, or browser CORS preflight rejection.
 * On Expo Web, a CORS block from the backend manifests as a `TypeError` which
 * we convert to this class so callers can show a platform-specific message.
 */
export class NetworkError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

export interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const url = `${BASE}${path}`;

  if (__DEV__) {
    console.log(`[API] ${method} ${url}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
      signal: controller.signal,
    });

    let json: any = null;
    const isJson = res.headers.get('content-type')?.includes('application/json');
    if (isJson) {
      json = await res.json();
    }

    if (!res.ok) {
      throw new ApiError(
        json?.message || json?.error || `HTTP ${res.status}`,
        res.status,
        json
      );
    }

    return normalize(json) as T;
  } catch (err) {
    // AbortError means our timeout fired.
    if (err instanceof Error && err.name === 'AbortError') {
      const timeoutErr = new NetworkError(
        `Request timed out after ${TIMEOUT_MS / 1000}s`,
        err
      );
      console.error(`[API] Timeout: ${method} ${url}`, timeoutErr);
      throw timeoutErr;
    }

    // TypeError is what browsers (and React Native fetch) throw when the network
    // is unreachable OR when a CORS preflight is rejected by the server.
    if (err instanceof TypeError) {
      const netErr = new NetworkError(
        'Network request failed – check connectivity or CORS configuration.',
        err
      );
      console.error(`[API] Network error: ${method} ${url}`, netErr);
      throw netErr;
    }

    // ApiError and any other typed errors pass through as-is.
    if (__DEV__) {
      console.error(`[API] Error: ${method} ${url}`, err);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================
// HEALTH
// ============================================================

export const checkHealth = () => request('/health');

// ============================================================
// VALUATION
// ============================================================

export interface ValuationParams {
  category: string;
  location: string;
  weight: number | string;
}

export const getInstantValuation = ({ category, location, weight }: ValuationParams) =>
  request(
    `/valuation/instant?category=${encodeURIComponent(category)}&location=${encodeURIComponent(location)}&weight=${weight}`
  );

// ============================================================
// RECYCLERS
// ============================================================

export interface MatchedRecyclersParams {
  category?: string;
  lat?: number | string;
  lng?: number | string;
  maxDistanceKm?: number | string;
  location?: string;
}

export const getMatchedRecyclers = ({
  category,
  lat,
  lng,
  maxDistanceKm,
  location,
}: MatchedRecyclersParams = {}) => {
  const params = new URLSearchParams();

  if (category) params.set('category', category);
  if (lat != null && Number.isFinite(Number(lat))) params.set('lat', String(lat));
  if (lng != null && Number.isFinite(Number(lng))) params.set('lng', String(lng));
  if (location) params.set('location', location);
  if (maxDistanceKm != null) params.set('maxDistanceKm', String(maxDistanceKm));

  return request(`/recyclers/match?${params.toString()}`);
};

export interface AllRecyclersParams {
  limit?: number;
  location?: string;
  name?: string;
  authorization_status?: string;
}

export const getAllRecyclers = ({
  limit,
  location,
  name,
  authorization_status,
}: AllRecyclersParams = {}) => {
  const params = new URLSearchParams();

  if (limit) params.set('limit', String(limit));
  if (location) params.set('location', location);
  if (name) params.set('name', name);
  if (authorization_status) params.set('authorization_status', authorization_status);

  const qs = params.toString();
  return request(qs ? `/recyclers?${qs}` : '/recyclers').then((r: any) => ({
    ...r,
    data: Array.isArray(r.data)
      ? r.data
      : (r.data?.recyclers ?? r.recyclers ?? []),
  }));
};

export const getRecycler = (id: number | string) => request(`/recyclers/${id}`);

export const updateRecycler = (id: number | string, data: any) =>
  request(`/recyclers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// ============================================================
// PRICE TRENDS / MARKET
// ============================================================

export interface PriceTrendsParams {
  category: string;
  location?: string;
  days?: number;
}

export const getPriceTrends = ({
  category,
  location,
  days = 90,
}: PriceTrendsParams) => {
  let url = `/prices/trends?category=${encodeURIComponent(category)}&days=${days}`;
  if (location) {
    url += `&location=${encodeURIComponent(location)}`;
  }
  return request(url);
};

export const getMarketPulse = (location = 'Bengaluru') =>
  request(`/prices/market-pulse?location=${encodeURIComponent(location)}`);

export const refreshMarketPrices = (days = 90) =>
  request('/prices/refresh-market', {
    method: 'POST',
    body: JSON.stringify({ days }),
  });

export interface RecyclerRateBoardParams {
  category: string;
  location: string;
}

export const getRecyclerRateBoard = ({ category, location }: RecyclerRateBoardParams) =>
  request(
    `/prices/ingest/recycler-rates?category=${encodeURIComponent(category)}&location=${encodeURIComponent(location)}`
  );

// ============================================================
// HANDOVER / LOTS
// ============================================================

export async function createLot(data: any) {
  return request('/handover/lots', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function initiateHandover(data: any) {
  return request('/handover/initiate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export const confirmHandover = (referenceNumber: string, data?: any) =>
  request(`/handover/confirm/${referenceNumber}`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });

export const getHandoverByRef = (referenceNumber: string) =>
  request(`/handover/reference/${referenceNumber}`);

export const getHandoversByLot = (lotId: number | string) =>
  request(`/handover/lot/${lotId}`);

export const getLotEvents = (lotId: number | string) =>
  request(`/handover/lots/${lotId}/events`);

export const getLotImages = (lotId: number | string) =>
  request(`/handover/lots/${lotId}/images`);

export const cancelLot = (lotId: number | string, reason?: string) =>
  request(`/handover/lots/${lotId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

export const deleteLot = (lotId: number | string) =>
  request(`/handover/lots/${lotId}`, {
    method: 'DELETE',
  });

export async function getLotsByCollector(collectorId: number | string) {
  return request(`/handover/collector/${collectorId}/lots`);
}

export async function getLotsByRecycler(recyclerId: number | string) {
  return request(`/handover/recycler/${recyclerId}/lots`);
}

export const updatePayment = (handoverId: number | string, data: any) =>
  request(`/handover/${handoverId}/payment`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// ============================================================
// AI CLASSIFICATION & FEEDBACK
// ============================================================

export const submitAiFeedback = (data: any) =>
  request('/ai/feedback', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateAiFeedback = (feedbackId: number | string, data: any) =>
  request(`/ai/feedback/${feedbackId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const getAiStats = () => request('/ai/stats');

export const classifyAi = (formData: FormData) =>
  request('/ai/classify', {
    method: 'POST',
    headers: {}, // Let fetch generate multipart boundary
    body: formData,
  });

export const getAiDatasetSummary = () => request('/ai/dataset/summary');

export interface DatasetSamplesParams {
  category?: string;
  limit?: number;
  offset?: number;
}

export const getAiDatasetSamples = ({ category, limit, offset }: DatasetSamplesParams = {}) => {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (limit) params.set('limit', String(limit));
  if (offset) params.set('offset', String(offset));
  const qs = params.toString();
  return request(qs ? `/ai/dataset/samples?${qs}` : '/ai/dataset/samples');
};

export const getAiDatasetExportUrl = (format = 'json') =>
  `${BASE}/ai/dataset/export?format=${format}`;

// ============================================================
// ANOMALIES
// ============================================================

export const getAnomalies = (params: Record<string, any> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(qs ? `/anomaly?${qs}` : '/anomaly');
};

export const checkTransactionAnomaly = (payload: any) =>
  request('/anomaly/check', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// ============================================================
// AUTHENTICATION
// ============================================================

export const loginCollector = (phone: string) =>
  request('/collectors/login', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });

export const registerCollector = (data: any) =>
  request('/collectors/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const loginRecycler = (recyclerId: number | string) =>
  request('/recyclers/login', {
    method: 'POST',
    body: JSON.stringify({ recycler_id: recyclerId }),
  });

export const onboardRecycler = (data: any) =>
  request('/recyclers/onboard', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ============================================================
// QUOTE / OFFER MARKETPLACE
// ============================================================

export const requestQuote = (lotId: number | string, recyclerId: number | string) =>
  request('/quotes/request', {
    method: 'POST',
    body: JSON.stringify({
      lot_id: lotId,
      recycler_id: recyclerId,
    }),
  });

export const respondToOffer = (offerId: number | string, offeredPrice: number | string) =>
  request(`/quotes/${offerId}/respond`, {
    method: 'POST',
    body: JSON.stringify({
      offered_price: offeredPrice,
    }),
  });

export const acceptOffer = (offerId: number | string) =>
  request(`/quotes/${offerId}/accept`, {
    method: 'POST',
  });

export const rejectOffer = (offerId: number | string) =>
  request(`/quotes/${offerId}/reject`, {
    method: 'POST',
  });

export const getOffersByLot = (lotId: number | string) =>
  request(`/quotes/lot/${lotId}`);

export const getAvailableLots = (recyclerId: number | string) =>
  request(`/quotes/available?recycler_id=${recyclerId}`);

export interface QuoteLotParams {
  lotId: number | string;
  recyclerId: number | string;
  offeredPrice: number | string;
  existingOfferId?: number | string;
}

export async function quoteLot({
  lotId,
  recyclerId,
  offeredPrice,
  existingOfferId,
}: QuoteLotParams) {
  let offerId = existingOfferId;

  if (!offerId) {
    const created = await requestQuote(lotId, recyclerId);
    offerId = created.data.id;
  }

  return respondToOffer(offerId!, offeredPrice);
}

// ============================================================
// ADMIN
// ============================================================

export const adminLogin = (code: string) =>
  request('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });

export const getAdminSummary = () => request('/admin/summary');

export const renewRecyclerAuthorization = (id: number | string, data: any) =>
  request(`/recyclers/${id}/renew`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const adminVerifyRecycler = (
  id: number | string,
  decision: string,
  verification_source?: string,
  rejection_reason?: string
) =>
  request(`/admin/recyclers/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify({
      decision,
      verification_source,
      rejection_reason,
    }),
  });

export const getPriceSources = () => request('/admin/price-sources');

export const createPriceSource = (data: any) =>
  request('/admin/price-sources', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updatePriceSource = (id: number | string, data: any) =>
  request(`/admin/price-sources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deletePriceSource = (id: number | string) =>
  request(`/admin/price-sources/${id}`, {
    method: 'DELETE',
  });

export const getAdminLots = () => request('/admin/lots');

export const getAdminAuditEvents = () => request('/admin/audit-events');

export const getAdminAnalytics = () => request('/admin/analytics');

export const getAdminHeatmap = () => request('/admin/heatmap');

// ============================================================
// EARNINGS & PAYMENTS
// ============================================================

export async function getEarningsSummary(collectorId: number | string) {
  return request(`/payments/earnings/${collectorId}`);
}

export async function getPaymentHistory(collectorId: number | string) {
  return request(`/payments/history/${collectorId}`);
}

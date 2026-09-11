/**
 * ReLoop Mobile API Client
 * React Native / Expo + TypeScript
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

import type {
  Recycler,
  RecyclerApplication,
  RecyclerApplicationResponse,
  RecyclerLoginResponse,
} from '../types/auth';

import type {
  ApiDataResponse,
  RecyclerLot,
} from '../types/recycler-dashboard';

import type {
  ApiResponse,
  RecyclerIncomingLot,
  RecyclerQuote,
  RecyclerQuoteInput,
} from '../types/recycler-lot';

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
  const fromEnv =
    process.env.EXPO_PUBLIC_API_BASE_URL;

  if (
    fromEnv &&
    fromEnv.trim()
  ) {
    return fromEnv
      .trim()
      .replace(/\/+$/, '');
  }

  // Development fallback.
  // .env should normally provide this value.
  return 'https://kabadiwala-mh5c.onrender.com/v1';
}

export const BASE =
  resolveBaseUrl();

if (__DEV__) {
  console.log(
    '[API] Base URL:',
    BASE,
  );
}

function envInt(
  value?: string,
  fallback = 1,
): number {
  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

export const DEMO_COLLECTOR_ID =
  envInt(
    process.env
      .EXPO_PUBLIC_DEMO_COLLECTOR_ID,
    1,
  );

export const DEMO_RECYCLER_ID =
  envInt(
    process.env
      .EXPO_PUBLIC_DEMO_RECYCLER_ID,
    1,
  );

export const DEFAULT_LOCATION =
  process.env
    .EXPO_PUBLIC_DEFAULT_LOCATION ||
  'Bengaluru';

export const DEFAULT_LAT =
  Number(
    process.env
      .EXPO_PUBLIC_DEFAULT_LAT,
  ) || 12.9716;

export const DEFAULT_LNG =
  Number(
    process.env
      .EXPO_PUBLIC_DEFAULT_LNG,
  ) || 77.5946;

// ============================================================
// NORMALIZATION HELPERS
// ============================================================

const SKIP_KEYS =
  new Set<string>([
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
    'account_status',

    'pickup_availability',

    'pincode',
    'postal_code',
  ]);

function toNumberIfNumeric(
  value: unknown,
): unknown {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return value;
  }

  const number =
    Number(value);

  return Number.isNaN(number)
    ? value
    : number;
}

function normalize<T>(
  value: T,
  key?: string,
): T {
  if (
    Array.isArray(value)
  ) {
    return value.map(item =>
      normalize(item),
    ) as unknown as T;
  }

  if (
    value &&
    typeof value ===
    'object' &&
    !(value instanceof FormData)
  ) {
    const output:
      Record<string, unknown> =
      {};

    for (
      const [currentKey, currentValue]
      of Object.entries(value)
    ) {
      output[currentKey] =
        SKIP_KEYS.has(
          currentKey,
        )
          ? currentValue
          : normalize(
            currentValue,
            currentKey,
          );
    }

    return output as T;
  }

  if (
    typeof value ===
    'string' &&
    key &&
    !SKIP_KEYS.has(key)
  ) {
    return toNumberIfNumeric(
      value,
    ) as T;
  }

  return value;
}

// ============================================================
// REQUEST / ERROR TYPES
// ============================================================

const TIMEOUT_MS =
  (() => {
    const raw =
      process.env
        .EXPO_PUBLIC_API_TIMEOUT_MS;

    const parsed =
      Number(raw);

    return (
      Number.isFinite(
        parsed,
      ) &&
      parsed > 0
    )
      ? parsed
      : 30_000;
  })();

/**
 * Returned when the backend responds
 * with a non-success HTTP status.
 */
export class ApiError extends Error {
  readonly status?: number;

  readonly data?: unknown;

  constructor(
    message: string,
    status?: number,
    data?: unknown,
  ) {
    super(message);

    this.name =
      'ApiError';

    this.status =
      status;

    this.data =
      data;

    Object.setPrototypeOf(
      this,
      ApiError.prototype,
    );
  }
}

/**
 * Returned when fetch cannot reach the API.
 *
 * Examples:
 * - no internet
 * - DNS failure
 * - timeout
 * - Expo Web CORS rejection
 */
export class NetworkError extends Error {
  readonly cause?:
    unknown;

  constructor(
    message: string,
    cause?: unknown,
  ) {
    super(message);

    this.name =
      'NetworkError';

    this.cause =
      cause;

    Object.setPrototypeOf(
      this,
      NetworkError.prototype,
    );
  }
}

export interface RequestOptions
  extends Omit<
    RequestInit,
    'headers'
  > {
  headers?:
  Record<string, string>;
}

// ============================================================
// INTERNAL REQUEST HELPERS
// ============================================================

function buildUrl(
  path: string,
): string {
  const normalizedPath =
    path.startsWith('/')
      ? path
      : `/${path}`;

  return `${BASE}${normalizedPath}`;
}

async function parseResponse(
  response: Response,
): Promise<unknown> {
  const contentType =
    response.headers.get(
      'content-type',
    ) ?? '';

  if (
    contentType.includes(
      'application/json',
    )
  ) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text =
      await response.text();

    return text ||
      null;
  } catch {
    return null;
  }
}

function getErrorMessage(
  body: unknown,
  status: number,
): string {
  if (
    typeof body ===
    'object' &&
    body !== null
  ) {
    const object =
      body as {
        message?: unknown;
        error?: unknown;
        detail?: unknown;
      };

    if (
      typeof object.message ===
      'string' &&
      object.message.trim()
    ) {
      return object.message;
    }

    if (
      typeof object.error ===
      'string' &&
      object.error.trim()
    ) {
      return object.error;
    }

    if (
      typeof object.detail ===
      'string' &&
      object.detail.trim()
    ) {
      return object.detail;
    }
  }

  if (
    typeof body ===
    'string' &&
    body.trim()
  ) {
    return body;
  }

  switch (status) {
    case 400:
      return 'Invalid request. Please check the submitted information.';

    case 401:
      return 'Authentication is required.';

    case 403:
      return 'You are not authorized to perform this action.';

    case 404:
      return 'Requested resource was not found.';

    case 409:
      return 'This operation conflicts with existing data.';

    case 422:
      return 'Some submitted information is invalid.';

    case 429:
      return 'Too many requests. Please try again shortly.';

    case 500:
      return 'The server encountered an error.';

    case 502:
    case 503:
    case 504:
      return 'The server is temporarily unavailable.';

    default:
      return `HTTP ${status}`;
  }
}

// ============================================================
// MAIN REQUEST FUNCTION
// ============================================================

export async function request<
  T = unknown,
>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method =
    (
      options.method ??
      'GET'
    ).toUpperCase();

  const url =
    buildUrl(path);

  if (__DEV__) {
    console.log(
      `[API] ${method} ${url}`,
    );
  }

  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      () => {
        controller.abort();
      },
      TIMEOUT_MS,
    );

  try {
    const body =
      options.body;

    const isFormData =
      body instanceof
      FormData;

    const headers:
      Record<string, string> =
    {
      Accept:
        'application/json',

      ...(!isFormData &&
        body !==
        undefined && {
        'Content-Type':
          'application/json',
      }),

      ...options.headers,
    };

    const response =
      await fetch(
        url,
        {
          ...options,

          headers,

          signal:
            controller.signal,
        },
      );

    const parsed =
      await parseResponse(
        response,
      );

    if (
      !response.ok
    ) {
      throw new ApiError(
        getErrorMessage(
          parsed,
          response.status,
        ),
        response.status,
        parsed,
      );
    }

    if (__DEV__) {
      console.log(
        `[API] ${response.status} ${method} ${url}`,
      );
    }

    return normalize(
      parsed,
    ) as T;
  } catch (error) {
    if (
      error instanceof
      ApiError
    ) {
      if (__DEV__) {
        console.error(
          `[API] Error: ${method} ${url}`,
          error,
        );
      }

      throw error;
    }

    if (
      error instanceof Error &&
      error.name ===
      'AbortError'
    ) {
      const timeoutError =
        new NetworkError(
          `Request timed out after ${TIMEOUT_MS /
          1000
          } seconds.`,
          error,
        );

      if (__DEV__) {
        console.error(
          `[API] Timeout: ${method} ${url}`,
          timeoutError,
        );
      }

      throw timeoutError;
    }

    const networkError =
      new NetworkError(
        'Unable to connect to the server. Check your internet connection.',
        error,
      );

    if (__DEV__) {
      console.error(
        `[API] Network error: ${method} ${url}`,
        networkError,
      );
    }

    throw networkError;
  } finally {
    clearTimeout(
      timeoutId,
    );
  }
}

// ============================================================
// HEALTH
// ============================================================

export const checkHealth =
  () =>
    request(
      '/health',
    );

// ============================================================
// VALUATION
// ============================================================

export interface ValuationParams {
  category: string;

  location: string;

  weight:
  | number
  | string;
}

export const getInstantValuation =
  ({
    category,
    location,
    weight,
  }: ValuationParams) =>
    request(
      `/valuation/instant?category=${encodeURIComponent(
        category,
      )}&location=${encodeURIComponent(
        location,
      )}&weight=${encodeURIComponent(
        String(weight),
      )}`,
    );

// ============================================================
// RECYCLERS
// ============================================================

export interface MatchedRecyclersParams {
  category?: string;

  lat?:
  | number
  | string;

  lng?:
  | number
  | string;

  maxDistanceKm?:
  | number
  | string;

  location?: string;
}

export const getMatchedRecyclers =
  ({
    category,
    lat,
    lng,
    maxDistanceKm,
    location,
  }: MatchedRecyclersParams = {}) => {
    const params =
      new URLSearchParams();

    if (category) {
      params.set(
        'category',
        category,
      );
    }

    if (
      lat !==
      undefined &&
      Number.isFinite(
        Number(lat),
      )
    ) {
      params.set(
        'lat',
        String(lat),
      );
    }

    if (
      lng !==
      undefined &&
      Number.isFinite(
        Number(lng),
      )
    ) {
      params.set(
        'lng',
        String(lng),
      );
    }

    if (location) {
      params.set(
        'location',
        location,
      );
    }

    if (
      maxDistanceKm !==
      undefined
    ) {
      params.set(
        'maxDistanceKm',
        String(
          maxDistanceKm,
        ),
      );
    }

    const query =
      params.toString();

    return request(
      query
        ? `/recyclers/match?${query}`
        : '/recyclers/match',
    );
  };

export interface AllRecyclersParams {
  limit?: number;

  location?: string;

  name?: string;

  authorization_status?:
  string;
}

export const getAllRecyclers =
  ({
    limit,
    location,
    name,
    authorization_status,
  }: AllRecyclersParams = {}) => {
    const params =
      new URLSearchParams();

    if (limit) {
      params.set(
        'limit',
        String(limit),
      );
    }

    if (location) {
      params.set(
        'location',
        location,
      );
    }

    if (name) {
      params.set(
        'name',
        name,
      );
    }

    if (
      authorization_status
    ) {
      params.set(
        'authorization_status',
        authorization_status,
      );
    }

    const query =
      params.toString();

    return request<any>(
      query
        ? `/recyclers?${query}`
        : '/recyclers',
    ).then(response => ({
      ...response,

      data:
        Array.isArray(
          response.data,
        )
          ? response.data
          : (
            response.data
              ?.recyclers ??
            response.recyclers ??
            []
          ),
    }));
  };

// ------------------------------------------------------------
// Phase 2 — Recycler profile/dashboard
// ------------------------------------------------------------

export function getRecycler(
  recyclerId:
    | number
    | string,
): Promise<
  ApiDataResponse<Recycler>
> {
  return request<
    ApiDataResponse<Recycler>
  >(
    `/recyclers/${encodeURIComponent(
      String(
        recyclerId,
      ),
    )}`,
  );
}

export interface UpdateRecyclerPayload {
  name?: string;

  facility_location?: string;

  contact_details?: string;

  service_area?: string;

  materials_accepted?:
  MaterialCategory[];

  pickup_availability?:
  string;
}

export function updateRecycler(
  recyclerId:
    | number
    | string,
  data:
    UpdateRecyclerPayload,
): Promise<
  ApiDataResponse<Recycler>
> {
  return request<
    ApiDataResponse<Recycler>
  >(
    `/recyclers/${encodeURIComponent(
      String(
        recyclerId,
      ),
    )}`,
    {
      method: 'PUT',

      body:
        JSON.stringify(
          data,
        ),
    },
  );
}

// ============================================================
// PRICE TRENDS / MARKET
// ============================================================

export interface PriceTrendsParams {
  category: string;

  location?: string;

  days?: number;
}

export const getPriceTrends =
  ({
    category,
    location,
    days = 90,
  }: PriceTrendsParams) => {
    const params =
      new URLSearchParams({
        category,

        days:
          String(days),
      });

    if (location) {
      params.set(
        'location',
        location,
      );
    }

    return request(
      `/prices/trends?${params.toString()}`,
    );
  };

export const getMarketPulse =
  (
    location =
      'Bengaluru',
  ) =>
    request(
      `/prices/market-pulse?location=${encodeURIComponent(
        location,
      )}`,
    );

export const refreshMarketPrices =
  (
    days = 90,
  ) =>
    request(
      '/prices/refresh-market',
      {
        method:
          'POST',

        body:
          JSON.stringify({
            days,
          }),
      },
    );

export interface RecyclerRateBoardParams {
  category: string;

  location: string;
}

export const getRecyclerRateBoard =
  ({
    category,
    location,
  }: RecyclerRateBoardParams) =>
    request(
      `/prices/ingest/recycler-rates?category=${encodeURIComponent(
        category,
      )}&location=${encodeURIComponent(
        location,
      )}`,
    );

// ============================================================
// HANDOVER / LOTS
// ============================================================

export function createLot(
  data: unknown,
) {
  return request(
    '/handover/lots',
    {
      method: 'POST',

      body:
        JSON.stringify(
          data,
        ),
    },
  );
}

export function initiateHandover(
  data: unknown,
) {
  return request(
    '/handover/initiate',
    {
      method: 'POST',

      body:
        JSON.stringify(
          data,
        ),
    },
  );
}

export const confirmHandover =
  (
    referenceNumber:
      string,

    data?: unknown,
  ) =>
    request(
      `/handover/confirm/${encodeURIComponent(
        referenceNumber,
      )}`,
      {
        method: 'POST',

        body:
          JSON.stringify(
            data ??
            {},
          ),
      },
    );

export const getHandoverByRef =
  (
    referenceNumber:
      string,
  ) =>
    request(
      `/handover/reference/${encodeURIComponent(
        referenceNumber,
      )}`,
    );

export const getHandoversByLot =
  (
    lotId:
      | number
      | string,
  ) =>
    request(
      `/handover/lot/${encodeURIComponent(
        String(
          lotId,
        ),
      )}`,
    );

export const getLotEvents =
  (
    lotId:
      | number
      | string,
  ) =>
    request(
      `/handover/lots/${encodeURIComponent(
        String(
          lotId,
        ),
      )}/events`,
    );

export const getLotImages =
  (
    lotId:
      | number
      | string,
  ) =>
    request(
      `/handover/lots/${encodeURIComponent(
        String(
          lotId,
        ),
      )}/images`,
    );

export const cancelLot =
  (
    lotId:
      | number
      | string,

    reason?: string,
  ) =>
    request(
      `/handover/lots/${encodeURIComponent(
        String(
          lotId,
        ),
      )}/cancel`,
      {
        method: 'POST',

        body:
          JSON.stringify({
            reason,
          }),
      },
    );

export const deleteLot =
  (
    lotId:
      | number
      | string,
  ) =>
    request(
      `/handover/lots/${encodeURIComponent(
        String(
          lotId,
        ),
      )}`,
      {
        method:
          'DELETE',
      },
    );

export function getLotsByCollector(
  collectorId:
    | number
    | string,
) {
  return request(
    `/handover/collector/${encodeURIComponent(
      String(
        collectorId,
      ),
    )}/lots`,
  );
}

/**
 * Existing ReLoop backend Recycler lots route.
 *
 * Keep this route aligned with the existing web API client.
 */
export function getLotsByRecycler(
  recyclerId: number | string,
): Promise<ApiDataResponse<RecyclerLot[]>> {
  return request<ApiDataResponse<RecyclerLot[]>>(
    `/handover/lots/recycler/${encodeURIComponent(
      String(recyclerId),
    )}`,
  );
}

export const updatePayment =
  (
    handoverId:
      | number
      | string,

    data: unknown,
  ) =>
    request(
      `/handover/${encodeURIComponent(
        String(
          handoverId,
        ),
      )}/payment`,
      {
        method: 'PUT',

        body:
          JSON.stringify(
            data,
          ),
      },
    );

// ============================================================
// AI CLASSIFICATION & FEEDBACK
// ============================================================

export const submitAiFeedback =
  (
    data: unknown,
  ) =>
    request(
      '/ai/feedback',
      {
        method: 'POST',

        body:
          JSON.stringify(
            data,
          ),
      },
    );

export const updateAiFeedback =
  (
    feedbackId:
      | number
      | string,

    data: unknown,
  ) =>
    request(
      `/ai/feedback/${encodeURIComponent(
        String(
          feedbackId,
        ),
      )}`,
      {
        method:
          'PATCH',

        body:
          JSON.stringify(
            data,
          ),
      },
    );

export const getAiStats =
  () =>
    request(
      '/ai/stats',
    );

export const classifyAi =
  (
    formData:
      FormData,
  ) =>
    request(
      '/ai/classify',
      {
        method:
          'POST',

        body:
          formData,
      },
    );

export const getAiDatasetSummary =
  () =>
    request(
      '/ai/dataset/summary',
    );

export interface DatasetSamplesParams {
  category?: string;

  limit?: number;

  offset?: number;
}

export const getAiDatasetSamples =
  ({
    category,
    limit,
    offset,
  }: DatasetSamplesParams = {}) => {
    const params =
      new URLSearchParams();

    if (category) {
      params.set(
        'category',
        category,
      );
    }

    if (limit) {
      params.set(
        'limit',
        String(limit),
      );
    }

    if (offset) {
      params.set(
        'offset',
        String(offset),
      );
    }

    const query =
      params.toString();

    return request(
      query
        ? `/ai/dataset/samples?${query}`
        : '/ai/dataset/samples',
    );
  };

export const getAiDatasetExportUrl =
  (
    format =
      'json',
  ) =>
    `${BASE}/ai/dataset/export?format=${encodeURIComponent(
      format,
    )}`;

// ============================================================
// ANOMALIES
// ============================================================

export const getAnomalies =
  (
    params:
      Record<
        string,
        string
      > = {},
  ) => {
    const query =
      new URLSearchParams(
        params,
      ).toString();

    return request(
      query
        ? `/anomaly?${query}`
        : '/anomaly',
    );
  };

export const checkTransactionAnomaly =
  (
    payload: unknown,
  ) =>
    request(
      '/anomaly/check',
      {
        method:
          'POST',

        body:
          JSON.stringify(
            payload,
          ),
      },
    );

// ============================================================
// AUTHENTICATION
// ============================================================

// ------------------------------------------------------------
// Collector auth
// ------------------------------------------------------------

export const loginCollector =
  (
    phone: string,
  ) =>
    request(
      '/collectors/login',
      {
        method:
          'POST',

        body:
          JSON.stringify({
            phone,
          }),
      },
    );

export const registerCollector =
  (
    data: unknown,
  ) =>
    request(
      '/collectors/register',
      {
        method:
          'POST',

        body:
          JSON.stringify(
            data,
          ),
      },
    );

// ------------------------------------------------------------
// Recycler auth
// ------------------------------------------------------------

export function loginRecycler(
  recyclerId:
    | number
    | string,
): Promise<
  RecyclerLoginResponse
> {
  return request<
    RecyclerLoginResponse
  >(
    '/recyclers/login',
    {
      method:
        'POST',

      body:
        JSON.stringify({
          recycler_id:
            recyclerId,
        }),
    },
  );
}

export function onboardRecycler(
  data:
    RecyclerApplication,
): Promise<
  RecyclerApplicationResponse
> {
  return request<
    RecyclerApplicationResponse
  >(
    '/recyclers/onboard',
    {
      method:
        'POST',

      body:
        JSON.stringify(
          data,
        ),
    },
  );
}

// ============================================================
// QUOTE / OFFER MARKETPLACE
// ============================================================

export const requestQuote =
  (
    lotId:
      | number
      | string,

    recyclerId:
      | number
      | string,
  ) =>
    request(
      '/quotes/request',
      {
        method:
          'POST',

        body:
          JSON.stringify({
            lot_id:
              lotId,

            recycler_id:
              recyclerId,
          }),
      },
    );

export const respondToOffer =
  (
    offerId:
      | number
      | string,

    offeredPrice:
      | number
      | string,
  ) =>
    request(
      `/quotes/${encodeURIComponent(
        String(
          offerId,
        ),
      )}/respond`,
      {
        method:
          'POST',

        body:
          JSON.stringify({
            offered_price:
              offeredPrice,
          }),
      },
    );

export const acceptOffer =
  (
    offerId:
      | number
      | string,
  ) =>
    request(
      `/quotes/${encodeURIComponent(
        String(
          offerId,
        ),
      )}/accept`,
      {
        method:
          'POST',
      },
    );

export const rejectOffer =
  (
    offerId:
      | number
      | string,
  ) =>
    request(
      `/quotes/${encodeURIComponent(
        String(
          offerId,
        ),
      )}/reject`,
      {
        method:
          'POST',
      },
    );

export const getOffersByLot =
  (
    lotId:
      | number
      | string,
  ) =>
    request(
      `/quotes/lot/${encodeURIComponent(
        String(
          lotId,
        ),
      )}`,
    );

/**
 * Phase 2 Recycler dashboard:
 * lots currently available to this Recycler.
 */
export function getAvailableLots(
  recyclerId: number,
): Promise<ApiResponse<RecyclerIncomingLot[]>> {
  return request<ApiResponse<RecyclerIncomingLot[]>>(
    `/quotes/available?recycler_id=${encodeURIComponent(
      String(recyclerId),
    )}`,
  );
}

// Use the exact endpoint/payload from the existing ReLoop web application.
export async function submitRecyclerQuote(
  input: RecyclerQuoteInput,
): Promise<ApiResponse<RecyclerQuote>> {
  // 1. requestQuote
  const created = await request<ApiResponse<{ id: string | number }>>(
    '/quotes/request',
    {
      method: 'POST',
      body: JSON.stringify({
        lot_id: input.lot_id,
        recycler_id: input.recycler_id,
      }) as any,
    },
  );

  // 2. respondToOffer
  return request<ApiResponse<RecyclerQuote>>(
    `/quotes/${encodeURIComponent(String(created.data.id))}/respond`,
    {
      method: 'POST',
      body: JSON.stringify({
        offered_price: input.amount,
        notes: input.notes,
      }) as any,
    },
  );
}

export async function acceptRecyclerLot(
  recyclerId: number,
  lotId: string,
): Promise<ApiResponse<unknown>> {
  // Replace with exact endpoint used by the website.
  return request<ApiResponse<unknown>>(
    `/quotes/${lotId}/accept`,
    {
      method: 'POST',
    },
  );
}

export async function rejectRecyclerLot(
  recyclerId: number,
  lotId: string,
): Promise<ApiResponse<unknown>> {
  // Replace with exact endpoint used by the website.
  return request<ApiResponse<unknown>>(
    `/quotes/${lotId}/reject`,
    {
      method: 'POST',
    },
  );
}

export interface QuoteLotParams {
  lotId:
  | number
  | string;

  recyclerId:
  | number
  | string;

  offeredPrice:
  | number
  | string;

  existingOfferId?:
  | number
  | string;
}

interface QuoteRequestResponse {
  data: {
    id:
    | number
    | string;
  };
}

export async function quoteLot({
  lotId,
  recyclerId,
  offeredPrice,
  existingOfferId,
}: QuoteLotParams) {
  let offerId =
    existingOfferId;

  if (!offerId) {
    const created =
      await requestQuote(
        lotId,
        recyclerId,
      ) as QuoteRequestResponse;

    offerId =
      created.data.id;
  }

  return respondToOffer(
    offerId,
    offeredPrice,
  );
}

// ============================================================
// RECYCLER AUTHORIZATION RENEWAL
// ============================================================

/**
 * This is a Recycler-owned profile action,
 * not an Admin screen.
 */
export const renewRecyclerAuthorization =
  (
    recyclerId:
      | number
      | string,

    data: unknown,
  ) =>
    request(
      `/recyclers/${encodeURIComponent(
        String(
          recyclerId,
        ),
      )}/renew`,
      {
        method:
          'POST',

        body:
          JSON.stringify(
            data,
          ),
      },
    );

// ============================================================
// EARNINGS & PAYMENTS
// ============================================================

export function getEarningsSummary(
  collectorId:
    | number
    | string,
) {
  return request(
    `/payments/earnings/${encodeURIComponent(
      String(
        collectorId,
      ),
    )}`,
  );
}

export function getPaymentHistory(
  collectorId:
    | number
    | string,
) {
  return request(
    `/payments/history/${encodeURIComponent(
      String(
        collectorId,
      ),
    )}`,
  );
}
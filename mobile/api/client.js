// ============================================================
// ReLoop Mobile API Client
// React Native / Expo
// ============================================================
//
// Backend base URL comes from:
//
// EXPO_PUBLIC_API_BASE_URL
//
// Example:
// https://kabadiwala-mh5c.onrender.com/v1
//
// NOTE:
// The original web frontend had IndexedDB-based offline support.
// That code is intentionally NOT used here because IndexedDB and
// the existing browser offline utilities are not suitable for the
// React Native mobile app.
//
// Proper mobile offline support will be added later using
// AsyncStorage / SQLite / NetInfo.
// ============================================================


// ============================================================
// BASE URL
// ============================================================

function resolveBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (fromEnv && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/+$/, '');
  }

  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL is not configured'
  );
}

const BASE = resolveBaseUrl();


// ============================================================
// NORMALIZATION
// ============================================================

// PostgreSQL NUMERIC/DECIMAL values often come back as strings.
//
// We convert numeric-looking values into numbers, except fields
// such as IDs, phone numbers, categories, references, etc.

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


function toNumberIfNumeric(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return value;
  }

  const num = Number(value);

  return Number.isNaN(num)
    ? value
    : num;
}


function normalize(value, key) {
  if (Array.isArray(value)) {
    return value.map((item) =>
      normalize(item)
    );
  }

  if (
    value &&
    typeof value === 'object'
  ) {
    const out = {};

    for (const [k, v] of Object.entries(value)) {
      out[k] = SKIP_KEYS.has(k)
        ? v
        : normalize(v, k);
    }

    return out;
  }

  if (
    typeof value === 'string' &&
    key &&
    !SKIP_KEYS.has(key)
  ) {
    return toNumberIfNumeric(value);
  }

  return value;
}


// ============================================================
// REQUEST HELPER
// ============================================================

async function request(path, options = {}) {
  try {
    const res = await fetch(
      `${BASE}${path}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },

        ...options,
      }
    );

    let json = null;

    const isJson =
      res.headers
        .get('content-type')
        ?.includes('application/json');

    if (isJson) {
      json = await res.json();
    }

    if (!res.ok) {
      const err = new Error(
        json?.message ||
        json?.error ||
        `HTTP ${res.status}`
      );

      err.status = res.status;
      err.data = json;

      throw err;
    }

    return normalize(json);
  } catch (err) {
    console.error(
      `API request failed: ${path}`,
      err
    );

    throw err;
  }
}


// ============================================================
// HEALTH
// ============================================================

export const checkHealth = () =>
  request('/health');


// ============================================================
// VALUATION
// ============================================================

export const getInstantValuation = ({
  category,
  location,
  weight,
}) =>
  request(
    `/valuation/instant` +
    `?category=${encodeURIComponent(category)}` +
    `&location=${encodeURIComponent(location)}` +
    `&weight=${weight}`
  );


// ============================================================
// RECYCLERS
// ============================================================

export const getMatchedRecyclers = ({
  category,
  lat,
  lng,
  maxDistanceKm,
  location,
} = {}) => {
  const params =
    new URLSearchParams();

  if (category) {
    params.set(
      'category',
      category
    );
  }

  if (
    lat != null &&
    Number.isFinite(Number(lat))
  ) {
    params.set(
      'lat',
      String(lat)
    );
  }

  if (
    lng != null &&
    Number.isFinite(Number(lng))
  ) {
    params.set(
      'lng',
      String(lng)
    );
  }

  if (location) {
    params.set(
      'location',
      location
    );
  }

  if (
    maxDistanceKm != null
  ) {
    params.set(
      'maxDistanceKm',
      String(maxDistanceKm)
    );
  }

  return request(
    `/recyclers/match?${params.toString()}`
  );
};


export const getAllRecyclers = ({
  limit,
  location,
  name,
  authorization_status,
} = {}) => {
  const params =
    new URLSearchParams();

  if (limit) {
    params.set(
      'limit',
      String(limit)
    );
  }

  if (location) {
    params.set(
      'location',
      location
    );
  }

  if (name) {
    params.set(
      'name',
      name
    );
  }

  if (authorization_status) {
    params.set(
      'authorization_status',
      authorization_status
    );
  }

  const qs =
    params.toString();

  return request(
    qs
      ? `/recyclers?${qs}`
      : '/recyclers'
  ).then((r) => ({
    ...r,

    data: Array.isArray(r.data)
      ? r.data
      : (
        r.data?.recyclers ??
        r.recyclers ??
        []
      ),
  }));
};


export const getRecycler = (id) =>
  request(
    `/recyclers/${id}`
  );


export const updateRecycler = (
  id,
  data
) =>
  request(
    `/recyclers/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    }
  );


// ============================================================
// PRICE TRENDS / MARKET
// ============================================================

export const getPriceTrends = ({
  category,
  location,
  days = 90,
}) => {
  let url =
    `/prices/trends` +
    `?category=${encodeURIComponent(category)}` +
    `&days=${days}`;

  if (location) {
    url +=
      `&location=${encodeURIComponent(location)}`;
  }

  return request(url);
};


export const getMarketPulse = (
  location = 'Bengaluru'
) =>
  request(
    `/prices/market-pulse` +
    `?location=${encodeURIComponent(location)}`
  );


export const refreshMarketPrices = (
  days = 90
) =>
  request(
    '/prices/refresh-market',
    {
      method: 'POST',

      body: JSON.stringify({
        days,
      }),
    }
  );


export const getRecyclerRateBoard = ({
  category,
  location,
}) =>
  request(
    `/prices/ingest/recycler-rates` +
    `?category=${encodeURIComponent(category)}` +
    `&location=${encodeURIComponent(location)}`
  );


// ============================================================
// HANDOVER / LOTS
// ============================================================


// ------------------------------------------------------------
// CREATE LOT
// ------------------------------------------------------------
//
// Mobile version is currently network-only.
//
// Mobile offline queue support will be added later.

export async function createLot(
  data
) {
  return request(
    '/handover/lots',
    {
      method: 'POST',

      body:
        JSON.stringify(data),
    }
  );
}


// ------------------------------------------------------------
// INITIATE HANDOVER
// ------------------------------------------------------------

export async function initiateHandover(
  data
) {
  return request(
    '/handover/initiate',
    {
      method: 'POST',

      body:
        JSON.stringify(data),
    }
  );
}


// ------------------------------------------------------------
// CONFIRM HANDOVER
// ------------------------------------------------------------

export const confirmHandover = (
  reference,
  opts
) =>
  request(
    `/handover/confirm/${reference}`,
    {
      method: 'POST',

      body:
        JSON.stringify(opts),
    }
  );


// ------------------------------------------------------------
// GET HANDOVER BY REFERENCE
// ------------------------------------------------------------

export const getHandoverByRef = (
  reference
) =>
  request(
    `/handover/${reference}`
  );


// ------------------------------------------------------------
// HANDOVERS FOR LOT
// ------------------------------------------------------------

export const getHandoversByLot = (
  lotId
) =>
  request(
    `/handover/lot/${lotId}`
  );


// ------------------------------------------------------------
// LOT EVENTS / TRACEABILITY
// ------------------------------------------------------------

export const getLotEvents = (
  lotId
) =>
  request(
    `/handover/lots/${encodeURIComponent(
      lotId
    )}/events`
  );


// ------------------------------------------------------------
// LOT IMAGES
// ------------------------------------------------------------

export const getLotImages = (
  lotId
) =>
  request(
    `/handover/lots/${encodeURIComponent(
      lotId
    )}/images`
  );


// ------------------------------------------------------------
// CANCEL LOT
// ------------------------------------------------------------

export const cancelLot = (
  lotId,
  data = {}
) =>
  request(
    `/handover/lots/${encodeURIComponent(
      lotId
    )}/cancel`,
    {
      method: 'POST',

      body:
        JSON.stringify(data),
    }
  );


// ------------------------------------------------------------
// DELETE LOT
// ------------------------------------------------------------

export const deleteLot = (
  lotId,
  data = {}
) =>
  request(
    `/handover/lots/${encodeURIComponent(
      lotId
    )}`,
    {
      method: 'DELETE',

      body:
        JSON.stringify(data),
    }
  );


// ------------------------------------------------------------
// GET LOTS BY COLLECTOR
// ------------------------------------------------------------
//
// IMPORTANT:
// Old web IndexedDB caching has been removed for React Native.

export async function getLotsByCollector(
  collectorId
) {
  return request(
    `/handover/lots/collector/${collectorId}`
  );
}


// ------------------------------------------------------------
// GET LOTS BY RECYCLER
// ------------------------------------------------------------

export async function getLotsByRecycler(
  recyclerId
) {
  return request(
    `/handover/lots/recycler/${recyclerId}`
  );
}


// ============================================================
// PAYMENTS
// ============================================================

export const updatePayment = (
  lotId,
  data
) =>
  request(
    `/payments/${lotId}`,
    {
      method: 'PATCH',

      body:
        JSON.stringify(data),
    }
  );


// ============================================================
// AI FEEDBACK / CLASSIFICATION
// ============================================================

export const submitAiFeedback = (
  payload
) =>
  request(
    '/ai/feedback',
    {
      method: 'POST',

      body:
        JSON.stringify(payload),
    }
  );


export const updateAiFeedback = (
  id,
  payload
) =>
  request(
    `/ai/feedback/${id}`,
    {
      method: 'PATCH',

      body:
        JSON.stringify(payload),
    }
  );


export const getAiStats = () =>
  request(
    '/ai/stats'
  );


export const classifyAi = (
  payload
) =>
  request(
    '/ai/classify',
    {
      method: 'POST',

      body:
        JSON.stringify(payload),
    }
  );


export const getAiDatasetSummary = () =>
  request(
    '/ai/dataset/summary'
  );


export const getAiDatasetSamples = ({
  outcome,
  category,
  limit,
  offset,
} = {}) => {
  const q =
    new URLSearchParams();

  if (outcome) {
    q.set(
      'outcome',
      outcome
    );
  }

  if (category) {
    q.set(
      'category',
      category
    );
  }

  if (limit) {
    q.set(
      'limit',
      String(limit)
    );
  }

  if (offset) {
    q.set(
      'offset',
      String(offset)
    );
  }

  return request(
    `/ai/dataset/samples?${q.toString()}`
  );
};


export const getAiDatasetExportUrl =
  () =>
    `${BASE}/ai/dataset/export`;


// ============================================================
// ANOMALY DETECTION
// ============================================================

export const getAnomalies = ({
  category,
} = {}) => {
  let url =
    '/anomaly';

  if (category) {
    url +=
      `?category=${encodeURIComponent(
        category
      )}`;
  }

  return request(url);
};


export const checkTransactionAnomaly = (
  payload
) =>
  request(
    '/anomaly/check',
    {
      method: 'POST',

      body:
        JSON.stringify(payload),
    }
  );


// ============================================================
// COLLECTOR AUTH
// ============================================================


// ------------------------------------------------------------
// LOGIN COLLECTOR
//
// POST /v1/collectors/login
//
// body:
// {
//   phone: "9876543210"
// }
// ------------------------------------------------------------

export const loginCollector = (
  phone
) =>
  request(
    '/collectors/login',
    {
      method: 'POST',

      body:
        JSON.stringify({
          phone,
        }),
    }
  );


// ------------------------------------------------------------
// REGISTER COLLECTOR
//
// Creates account and returns collector + token.
// ------------------------------------------------------------

export const registerCollector = (
  data
) =>
  request(
    '/collectors/register',
    {
      method: 'POST',

      body:
        JSON.stringify(data),
    }
  );


// ============================================================
// RECYCLER AUTH
// ============================================================

export const loginRecycler = (
  recyclerId
) =>
  request(
    '/recyclers/login',
    {
      method: 'POST',

      body:
        JSON.stringify({
          recycler_id:
            recyclerId,
        }),
    }
  );


export const onboardRecycler = (
  data
) =>
  request(
    '/recyclers/onboard',
    {
      method: 'POST',

      body:
        JSON.stringify(data),
    }
  );


// ============================================================
// QUOTE / OFFER MARKETPLACE
// ============================================================


// Collector requests quote from recycler

export const requestQuote = (
  lotId,
  recyclerId
) =>
  request(
    '/quotes/request',
    {
      method: 'POST',

      body:
        JSON.stringify({
          lot_id: lotId,
          recycler_id: recyclerId,
        }),
    }
  );


// Recycler responds with price

export const respondToOffer = (
  offerId,
  offeredPrice
) =>
  request(
    `/quotes/${offerId}/respond`,
    {
      method: 'POST',

      body:
        JSON.stringify({
          offered_price:
            offeredPrice,
        }),
    }
  );


// Collector accepts offer

export const acceptOffer = (
  offerId
) =>
  request(
    `/quotes/${offerId}/accept`,
    {
      method: 'POST',
    }
  );


// Collector rejects offer

export const rejectOffer = (
  offerId
) =>
  request(
    `/quotes/${offerId}/reject`,
    {
      method: 'POST',
    }
  );


// All offers for one lot

export const getOffersByLot = (
  lotId
) =>
  request(
    `/quotes/lot/${lotId}`
  );


// Lots recycler can quote

export const getAvailableLots = (
  recyclerId
) =>
  request(
    `/quotes/available?recycler_id=${recyclerId}`
  );


// Convenient one-call quote function

export async function quoteLot({
  lotId,
  recyclerId,
  offeredPrice,
  existingOfferId,
}) {
  let offerId =
    existingOfferId;

  if (!offerId) {
    const created =
      await requestQuote(
        lotId,
        recyclerId
      );

    offerId =
      created.data.id;
  }

  return respondToOffer(
    offerId,
    offeredPrice
  );
}


// ============================================================
// ADMIN
// ============================================================

export const adminLogin = (
  code
) =>
  request(
    '/admin/login',
    {
      method: 'POST',

      body:
        JSON.stringify({
          code,
        }),
    }
  );


export const getAdminSummary = () =>
  request(
    '/admin/summary'
  );


export const renewRecyclerAuthorization = (
  id,
  data
) =>
  request(
    `/recyclers/${id}/renew`,
    {
      method: 'POST',

      body:
        JSON.stringify(data),
    }
  );


export const adminVerifyRecycler = (
  id,
  decision,
  verification_source,
  rejection_reason
) =>
  request(
    `/admin/recyclers/${id}/verify`,
    {
      method: 'POST',

      body:
        JSON.stringify({
          decision,
          verification_source,
          rejection_reason,
        }),
    }
  );


// ============================================================
// PRICE SOURCES
// ============================================================

export const getPriceSources =
  () =>
    request(
      '/admin/price-sources'
    );


export const createPriceSource = (
  data
) =>
  request(
    '/admin/price-sources',
    {
      method: 'POST',

      body:
        JSON.stringify(data),
    }
  );


export const updatePriceSource = (
  id,
  data
) =>
  request(
    `/admin/price-sources/${id}`,
    {
      method: 'PUT',

      body:
        JSON.stringify(data),
    }
  );


export const deletePriceSource = (
  id
) =>
  request(
    `/admin/price-sources/${id}`,
    {
      method: 'DELETE',
    }
  );


// ============================================================
// ADMIN OPERATIONAL DATA
// ============================================================

export const getAdminLots = () =>
  request(
    '/admin/lots'
  );


export const getAdminAuditEvents = () =>
  request(
    '/admin/audit-events'
  );


export const getAdminAnalytics = () =>
  request(
    '/admin/analytics'
  );


export const getAdminHeatmap = () =>
  request(
    '/admin/heatmap'
  );


// ============================================================
// EARNINGS
// ============================================================
//
// Mobile version is network-only.
// Offline caching will be implemented later using mobile storage.

export async function getEarningsSummary(
  collectorId
) {
  return request(
    `/payments/earnings/${collectorId}`
  );
}


// ============================================================
// PAYMENT HISTORY
// ============================================================

export async function getPaymentHistory(
  collectorId
) {
  return request(
    `/payments/history/${collectorId}`
  );
}


// ============================================================
// ENV / APP DEFAULTS
// ============================================================

const envInt = (
  value,
  fallback
) => {
  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
};


export const DEMO_COLLECTOR_ID =
  envInt(
    process.env
      .EXPO_PUBLIC_DEMO_COLLECTOR_ID,
    1
  );


export const DEMO_RECYCLER_ID =
  envInt(
    process.env
      .EXPO_PUBLIC_DEMO_RECYCLER_ID,
    1
  );


export const DEFAULT_LOCATION =
  process.env
    .EXPO_PUBLIC_DEFAULT_LOCATION ||
  'Bengaluru';


export const DEFAULT_LAT =
  Number(
    process.env
      .EXPO_PUBLIC_DEFAULT_LAT
  ) || 12.9716;


export const DEFAULT_LNG =
  Number(
    process.env
      .EXPO_PUBLIC_DEFAULT_LNG
  ) || 77.5946;


// ============================================================
// MATERIAL CATEGORIES
// ============================================================

export const MATERIAL_CATEGORIES = [
  {
    id: 'CRT',
    label: 'CRTs',
    icon: '📺',

    sub: [
      'Color CRT',
      'Monochrome CRT',
    ],
  },

  {
    id: 'LCD',
    label: 'LCD Panels',
    icon: '🖥️',

    sub: [
      'LED Monitor',
      'LCD TV',
      'Flat Panel',
    ],
  },

  {
    id: 'PCB',
    label: 'PCBs',
    icon: '🔌',

    sub: [
      'Motherboard',
      'Graphics Card',
      'RAM',
      'Mixed PCB',
    ],
  },

  {
    id: 'Cable',
    label: 'Cables',
    icon: '🔗',

    sub: [
      'Power Cable',
      'Data Cable',
      'Mixed Cables',
    ],
  },

  {
    id: 'Battery',
    label: 'Batteries',
    icon: '🔋',

    sub: [
      'Li-Ion',
      'Lead-Acid',
      'NiMH',
      'Mixed',
    ],
  },

  {
    id: 'Motor',
    label: 'Motors',
    icon: '⚙️',

    sub: [
      'Electric Motor',
      'Transformer',
      'Magnet Assembly',
    ],
  },

  {
    id: 'Plastic',
    label: 'Mixed Plastics',
    icon: '♻️',

    sub: [
      'ABS Plastic',
      'PC Plastic',
      'Mixed E-Plastic',
    ],
  },
];
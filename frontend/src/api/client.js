// API Client — wraps all backend calls to http://localhost:3000/v1
// (proxied via Vite to /v1 in dev)

const BASE = '/v1';

// Keys that hold identifiers / human-readable codes and must NEVER be coerced
// to numbers, even if they happen to look numeric.
const SKIP_KEYS = new Set([
  'lot_id',
  'handover_reference_number',
  'handover_reference',
  'reference',
  'client_id',
  'category',
]);

function toNumberIfNumeric(value) {
  if (value === null || value === undefined || value === '') return value;
  const num = Number(value);
  return Number.isNaN(num) ? value : num;
}

// pg returns NUMERIC/DECIMAL columns as strings ("5.20", "140.00"). Recursively
// coerce float-looking strings to numbers so components can use .toFixed(),
// comparisons, etc. Skipped keys are identifiers / codes that must stay strings.
function normalize(value, key) {
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SKIP_KEYS.has(k) ? v : normalize(v, k);
    }
    return out;
  }
  if (typeof value === 'string' && key && !SKIP_KEYS.has(key)) {
    return toNumberIfNumeric(value);
  }
  return value;
}

async function request(path, options = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || `HTTP ${res.status}`);
    }
    return normalize(json);
  } catch (err) {
    console.error(`[API] ${path}`, err.message);
    throw err;
  }
}

// ── Health ──────────────────────────────────────────────────
export const checkHealth = () => request('/health');

// ── Valuation ───────────────────────────────────────────────
export const getInstantValuation = ({ category, location, weight }) =>
  request(`/valuation/instant?category=${encodeURIComponent(category)}&location=${encodeURIComponent(location)}&weight=${weight}`);

// ── Recyclers ───────────────────────────────────────────────
export const getMatchedRecyclers = ({ category, lat, lng, maxDistanceKm }) => {
  let url = `/recyclers/match?category=${encodeURIComponent(category)}&lat=${lat}&lng=${lng}`;
  if (maxDistanceKm) url += `&maxDistanceKm=${maxDistanceKm}`;
  return request(url);
};

export const getAllRecyclers = () => request('/recyclers');
export const getRecycler = (id) => request(`/recyclers/${id}`);
export const updateRecycler = (id, data) =>
  request(`/recyclers/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// ── Price Trends ─────────────────────────────────────────────
export const getPriceTrends = ({ category, location, days = 90 }) => {
  let url = `/prices/trends?category=${encodeURIComponent(category)}&days=${days}`;
  if (location) url += `&location=${encodeURIComponent(location)}`;
  return request(url);
};

// ── Handover / Lots ─────────────────────────────────────────
export const createLot = (data) =>
  request('/handover/lots', { method: 'POST', body: JSON.stringify(data) });

export const initiateHandover = (data) =>
  request('/handover/initiate', { method: 'POST', body: JSON.stringify(data) });

export const confirmHandover = (reference, recycler_id) =>
  request(`/handover/confirm/${reference}`, {
    method: 'POST',
    body: JSON.stringify({ recycler_id }),
  });

export const getHandoverByRef = (reference) => request(`/handover/${reference}`);
export const getHandoversByLot = (lotId) => request(`/handover/lot/${lotId}`);
export const getLotsByCollector = (collectorId) =>
  request(`/handover/lots/collector/${collectorId}`);

// ── Payments ─────────────────────────────────────────────────
export const getEarningsSummary = (collectorId) =>
  request(`/payments/earnings/${collectorId}`);

export const getPaymentHistory = (collectorId) =>
  request(`/payments/history/${collectorId}`);

// ── Defaults ─────────────────────────────────────────────────
export const DEMO_COLLECTOR_ID = 1;
export const DEMO_RECYCLER_ID = 1;
export const DEFAULT_LOCATION = 'Bengaluru';
export const DEFAULT_LAT = 12.9716;
export const DEFAULT_LNG = 77.5946;

export const MATERIAL_CATEGORIES = [
  { id: 'CRT',    label: 'CRTs',      icon: '📺', sub: ['Color CRT', 'Monochrome CRT'] },
  { id: 'LCD',    label: 'LCD Panels', icon: '🖥️', sub: ['LED Monitor', 'LCD TV', 'Flat Panel'] },
  { id: 'PCB',    label: 'PCBs',      icon: '🔌', sub: ['Motherboard', 'Graphics Card', 'RAM', 'Mixed PCB'] },
  { id: 'Cable',  label: 'Cables',    icon: '🔋', sub: ['Power Cable', 'Data Cable', 'Mixed Cables'] },
  { id: 'Battery', label: 'Batteries', icon: '🔋', sub: ['Li-Ion', 'Lead-Acid', 'NiMH', 'Mixed'] },
  { id: 'Motor',  label: 'Motors',    icon: '⚙️', sub: ['Electric Motor', 'Transformer', 'Magnet Assembly'] },
  { id: 'Plastic', label: 'Mixed Plastics', icon: '♻️', sub: ['ABS Plastic', 'PC Plastic', 'Mixed E-Plastic'] },
];

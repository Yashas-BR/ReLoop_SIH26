import { query } from '../db.js';
import { ApiError } from '../utils/ApiError.js';
import { CITY_COORDS } from './location.service.js';

export const BENCHMARK_HUBS = [
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
];

function findClosestHub(lat, lng) {
  let closest = 'Bengaluru';
  let minD = Infinity;
  for (const hub of BENCHMARK_HUBS) {
    const d = Math.hypot(hub.lat - lat, hub.lng - lng);
    if (d < minD) {
      minD = d;
      closest = hub.name;
    }
  }
  return closest;
}

export function resolvePricingLocation(locStr, lat = null, lng = null) {
  // 1. Direct coordinates provided
  if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    return findClosestHub(Number(lat), Number(lng));
  }

  if (!locStr) return 'Bengaluru';

  // 2. String contains coordinates "(lat, lng)"
  const coordsMatch = String(locStr).match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (coordsMatch) {
    const latParsed = parseFloat(coordsMatch[1]);
    const lngParsed = parseFloat(coordsMatch[2]);
    if (!isNaN(latParsed) && !isNaN(lngParsed)) {
      return findClosestHub(latParsed, lngParsed);
    }
  }

  // 3. String matches or contains one of our benchmark hubs directly
  const locLower = String(locStr).toLowerCase().trim();
  for (const hub of BENCHMARK_HUBS) {
    if (locLower === hub.name.toLowerCase() || locLower.includes(hub.name.toLowerCase())) {
      return hub.name;
    }
  }

  // 4. Match against extensive nationwide CITY_COORDS (all major Indian cities, clusters, states)
  if (CITY_COORDS) {
    if (CITY_COORDS[locLower]) {
      return findClosestHub(CITY_COORDS[locLower].lat, CITY_COORDS[locLower].lng);
    }
    const hit = Object.entries(CITY_COORDS).find(([name]) => locLower.includes(name) || name.includes(locLower));
    if (hit) {
      return findClosestHub(hit[1].lat, hit[1].lng);
    }
  }

  return 'Bengaluru';
}

/**
 * Calculates the instant valuation for a given material lot.
 * @param {string} category 
 * @param {string} location 
 * @param {number} weight 
 * @returns {Promise<Object>}
 */
export const calculateInstantValuation = async (category, location, weight) => {
  const normalizedLoc = resolvePricingLocation(location);

  console.log(`[Valuation] Request: category=${category}, location=${location} → resolved=${normalizedLoc}, weight=${weight}kg`);

  const CATEGORY_MATCH_SQL = `
    material_category = $1
    OR ($1 IN ('Motor', 'Motors') AND material_category = 'Motor/Magnet Assembly')
    OR ($1 = 'Motor/Magnet Assembly' AND material_category IN ('Motor', 'Motors'))
    OR ($1 IN ('LCD', 'LCDs', 'LCD Panels') AND material_category = 'LCD Panel')
    OR ($1 = 'LCD Panel' AND material_category IN ('LCD', 'LCDs', 'LCD Panels'))
    OR ($1 IN ('Plastic', 'Plastics', 'Mixed Plastics') AND material_category = 'Mixed Plastic')
    OR ($1 = 'Mixed Plastic' AND material_category IN ('Plastic', 'Plastics', 'Mixed Plastics'))
    OR ($1 = 'Batteries' AND material_category = 'Battery')
    OR ($1 = 'PCBs' AND material_category = 'PCB')
    OR ($1 = 'Cables' AND material_category = 'Cable')
    OR ($1 = 'CRTs' AND material_category = 'CRT')
  `;

  let priceResult = await query(
    `SELECT buying_price, unit, market_range_low, market_range_high, price_date,
            ROW_NUMBER() OVER (ORDER BY price_date DESC) AS recency_rank
     FROM prices
     WHERE (${CATEGORY_MATCH_SQL})
       AND (
         location = $2
         OR LOWER(location) = LOWER($2)
         OR location ILIKE $3
       )
     ORDER BY price_date DESC
     LIMIT 10`,
    [category, normalizedLoc, `%${normalizedLoc}%`]
  );

  let usedFallback = false;
  if (priceResult.rows.length === 0) {
    console.warn(`[Valuation] No price data for ${category} in ${normalizedLoc}. Falling back to Bengaluru benchmark.`);
    priceResult = await query(
      `SELECT buying_price, unit, market_range_low, market_range_high, price_date,
              ROW_NUMBER() OVER (ORDER BY price_date DESC) AS recency_rank
       FROM prices
       WHERE (${CATEGORY_MATCH_SQL})
       ORDER BY price_date DESC
       LIMIT 10`,
      [category]
    );
    usedFallback = true;
  }

  if (priceResult.rows.length === 0) {
    console.error(`[Valuation] No pricing data found for ${category} anywhere in DB.`);
    throw new ApiError(404, `No pricing data found for ${category} in ${location}`);
  }

  const rows = priceResult.rows;
  const n = rows.length;

  // Detect and correct per_quintal unit (1 quintal = 100 kg)
  let rawUnit = rows[0].unit || 'per_kg';
  let unitScaleFactor = 1;
  if (rawUnit === 'per_quintal') {
    console.warn(`[Valuation] ⚠ Unit is per_quintal for ${category}. Converting to per_kg (÷100).`);
    unitScaleFactor = 1 / 100;
    rawUnit = 'per_kg';
  }

  // Authoritative current market benchmark: latest price record
  const latestPrice = parseFloat(rows[0].buying_price) * unitScaleFactor;
  const unitPrice = Math.round(latestPrice * 100) / 100;

  // Market range — trimmed to a normal ±12% trading band around benchmark
  const rawMin = Math.min(...rows.map(r => parseFloat(r.market_range_low ?? r.buying_price) * unitScaleFactor));
  const rawMax = Math.max(...rows.map(r => parseFloat(r.market_range_high ?? r.buying_price) * unitScaleFactor));
  const rangeLow  = Math.max(Math.round(unitPrice * 0.88 * 100) / 100, Math.round(rawMin * 100) / 100);
  const rangeHigh = Math.min(Math.round(unitPrice * 1.12 * 100) / 100, Math.round(rawMax * 100) / 100);

  const estimatedValue = Math.round(unitPrice * weight * 100) / 100;

  // Determine the most recent price_date across the rows used
  const priceDateRaw = rows[0].price_date;
  const priceDate = priceDateRaw
    ? new Date(priceDateRaw).toISOString().slice(0, 10)
    : null;

  console.log(`[Valuation] Result: category=${category}, resolvedLoc=${normalizedLoc}, unitPrice=₹${unitPrice}/kg, date=${priceDate}, samples=${n}, fallback=${usedFallback}`);

  return {
    benchmark_available: true,
    is_estimated: true,                    // Prices are benchmark-derived, not live traded
    estimated_value: parseFloat(estimatedValue.toFixed(2)),
    unit_price: parseFloat(unitPrice.toFixed(2)),
    market_benchmark: parseFloat(unitPrice.toFixed(2)),
    unit: rawUnit,
    market_range_low:  parseFloat(rangeLow.toFixed(2)),
    market_range_high: parseFloat(rangeHigh.toFixed(2)),
    weight_kg: weight,
    category,
    location: normalizedLoc || location,
    price_date: priceDate,                 // For UI "last updated" display
    price_samples: n,
    used_fallback_location: usedFallback,
    benchmark_notice: usedFallback
      ? `No benchmark data for ${location}. Showing Bengaluru reference rates.`
      : `Based on current ${normalizedLoc} market benchmark reference (estimated).`,
  };
};

const db = require('../db/database');

/**
 * Haversine formula — calculates great-circle distance between two lat/lng points.
 * Returns distance in kilometers.
 *
 * Reference: https://en.wikipedia.org/wiki/Haversine_formula
 *
 * @param {number} lat1  Collector latitude (decimal degrees)
 * @param {number} lon1  Collector longitude (decimal degrees)
 * @param {number} lat2  Recycler latitude (decimal degrees)
 * @param {number} lon2  Recycler longitude (decimal degrees)
 * @returns {number}  Distance in km, rounded to 2dp
 */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // round to 2 decimal places
}

/**
 * Composite match score formula.
 *
 * We score each recycler from 0–100 using two factors:
 *
 *   score = (W_dist × normalizedDistScore) + (W_rate × normalizedRateScore)
 *
 * where:
 *   normalizedDistScore  = 1 - (distance / maxDistance)  →  closer = higher
 *   normalizedRateScore  = offeredRate / maxRate          →  higher rate = higher
 *
 * Weights (must sum to 1.0):
 *   WEIGHT_DISTANCE = 0.55  (distance matters slightly more for a collector on foot)
 *   WEIGHT_RATE     = 0.45  (rate matters too — this is how Kabadiwala Connect adds value)
 *
 * @param {number} distance  Haversine distance in km
 * @param {number} offeredRate  Recycler's offered_rate_modifier (e.g. 0.95)
 * @param {number} maxDistance  Max distance across candidate set
 * @param {number} maxRate  Max rate modifier across candidate set
 * @returns {number}  Composite score 0–100
 */
function computeMatchScore(distance, offeredRate, maxDistance, maxRate) {
  const WEIGHT_DISTANCE = 0.55;
  const WEIGHT_RATE = 0.45;

  const distScore = maxDistance > 0 ? 1 - distance / maxDistance : 1;
  const rateScore = maxRate > 0 ? offeredRate / maxRate : 1;

  return Math.round((WEIGHT_DISTANCE * distScore + WEIGHT_RATE * rateScore) * 100);
}

/**
 * Core matching function — reusable by both the route handler and test scripts.
 *
 * @param {object} params
 * @param {number} params.lot_id
 * @param {number} [params.collector_lat]   Override lot's lat (for testing)
 * @param {number} [params.collector_lon]   Override lot's lng (for testing)
 * @param {boolean} [params.authorized_only=true]  Only return KSPCB/CPCB authorized
 * @param {number} [params.max_distance_km=100]  Hard cutoff
 * @param {number} [params.top_n=5]              Return top N results
 */
function findMatches({ lot_id, collector_lat, collector_lon, authorized_only = true, max_distance_km = 100, top_n = 5 }) {
  // 1. Fetch the lot and its primary material
  const lot = db.prepare(`
    SELECT 
      l.*,
      li.material_id,
      m.category AS material_category,
      m.sub_category AS material_sub_category
    FROM lots l
    JOIN lot_items li ON li.lot_id = l.id
    JOIN materials m ON m.id = li.material_id
    WHERE l.id = ?
    LIMIT 1
  `).get(lot_id);

  if (!lot) {
    throw new Error(`Lot #${lot_id} not found.`);
  }

  // Determine collector coordinates (override for testing, otherwise use lot's stored value)
  const cLat = collector_lat !== undefined ? collector_lat : lot.latitude;
  const cLon = collector_lon !== undefined ? collector_lon : lot.longitude;

  if (!cLat || !cLon) {
    throw new Error(`Lot #${lot_id} has no location coordinates. Cannot match.`);
  }

  // 2. Fetch recycler candidates with SQL pre-filter
  //    - authorization_status = 'authorized' if authorized_only
  //    - materials_accepted contains the lot's material category
  //    - pickup_available = 1
  let recyclerQuery = `
    SELECT
      id, name, contact_person, phone, email,
      address, city, state, latitude, longitude,
      service_radius_km, materials_accepted,
      authorization_status, authorization_number,
      offered_rate_modifier, pickup_available, min_pickup_weight_kg,
      rating, total_transactions
    FROM recyclers
    WHERE pickup_available = 1
  `;
  const queryParams = [];

  if (authorized_only) {
    recyclerQuery += ` AND authorization_status = 'authorized'`;
  }

  const recyclers = db.prepare(recyclerQuery).all(...queryParams);

  // 3. In-memory filtering and scoring
  const candidates = recyclers
    .map((recycler) => {
      // Parse material acceptance list
      let acceptedCategories = [];
      try {
        acceptedCategories = JSON.parse(recycler.materials_accepted);
      } catch (e) {
        return null; // skip recyclers with malformed data
      }

      // Filter by material category (also accept generic "E-Waste" as a catch-all)
      const acceptsMaterial =
        acceptedCategories.includes(lot.material_category) ||
        acceptedCategories.includes('E-Waste');

      if (!acceptsMaterial) return null;

      // Calculate actual distance via Haversine
      const distance = haversineDistanceKm(cLat, cLon, recycler.latitude, recycler.longitude);

      // Hard distance cutoff
      if (distance > max_distance_km) return null;

      // Minimum weight check
      if (lot.total_weight_kg < recycler.min_pickup_weight_kg) return null;

      // Compute the offered price for this lot
      const offeredPrice = Math.round(lot.estimated_value * recycler.offered_rate_modifier);

      return {
        ...recycler,
        materials_accepted: acceptedCategories,
        distance_km: distance,
        offered_price: offeredPrice,
        accepts_material: true,
      };
    })
    .filter(Boolean); // remove nulls

  if (candidates.length === 0) {
    return { lot, candidates: [], collector: { lat: cLat, lon: cLon } };
  }

  // 4. Compute composite score now that we know maxDistance and maxRate
  const maxDistance = Math.max(...candidates.map((r) => r.distance_km));
  const maxRate = Math.max(...candidates.map((r) => r.offered_rate_modifier));

  const scored = candidates.map((r) => ({
    ...r,
    match_score: computeMatchScore(r.distance_km, r.offered_rate_modifier, maxDistance, maxRate),
    score_breakdown: {
      weight_distance: 0.55,
      weight_rate: 0.45,
      normalized_dist_score: maxDistance > 0 ? Math.round((1 - r.distance_km / maxDistance) * 100) / 100 : 1,
      normalized_rate_score: maxRate > 0 ? Math.round((r.offered_rate_modifier / maxRate) * 100) / 100 : 1,
    },
  }));

  // 5. Sort: descending by match_score (higher = better)
  scored.sort((a, b) => b.match_score - a.match_score);

  return {
    lot: {
      id: lot.id,
      lot_ref: lot.lot_ref,
      material_category: lot.material_category,
      material_sub_category: lot.material_sub_category,
      total_weight_kg: lot.total_weight_kg,
      estimated_value: lot.estimated_value,
      status: lot.status,
    },
    collector: { lat: cLat, lon: cLon },
    scoring_weights: { distance: 0.55, offered_rate: 0.45 },
    total_candidates_before_cutoff: recyclers.length,
    matches: scored.slice(0, top_n),
  };
}

/**
 * GET /api/match?lot_id=&collector_lat=&collector_lon=&authorized_only=&max_distance_km=&top_n=
 */
function getMatches(req, res) {
  try {
    const {
      lot_id,
      collector_lat,
      collector_lon,
      authorized_only,
      max_distance_km,
      top_n,
    } = req.query;

    if (!lot_id) {
      return res.status(400).json({ status: 'error', message: 'lot_id query parameter is required.' });
    }

    const result = findMatches({
      lot_id: Number(lot_id),
      collector_lat: collector_lat ? parseFloat(collector_lat) : undefined,
      collector_lon: collector_lon ? parseFloat(collector_lon) : undefined,
      authorized_only: authorized_only !== 'false', // default true
      max_distance_km: max_distance_km ? parseFloat(max_distance_km) : 100,
      top_n: top_n ? parseInt(top_n, 10) : 5,
    });

    res.json({ status: 'ok', ...result });
  } catch (error) {
    console.error('Match error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ status: 'error', message: error.message });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
}

module.exports = { getMatches, findMatches, haversineDistanceKm, computeMatchScore };

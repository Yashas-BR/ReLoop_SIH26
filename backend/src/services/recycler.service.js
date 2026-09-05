import { query } from '../db.js';

/**
 * Matches collected lots with nearby authorized recyclers using weighted ranking.
 * Score = 0.5 * norm_distance + 0.3 * norm_rate + 0.2 * pickup_penalty
 * Lower score = better match.
 *
 * @param {string} category - Material category to match
 * @param {number} lat - Collector latitude
 * @param {number} lng - Collector longitude
 * @param {number} maxDistanceKm - Maximum search radius
 * @returns {Promise<Array>}
 */
export const matchAuthorizedRecyclers = async (category, lat, lng, maxDistanceKm = 50) => {
  const matchQuery = `
    WITH RecyclerDistances AS (
      SELECT 
        r.id, 
        r.name, 
        r.facility_location,
        r.latitude,
        r.longitude,
        r.materials_accepted,
        r.authorization_details,
        r.contact_details,
        r.pickup_availability,
        r.service_area,
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(r.latitude)) * 
            cos(radians(r.longitude) - radians($2)) + 
            sin(radians($1)) * sin(radians(r.latitude))
          )
        ) AS distance_km,
        COALESCE(p.buying_price, 0) AS offered_rate
      FROM recyclers r
      LEFT JOIN prices p 
        ON p.recycler_id = r.id 
        AND p.material_category = $3
        AND p.price_date = (
          SELECT MAX(price_date) FROM prices 
          WHERE recycler_id = r.id AND material_category = $3
        )
      WHERE r.authorization_status = 'authorized'
        AND r.materials_accepted ? $3
    ),
    Ranked AS (
      SELECT 
        *,
        CASE 
          WHEN MAX(distance_km) OVER () = MIN(distance_km) OVER () THEN 0
          ELSE (distance_km - MIN(distance_km) OVER ()) / 
               NULLIF(MAX(distance_km) OVER () - MIN(distance_km) OVER (), 0)
        END AS norm_distance,
        CASE 
          WHEN MAX(offered_rate) OVER () = MIN(offered_rate) OVER () THEN 1
          ELSE (offered_rate - MIN(offered_rate) OVER ()) / 
               NULLIF(MAX(offered_rate) OVER () - MIN(offered_rate) OVER (), 0)
        END AS norm_rate
      FROM RecyclerDistances
      WHERE distance_km <= $4
    )
    SELECT 
      id AS recycler_id,
      id,
      name,
      facility_location,
      latitude,
      longitude,
      materials_accepted,
      authorization_details,
      contact_details,
      pickup_availability,
      service_area,
      ROUND(distance_km::numeric, 2) AS distance_km,
      offered_rate,
      ROUND(
        ((0.5 * COALESCE(norm_distance, 0.5)) + 
         (0.3 * COALESCE(norm_rate, 0.5)) + 
         (0.2 * (CASE WHEN pickup_availability = 'daily' THEN 0 
                      WHEN pickup_availability = 'weekly' THEN 0.5 
                      ELSE 1 END)))::numeric,
      3) AS match_score
    FROM Ranked
    ORDER BY match_score ASC
  `;

  const result = await query(matchQuery, [lat, lng, category, maxDistanceKm]);
  
  return result.rows;
};

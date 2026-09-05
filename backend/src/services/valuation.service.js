import { query } from '../db.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Calculates the instant valuation for a given material lot.
 * @param {string} category 
 * @param {string} location 
 * @param {number} weight 
 * @returns {Promise<Object>}
 */
export const calculateInstantValuation = async (category, location, weight) => {
  // Weighted average of the 10 most recent price records for this category+location.
  // More recent rows get higher weight (rank 1 = most recent = weight 10, rank 10 = weight 1).
  // This smooths out single-day spikes and gives a more representative market price.
  const priceResult = await query(
    `SELECT buying_price, unit, market_range_low, market_range_high,
            ROW_NUMBER() OVER (ORDER BY price_date DESC) AS recency_rank
     FROM prices
     WHERE material_category = $1 AND location = $2
     ORDER BY price_date DESC
     LIMIT 10`,
    [category, location]
  );

  if (priceResult.rows.length === 0) {
    throw new ApiError(404, `No pricing data found for ${category} in ${location}`);
  }

  const rows = priceResult.rows;
  const n = rows.length;

  // Weight = (n + 1 - rank), so rank-1 (newest) gets weight n, rank-n (oldest) gets weight 1
  let weightedSum = 0;
  let totalWeight = 0;
  for (const row of rows) {
    const w = n + 1 - Number(row.recency_rank);
    weightedSum += parseFloat(row.buying_price) * w;
    totalWeight += w;
  }
  const unitPrice = weightedSum / totalWeight;

  // Market range: min of all range_lows, max of all range_highs across the window
  const rangeLow  = Math.min(...rows.map(r => parseFloat(r.market_range_low  ?? r.buying_price)));
  const rangeHigh = Math.max(...rows.map(r => parseFloat(r.market_range_high ?? r.buying_price)));

  const estimatedValue = unitPrice * weight;

  return {
    estimated_value: parseFloat(estimatedValue.toFixed(2)),
    unit_price: parseFloat(unitPrice.toFixed(2)),
    unit: rows[0].unit,
    market_range_low: parseFloat(rangeLow.toFixed(2)),
    market_range_high: parseFloat(rangeHigh.toFixed(2)),
    weight_kg: weight,
    category,
    location,
    price_samples: n,
  };
};

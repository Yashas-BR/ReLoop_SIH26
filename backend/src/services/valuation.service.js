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
  // Fetch the latest price for this category and location
  const priceResult = await query(
    `SELECT buying_price, unit, market_range_low, market_range_high, recycler_id 
     FROM prices 
     WHERE material_category = $1 AND location = $2
     ORDER BY price_date DESC 
     LIMIT 1`,
    [category, location]
  );

  if (priceResult.rows.length === 0) {
    throw new ApiError(404, `No pricing data found for ${category} in ${location}`);
  }

  const priceData = priceResult.rows[0];
  const unitPrice = parseFloat(priceData.buying_price);
  
  // Assuming unit is 'per_kg' and weight is in kg
  const estimatedValue = unitPrice * weight;

  return {
    estimated_value: parseFloat(estimatedValue.toFixed(2)),
    unit_price: unitPrice,
    unit: priceData.unit,
    market_range_low: priceData.market_range_low,
    market_range_high: priceData.market_range_high,
    weight_kg: weight,
    category,
    location
  };
};

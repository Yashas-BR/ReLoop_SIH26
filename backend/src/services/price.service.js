import { query } from '../db.js';

/**
 * Get historical price trends for a specific material and location
 * @param {string} category 
 * @param {string} location 
 * @param {number} days 
 * @returns {Promise<Array>}
 */
export const getPriceTrends = async (category, location, days = 30) => {
  const trendQuery = `
    SELECT 
      price_date,
      buying_price,
      market_range_low,
      market_range_high,
      unit
    FROM prices
    WHERE material_category = $1 
      AND location = $2
      AND price_date >= CURRENT_DATE - ($3 || ' days')::INTERVAL
    ORDER BY price_date ASC
  `;

  const result = await query(trendQuery, [category, location, days]);
  
  return result.rows;
};

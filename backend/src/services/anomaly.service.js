import { query } from '../db.js';

/**
 * Check if a transaction value is anomalous for the given material category.
 * Uses statistical outlier detection: flags values beyond 2 standard deviations
 * from the category mean, and also checks against market range from the prices table.
 *
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export const checkTransactionAnomaly = async (data) => {
  const { material_category, quoted_price, final_price, weight_kg, location } = data;

  const unitPrice = final_price
    ? parseFloat(final_price) / parseFloat(weight_kg)
    : parseFloat(quoted_price) / parseFloat(weight_kg);

  // Get category statistics from existing transactions
  const statsResult = await query(
    `SELECT 
       AVG(final_price / NULLIF(quantity_weight_kg, 0)) AS avg_unit_price,
       STDDEV_POP(final_price / NULLIF(quantity_weight_kg, 0)) AS stddev_unit_price,
       COUNT(*) AS sample_count
     FROM transactions
     WHERE material_category = $1 
       AND final_price IS NOT NULL 
       AND quantity_weight_kg > 0`,
    [material_category]
  );

  const stats = statsResult.rows[0];
  const avgUnitPrice = parseFloat(stats.avg_unit_price) || 0;
  const stddevUnitPrice = parseFloat(stats.stddev_unit_price) || 0;
  const sampleCount = parseInt(stats.sample_count, 10);

  // Get current market range from prices table
  let marketRange = null;
  if (location) {
    const priceResult = await query(
      `SELECT buying_price, market_range_low, market_range_high
       FROM prices
       WHERE material_category = $1 AND location = $2
       ORDER BY price_date DESC LIMIT 1`,
      [material_category, location]
    );
    if (priceResult.rows.length > 0) {
      marketRange = priceResult.rows[0];
    }
  }

  const flags = [];
  let isAnomalous = false;

  // Statistical outlier check (need at least 5 data points)
  if (sampleCount >= 5 && stddevUnitPrice > 0) {
    const zScore = (unitPrice - avgUnitPrice) / stddevUnitPrice;
    if (Math.abs(zScore) > 2) {
      isAnomalous = true;
      flags.push({
        type: 'statistical_outlier',
        message: `Unit price ₹${unitPrice.toFixed(2)}/kg is ${Math.abs(zScore).toFixed(1)} standard deviations from category mean of ₹${avgUnitPrice.toFixed(2)}/kg`,
        z_score: parseFloat(zScore.toFixed(2)),
        severity: Math.abs(zScore) > 3 ? 'high' : 'medium',
      });
    }
  }

  // Market range check
  if (marketRange) {
    const low = parseFloat(marketRange.market_range_low);
    const high = parseFloat(marketRange.market_range_high);
    if (unitPrice < low) {
      isAnomalous = true;
      flags.push({
        type: 'below_market_range',
        message: `Unit price ₹${unitPrice.toFixed(2)}/kg is below market range (₹${low.toFixed(2)} - ₹${high.toFixed(2)})`,
        severity: 'high',
      });
    } else if (unitPrice > high * 1.5) {
      isAnomalous = true;
      flags.push({
        type: 'above_market_range',
        message: `Unit price ₹${unitPrice.toFixed(2)}/kg is significantly above market range (₹${low.toFixed(2)} - ₹${high.toFixed(2)})`,
        severity: 'medium',
      });
    }
  }

  return {
    is_anomalous: isAnomalous,
    unit_price: parseFloat(unitPrice.toFixed(2)),
    category_stats: sampleCount >= 5
      ? {
          avg_unit_price: parseFloat(avgUnitPrice.toFixed(2)),
          stddev_unit_price: parseFloat(stddevUnitPrice.toFixed(2)),
          sample_count: sampleCount,
        }
      : null,
    market_range: marketRange
      ? {
          buying_price: parseFloat(marketRange.buying_price),
          low: parseFloat(marketRange.market_range_low),
          high: parseFloat(marketRange.market_range_high),
        }
      : null,
    flags,
  };
};

/**
 * Get recent anomalous transactions.
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export const getAnomalies = async ({ category, page = 1, limit = 20 }) => {
  const conditions = [
    `t.transaction_status IN ('handed_over', 'confirmed')`,
    `t.final_price IS NOT NULL`,
    `t.quantity_weight_kg > 0`,
  ];
  const params = [];
  let paramIndex = 1;

  if (category) {
    conditions.push(`t.material_category = $${paramIndex++}`);
    params.push(category);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  // Get transactions with category stats for anomaly flagging
  const result = await query(
    `WITH category_stats AS (
       SELECT 
         material_category,
         AVG(final_price / NULLIF(quantity_weight_kg, 0)) AS avg_unit_price,
         STDDEV_POP(final_price / NULLIF(quantity_weight_kg, 0)) AS stddev_unit_price,
         COUNT(*) AS sample_count
       FROM transactions
       WHERE final_price IS NOT NULL AND quantity_weight_kg > 0
       GROUP BY material_category
       HAVING COUNT(*) >= 5
     ),
     flagged AS (
       SELECT 
         t.id, t.lot_id, t.material_category, t.quantity_weight_kg,
         t.quoted_price, t.final_price, t.recycler_id, t.txn_datetime,
         r.name AS recycler_name,
         ROUND((t.final_price / NULLIF(t.quantity_weight_kg, 0))::numeric, 2) AS unit_price,
         ROUND(cs.avg_unit_price::numeric, 2) AS avg_unit_price,
         ROUND(cs.stddev_unit_price::numeric, 2) AS stddev_unit_price,
         CASE 
           WHEN cs.stddev_unit_price > 0 THEN 
             ROUND(((t.final_price / NULLIF(t.quantity_weight_kg, 0)) - cs.avg_unit_price) / cs.stddev_unit_price, 2)
           ELSE NULL
         END AS z_score,
         CASE
           WHEN cs.stddev_unit_price > 0 AND 
                ABS((t.final_price / NULLIF(t.quantity_weight_kg, 0)) - cs.avg_unit_price) / cs.stddev_unit_price > 2
             THEN 'high'
           WHEN cs.stddev_unit_price > 0 AND 
                ABS((t.final_price / NULLIF(t.quantity_weight_kg, 0)) - cs.avg_unit_price) / cs.stddev_unit_price > 1.5
             THEN 'medium'
           ELSE 'normal'
         END AS severity
       FROM transactions t
       LEFT JOIN category_stats cs ON t.material_category = cs.material_category
       LEFT JOIN recyclers r ON t.recycler_id = r.id
       ${whereClause}
     )
     SELECT * FROM flagged
     WHERE severity IN ('high', 'medium')
     ORDER BY ABS(z_score) DESC NULLS LAST
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return {
    anomalies: result.rows,
    pagination: { page, limit },
  };
};

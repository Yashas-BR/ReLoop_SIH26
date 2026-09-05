import { query } from '../db.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Update payment status for a transaction.
 * @param {string} lotId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export const updatePaymentStatus = async (lotId, data) => {
  const { payment_status, final_price, payment_method } = data;

  const existing = await query(
    'SELECT * FROM transactions WHERE lot_id = $1',
    [lotId]
  );

  if (existing.rows.length === 0) {
    throw new ApiError(404, `Transaction for lot ${lotId} not found`);
  }

  const updates = ['payment_status = $1'];
  const params = [payment_status];
  let paramIndex = 2;

  if (final_price !== undefined) {
    updates.push(`final_price = $${paramIndex++}`);
    params.push(final_price);
  }

  if (payment_method !== undefined) {
    updates.push(`payment_method = $${paramIndex++}`);
    params.push(payment_method);
  }

  params.push(lotId);

  const result = await query(
    `UPDATE transactions 
     SET ${updates.join(', ')}
     WHERE lot_id = $${paramIndex}
     RETURNING *`,
    params
  );

  return result.rows[0];
};

/**
 * Get earnings summary for a collector.
 * @param {number} collectorId
 * @returns {Promise<Object>}
 */
export const getEarningsSummary = async (collectorId) => {
  const result = await query(
    `SELECT 
       COALESCE(SUM(final_price), 0) AS total_earned,
       COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN final_price ELSE 0 END), 0) AS total_paid,
       COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN final_price ELSE 0 END), 0) AS total_pending,
       COUNT(*) AS total_transactions,
       COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) AS paid_transactions,
       COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) AS pending_transactions
     FROM transactions
     WHERE collector_id = $1 AND final_price IS NOT NULL`,
    [collectorId]
  );

  const stats = result.rows[0];

  return {
    total_earned: parseFloat(stats.total_earned) || 0,
    total_paid: parseFloat(stats.total_paid) || 0,
    total_pending: parseFloat(stats.total_pending) || 0,
    total_transactions: parseInt(stats.total_transactions, 10),
    paid_transactions: parseInt(stats.paid_transactions, 10),
    pending_transactions: parseInt(stats.pending_transactions, 10),
  };
};

/**
 * Get payment history for a collector.
 * @param {number} collectorId
 * @returns {Promise<Array>}
 */
export const getPaymentHistory = async (collectorId) => {
  const result = await query(
    `SELECT 
       t.lot_id, t.material_category, t.quantity_weight_kg,
       t.quoted_price, t.final_price, t.payment_status, t.payment_method,
       t.transaction_status, t.txn_datetime,
       r.name AS recycler_name
     FROM transactions t
     LEFT JOIN recyclers r ON t.recycler_id = r.id
     WHERE t.collector_id = $1 AND t.final_price IS NOT NULL
     ORDER BY t.txn_datetime DESC`,
    [collectorId]
  );

  return result.rows;
};

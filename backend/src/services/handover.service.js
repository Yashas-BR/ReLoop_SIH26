import crypto from 'crypto';
import { query } from '../db.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateInstantValuation } from './valuation.service.js';

const generateHandoverRef = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `HO-${timestamp}-${random}`;
};

const generateLotId = (category) => {
  const prefix = category.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Create a new material lot with instant valuation.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export const createLot = async (data) => {
  const { collector_id, category, sub_category, description, image_ref, approx_weight_kg, condition, source_type, location } = data;

  const lot_id = generateLotId(category);

  let estimated_value = null;
  try {
    const valuation = await calculateInstantValuation(category, location, approx_weight_kg);
    estimated_value = valuation.estimated_value;
  } catch {
    // Valuation data may not exist for all category+location combos — proceed without it
  }

  const result = await query(
    `INSERT INTO materials 
       (lot_id, category, sub_category, description, image_ref, approx_weight_kg, condition, source_type, estimated_value, collector_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [lot_id, category, sub_category ?? null, description ?? null, image_ref ?? null,
     approx_weight_kg, condition ?? null, source_type ?? null, estimated_value, collector_id]
  );

  // Create a quoted transaction for this lot
  await query(
    `INSERT INTO transactions 
       (lot_id, collector_id, material_category, quantity_weight_kg, quoted_price, collection_location, transaction_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'quoted')`,
    [lot_id, collector_id, category, approx_weight_kg, estimated_value, location]
  );

  return {
    lot: result.rows[0],
    estimated_value,
  };
};

/**
 * Initiate a handover — creates a traceability record with a unique reference.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export const initiateHandover = async (data) => {
  const { lot_id, collector_id, recycler_id, photo_refs, weight_kg, gps_lat, gps_lng, handover_location } = data;

  // Verify lot exists
  const lotResult = await query(
    'SELECT * FROM materials WHERE lot_id = $1',
    [lot_id]
  );

  if (lotResult.rows.length === 0) {
    throw new ApiError(404, `Lot ${lot_id} not found`);
  }

  // Verify recycler exists and is authorized
  const recyclerResult = await query(
    'SELECT * FROM recyclers WHERE id = $1',
    [recycler_id]
  );

  if (recyclerResult.rows.length === 0) {
    throw new ApiError(404, 'Recycler not found');
  }

  if (recyclerResult.rows[0].authorization_status !== 'authorized') {
    throw new ApiError(400, 'Can only hand over to authorized recyclers');
  }

  const handover_reference_number = generateHandoverRef();

  const traceResult = await query(
    `INSERT INTO traceability 
       (lot_id, photo_refs, weight_kg, gps_lat, gps_lng, handover_reference_number, status)
     VALUES ($1, $2::jsonb, $3, $4, $5, $6, 'pending_confirmation')
     RETURNING *`,
    [lot_id, JSON.stringify(photo_refs), weight_kg, gps_lat, gps_lng, handover_reference_number]
  );

  // Update transaction status to 'matched' and set recycler + handover location
  await query(
    `UPDATE transactions 
     SET recycler_id = $1, handover_location = $2, transaction_status = 'matched'
     WHERE lot_id = $3`,
    [recycler_id, handover_location ?? null, lot_id]
  );

  return {
    traceability: traceResult.rows[0],
    handover_reference_number,
    recycler: {
      id: recyclerResult.rows[0].id,
      name: recyclerResult.rows[0].name,
      facility_location: recyclerResult.rows[0].facility_location,
    },
  };
};

/**
 * Recycler confirms receipt of a handover.
 * @param {string} reference - Handover reference number
 * @param {number} recyclerId - Recycler confirming receipt
 * @returns {Promise<Object>}
 */
export const confirmHandover = async (reference, recyclerId) => {
  const traceResult = await query(
    'SELECT * FROM traceability WHERE handover_reference_number = $1',
    [reference]
  );

  if (traceResult.rows.length === 0) {
    throw new ApiError(404, `Handover reference ${reference} not found`);
  }

  const trace = traceResult.rows[0];

  if (trace.status === 'confirmed') {
    throw new ApiError(400, 'Handover already confirmed');
  }

  // Update traceability record
  const updatedTrace = await query(
    `UPDATE traceability 
     SET status = 'confirmed', recycler_confirmation = TRUE, confirmation_timestamp = NOW()
     WHERE handover_reference_number = $1
     RETURNING *`,
    [reference]
  );

  // Update transaction status
  await query(
    `UPDATE transactions 
     SET transaction_status = 'handed_over'
     WHERE lot_id = $1 AND transaction_status IN ('quoted', 'matched')`,
    [trace.lot_id]
  );

  return updatedTrace.rows[0];
};

/**
 * Get a handover record by reference number.
 * @param {string} reference
 * @returns {Promise<Object>}
 */
export const getHandoverByReference = async (reference) => {
  const result = await query(
    `SELECT t.*, m.category, m.sub_category, m.approx_weight_kg, m.estimated_value,
            r.name AS recycler_name, r.facility_location AS recycler_location
     FROM traceability t
     JOIN materials m ON t.lot_id = m.lot_id
     LEFT JOIN recyclers r ON r.id = (
       SELECT recycler_id FROM transactions WHERE lot_id = t.lot_id AND recycler_id IS NOT NULL LIMIT 1
     )
     WHERE t.handover_reference_number = $1`,
    [reference]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, `Handover reference ${reference} not found`);
  }

  return result.rows[0];
};

/**
 * Get all handover records for a lot.
 * @param {string} lotId
 * @returns {Promise<Array>}
 */
export const getHandoversByLot = async (lotId) => {
    const result = await query(
      `SELECT
         t.id AS handover_id,
         t.handover_reference_number AS handover_reference,
         t.status,
         t.lot_id,
         t.photo_refs,
         t.weight_kg,
         t.gps_lat,
         t.gps_lng,
         t.event_timestamp AS created_at,
         t.confirmation_timestamp AS confirmed_at,
         txn.collection_location,
         txn.quoted_price,
         txn.payment_status,
         txn.payment_method,
         m.category,
         m.sub_category,
         m.approx_weight_kg,
         m.estimated_value,
         r.name AS recycler_name
       FROM traceability t
       JOIN materials m ON t.lot_id = m.lot_id
       LEFT JOIN transactions txn ON txn.lot_id = t.lot_id
       LEFT JOIN recyclers r ON r.id = (
         SELECT recycler_id FROM transactions WHERE lot_id = t.lot_id AND recycler_id IS NOT NULL LIMIT 1
       )
       WHERE t.lot_id = $1
       ORDER BY t.event_timestamp DESC`,
      [lotId]
    );

    return result.rows;
  };

/**
 * Get all lots for a collector.
 * @param {number} collectorId
 * @returns {Promise<Array>}
 */
export const getLotsByCollector = async (collectorId) => {
  const result = await query(
    `SELECT m.*, 
            t.transaction_status, t.payment_status, t.final_price, t.payment_method,
            r.name AS recycler_name
     FROM materials m
     LEFT JOIN transactions t ON m.lot_id = t.lot_id
     LEFT JOIN recyclers r ON t.recycler_id = r.id
     WHERE m.collector_id = $1
     ORDER BY m.created_at DESC`,
    [collectorId]
  );

  return result.rows;
};

/**
 * Get all lots assigned to a recycler (matched / handed over / confirmed).
 * Includes the latest traceability record so the recycler can see pending
 * confirmations from the incoming-lots list.
 * @param {number} recyclerId
 * @returns {Promise<Array>}
 */
export const getLotsByRecycler = async (recyclerId) => {
  const result = await query(
    `SELECT m.*,
            t.transaction_status, t.payment_status, t.final_price, t.payment_method,
            r.name AS recycler_name,
            tr.handover_reference_number,
            tr.status AS traceability_status,
            tr.confirmation_timestamp
     FROM materials m
     JOIN transactions t ON m.lot_id = t.lot_id
     LEFT JOIN recyclers r ON t.recycler_id = r.id
     LEFT JOIN LATERAL (
       SELECT handover_reference_number, status, confirmation_timestamp
       FROM traceability
       WHERE lot_id = m.lot_id
       ORDER BY event_timestamp DESC
       LIMIT 1
     ) tr ON true
     WHERE t.recycler_id = $1
     ORDER BY m.created_at DESC`,
    [recyclerId]
  );

  return result.rows;
};

const db = require('../db/database');

/**
 * GET /api/traceability/lot/:lotId
 * Returns the traceability record for a given lot (collector polling their status).
 */
function getByLot(req, res) {
  try {
    const { lotId } = req.params;

    const record = db.prepare(`
      SELECT
        t.*,
        l.lot_ref, l.status AS lot_status, l.total_weight_kg, l.estimated_value,
        c.name AS collector_name,
        r.name AS recycler_name, r.authorization_number, r.phone AS recycler_phone
      FROM traceability t
      JOIN lots l         ON l.id = t.lot_id
      JOIN collectors c   ON c.id = l.collector_id
      JOIN transactions tx ON tx.id = t.transaction_id
      JOIN recyclers r    ON r.id = tx.recycler_id
      WHERE t.lot_id = ?
      ORDER BY t.created_at DESC
      LIMIT 1
    `).get(lotId);

    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: 'No traceability record found for this lot.',
      });
    }

    // Parse GPS JSON safely
    if (record.gps_collection) {
      try { record.gps_collection = JSON.parse(record.gps_collection); } catch {}
    }
    if (record.gps_handover) {
      try { record.gps_handover = JSON.parse(record.gps_handover); } catch {}
    }

    res.json({ status: 'ok', data: record });
  } catch (error) {
    console.error('Error fetching traceability:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * GET /api/traceability/pending?recycler_id=N
 * Returns all pending handovers for a given recycler (recycler portal view).
 */
function getPendingForRecycler(req, res) {
  try {
    const { recycler_id } = req.query;
    if (!recycler_id) {
      return res.status(400).json({ status: 'error', message: 'recycler_id query param required.' });
    }

    const pending = db.prepare(`
      SELECT
        t.id AS traceability_id,
        t.handover_ref,
        t.status,
        t.collector_confirmed_at,
        t.gps_collection,
        t.weight_at_handover,
        t.weight_variance_pct,
        t.notes,
        t.created_at,
        l.id AS lot_id,
        l.lot_ref,
        l.total_weight_kg,
        l.estimated_value,
        l.pickup_address,
        l.latitude AS lot_lat,
        l.longitude AS lot_lon,
        c.name AS collector_name,
        c.phone AS collector_phone,
        m.category AS material_category,
        m.sub_category AS material_name,
        tx.id AS transaction_id,
        tx.final_price,
        tx.quoted_price
      FROM traceability t
      JOIN lots l          ON l.id = t.lot_id
      JOIN collectors c    ON c.id = l.collector_id
      JOIN transactions tx ON tx.id = t.transaction_id
      LEFT JOIN lot_items li ON li.lot_id = l.id
      LEFT JOIN materials m  ON m.id = li.material_id
      WHERE tx.recycler_id = ?
        AND t.status = 'pending_confirmation'
      ORDER BY t.created_at DESC
    `).all(recycler_id);

    // Parse GPS JSON for each record
    const parsedPending = pending.map((r) => {
      if (r.gps_collection) {
        try { r.gps_collection = JSON.parse(r.gps_collection); } catch {}
      }
      return r;
    });

    res.json({ status: 'ok', count: parsedPending.length, data: parsedPending });
  } catch (error) {
    console.error('Error fetching pending handovers:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * PUT /api/traceability/:id/confirm
 * Recycler confirms receipt of the lot.
 * - Updates traceability.status → 'recycler_confirmed'
 * - Sets recycler_confirmed_at = NOW()
 * - Optionally records recycler-side GPS
 * - Updates lot.status → 'completed'
 * - Updates transaction.payment_status → 'paid'
 */
function confirmReceipt(req, res) {
  try {
    const { id } = req.params;
    const {
      recycler_id,
      recycler_lat,
      recycler_lon,
      notes,
    } = req.body;

    if (!recycler_id) {
      return res.status(400).json({ status: 'error', message: 'recycler_id is required.' });
    }

    // Fetch the traceability record and validate ownership
    const record = db.prepare(`
      SELECT t.*, tx.recycler_id, tx.lot_id AS tx_lot_id, tx.id AS tx_id
      FROM traceability t
      JOIN transactions tx ON tx.id = t.transaction_id
      WHERE t.id = ?
    `).get(id);

    if (!record) {
      return res.status(404).json({ status: 'error', message: 'Traceability record not found.' });
    }

    if (record.recycler_id !== parseInt(recycler_id, 10)) {
      return res.status(403).json({
        status: 'error',
        message: 'This handover is not assigned to you.',
      });
    }

    if (record.status !== 'pending_confirmation') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot confirm — current status is '${record.status}'.`,
      });
    }

    const gpsHandoverJson = (recycler_lat && recycler_lon)
      ? JSON.stringify({
          lat: parseFloat(recycler_lat),
          lon: parseFloat(recycler_lon),
          source: 'recycler_confirmed',
          captured_at: new Date().toISOString(),
        })
      : null;

    // Atomic confirmation
    const doConfirm = db.transaction(() => {
      // 1. Update traceability
      db.prepare(`
        UPDATE traceability
        SET
          status = 'recycler_confirmed',
          recycler_confirmed_at = datetime('now'),
          gps_handover = @gps_handover,
          notes = CASE WHEN @extra_notes IS NOT NULL
                    THEN notes || ' | Recycler: ' || @extra_notes
                    ELSE notes END,
          updated_at = datetime('now')
        WHERE id = @id
      `).run({ gps_handover: gpsHandoverJson, extra_notes: notes || null, id: parseInt(id, 10) });

      // 2. Lot → completed
      db.prepare(`
        UPDATE lots SET status = 'completed', updated_at = datetime('now')
        WHERE id = ?
      `).run(record.lot_id);

      // 3. Transaction → paid
      db.prepare(`
        UPDATE transactions SET payment_status = 'paid', updated_at = datetime('now')
        WHERE id = ?
      `).run(record.tx_id);
    });

    doConfirm();

    // Return the updated full record
    const updated = db.prepare(`
      SELECT t.*, l.lot_ref, l.status AS lot_status
      FROM traceability t JOIN lots l ON l.id = t.lot_id
      WHERE t.id = ?
    `).get(id);

    res.json({
      status: 'ok',
      message: 'Handover confirmed by recycler. Lot marked as completed.',
      data: {
        traceability_id: updated.id,
        handover_ref: updated.handover_ref,
        status: updated.status,
        lot_ref: updated.lot_ref,
        lot_status: updated.lot_status,
        recycler_confirmed_at: updated.recycler_confirmed_at,
      },
    });
  } catch (error) {
    console.error('Error confirming receipt:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * GET /api/traceability/all?recycler_id=N
 * Returns all handovers for a recycler (any status) — for history view.
 */
function getAllForRecycler(req, res) {
  try {
    const { recycler_id } = req.query;
    if (!recycler_id) {
      return res.status(400).json({ status: 'error', message: 'recycler_id is required.' });
    }

    const all = db.prepare(`
      SELECT
        t.id AS traceability_id,
        t.handover_ref, t.status,
        t.collector_confirmed_at, t.recycler_confirmed_at,
        t.weight_at_handover, t.notes, t.created_at,
        l.lot_ref, l.total_weight_kg,
        c.name AS collector_name,
        tx.final_price
      FROM traceability t
      JOIN lots l          ON l.id = t.lot_id
      JOIN collectors c    ON c.id = l.collector_id
      JOIN transactions tx ON tx.id = t.transaction_id
      WHERE tx.recycler_id = ?
      ORDER BY t.created_at DESC
    `).all(recycler_id);

    res.json({ status: 'ok', count: all.length, data: all });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

module.exports = { getByLot, getPendingForRecycler, confirmReceipt, getAllForRecycler };

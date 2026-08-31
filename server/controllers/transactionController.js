const db = require('../db/database');
const { randomUUID } = require('crypto');

/**
 * POST /api/transactions/handover
 *
 * Initiates a handover:
 *   - Lot status → 'pending_confirmation'  (not yet 'completed')
 *   - Creates a transaction row
 *   - Creates a traceability row with status = 'pending_confirmation'
 *   - Records GPS coords (from client) and weight at time of handover
 *
 * The recycler must separately call PUT /api/traceability/:id/confirm
 * to finalize the handover — at which point lot → 'completed'.
 */
function recordHandover(req, res) {
  try {
    const {
      lot_id,
      recycler_id,
      final_agreed_value,
      notes,
      // GPS from browser Geolocation API or manual entry
      collector_lat,
      collector_lon,
      collector_gps_accuracy,
      weight_at_handover,
    } = req.body;

    if (!lot_id || !recycler_id || !final_agreed_value) {
      return res.status(400).json({
        status: 'error',
        message: 'lot_id, recycler_id, and final_agreed_value are required.',
      });
    }

    const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(lot_id);
    if (!lot) {
      return res.status(404).json({ status: 'error', message: 'Lot not found.' });
    }
    if (lot.status !== 'submitted') {
      return res.status(400).json({
        status: 'error',
        message: `Lot status is '${lot.status}' — only 'submitted' lots can be handed over.`,
      });
    }

    const recycler = db.prepare('SELECT * FROM recyclers WHERE id = ?').get(recycler_id);
    if (!recycler) {
      return res.status(404).json({ status: 'error', message: 'Recycler not found.' });
    }

    // ── Generate unique, verifiable refs ─────────────────────────────────────
    const uuid = randomUUID(); // crypto-grade UUID e.g. 550e8400-e29b-41d4-a716-446655440000
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    const txnRef      = `TXN-${todayStr}-${randomSuffix}`;  // human-readable transaction ref
    const handoverRef = `HDO-${uuid.toUpperCase()}`;         // UUID-backed, globally unique handover ref

    // ── Build material summary ────────────────────────────────────────────────
    const items = db.prepare(`
      SELECT li.weight_kg, m.sub_category, m.category
      FROM lot_items li JOIN materials m ON m.id = li.material_id
      WHERE li.lot_id = ?
    `).all(lot_id);
    const materialSummary = items.length
      ? items.map((i) => `${i.sub_category}(${i.weight_kg}kg)`).join(', ')
      : `Lot ${lot.lot_ref}`;

    // ── GPS payload (JSON string for DB storage) ──────────────────────────────
    const gpsCollectionJson = (collector_lat && collector_lon)
      ? JSON.stringify({
          lat: parseFloat(collector_lat),
          lon: parseFloat(collector_lon),
          accuracy: collector_gps_accuracy ? parseFloat(collector_gps_accuracy) : null,
          source: collector_gps_accuracy ? 'browser_geolocation' : 'manual_entry',
          captured_at: new Date().toISOString(),
        })
      : null;

    const actualWeight = weight_at_handover
      ? parseFloat(weight_at_handover)
      : lot.total_weight_kg;

    const weightVariancePct = lot.total_weight_kg > 0
      ? parseFloat((((actualWeight - lot.total_weight_kg) / lot.total_weight_kg) * 100).toFixed(2))
      : 0;

    // ── Atomic DB transaction ─────────────────────────────────────────────────
    const performHandover = db.transaction(() => {
      // 1. Lot → pending_confirmation (NOT yet completed — recycler must confirm)
      db.prepare(`
        UPDATE lots
        SET status = 'pending_confirmation', updated_at = datetime('now')
        WHERE id = ?
      `).run(lot_id);

      // 2. Insert transaction row
      const txnResult = db.prepare(`
        INSERT INTO transactions (
          lot_id, collector_id, recycler_id, material_summary,
          total_weight_kg, quoted_price, final_price,
          payment_status, payment_method,
          latitude, longitude
        ) VALUES (
          @lot_id, @collector_id, @recycler_id, @material_summary,
          @total_weight_kg, @quoted_price, @final_price,
          'pending', 'cash',
          @latitude, @longitude
        )
      `).run({
        lot_id,
        collector_id: lot.collector_id,
        recycler_id,
        material_summary: materialSummary,
        total_weight_kg: lot.total_weight_kg,
        quoted_price: lot.estimated_value,
        final_price: final_agreed_value,
        latitude: collector_lat ? parseFloat(collector_lat) : null,
        longitude: collector_lon ? parseFloat(collector_lon) : null,
      });

      const txnId = txnResult.lastInsertRowid;

      // 3. Insert traceability row — status = 'pending_confirmation'
      db.prepare(`
        INSERT INTO traceability (
          lot_id, transaction_id, handover_ref,
          status,
          collector_confirmed_at,
          gps_collection,
          weight_at_handover, weight_variance_pct,
          notes
        ) VALUES (
          @lot_id, @transaction_id, @handover_ref,
          'pending_confirmation',
          datetime('now'),
          @gps_collection,
          @weight_at_handover, @weight_variance_pct,
          @notes
        )
      `).run({
        lot_id,
        transaction_id: txnId,
        handover_ref: handoverRef,
        gps_collection: gpsCollectionJson,
        weight_at_handover: actualWeight,
        weight_variance_pct: weightVariancePct,
        notes: notes || `Collector initiated handover to ${recycler.name}`,
      });

      return { txnId, handoverRef, txnRef };
    });

    const result = performHandover();

    // Fetch the freshly-created traceability record to return its id
    const traceRecord = db.prepare(
      'SELECT id FROM traceability WHERE handover_ref = ?'
    ).get(result.handoverRef);

    res.status(201).json({
      status: 'ok',
      message: 'Handover initiated — awaiting recycler confirmation.',
      transaction: {
        id: result.txnId,
        ref: result.txnRef,
        handover_ref: result.handoverRef,
        traceability_id: traceRecord?.id,
        amount: final_agreed_value,
        recycler_name: recycler.name,
        recycler_auth: recycler.authorization_number,
        lot_status: 'pending_confirmation',
        gps_captured: !!gpsCollectionJson,
        weight_at_handover: actualWeight,
        date: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error during handover:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
}

module.exports = { recordHandover };

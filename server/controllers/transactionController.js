const db = require('../db/database');
const { randomUUID } = require('crypto');

/**
 * GET /api/transactions?collector_id=:id
 * Fetch all transactions for a given collector, along with live calculated totals directly from SQLite.
 */
function getTransactions(req, res) {
  try {
    const { collector_id } = req.query;

    let query = `
      SELECT 
        tx.*,
        l.lot_ref,
        l.status AS lot_status,
        r.name AS recycler_name,
        r.phone AS recycler_phone,
        r.authorization_number AS recycler_auth,
        c.name AS collector_name,
        tr.handover_ref,
        tr.status AS traceability_status,
        tr.recycler_confirmed_at
      FROM transactions tx
      JOIN lots l ON l.id = tx.lot_id
      JOIN recyclers r ON r.id = tx.recycler_id
      JOIN collectors c ON c.id = tx.collector_id
      LEFT JOIN traceability tr ON tr.transaction_id = tx.id
    `;

    const params = [];
    if (collector_id) {
      query += ` WHERE tx.collector_id = ? `;
      params.push(parseInt(collector_id, 10));
    }
    query += ` ORDER BY tx.created_at DESC `;

    const transactions = db.prepare(query).all(...params);

    // Run real DB aggregation queries to calculate actual totals directly in SQLite
    let totalsQuery = `
      SELECT 
        COUNT(*) AS total_transactions,
        COALESCE(SUM(total_weight_kg), 0) AS total_weight_kg,
        COALESCE(SUM(CASE WHEN payment_status IN ('paid', 'completed') THEN COALESCE(final_price, quoted_price, 0) ELSE 0 END), 0) AS total_earned,
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN COALESCE(final_price, quoted_price, 0) ELSE 0 END), 0) AS pending_dues,
        COALESCE(SUM(COALESCE(final_price, quoted_price, 0)), 0) AS total_gross_value,
        COUNT(CASE WHEN payment_status IN ('paid', 'completed') THEN 1 END) AS paid_count,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) AS pending_count
      FROM transactions
    `;

    const totalsParams = [];
    if (collector_id) {
      totalsQuery += ` WHERE collector_id = ? `;
      totalsParams.push(parseInt(collector_id, 10));
    }

    const summary = db.prepare(totalsQuery).get(...totalsParams);

    res.json({
      status: 'ok',
      collector_id: collector_id ? parseInt(collector_id, 10) : null,
      count: transactions.length,
      summary: {
        total_earned: Math.round(summary.total_earned * 100) / 100,
        pending_dues: Math.round(summary.pending_dues * 100) / 100,
        total_gross_value: Math.round(summary.total_gross_value * 100) / 100,
        total_weight_kg: Math.round(summary.total_weight_kg * 100) / 100,
        total_transactions: summary.total_transactions,
        paid_count: summary.paid_count,
        pending_count: summary.pending_count,
      },
      data: transactions,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * PUT /api/transactions/:id/payment
 * Update payment_status for a transaction (e.g. mark as 'paid' or 'pending').
 */
function updatePaymentStatus(req, res) {
  try {
    const { id } = req.params;
    const { payment_status, payment_method } = req.body;

    if (!payment_status) {
      return res.status(400).json({ status: 'error', message: 'payment_status is required' });
    }

    const validStatuses = ['paid', 'pending', 'completed', 'disputed'];
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid payment_status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!tx) {
      return res.status(404).json({ status: 'error', message: 'Transaction not found' });
    }

    const updateQuery = db.prepare(`
      UPDATE transactions 
      SET 
        payment_status = @payment_status,
        payment_method = COALESCE(@payment_method, payment_method),
        updated_at = datetime('now')
      WHERE id = @id
    `);

    updateQuery.run({
      id: parseInt(id, 10),
      payment_status,
      payment_method: payment_method || null,
    });

    const updatedTx = db.prepare(`
      SELECT 
        tx.*,
        l.lot_ref,
        r.name AS recycler_name,
        c.name AS collector_name
      FROM transactions tx
      JOIN lots l ON l.id = tx.lot_id
      JOIN recyclers r ON r.id = tx.recycler_id
      JOIN collectors c ON c.id = tx.collector_id
      WHERE tx.id = ?
    `).get(id);

    res.json({
      status: 'ok',
      message: `Transaction payment status updated to '${payment_status}'`,
      data: updatedTx,
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * POST /api/transactions/handover
 *
 * Initiates a handover:
 *   - Lot status → 'pending_confirmation'  (not yet 'completed')
 *   - Creates a transaction row with payment_status = 'pending'
 *   - Creates a traceability row with status = 'pending_confirmation'
 *   - Records GPS coords (from client) and weight at time of handover
 */
function recordHandover(req, res) {
  try {
    const {
      lot_id,
      recycler_id,
      final_agreed_value,
      notes,
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
    const uuid = randomUUID();
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    const txnRef      = `TXN-${todayStr}-${randomSuffix}`;
    const handoverRef = `HDO-${uuid.toUpperCase()}`;

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
      // 1. Lot → pending_confirmation
      db.prepare(`
        UPDATE lots
        SET status = 'pending_confirmation', updated_at = datetime('now')
        WHERE id = ?
      `).run(lot_id);

      // 2. Insert transaction row (default payment_status is 'pending')
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

module.exports = {
  getTransactions,
  updatePaymentStatus,
  recordHandover,
};

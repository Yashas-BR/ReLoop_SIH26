const db = require('../db/database');

/**
 * POST /api/transactions/handover
 * Records a handover of a lot to a recycler, mapping to the ACTUAL schema.
 *
 * transactions table columns: id, lot_id, collector_id, recycler_id, material_summary,
 *   total_weight_kg, quoted_price, final_price, payment_status, payment_method,
 *   pickup_scheduled, pickup_location, latitude, longitude, created_at, updated_at
 *
 * traceability table columns: id, lot_id, transaction_id, handover_ref, status,
 *   collector_confirmed_at, recycler_confirmed_at, notes, created_at, updated_at
 */
function recordHandover(req, res) {
  try {
    const { lot_id, recycler_id, final_agreed_value, notes } = req.body;

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
        message: `Lot is in status '${lot.status}' — only 'submitted' lots can be handed over.`,
      });
    }

    const recycler = db.prepare('SELECT * FROM recyclers WHERE id = ?').get(recycler_id);
    if (!recycler) {
      return res.status(404).json({ status: 'error', message: 'Recycler not found.' });
    }

    // Generate human-readable refs
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const txnRef = `TXN-${todayStr}-${randomSuffix}`;
    const handoverRef = `HDO-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Build material summary from lot items
    const items = db.prepare(`
      SELECT li.weight_kg, m.sub_category, m.category
      FROM lot_items li JOIN materials m ON m.id = li.material_id
      WHERE li.lot_id = ?
    `).all(lot_id);
    const materialSummary = items.map((i) => `${i.sub_category}(${i.weight_kg}kg)`).join(', ');

    // Atomic update: update lot + insert transaction + insert traceability
    const performHandover = db.transaction(() => {
      // 1. Mark lot as completed
      db.prepare(`UPDATE lots SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(lot_id);

      // 2. Insert transaction row (using actual column names)
      const txnResult = db.prepare(`
        INSERT INTO transactions (
          lot_id, collector_id, recycler_id, material_summary,
          total_weight_kg, quoted_price, final_price,
          payment_status, payment_method
        ) VALUES (
          @lot_id, @collector_id, @recycler_id, @material_summary,
          @total_weight_kg, @quoted_price, @final_price,
          'completed', 'cash'
        )
      `).run({
        lot_id,
        collector_id: lot.collector_id,
        recycler_id,
        material_summary: materialSummary || `Lot ${lot.lot_ref}`,
        total_weight_kg: lot.total_weight_kg,
        quoted_price: lot.estimated_value,
        final_price: final_agreed_value,
      });

      const txnId = txnResult.lastInsertRowid;

      // 3. Insert traceability record (using actual column names)
      db.prepare(`
        INSERT INTO traceability (
          lot_id, transaction_id, handover_ref, status,
          collector_confirmed_at, recycler_confirmed_at, notes
        ) VALUES (
          @lot_id, @transaction_id, @handover_ref, 'received',
          datetime('now'), datetime('now'), @notes
        )
      `).run({
        lot_id,
        transaction_id: txnId,
        handover_ref: handoverRef,
        notes: notes || `Handover to ${recycler.name} — authorized recycler`,
      });

      return txnId;
    });

    const txnId = performHandover();

    res.json({
      status: 'ok',
      message: 'Handover recorded successfully.',
      transaction: {
        id: txnId,
        ref: txnRef,
        amount: final_agreed_value,
        trace_id: handoverRef,
        recycler_name: recycler.name,
        recycler_auth: recycler.authorization_number,
        date: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error during handover:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
}

module.exports = { recordHandover };

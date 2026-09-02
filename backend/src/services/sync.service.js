import { pool } from '../db.js';
import { createLot, initiateHandover } from './handover.service.js';

/**
 * Process a batch of offline-queued records.
 * Uses a database transaction to ensure atomicity.
 * Duplicate detection via client_id in a sync_log table.
 *
 * @param {Array} records
 * @returns {Promise<Object>}
 */
export const processSyncBatch = async (records) => {
  const client = await pool.connect();
  const results = [];

  try {
    await client.query('BEGIN');

    // Ensure sync_log table exists for duplicate detection
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id SERIAL PRIMARY KEY,
        client_id VARCHAR(100) UNIQUE NOT NULL,
        record_type VARCHAR(20) NOT NULL,
        server_lot_id VARCHAR(30),
        synced_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const record of records) {
      const { client_id, type, ...data } = record;

      // Check for duplicate
      const existingResult = await client.query(
        'SELECT * FROM sync_log WHERE client_id = $1',
        [client_id]
      );

      if (existingResult.rows.length > 0) {
        results.push({
          client_id,
          status: 'duplicate',
          message: 'Record already synced',
          server_lot_id: existingResult.rows[0].server_lot_id,
        });
        continue;
      }

      try {
        if (type === 'lot') {
          const { lot } = await createLot(data);

          await client.query(
            'INSERT INTO sync_log (client_id, record_type, server_lot_id) VALUES ($1, $2, $3)',
            [client_id, 'lot', lot.lot_id]
          );

          results.push({
            client_id,
            status: 'success',
            server_lot_id: lot.lot_id,
          });
        } else if (type === 'handover') {
          const result = await initiateHandover(data);

          await client.query(
            'INSERT INTO sync_log (client_id, record_type, server_lot_id) VALUES ($1, $2, $3)',
            [client_id, 'handover', data.lot_id]
          );

          results.push({
            client_id,
            status: 'success',
            handover_reference: result.handover_reference_number,
          });
        }
      } catch (err) {
        results.push({
          client_id,
          status: 'error',
          message: err.message || 'Processing failed',
        });
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const summary = {
    total: records.length,
    successful: results.filter((r) => r.status === 'success').length,
    duplicates: results.filter((r) => r.status === 'duplicate').length,
    errors: results.filter((r) => r.status === 'error').length,
  };

  return { summary, results };
};

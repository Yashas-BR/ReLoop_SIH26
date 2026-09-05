// src/migrate.js
// Run: npm run migrate
// Executes sql/01_schema.sql against the connected database.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const schemaPath = path.join(__dirname, '..', 'sql', '01_schema.sql');
  const lotSystemPath = path.join(__dirname, '..', 'sql', '06_lot_system.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const lotSystemSql = fs.readFileSync(lotSystemPath, 'utf8');

  try {
    console.log('Running schema migration...');
    await pool.query(sql);
    await pool.query(lotSystemSql);
    console.log('✅ Schema created successfully.');

    const res = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('Tables now present:', res.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

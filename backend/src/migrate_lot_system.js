// One-off migration runner for 06_lot_system.sql
// Run: node src/migrate_lot_system.js
// Safe to run multiple times — all DDL uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const sqlPath = path.join(__dirname, '..', 'sql', '06_lot_system.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying 06_lot_system.sql migration...');
  try {
    await pool.query(sql);
    console.log('✅ Migration applied successfully.');

    // Verify the new tables exist
    const res = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`
    );
    console.log('Tables now present:', res.rows.map(r => r.table_name).join(', '));

    // Verify new columns on materials
    const cols = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'materials' AND column_name IN ('display_lot_id','collection_lat','collection_lng')
       ORDER BY column_name`
    );
    console.log('New materials columns:', cols.rows.map(r => r.column_name).join(', '));

    // Verify sequence exists
    const seq = await pool.query(
      `SELECT sequencename FROM pg_sequences WHERE sequencename = 'lot_display_seq'`
    );
    console.log('lot_display_seq:', seq.rows.length ? 'EXISTS ✅' : 'MISSING ❌');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

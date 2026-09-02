// src/reset.js
// Run: npm run reset
// Clears all data (keeps schema intact) so you can reseed for a clean demo.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const resetPath = path.join(__dirname, '..', 'sql', '04_reset.sql');
  const sql = fs.readFileSync(resetPath, 'utf8');

  try {
    console.log('Resetting database...');
    await pool.query(sql);
    console.log('✅ All tables truncated, IDs reset. Run "npm run seed" next to reload demo data.');
  } catch (err) {
    console.error('❌ Reset failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

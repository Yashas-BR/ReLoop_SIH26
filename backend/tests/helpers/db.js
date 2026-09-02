import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.join(__dirname, '..', '..', 'sql');

const seedFiles = [
  '02_seed_recyclers_prices.sql',
  '03_seed_transactions.sql',
  '05_seed_recycler_rates.sql',
];

export async function resetAndSeed() {
  const resetSql = fs.readFileSync(path.join(sqlDir, '04_reset.sql'), 'utf8');
  await pool.query(resetSql);

  for (const file of seedFiles) {
    const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
    await pool.query(sql);
  }
}

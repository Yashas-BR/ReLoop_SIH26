// src/db.js
// Central PostgreSQL connection pool. Import { pool } from this file
// anywhere you need to run a query (this is what Vedanth's API layer
// should also import from, if you're sharing this backend project).

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// If DATABASE_URL is set (hosted DB like Neon/Supabase), prefer it.
// Otherwise fall back to individual PGHOST/PGUSER/etc vars (local setup).
const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // required by most hosted Postgres providers
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE || 'kabadiwala_connect',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
    };

export const pool = new Pool(connectionConfig);

pool.on('connect', () => {
  pool.query("SET TIME ZONE 'Asia/Kolkata'");
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(1);
});

// Simple helper so callers don't need to import pg directly everywhere
export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL) {
    console.log('executed query', { text, duration, rows: res.rowCount });
  }
  return res;
}

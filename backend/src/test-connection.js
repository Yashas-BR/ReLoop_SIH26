// src/test-connection.js
// Run: npm run test-connection
// Confirms the DB is reachable and reports basic server info.

import { pool } from './db.js';

async function main() {
  try {
    const res = await pool.query('SELECT NOW() AS server_time, version() AS pg_version');
    console.log('✅ Connected to PostgreSQL successfully.');
    console.log('Server time:', res.rows[0].server_time);
    console.log('PostgreSQL version:', res.rows[0].pg_version);
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL.');
    console.error(err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

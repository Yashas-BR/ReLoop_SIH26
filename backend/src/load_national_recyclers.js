// src/load_national_recyclers.js
// Run: node src/load_national_recyclers.js
//
// Loads the real, official national e-waste recycler dataset
// (datasets/national_recyclers_full.csv, 569 verified entries) into
// PostgreSQL. Creates the table if it doesn't exist, then bulk-inserts
// all rows, then verifies the row count matches the source file.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  try {
    // 1. Create the table
    const schemaPath = path.join(__dirname, '..', 'sql', '05_national_recyclers_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Creating national_recyclers_verified table...');
    await pool.query(schemaSql);
    console.log('✅ Table created.');

    // 2. Read and parse the CSV
    const csvPath = path.join(__dirname, '..', 'datasets', 'national_recyclers_full.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const records = parse(csvContent, { columns: true, skip_empty_lines: true });
    console.log(`Parsed ${records.length} rows from CSV.`);

    // 3. Bulk insert
    console.log('Inserting rows...');
    const insertQuery = `
      INSERT INTO national_recyclers_verified
        (name, address, state, activity_type, installed_capacity_mta, status, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    let inserted = 0;
    for (const row of records) {
      const capacity = row.installed_capacity_mta && row.installed_capacity_mta.trim() !== ''
        ? parseFloat(row.installed_capacity_mta)
        : null;
      await pool.query(insertQuery, [
        row.name,
        row.address,
        row.state,
        row.activity_type,
        capacity,
        row.status,
        row.source,
      ]);
      inserted++;
      if (inserted % 100 === 0) console.log(`  ...${inserted} rows inserted`);
    }
    console.log(`✅ ${inserted} rows inserted.`);

    // 4. Verify
    const countRes = await pool.query('SELECT COUNT(*) FROM national_recyclers_verified');
    const dbCount = parseInt(countRes.rows[0].count, 10);
    console.log(`\nVerification: CSV had ${records.length} rows, DB now has ${dbCount} rows.`);
    console.log(dbCount === records.length ? '✅ Match confirmed.' : '❌ MISMATCH — investigate.');

    // 5. Show state breakdown from the DB itself, as a second independent check
    const stateRes = await pool.query(`
      SELECT state, COUNT(*) as count
      FROM national_recyclers_verified
      GROUP BY state
      ORDER BY state
    `);
    console.log('\nState breakdown (from DB):');
    stateRes.rows.forEach(r => console.log(`  ${r.state}: ${r.count}`));

  } catch (err) {
    console.error('❌ Load failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

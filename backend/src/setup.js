// src/setup.js
// All-in-one script: runs migrations + seeds all data
// Run: npm run setup
// Or:   node src/setup.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.join(__dirname, '..', 'sql');

// ─────────────────────────────────────────────────────────────────────────────
// MIGRATION FILES (in order)
const migrationFiles = [
  '01_schema.sql',      // Core tables
  '06_lot_system.sql',  // Lot system additions
];

// OPTIONAL: Uncomment to include national recyclers data
// const nationalSchemaFile = '05_national_recyclers_schema.sql';

// SEED FILES (in dependency order)
const seedFiles = [
  '02_seed_recyclers_prices.sql',  // Recyclers + prices + price sources
  '03_seed_transactions.sql',      // Collectors + materials + transactions + traceability
  '05_seed_recycler_rates.sql',    // Recycler-specific rates
];

// Expected row counts after seeding
const expectedCounts = {
  recyclers: 10,
  prices: 71,
  collectors: 2,
  materials: 6,
  transactions: 6,
  traceability: 4,
  price_sources: 4,
};

// ─────────────────────────────────────────────────────────────────────────────

async function runSqlFile(filename) {
  const filePath = path.join(sqlDir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️  File not found: ${filename}, skipping...`);
    return false;
  }
  const sql = fs.readFileSync(filePath, 'utf8');
  await pool.query(sql);
  return true;
}

async function verifyCounts() {
  console.log('\n📊 Verifying row counts...');
  const res = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM recyclers)    AS recyclers,
      (SELECT COUNT(*) FROM prices)       AS prices,
      (SELECT COUNT(*) FROM collectors)   AS collectors,
      (SELECT COUNT(*) FROM materials)    AS materials,
      (SELECT COUNT(*) FROM transactions) AS transactions,
      (SELECT COUNT(*) FROM traceability) AS traceability,
      (SELECT COUNT(*) FROM price_sources) AS price_sources
  `);

  const actual = res.rows[0];
  let allMatch = true;
  for (const [table, expected] of Object.entries(expectedCounts)) {
    const got = Number(actual[table]);
    const ok = got === expected;
    if (!ok) allMatch = false;
    console.log(`  ${ok ? '✅' : '❌'} ${table}: expected ${expected}, got ${got}`);
  }
  return allMatch;
}

async function listTables() {
  const res = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `);
  return res.rows.map(r => r.table_name);
}

async function main() {
  const args = process.argv.slice(2);
  const skipSeed = args.includes('--skip-seed');
  const skipVerify = args.includes('--skip-verify');

  try {
    console.log('🚀 Kabadiwala Connect - Database Setup\n');
    console.log('─'.repeat(50));

    // ─── MIGRATIONS ───────────────────────────────────────────────────────────
    console.log('\n📦 Running migrations...\n');
    
    for (const file of migrationFiles) {
      console.log(`  ▶ ${file}`);
      await runSqlFile(file);
      console.log(`    ✅ Done`);
    }

    // Optional: National recyclers schema
    // console.log('\n  ▶ 05_national_recyclers_schema.sql');
    // await runSqlFile('05_national_recyclers_schema.sql');
    // console.log('    ✅ Done');

    const tables = await listTables();
    console.log(`\n📋 Tables created: ${tables.join(', ')}`);

    // ─── SEED DATA ─────────────────────────────────────────────────────────────
    if (!skipSeed) {
      console.log('\n🌱 Seeding data...\n');
      
      for (const file of seedFiles) {
        console.log(`  ▶ ${file}`);
        await runSqlFile(file);
        console.log(`    ✅ Done`);
      }

      // ─── VERIFY ─────────────────────────────────────────────────────────────
      if (!skipVerify) {
        const allMatch = await verifyCounts();
        if (allMatch) {
          console.log('\n✅ All seed data loaded correctly!');
        } else {
          console.log('\n❌ Row count mismatch detected!');
          process.exit(1);
        }
      }
    } else {
      console.log('\n⏭️  Skipping seed (--skip-seed flag)');
    }

    console.log('\n' + '─'.repeat(50));
    console.log('🎉 Setup complete!\n');
    console.log('Next steps:');
    console.log('  • npm start          - Start the server');
    console.log('  • npm run reset      - Clear all data (keep schema)');
    console.log('  • npm run seed       - Reseed data only');
    console.log('');

  } catch (err) {
    console.error('\n❌ Setup failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
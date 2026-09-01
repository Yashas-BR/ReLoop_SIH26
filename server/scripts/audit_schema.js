const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'kabadiwala.db'));

// Get exact schema for all tables
const tables = ['collectors', 'recyclers', 'materials', 'prices', 'lots', 'lot_items', 'transactions', 'traceability'];
tables.forEach(name => {
  try {
    const cols = db.prepare(`PRAGMA table_info(${name})`).all();
    console.log(`\n=== ${name} SCHEMA ===`);
    cols.forEach(c => console.log(`  ${c.cid}: ${c.name} ${c.type} ${c.notnull ? 'NOT NULL' : ''} ${c.dflt_value ? 'DEFAULT ' + c.dflt_value : ''}`));
    const sample = db.prepare(`SELECT * FROM ${name} LIMIT 2`).all();
    console.log(`  SAMPLE (first 2 rows):`, JSON.stringify(sample));
  } catch(e) {
    console.log(`  ERROR reading ${name}: ${e.message}`);
  }
});

db.close();

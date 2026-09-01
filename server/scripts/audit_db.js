const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'kabadiwala.db'));

console.log('\n=== A. INFRASTRUCTURE: DB TABLE AUDIT ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables found:', tables.map(t => t.name));

const tableCounts = {};
tables.forEach(t => {
  const count = db.prepare(`SELECT COUNT(*) as n FROM "${t.name}"`).get();
  tableCounts[t.name] = count.n;
  console.log(`  ${t.name}: ${count.n} rows`);
});

console.log('\n=== A. SCHEMA CHECK ===');
const requiredTables = ['collectors', 'recyclers', 'materials', 'prices', 'lots', 'transactions', 'traceability'];
requiredTables.forEach(name => {
  const found = tables.some(t => t.name === name);
  console.log(`  ${found ? 'PASS' : 'FAIL'} Table "${name}" exists: ${found}`);
});

console.log('\n=== A. ROW COUNT VALIDATION ===');
console.log(`  collectors: ${tableCounts.collectors} (expected >=4)`);
console.log(`  recyclers: ${tableCounts.recyclers} (expected >=8)`);
console.log(`  materials: ${tableCounts.materials} (expected >=20)`);
console.log(`  prices: ${tableCounts.prices} (expected >=1000)`);
console.log(`  lots: ${tableCounts.lots} (expected 0 after fresh seed)`);
console.log(`  transactions: ${tableCounts.transactions} (expected 0 after fresh seed)`);
console.log(`  traceability: ${tableCounts.traceability} (expected 0 after fresh seed)`);

console.log('\n=== B. COLLECTOR CHECK ===');
const collectors = db.prepare('SELECT id, name, phone, location FROM collectors LIMIT 5').all();
console.log('Collectors:', JSON.stringify(collectors, null, 2));

console.log('\n=== B. RECYCLER AUTH STATUS CHECK ===');
const recyclers = db.prepare('SELECT id, name, authorization_status, materials_accepted, lat, lon FROM recyclers').all();
recyclers.forEach(r => {
  console.log(`  [${r.id}] ${r.name} | auth=${r.authorization_status} | lat=${r.lat} lon=${r.lon} | accepts=${r.materials_accepted}`);
});

console.log('\n=== C. PRICE DATA SAMPLE (latest for 5 materials, Bengaluru) ===');
const latestPrices = db.prepare(`
  SELECT m.sub_category, p.date, p.buying_price, p.quoted_price, p.price_trend
  FROM prices p JOIN materials m ON m.id = p.material_id
  WHERE p.location = 'Bengaluru'
    AND p.date = (SELECT MAX(p2.date) FROM prices p2 WHERE p2.material_id = p.material_id AND p2.location = 'Bengaluru')
  GROUP BY p.material_id ORDER BY m.sub_category LIMIT 8
`).all();
latestPrices.forEach(p => console.log(`  ${p.sub_category}: buy=₹${p.buying_price} quote=₹${p.quoted_price} trend=${p.price_trend} date=${p.date}`));

console.log('\n=== B. ESTIMATE CALCULATION TEST (verify formula) ===');
// Test Lead-Acid Battery, 10kg, good condition
const mat = db.prepare("SELECT id, avg_price_per_kg FROM materials WHERE sub_category='Lead-Acid Battery'").get();
console.log('  Material found for Lead-Acid Battery:', mat);

const priceRow = db.prepare(`
  SELECT AVG(buying_price) as avg7d FROM prices 
  WHERE material_id=? AND location='Bengaluru' 
  AND date >= date('now', '-7 days')
`).get(mat ? mat.id : 10);
console.log('  7-day avg buying_price for Lead-Acid Battery:', priceRow ? priceRow.avg7d : 'NOT FOUND');

console.log('\n=== D. RECYCLER MATCHING - Auth filter test ===');
const unauthorizedRecyclers = db.prepare("SELECT id, name, authorization_status FROM recyclers WHERE authorization_status != 'authorized'").all();
console.log('  Non-authorized recyclers:', JSON.stringify(unauthorizedRecyclers));

console.log('\n=== D. RECYCLER COORDINATES for Haversine check ===');
recyclers.forEach(r => {
  const hasCoords = r.lat !== null && r.lon !== null;
  console.log(`  [${r.id}] ${r.name}: lat=${r.lat} lon=${r.lon} ${hasCoords ? 'PASS' : 'FAIL - missing coords'}`);
});

db.close();
console.log('\n=== DB AUDIT COMPLETE ===\n');

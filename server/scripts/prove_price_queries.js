// Proof script: shows the EXACT SQL query used by getPriceHistory()
const db = require('../db/database');

const materialId = 23; // Server-Grade PCB
const location = 'Bengaluru';
const days = 60;

const SQL = `
  SELECT 
    p.id,
    p.date,
    p.buying_price,
    p.quoted_price,
    p.price_trend,
    p.location
  FROM prices p
  WHERE p.material_id = ?
    AND p.location = ?
  ORDER BY p.date ASC
  LIMIT ?
`;

console.log('=== ACTUAL SQLITE QUERY USED BY getPriceHistory() ===\n');
console.log(SQL.trim());
console.log('\n=== RESULTS (material_id=23, location=Bengaluru, days=60) ===\n');

const records = db.prepare(SQL).all(materialId, location, days);
const prices = records.map(r => r.buying_price);
const min = Math.min(...prices);
const max = Math.max(...prices);
const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
const latest = records[records.length - 1].buying_price;

console.log('Records returned :', records.length);
console.log('Date range       :', records[0].date, '->', records[records.length - 1].date);
console.log('Min price        : INR', min, '/kg');
console.log('Max price        : INR', max, '/kg');
console.log('Avg price (60d)  : INR', avg, '/kg');
console.log('Latest price     : INR', latest, '/kg');
console.log('');
console.log('First 5 data points (oldest):');
records.slice(0, 5).forEach(r =>
  console.log(`  ${r.date}  buy=INR${r.buying_price}  quoted=INR${r.quoted_price}  trend=${r.price_trend}`)
);
console.log('  ...');
console.log('Last 5 data points (newest):');
records.slice(-5).forEach(r =>
  console.log(`  ${r.date}  buy=INR${r.buying_price}  quoted=INR${r.quoted_price}  trend=${r.price_trend}`)
);

console.log('\n=== SPARKLINE QUERY (used in /api/prices for inline trend preview) ===\n');
const sparklineSQL = `
  SELECT date, buying_price 
  FROM prices 
  WHERE material_id = ? AND location = ?
  ORDER BY date DESC 
  LIMIT 14
`;
console.log(sparklineSQL.trim());

const sparkline = db.prepare(sparklineSQL).all(materialId, location).reverse();
const pctChange = Math.round(((sparkline[sparkline.length-1].buying_price - sparkline[0].buying_price) / sparkline[0].buying_price) * 1000) / 10;
console.log('\nSparkline (14 points, reversed to chronological):');
sparkline.forEach(p => process.stdout.write(`  ${p.buying_price}`));
console.log();
console.log('14-day % change:', pctChange > 0 ? '+' : '', pctChange + '%');

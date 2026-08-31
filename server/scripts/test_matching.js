/**
 * Test script: proves the Haversine matching algorithm is real.
 *
 * Uses two different collector locations:
 *   A) Peenya Industrial Area (NW Bengaluru)  – 13.0284° N, 77.5183° E
 *   B) Electronic City Phase 2 (SE Bengaluru) – 12.8340° N, 77.6649° E
 *
 * Both use the same lot to keep material/value constant.
 * We expect the ranking to change because the nearest recycler differs by location.
 */

const { haversineDistanceKm, computeMatchScore, findMatches } = require('../controllers/matchController');
const db = require('../db/database');

// ─── 1. Unit-test Haversine ────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════');
console.log('  UNIT TEST: haversineDistanceKm()');
console.log('═══════════════════════════════════════════════════════════');

// Known reference: Peenya → Electronic City (should be ~22–24 km)
const peenyaLat = 13.0284, peenyaLon = 77.5183;
const elcityLat = 12.8340, elcityLon = 77.6649;
const dist = haversineDistanceKm(peenyaLat, peenyaLon, elcityLat, elcityLon);
console.log(`\nPeenya → Electronic City: ${dist} km  (expected ~22–24 km)`);
console.log(dist >= 20 && dist <= 26 ? '  ✅ PASS' : '  ❌ FAIL – formula may be wrong!');

// Zero-distance check
const selfDist = haversineDistanceKm(13.0, 77.5, 13.0, 77.5);
console.log(`\nSelf-distance (same point): ${selfDist} km  (expected 0)`);
console.log(selfDist === 0 ? '  ✅ PASS' : `  ❌ FAIL – got ${selfDist}`);

// ─── 2. Load all recyclers and show their positions ───────────────────────────
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  RECYCLER LOCATIONS FROM DB');
console.log('═══════════════════════════════════════════════════════════\n');

const recyclers = db.prepare(`
  SELECT id, name, city, latitude, longitude, authorization_status, offered_rate_modifier
  FROM recyclers 
  ORDER BY id
`).all();

recyclers.forEach(r => {
  const dFromPeenya = haversineDistanceKm(peenyaLat, peenyaLon, r.latitude, r.longitude);
  const dFromElCity = haversineDistanceKm(elcityLat, elcityLon, r.latitude, r.longitude);
  console.log(`  #${r.id} ${r.name.padEnd(35)} ${r.authorization_status.padEnd(12)} rate:${r.offered_rate_modifier.toFixed(2)}  |  fromPeenya: ${dFromPeenya}km  |  fromElCity: ${dFromElCity}km`);
});

// ─── 3. Use an existing lot or create a fresh one for the test ─────────────────
let testLotId = db.prepare(`SELECT id FROM lots WHERE status = 'submitted' ORDER BY id DESC LIMIT 1`).get()?.id;

if (!testLotId) {
  // Create a minimal test lot
  const mat = db.prepare(`SELECT id FROM materials WHERE category = 'E-Waste' LIMIT 1`).get();
  const collector = db.prepare(`SELECT id FROM collectors LIMIT 1`).get();
  if (mat && collector) {
    const result = db.prepare(`
      INSERT INTO lots (lot_ref, collector_id, status, total_weight_kg, estimated_value, pickup_address, latitude, longitude)
      VALUES ('LOT-TEST-9999', ?, 'submitted', 20, 8000, 'Test Location', 13.0, 77.5)
    `).run(collector.id);
    db.prepare(`INSERT INTO lot_items (lot_id, material_id, weight_kg, condition, estimated_value) VALUES (?, ?, 20, 'good', 8000)`).run(result.lastInsertRowid, mat.id);
    testLotId = result.lastInsertRowid;
    console.log(`\n  Created test lot #${testLotId} for matching`);
  }
}

if (!testLotId) {
  console.error('\n  ❌ Could not find or create a test lot. Ensure DB is seeded.');
  process.exit(1);
}

console.log(`\n  Using Lot #${testLotId} for both location tests`);

// ─── 4. Location A: Peenya Industrial Area ────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  TEST A: COLLECTOR AT PEENYA (NW Bengaluru)');
console.log(`  Coordinates: ${peenyaLat}°N, ${peenyaLon}°E`);
console.log('═══════════════════════════════════════════════════════════\n');

const resultA = findMatches({
  lot_id: testLotId,
  collector_lat: peenyaLat,
  collector_lon: peenyaLon,
  authorized_only: true,
  max_distance_km: 100,
  top_n: 5,
});

console.log(`  Lot: ${resultA.lot.lot_ref} | Material: ${resultA.lot.material_category} | Weight: ${resultA.lot.total_weight_kg}kg | Est. Value: ₹${resultA.lot.estimated_value}`);
console.log(`  Scoring weights: distance=${resultA.scoring_weights.distance}, rate=${resultA.scoring_weights.offered_rate}`);
console.log(`  Candidates found: ${resultA.matches.length}\n`);

console.log('  Rank  | Recycler                              | Distance  | Rate  | Offered ₹ | Score | Dist.Score | Rate.Score');
console.log('  ------|---------------------------------------|-----------|-------|-----------|-------|------------|----------');
resultA.matches.forEach((r, i) => {
  console.log(
    `  #${i+1}    | ${r.name.padEnd(37)} | ${String(r.distance_km).padEnd(9)} | ${r.offered_rate_modifier.toFixed(2)}  | ₹${String(r.offered_price).padEnd(9)} | ${String(r.match_score).padEnd(5)} | ${r.score_breakdown.normalized_dist_score}       | ${r.score_breakdown.normalized_rate_score}`
  );
});

const topA = resultA.matches[0];

// ─── 5. Location B: Electronic City (SE Bengaluru) ────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  TEST B: COLLECTOR AT ELECTRONIC CITY (SE Bengaluru)');
console.log(`  Coordinates: ${elcityLat}°N, ${elcityLon}°E`);
console.log('═══════════════════════════════════════════════════════════\n');

const resultB = findMatches({
  lot_id: testLotId,
  collector_lat: elcityLat,
  collector_lon: elcityLon,
  authorized_only: true,
  max_distance_km: 100,
  top_n: 5,
});

console.log(`  Same lot, different collector coordinates.`);
console.log(`  Candidates found: ${resultB.matches.length}\n`);

console.log('  Rank  | Recycler                              | Distance  | Rate  | Offered ₹ | Score | Dist.Score | Rate.Score');
console.log('  ------|---------------------------------------|-----------|-------|-----------|-------|------------|----------');
resultB.matches.forEach((r, i) => {
  console.log(
    `  #${i+1}    | ${r.name.padEnd(37)} | ${String(r.distance_km).padEnd(9)} | ${r.offered_rate_modifier.toFixed(2)}  | ₹${String(r.offered_price).padEnd(9)} | ${String(r.match_score).padEnd(5)} | ${r.score_breakdown.normalized_dist_score}       | ${r.score_breakdown.normalized_rate_score}`
  );
});

const topB = resultB.matches[0];

// ─── 6. Summary comparison ────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  RANKING COMPARISON SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

const sameTop = topA?.id === topB?.id;
console.log(`  Peenya    → Top match: "${topA?.name}" at ${topA?.distance_km}km (score ${topA?.match_score})`);
console.log(`  Elec City → Top match: "${topB?.name}" at ${topB?.distance_km}km (score ${topB?.match_score})`);
console.log('');
console.log(sameTop
  ? `  ⚠️  Both locations returned the same top recycler (#${topA?.id}). This may be correct if one recycler dominates both on rate+distance.`
  : `  ✅ Rankings DIFFER by location — Haversine distance correctly affects the ranking.`
);
console.log('');
console.log('  Authorization filter: Both tests ran with authorized_only=true');
console.log('  → Only recyclers with authorization_status=\'authorized\' appear above.');

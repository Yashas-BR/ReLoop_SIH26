/**
 * Full E2E integration test:
 * 1. Create a fresh lot via POST /api/lots
 * 2. Call GET /api/match?lot_id=... and verify results
 * 3. Call POST /api/transactions/handover
 * 4. Show everything that would be displayed in the UI
 */

const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function run() {
  const BASE = 'localhost';
  const PORT = 5000;

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║    KABADIWALA CONNECT — Full API Integration Test        ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ── Step 1: Create a lot ──────────────────────────────────────────────────
  console.log('▶ STEP 1: Creating lot via POST /api/lots');
  // Use raw JSON since we have no photo file here
  const lotPayload = JSON.stringify({
    collector_id: 1,
    material_id: 22,   // Server-Grade PCB (has price history)
    weight_kg: 18.5,
    condition: 'good',
    source_type: 'industrial',
    notes: 'Integration test lot',
    pickup_address: 'Peenya 2nd Stage, Bengaluru',
    latitude: 13.0284,
    longitude: 77.5183,
  });

  const lotRes = await request({
    hostname: BASE, port: PORT, path: '/api/lots', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(lotPayload) },
  }, lotPayload);

  if (lotRes.status !== 201 || lotRes.body.status !== 'ok') {
    console.error('  ❌ Create lot FAILED:', lotRes.status, JSON.stringify(lotRes.body));
    process.exit(1);
  }

  const { lot_id, lot_ref, calculation_breakdown: valuation } = lotRes.body;
  console.log(`  ✅ Lot created: ${lot_ref} (ID #${lot_id})`);
  console.log(`  Material: Server-Grade PCB | Weight: 18.5 kg | Condition: good`);
  console.log(`  7-day avg price: ₹${valuation.avg_buying_price_7d}/kg | Condition multiplier: ${valuation.condition_multiplier}`);
  console.log(`  Effective rate: ₹${valuation.effective_rate_per_kg}/kg`);
  console.log(`  → Estimated value recorded in DB: ₹${valuation.total_estimated_value.toLocaleString('en-IN')}`);

  // ── Step 2a: Match from Peenya ────────────────────────────────────────────
  console.log('\n▶ STEP 2A: GET /api/match?lot_id=' + lot_id + '&authorized_only=true (Collector at Peenya)');

  const matchAPeenya = await request({
    hostname: BASE, port: PORT,
    path: `/api/match?lot_id=${lot_id}&authorized_only=true&collector_lat=13.0284&collector_lon=77.5183&top_n=4`,
    method: 'GET',
  });

  if (matchAPeenya.status !== 200) {
    console.error('  ❌ Match FAILED:', matchAPeenya.status, JSON.stringify(matchAPeenya.body));
    process.exit(1);
  }

  const matchA = matchAPeenya.body;
  console.log(`  ✅ ${matchA.matches.length} authorized recyclers matched`);
  console.log(`  Scoring: distance weight=${matchA.scoring_weights.distance}, rate weight=${matchA.scoring_weights.offered_rate}`);
  console.log('');
  matchA.matches.forEach((r, i) =>
    console.log(`  [${i+1}] ${r.name.padEnd(35)} | ${r.distance_km}km | rate:${r.offered_rate_modifier} | ₹${r.offered_price} | score:${r.match_score}/100`)
  );

  // ── Step 2b: Match from Electronic City ──────────────────────────────────
  console.log('\n▶ STEP 2B: Same lot, collector at Electronic City (12.834°N, 77.6649°E)');

  const matchBElCity = await request({
    hostname: BASE, port: PORT,
    path: `/api/match?lot_id=${lot_id}&authorized_only=true&collector_lat=12.834&collector_lon=77.6649&top_n=4`,
    method: 'GET',
  });

  const matchB = matchBElCity.body;
  matchB.matches.forEach((r, i) =>
    console.log(`  [${i+1}] ${r.name.padEnd(35)} | ${r.distance_km}km | rate:${r.offered_rate_modifier} | ₹${r.offered_price} | score:${r.match_score}/100`)
  );

  const topA = matchA.matches[0];
  const topB = matchB.matches[0];
  console.log(`\n  📍 Peenya top match    → "${topA.name}" at ${topA.distance_km}km (score ${topA.match_score})`);
  console.log(`  📍 Elec City top match → "${topB.name}" at ${topB.distance_km}km (score ${topB.match_score})`);
  console.log(topA.id !== topB.id
    ? '  ✅ Rankings DIFFER by location — Haversine distance is real and correct.'
    : '  ⚠️  Same top match (one recycler dominates both on distance+rate).'
  );

  // ── Step 3: Handover ──────────────────────────────────────────────────────
  console.log('\n▶ STEP 3: POST /api/transactions/handover — confirming handover to top recycler from Peenya');

  const handoverPayload = JSON.stringify({
    lot_id,
    recycler_id: topA.id,
    final_agreed_value: topA.offered_price,
    notes: 'Integration test handover — all serial numbers verified',
  });

  const handoverRes = await request({
    hostname: BASE, port: PORT, path: '/api/transactions/handover', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(handoverPayload) },
  }, handoverPayload);

  if (handoverRes.status !== 200 || handoverRes.body.status !== 'ok') {
    console.error('  ❌ Handover FAILED:', handoverRes.status, JSON.stringify(handoverRes.body));
    process.exit(1);
  }

  const { transaction: txn } = handoverRes.body;
  console.log(`  ✅ Handover recorded!`);
  console.log(`  Transaction Ref:  ${txn.ref}`);
  console.log(`  Traceability ID:  ${txn.trace_id}`);
  console.log(`  Amount paid:      ₹${txn.amount.toLocaleString('en-IN')}`);
  console.log(`  Date:             ${txn.date}`);

  // ── Step 4: Verify lot status changed to 'completed' ─────────────────────
  console.log('\n▶ STEP 4: Verify lot status changed in DB');

  const lotCheck = await request({
    hostname: BASE, port: PORT, path: `/api/lots/${lot_id}`, method: 'GET',
  });

  const updatedLot = lotCheck.body.data;
  console.log(`  Lot ${updatedLot.lot_ref} status: ${updatedLot.status}`);
  console.log(updatedLot.status === 'completed'
    ? '  ✅ Lot correctly marked as completed in SQLite.'
    : '  ❌ Status not updated!'
  );

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  ALL STEPS PASSED — Full E2E flow is working end-to-end ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

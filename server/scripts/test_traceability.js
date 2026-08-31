/**
 * Full E2E test: two-step handover flow
 * 1. Create lot
 * 2. Match recyclers
 * 3. POST /api/transactions/handover → status: pending_confirmation
 * 4. GET /api/traceability/lot/:id → verify pending_confirmation in DB
 * 5. GET /api/traceability/pending?recycler_id=X → recycler sees it
 * 6. PUT /api/traceability/:id/confirm → recycler confirms
 * 7. GET /api/traceability/lot/:id → verify recycler_confirmed
 * 8. GET /api/lots/:id → verify lot.status = 'completed'
 */

const http = require('http');

function req(opts, body = null) {
  return new Promise((resolve, reject) => {
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ s: res.statusCode, b: JSON.parse(d) }); }
        catch { resolve({ s: res.statusCode, b: d }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}

const H = 'localhost';
const P = 5000;

function post(path, body) {
  const s = JSON.stringify(body);
  return req({ hostname: H, port: P, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(s) } }, s);
}
function get(path) {
  return req({ hostname: H, port: P, path, method: 'GET' });
}
function put(path, body) {
  const s = JSON.stringify(body);
  return req({ hostname: H, port: P, path, method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(s) } }, s);
}

function check(label, cond, got) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.error(`  ❌ ${label} — got:`, JSON.stringify(got)); process.exit(1); }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  TWO-STEP HANDOVER + TRACEABILITY — Full Flow Test       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ── Step 1: Create lot ────────────────────────────────────────────────────
  console.log('▶ STEP 1: Create lot');
  const lot = await post('/api/lots', {
    collector_id: 1,
    material_id: 12,   // Copper Wire
    weight_kg: 25,
    condition: 'good',
    source_type: 'industrial',
    pickup_address: 'Peenya 2nd Stage, Bengaluru',
    latitude: 13.0284,
    longitude: 77.5183,
  });
  check('HTTP 201', lot.s === 201, lot.b);
  check('status ok', lot.b.status === 'ok', lot.b);
  const { lot_id, lot_ref } = lot.b;
  console.log(`  → ${lot_ref} (id: ${lot_id})\n`);

  // ── Step 2: Match ─────────────────────────────────────────────────────────
  console.log('▶ STEP 2: Match recyclers');
  const match = await get(`/api/match?lot_id=${lot_id}&authorized_only=true`);
  check('HTTP 200', match.s === 200, match.b);
  const recycler = match.b.matches[0];
  console.log(`  → Top match: "${recycler.name}" | score ${recycler.match_score} | ₹${recycler.offered_price}\n`);

  // ── Step 3: Initiate handover ─────────────────────────────────────────────
  console.log('▶ STEP 3: POST /api/transactions/handover (with GPS coords)');
  const handover = await post('/api/transactions/handover', {
    lot_id,
    recycler_id: recycler.id,
    final_agreed_value: recycler.offered_price,
    notes: 'E2E test — weighbridge verified',
    collector_lat: 13.0284,
    collector_lon: 77.5183,
    collector_gps_accuracy: 15,
    weight_at_handover: 24.8,
  });
  check('HTTP 201', handover.s === 201, handover.b);
  check('status ok', handover.b.status === 'ok', handover.b);
  check('lot_status = pending_confirmation', handover.b.transaction.lot_status === 'pending_confirmation', handover.b.transaction);
  check('gps_captured = true', handover.b.transaction.gps_captured === true, handover.b.transaction);
  check('handover_ref is UUID-backed', handover.b.transaction.handover_ref.startsWith('HDO-'), handover.b.transaction);
  const { traceability_id, handover_ref, ref: txn_ref } = handover.b.transaction;
  console.log(`  → TXN Ref:      ${txn_ref}`);
  console.log(`  → Handover Ref: ${handover_ref}`);
  console.log(`  → Trace ID:     ${traceability_id}`);
  console.log(`  → GPS:          13.0284, 77.5183 (accuracy: 15m)\n`);

  // ── Step 4: Collector checks their lot status ─────────────────────────────
  console.log('▶ STEP 4: GET /api/traceability/lot/:lot_id (collector polling)');
  const trace = await get(`/api/traceability/lot/${lot_id}`);
  check('HTTP 200', trace.s === 200, trace.b);
  check('status = pending_confirmation', trace.b.data.status === 'pending_confirmation', trace.b.data);
  check('lot_status = pending_confirmation', trace.b.data.lot_status === 'pending_confirmation', trace.b.data);
  check('gps_collection parsed', trace.b.data.gps_collection?.lat === 13.0284, trace.b.data);
  check('weight_at_handover = 24.8', trace.b.data.weight_at_handover === 24.8, trace.b.data);
  console.log(`  → DB status: "${trace.b.data.status}" ✓`);
  console.log(`  → GPS: lat=${trace.b.data.gps_collection?.lat}, lon=${trace.b.data.gps_collection?.lon}\n`);

  // ── Step 5: Recycler portal sees pending ──────────────────────────────────
  console.log(`▶ STEP 5: GET /api/traceability/pending?recycler_id=${recycler.id} (recycler portal)`);
  const pending = await get(`/api/traceability/pending?recycler_id=${recycler.id}`);
  check('HTTP 200', pending.s === 200, pending.b);
  const myHandover = pending.b.data.find(h => h.traceability_id === traceability_id);
  check('Handover appears in recycler pending list', !!myHandover, pending.b.data);
  console.log(`  → Recycler sees ${pending.b.count} pending handover(s)`);
  console.log(`  → Lot: ${myHandover.lot_ref} | Collector: ${myHandover.collector_name} | ₹${myHandover.final_price}\n`);

  // ── Step 6: Recycler confirms ─────────────────────────────────────────────
  console.log(`▶ STEP 6: PUT /api/traceability/${traceability_id}/confirm (recycler confirms)`);
  const confirm = await put(`/api/traceability/${traceability_id}/confirm`, {
    recycler_id: recycler.id,
    recycler_lat: 13.0280,
    recycler_lon: 77.5198,
    notes: 'Received and weighed — material verified',
  });
  check('HTTP 200', confirm.s === 200, confirm.b);
  check('status ok', confirm.b.status === 'ok', confirm.b);
  check('traceability status = recycler_confirmed', confirm.b.data.status === 'recycler_confirmed', confirm.b.data);
  check('lot_status = completed', confirm.b.data.lot_status === 'completed', confirm.b.data);
  console.log(`  → Traceability status: "${confirm.b.data.status}"`);
  console.log(`  → Lot status:          "${confirm.b.data.lot_status}"`);
  console.log(`  → Confirmed at:        ${confirm.b.data.recycler_confirmed_at}\n`);

  // ── Step 7: Collector re-checks — sees updated status ─────────────────────
  console.log('▶ STEP 7: Collector re-polls /api/traceability/lot/:id after recycler confirmation');
  const traceUpdated = await get(`/api/traceability/lot/${lot_id}`);
  check('HTTP 200', traceUpdated.s === 200, traceUpdated.b);
  check('status updated to recycler_confirmed', traceUpdated.b.data.status === 'recycler_confirmed', traceUpdated.b.data);
  check('recycler_confirmed_at is set', !!traceUpdated.b.data.recycler_confirmed_at, traceUpdated.b.data);
  console.log(`  → DB status now: "${traceUpdated.b.data.status}" ✓ (changed from pending_confirmation)\n`);

  // ── Step 8: Lot directly shows completed ─────────────────────────────────
  console.log('▶ STEP 8: GET /api/lots/:lot_id — lot.status = completed');
  const lotFinal = await get(`/api/lots/${lot_id}`);
  check('HTTP 200', lotFinal.s === 200, lotFinal.b);
  check('lot.status = completed', lotFinal.b.data.status === 'completed', lotFinal.b.data);
  console.log(`  → Lot ${lotFinal.b.data.lot_ref}: status = "${lotFinal.b.data.status}"\n`);

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  ALL 8 STEPS PASSED — Two-step traceability flow works!  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

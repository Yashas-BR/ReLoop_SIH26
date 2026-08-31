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

async function runDynamicTest() {
  console.log('--- 1. Create a brand new lot for Raju (collector_id=1) ---');
  const lotRes = await req({
    hostname: H, port: P, path: '/api/lots', method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, JSON.stringify({
    collector_id: 1,
    material_id: 1, // Laptop
    weight_kg: 10,
    condition: 'fair',
    source_type: 'household',
    pickup_address: 'Indiranagar, Bengaluru',
    latitude: 12.9784,
    longitude: 77.6408,
  }));
  const lotId = lotRes.b.lot_id;
  console.log(`Created Lot #${lotId} (${lotRes.b.lot_ref})`);

  console.log('\n--- 2. Match with Recycler ---');
  const matchRes = await req({ hostname: H, port: P, path: `/api/match?lot_id=${lotId}&authorized_only=true`, method: 'GET' });
  const topRecycler = matchRes.b.matches[0];
  console.log(`Matched with: ${topRecycler.name}, Offered: ₹${topRecycler.offered_price}`);

  console.log('\n--- 3. Handover Lot (Creates Pending Transaction) ---');
  const hoRes = await req({
    hostname: H, port: P, path: '/api/transactions/handover', method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, JSON.stringify({
    lot_id: lotId,
    recycler_id: topRecycler.id,
    final_agreed_value: topRecycler.offered_price,
    notes: 'Dynamic ledger pending test',
  }));
  const txnId = hoRes.b.transaction.id;
  console.log(`Handover complete! Txn ID #${txnId}, Amount: ₹${hoRes.b.transaction.amount}`);

  console.log('\n--- 4. Check Ledger with Pending Transaction ---');
  const ledger1 = await req({ hostname: H, port: P, path: '/api/transactions?collector_id=1', method: 'GET' });
  console.log('Ledger Summary:');
  console.log(`  Total Earned: ₹${ledger1.b.summary.total_earned}`);
  console.log(`  Pending Dues: ₹${ledger1.b.summary.pending_dues} (Includes new txn ₹${topRecycler.offered_price})`);
  console.log(`  Pending Count: ${ledger1.b.summary.pending_count}`);

  if (ledger1.b.summary.pending_dues !== topRecycler.offered_price) {
    console.error('❌ Pending dues did not reflect new transaction!');
    process.exit(1);
  }

  console.log(`\n--- 5. Mark Transaction #${txnId} as PAID via PUT /api/transactions/${txnId}/payment ---`);
  const payRes = await req({
    hostname: H, port: P, path: `/api/transactions/${txnId}/payment`, method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
  }, JSON.stringify({ payment_status: 'paid', payment_method: 'upi' }));
  console.log(`Response: ${payRes.b.message}`);

  console.log('\n--- 6. Re-check Ledger after Payment Settled ---');
  const ledger2 = await req({ hostname: H, port: P, path: '/api/transactions?collector_id=1', method: 'GET' });
  console.log('Updated Ledger Summary:');
  console.log(`  Total Earned: ₹${ledger2.b.summary.total_earned} (Increased by ₹${topRecycler.offered_price})`);
  console.log(`  Pending Dues: ₹${ledger2.b.summary.pending_dues} (Reset to 0)`);
  console.log(`  Paid Count: ${ledger2.b.summary.paid_count}`);

  if (ledger2.b.summary.pending_dues === 0 && ledger2.b.summary.total_earned === (ledger1.b.summary.total_earned + topRecycler.offered_price)) {
    console.log('\n✅ DYNAMIC LEDGER TEST PASSED: State transitions and SQL aggregations are 100% verified!');
  } else {
    console.error('❌ Totals mismatch after status update!');
    process.exit(1);
  }
}

runDynamicTest().catch(console.error);

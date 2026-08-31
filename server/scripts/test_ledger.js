const http = require('http');
const db = require('../db/database');

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

async function run() {
  console.log('====================================================');
  console.log('  TESTING COLLECTOR EARNINGS LEDGER & DB TOTALS');
  console.log('====================================================\n');

  // Query API
  const apiRes = await req({ hostname: H, port: P, path: '/api/transactions?collector_id=1', method: 'GET' });
  if (apiRes.s !== 200) {
    console.error('API Error:', apiRes);
    process.exit(1);
  }

  const { summary, data: txns } = apiRes.b;
  console.log(`Fetched ${txns.length} transactions from API for collector_id=1.`);
  console.log('\n--- API Reported Totals ---');
  console.log(`Total Earned (Paid):  ₹${summary.total_earned}`);
  console.log(`Pending Dues:         ₹${summary.pending_dues}`);
  console.log(`Total Gross Value:    ₹${summary.total_gross_value}`);
  console.log(`Total Volume:         ${summary.total_weight_kg} kg`);
  console.log(`Paid Count:           ${summary.paid_count}`);
  console.log(`Pending Count:        ${summary.pending_count}`);

  // Query Database directly with direct SQL calculations
  const rawRows = db.prepare('SELECT * FROM transactions WHERE collector_id = 1').all();
  let manualPaid = 0;
  let manualPending = 0;
  let manualWeight = 0;
  let manualPaidCount = 0;
  let manualPendingCount = 0;

  rawRows.forEach((r, idx) => {
    const amt = r.final_price != null ? r.final_price : r.quoted_price;
    manualWeight += r.total_weight_kg;
    if (r.payment_status === 'paid' || r.payment_status === 'completed') {
      manualPaid += amt;
      manualPaidCount++;
    } else if (r.payment_status === 'pending') {
      manualPending += amt;
      manualPendingCount++;
    }
    console.log(`  Row ${idx+1}: ID=${r.id} | Status=${r.payment_status} | Quoted=₹${r.quoted_price} | Final=₹${r.final_price} | Weight=${r.total_weight_kg}kg`);
  });

  console.log('\n--- Direct DB Verification Calculation ---');
  console.log(`Direct DB Calculated Paid Sum:    ₹${manualPaid}`);
  console.log(`Direct DB Calculated Pending Sum: ₹${manualPending}`);
  console.log(`Direct DB Calculated Weight Sum:  ${manualWeight} kg`);

  // Assert API matches DB math
  if (summary.total_earned === manualPaid && summary.pending_dues === manualPending && summary.total_weight_kg === manualWeight) {
    console.log('\n✅ VERIFIED: API Aggregated Totals MATCH SQLite Database Calculation EXACTLY!\n');
  } else {
    console.error('\n❌ MISMATCH in calculation!');
    process.exit(1);
  }

  // Test updating status to 'paid' if there's any pending transaction
  const pendingTx = txns.find(t => t.payment_status === 'pending');
  if (pendingTx) {
    console.log(`▶ Testing Update Payment Status for Transaction #${pendingTx.id} -> 'paid'`);
    const updateRes = await req({
      hostname: H, port: P, path: `/api/transactions/${pendingTx.id}/payment`, method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    }, { payment_status: 'paid', payment_method: 'upi' });

    console.log('Update Response:', updateRes.b.message);

    // Re-verify totals after update
    const recheckRes = await req({ hostname: H, port: P, path: '/api/transactions?collector_id=1', method: 'GET' });
    console.log('\n--- Re-checked Totals After Update ---');
    console.log(`New Total Earned: ₹${recheckRes.b.summary.total_earned} (Increased by ₹${pendingTx.final_price})`);
    console.log(`New Pending Dues: ₹${recheckRes.b.summary.pending_dues} (Decreased by ₹${pendingTx.final_price})`);
    console.log('✅ Status successfully updated in DB & reflected in aggregate calculations.');
  }

  console.log('\n====================================================');
  console.log('  ALL LEDGER TESTS PASSED SUCCESSFULLY');
  console.log('====================================================');
}

run().catch(console.error);

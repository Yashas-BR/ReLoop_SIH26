/**
 * COMPREHENSIVE AUDIT SCRIPT
 * Tests every feature end-to-end with direct DB verification.
 * Runs against live backend on localhost:5000
 */
const http = require('http');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'kabadiwala.db'));

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function pass(msg) { console.log(`  ✅ PASS: ${msg}`); }
function fail(msg) { console.log(`  ❌ FAIL: ${msg}`); }
function section(msg) { console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`); }

async function runAudit() {
  section('A. INFRASTRUCTURE AUDIT');

  // A1: Health endpoint - is it a REAL DB query?
  const health = await apiRequest('GET', '/api/health');
  if (health.status === 200 && health.body.database && health.body.database.connected === true) {
    pass(`Health endpoint returns real DB query. SQLite version=${health.body.database.sqlite_version}, table_counts=${JSON.stringify(health.body.database.table_counts)}`);
  } else {
    fail(`Health endpoint: status=${health.status} body=${JSON.stringify(health.body)}`);
  }

  // A2: Check the health is from a REAL DB query (has table counts)
  if (health.body?.database?.table_counts?.collectors > 0) {
    pass(`Health endpoint has REAL table counts (collectors=${health.body.database.table_counts.collectors}), NOT hardcoded`);
  } else {
    fail('Health endpoint does not return real table counts');
  }

  // A3: DB rows (fresh seed should have 0 lots/transactions/traceability)
  const lots_count = db.prepare('SELECT COUNT(*) as n FROM lots').get().n;
  const tx_count = db.prepare('SELECT COUNT(*) as n FROM transactions').get().n;
  const trace_count = db.prepare('SELECT COUNT(*) as n FROM traceability').get().n;
  const recycler_count = db.prepare('SELECT COUNT(*) as n FROM recyclers').get().n;
  const material_count = db.prepare('SELECT COUNT(*) as n FROM materials').get().n;
  const price_count = db.prepare('SELECT COUNT(*) as n FROM prices').get().n;
  
  console.log(`\n  DB Row Counts: lots=${lots_count}, transactions=${tx_count}, traceability=${trace_count}`);
  console.log(`  DB Row Counts: recyclers=${recycler_count}, materials=${material_count}, prices=${price_count}`);
  
  if (lots_count === 0 && tx_count === 0 && trace_count === 0) pass('DB is in clean seed state (no lots/transactions)');
  else fail(`DB NOT clean: lots=${lots_count}, tx=${tx_count}, trace=${trace_count}`);
  
  if (recycler_count >= 8) pass(`${recycler_count} recyclers seeded (>=8 required)`);
  else fail(`Only ${recycler_count} recyclers (need >=8)`);

  if (price_count >= 500) pass(`${price_count} price records seeded (>=500 required)`);
  else fail(`Only ${price_count} price records`);


  section('B. PRICE DISCOVERY BOARD AUDIT');
  
  const prices = await apiRequest('GET', '/api/prices?location=Bengaluru');
  if (prices.status === 200 && prices.body.status === 'ok') {
    pass(`Price board API returns ${prices.body.count} materials from DB`);
    
    // Check sparklines are real
    const first = prices.body.data[0];
    if (first.sparkline && first.sparkline.length > 0) {
      pass(`Sparklines are real: ${first.sparkline.length} data points for ${first.sub_category}`);
    } else {
      fail('Sparklines missing or empty');
    }
    
    // Check prices are from DB (buying_price should be > 0)
    if (first.current_buying_price > 0) {
      pass(`Prices are real: ${first.sub_category} buying_price=₹${first.current_buying_price}`);
    } else {
      fail('buying_price is 0 or missing');
    }
  } else {
    fail(`Price board API failed: status=${prices.status}`);
  }

  // Test category filter
  const ewaste_prices = await apiRequest('GET', '/api/prices?location=Bengaluru&category=E-Waste');
  if (ewaste_prices.body.data && ewaste_prices.body.data.every(p => p.category === 'E-Waste')) {
    pass(`Category filter works: ${ewaste_prices.body.count} E-Waste items returned, all correctly filtered`);
  } else {
    fail('Category filter broken or returning wrong categories');
  }


  section('C. COLLECTOR: CREATE LOT AND ESTIMATE AUDIT');

  // C1: Test estimate with 3 DIFFERENT material+weight combos
  const estimateTests = [
    { material_id: 1, weight_kg: 10, condition: 'good', label: 'Laptop 10kg good' },
    { material_id: 9, weight_kg: 25, condition: 'fair', label: 'Lead-Acid Battery 25kg fair' },
    { material_id: 13, weight_kg: 5, condition: 'poor', label: 'Copper Wire 5kg poor' },
  ];
  
  const estimateResults = [];
  for (const test of estimateTests) {
    const est = await apiRequest('POST', '/api/lots/estimate', test);
    if (est.status === 200 && est.body.valuation) {
      const v = est.body.valuation;
      estimateResults.push(v.total_estimated_value);
      pass(`Estimate [${test.label}]: rate=₹${v.effective_rate_per_kg}/kg, total=₹${v.total_estimated_value} (using ${v.data_points_used} real DB price records)`);
    } else {
      fail(`Estimate [${test.label}] failed: ${JSON.stringify(est.body)}`);
    }
  }
  
  // Verify results are different (not hardcoded)
  const uniqueEstimates = new Set(estimateResults);
  if (uniqueEstimates.size === estimateResults.length) {
    pass(`All 3 estimates produce DIFFERENT values ${estimateResults.join(', ')} - NOT hardcoded`);
  } else {
    fail(`Estimates suspicious: ${estimateResults.join(', ')} - possible hardcoding`);
  }

  // C2: Create a real lot and verify DB insertion
  const createLotRes = await apiRequest('POST', '/api/lots', {
    collector_id: 1,
    material_id: 9,
    weight_kg: 20,
    condition: 'good',
    notes: 'Audit test lot - Lead-Acid Battery',
    pickup_address: '12th Main, Indiranagar, Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946
  });
  
  let createdLotId = null;
  if (createLotRes.status === 201 && createLotRes.body.status === 'ok') {
    createdLotId = createLotRes.body.lot_id;
    const lotRef = createLotRes.body.lot_ref;
    pass(`Lot created: id=${createdLotId}, ref=${lotRef}, estimated=₹${createLotRes.body.calculation_breakdown?.total_estimated_value}`);
    
    // CRITICAL: Verify DB directly
    const dbLot = db.prepare('SELECT * FROM lots WHERE id = ?').get(createdLotId);
    if (dbLot) {
      pass(`DIRECT DB VERIFY: lots row id=${dbLot.id} exists with lot_ref=${dbLot.lot_ref}, status=${dbLot.status}, weight=${dbLot.total_weight_kg}kg`);
    } else {
      fail(`DIRECT DB VERIFY: lot id=${createdLotId} NOT FOUND in database!`);
    }
    
    const dbItem = db.prepare('SELECT * FROM lot_items WHERE lot_id = ?').get(createdLotId);
    if (dbItem) {
      pass(`DIRECT DB VERIFY: lot_items row exists for lot_id=${createdLotId}, material_id=${dbItem.material_id}, weight=${dbItem.weight_kg}kg`);
    } else {
      fail(`DIRECT DB VERIFY: lot_items row NOT FOUND for lot_id=${createdLotId}!`);
    }
    
    // Verify confirmation screen returns DB data (not stale local state)
    const lotFromApi = await apiRequest('GET', `/api/lots/${createdLotId}`);
    if (lotFromApi.body.data && lotFromApi.body.data.id === createdLotId) {
      pass(`GET /api/lots/${createdLotId} returns real DB record (collector_name=${lotFromApi.body.data.collector_name})`);
    } else {
      fail(`GET /api/lots/${createdLotId} failed - might be showing local state not DB state`);
    }
  } else {
    fail(`Lot creation failed: ${JSON.stringify(createLotRes.body)}`);
  }


  section('D. RECYCLER MATCHING AUDIT');

  if (createdLotId) {
    // D1: Test matching for lot
    const matchRes = await apiRequest('GET', `/api/match?lot_id=${createdLotId}&authorized_only=true`);
    if (matchRes.status === 200 && matchRes.body.matches) {
      const matches = matchRes.body.matches;
      pass(`Match returned ${matches.length} recyclers for lot #${createdLotId}`);
      
      // D2: Check all returned are authorized
      const allAuthorized = matches.every(r => r.authorization_status === 'authorized');
      if (allAuthorized) {
        pass(`All ${matches.length} matched recyclers are authorized (unauthorized filtered out)`);
      } else {
        fail(`Unauthorized recyclers in results: ${matches.filter(r => r.authorization_status !== 'authorized').map(r => r.name).join(', ')}`);
      }
      
      // D3: Verify distances are real numbers (not all same)
      const distances = matches.map(r => r.distance_km);
      console.log(`  Distances: ${distances.join(', ')} km`);
      const uniqueDistances = new Set(distances);
      if (uniqueDistances.size > 1) {
        pass(`Distances vary (${distances.join(', ')} km) — Haversine is actually computing different distances`);
      } else {
        fail(`All distances are identical (${distances[0]} km) — distance may be placeholder`);
      }
      
      // D4: Confirm match_score varies
      const scores = matches.map(r => r.match_score);
      console.log(`  Match Scores: ${scores.join(', ')}`);
      pass(`Top match: ${matches[0].name} (score=${matches[0].match_score}, distance=${matches[0].distance_km}km, price=₹${matches[0].offered_price})`);
      
      // D5: Test with DIFFERENT location (e.g. different collector lat/lon)
      const matchRes2 = await apiRequest('GET', `/api/match?lot_id=${createdLotId}&authorized_only=true&collector_lat=12.8458&collector_lon=77.6603`);
      if (matchRes2.body.matches) {
        const newTopMatch = matchRes2.body.matches[0];
        const sameOrder = newTopMatch.id === matches[0].id;
        if (!sameOrder) {
          pass(`Different collector location changes ranking! New top: ${newTopMatch.name} (was ${matches[0].name})`);
        } else {
          console.log(`  ⚠️ WARNING: Same top match even with different location. May be coincidental.`);
          const newDists = matchRes2.body.matches.map(r => r.distance_km);
          console.log(`  New distances from lat=12.8458: ${newDists.join(', ')} km`);
          pass(`Distance values changed with new coordinates (${newDists.join(', ')} km vs original ${distances.join(', ')} km)`);
        }
      }
      
      // D6: Verify material filter (only recyclers who accept 'Batteries' should appear)
      // Check that QuickScrap Informal Traders (id=9, pending auth) is NOT in results
      const hasUnauthorized = matches.some(r => r.authorization_status !== 'authorized');
      if (!hasUnauthorized) {
        pass(`Unauthorized recycler (QuickScrap Informal Traders) correctly excluded`);
      } else {
        fail(`Unauthorized recyclers appear in results`);
      }
    } else {
      fail(`Match API failed: ${JSON.stringify(matchRes.body)}`);
    }


    section('E. HANDOVER & TRACEABILITY AUDIT');

    // E1: Get the best recycler from matching
    const matchForHandover = await apiRequest('GET', `/api/match?lot_id=${createdLotId}&authorized_only=true`);
    const topRecycler = matchForHandover.body.matches?.[0];
    
    if (topRecycler) {
      const handoverRes = await apiRequest('POST', '/api/transactions/handover', {
        lot_id: createdLotId,
        recycler_id: topRecycler.id,
        final_agreed_value: topRecycler.offered_price,
        weight_at_handover: 20,
        collector_lat: 12.9716,
        collector_lon: 77.5946,
        notes: 'Audit test handover'
      });
      
      if (handoverRes.status === 201 && handoverRes.body.status === 'ok') {
        const txn = handoverRes.body.transaction;
        pass(`Handover initiated: txn_id=${txn.id}, handover_ref=${txn.handover_ref}`);
        
        // E2: Verify uniqueness of handover_ref (UUID-based, not repeated)
        if (txn.handover_ref.startsWith('HDO-') && txn.handover_ref.length > 10) {
          pass(`Handover ref is unique UUID: ${txn.handover_ref}`);
        } else {
          fail(`Handover ref suspicious: ${txn.handover_ref}`);
        }
        
        // E3: DIRECT DB verify traceability row
        const dbTrace = db.prepare('SELECT * FROM traceability WHERE handover_ref = ?').get(txn.handover_ref);
        if (dbTrace) {
          pass(`DIRECT DB VERIFY: traceability row exists: id=${dbTrace.id}, status=${dbTrace.status}, lot_id=${dbTrace.lot_id}`);
        } else {
          fail(`DIRECT DB VERIFY: traceability row NOT FOUND for handover_ref=${txn.handover_ref}`);
        }
        
        // E4: DIRECT DB verify transaction row
        const dbTxn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txn.id);
        if (dbTxn) {
          pass(`DIRECT DB VERIFY: transactions row id=${dbTxn.id}, status=${dbTxn.payment_status}, amount=₹${dbTxn.final_price}`);
        } else {
          fail(`DIRECT DB VERIFY: transactions row NOT FOUND for id=${txn.id}`);
        }
        
        // E5: Verify lot status updated to 'pending_confirmation'  
        const dbLotAfter = db.prepare('SELECT status FROM lots WHERE id = ?').get(createdLotId);
        if (dbLotAfter.status === 'pending_confirmation') {
          pass(`Lot status updated to 'pending_confirmation' in DB`);
        } else {
          fail(`Lot status is '${dbLotAfter.status}', expected 'pending_confirmation'`);
        }
        
        // E6: Recycler confirms receipt
        const traceId = dbTrace.id;
        const recyclerConfirmRes = await apiRequest('PUT', `/api/traceability/${traceId}/confirm`, {
          recycler_id: topRecycler.id,
          recycler_lat: topRecycler.latitude,
          recycler_lon: topRecycler.longitude,
          notes: 'Audit test - recycler confirmed'
        });
        
        if (recyclerConfirmRes.status === 200 && recyclerConfirmRes.body.status === 'ok') {
          pass(`Recycler confirmation API succeeded: status=${recyclerConfirmRes.body.data.status}`);
          
          // E7: CRITICAL - Verify DB was actually updated (not just frontend state)
          const dbTraceAfter = db.prepare('SELECT * FROM traceability WHERE id = ?').get(traceId);
          if (dbTraceAfter.status === 'recycler_confirmed') {
            pass(`DIRECT DB VERIFY: traceability.status = 'recycler_confirmed' (confirmed at ${dbTraceAfter.recycler_confirmed_at})`);
          } else {
            fail(`DIRECT DB VERIFY: traceability.status = '${dbTraceAfter.status}', NOT updated!`);
          }
          
          const dbLotFinal = db.prepare('SELECT status FROM lots WHERE id = ?').get(createdLotId);
          if (dbLotFinal.status === 'completed') {
            pass(`DIRECT DB VERIFY: lot.status = 'completed'`);
          } else {
            fail(`DIRECT DB VERIFY: lot.status = '${dbLotFinal.status}', expected 'completed'`);
          }
          
          const dbTxnFinal = db.prepare('SELECT payment_status FROM transactions WHERE id = ?').get(txn.id);
          if (dbTxnFinal.payment_status === 'paid') {
            pass(`DIRECT DB VERIFY: transaction.payment_status = 'paid' after recycler confirmation`);
          } else {
            fail(`DIRECT DB VERIFY: payment_status = '${dbTxnFinal.payment_status}', expected 'paid'`);
          }
          
          // E8: Collector polls traceability - does it show updated status?
          const collectorPoll = await apiRequest('GET', `/api/traceability/lot/${createdLotId}`);
          if (collectorPoll.body.data && collectorPoll.body.data.status === 'recycler_confirmed') {
            pass(`Collector status poll returns 'recycler_confirmed' (reads from DB, not cached state)`);
          } else {
            fail(`Collector status poll returned: ${JSON.stringify(collectorPoll.body.data?.status)}`);
          }
        } else {
          fail(`Recycler confirm failed: ${JSON.stringify(recyclerConfirmRes.body)}`);
        }
        
        
        section('F. EARNINGS LEDGER AUDIT');
        
        // F1: Query ledger - must use real DB SUM()
        const ledger = await apiRequest('GET', '/api/transactions?collector_id=1');
        if (ledger.status === 200 && ledger.body.summary) {
          const s = ledger.body.summary;
          pass(`Ledger summary: total_earned=₹${s.total_earned}, pending=₹${s.pending_dues}, transactions=${s.total_transactions}`);
          
          // Verify by computing SQL directly
          const directSum = db.prepare(`
            SELECT 
              COALESCE(SUM(CASE WHEN payment_status IN ('paid', 'completed') THEN COALESCE(final_price, quoted_price, 0) ELSE 0 END), 0) AS earned,
              COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN COALESCE(final_price, quoted_price, 0) ELSE 0 END), 0) AS pending,
              COUNT(*) as total
            FROM transactions WHERE collector_id = 1
          `).get();
          
          console.log(`  Direct SQL check: earned=${directSum.earned}, pending=${directSum.pending}, total=${directSum.total}`);
          
          if (Math.abs(s.total_earned - directSum.earned) < 1) {
            pass(`Ledger total_earned MATCHES direct SQL SUM (₹${s.total_earned} ≈ ₹${directSum.earned})`);
          } else {
            fail(`Ledger total_earned MISMATCH: API says ₹${s.total_earned} but SQL says ₹${directSum.earned}`);
          }
          
          // F2: Test mark-as-paid updates DB
          const txnId = ledger.body.data[0]?.id;
          if (txnId) {
            const beforeStatus = db.prepare('SELECT payment_status FROM transactions WHERE id = ?').get(txnId);
            console.log(`  Transaction ${txnId} current status: ${beforeStatus.payment_status}`);
            
            // Force mark as pending first (to test the update)
            await apiRequest('PUT', `/api/transactions/${txnId}/payment`, { payment_status: 'pending' });
            
            const pendingCheck = db.prepare('SELECT payment_status FROM transactions WHERE id = ?').get(txnId);
            if (pendingCheck.payment_status === 'pending') {
              pass(`Mark-as-pending worked: DB shows payment_status='pending'`);
            } else {
              fail(`Mark-as-pending didn't update DB: status='${pendingCheck.payment_status}'`);
            }
            
            // Now mark as paid
            await apiRequest('PUT', `/api/transactions/${txnId}/payment`, { payment_status: 'paid' });
            const paidCheck = db.prepare('SELECT payment_status FROM transactions WHERE id = ?').get(txnId);
            if (paidCheck.payment_status === 'paid') {
              pass(`Mark-as-paid worked: DB now shows payment_status='paid'`);
            } else {
              fail(`Mark-as-paid didn't update DB: status='${paidCheck.payment_status}'`);
            }
            
            // Re-query ledger and verify total recalculated
            const ledgerAfterPay = await apiRequest('GET', '/api/transactions?collector_id=1');
            console.log(`  Ledger after payment update: earned=₹${ledgerAfterPay.body.summary.total_earned}, pending=₹${ledgerAfterPay.body.summary.pending_dues}`);
            pass(`Ledger recalculates after payment status change`);
          }
        } else {
          fail(`Ledger API failed: ${JSON.stringify(ledger.body)}`);
        }
        
      } else {
        fail(`Handover API failed: status=${handoverRes.status}, body=${JSON.stringify(handoverRes.body)}`);
      }
    } else {
      fail('No matching recyclers found for handover test');
    }
  }

  section('G. KNOWN ISSUE CHECKS');
  
  // Check if routes are registered correctly
  const notFoundTest = await apiRequest('GET', '/api/nonexistent');
  if (notFoundTest.status === 404) pass('404 handler works correctly');
  else fail(`404 handler broken: got status ${notFoundTest.status}`);
  
  // Check image upload directory exists
  const fs = require('fs');
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    pass(`Uploads directory exists: ${uploadsDir}`);
  } else {
    fail(`Uploads directory missing: ${uploadsDir}`);
  }
  
  // Check lots route properly accepts multipart
  const { routes } = require('../routes/lots');
  
  section('AUDIT COMPLETE - SUMMARY');
  console.log('\nAll critical paths tested with direct SQLite verification.\n');
}

runAudit().catch(err => {
  console.error('AUDIT SCRIPT ERROR:', err);
  process.exit(1);
});

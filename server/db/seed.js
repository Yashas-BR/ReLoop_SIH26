/**
 * seed.js — Kabadiwala Connect Demo Seed Script
 *
 * Usage:
 *   node db/seed.js           # Full reset + seed (wipes all existing data first)
 *   node db/seed.js --dry-run # Show what would be inserted without writing
 *
 * Safe to re-run: deletes all transactional data and re-seeds from scratch.
 * Migration tables (schema) are preserved — only data rows are wiped.
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const db = require('./database');
const { initializeDatabase } = require('./migrate');

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Seeder Utility ───────────────────────────────────────────────────────────

/** Generate a date string N days ago from today */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Realistic price walk: starts at `base`, applies a daily random walk
 * with drift and mean-reversion so prices look like real commodity data.
 *
 * @param {number} base     Starting price
 * @param {number} days     Number of days to generate (oldest → newest)
 * @param {number} sigma    Daily std-dev as fraction of base (e.g. 0.03 = 3%)
 * @param {number} drift    Daily expected drift (e.g. 0.001 = slight uptrend)
 * @param {number} meanRev  Mean-reversion strength [0..1] (0 = pure walk)
 * @returns {number[]}      Array of prices, oldest first
 */
function priceWalk(base, days, sigma = 0.025, drift = 0, meanRev = 0.08) {
  const prices = [];
  let p = base;
  for (let i = 0; i < days; i++) {
    // Box-Muller normal random
    const u1 = Math.random(), u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
    const reversion = meanRev * (base - p);
    p = p * (1 + drift + sigma * z) + reversion;
    p = Math.max(p, base * 0.5); // floor at 50% of base
    prices.push(Math.round(p));
  }
  return prices;
}

/** Compute overall trend label from a price series */
function trendLabel(prices) {
  if (prices.length < 2) return 'stable';
  const first = prices.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
  const last  = prices.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const pct   = (last - first) / first;
  if (pct > 0.03)  return 'rising';
  if (pct < -0.03) return 'falling';
  return 'stable';
}

// ─── Data Definitions ─────────────────────────────────────────────────────────

const COLLECTORS = [
  { name: 'Raju Kabadiwal',   phone: '9876543210', preferred_language: 'hi', operating_location: 'Bengaluru',  latitude: 12.9716, longitude: 77.5946, verified: 1 },
  { name: 'Meena Devi',       phone: '9765432109', preferred_language: 'kn', operating_location: 'Bengaluru',  latitude: 12.9352, longitude: 77.6245, verified: 1 },
  { name: 'Suresh Kumar',     phone: '9654321098', preferred_language: 'en', operating_location: 'Bengaluru',  latitude: 13.0358, longitude: 77.5970, verified: 0 },
  { name: 'Ramakrishna Rao',  phone: '9543210987', preferred_language: 'te', operating_location: 'Chennai',    latitude: 13.0827, longitude: 80.2707, verified: 1 },
  { name: 'Fatima Shaikh',    phone: '9432109876', preferred_language: 'hi', operating_location: 'Mumbai',     latitude: 19.0760, longitude: 72.8777, verified: 1 },
];

// 9 recyclers across Bengaluru (5), Mumbai (2), Chennai (2)
// One explicitly NOT authorized (id index 7 = "QuickScrap Informal Traders")
const RECYCLERS = [
  // ── BENGALURU ─────────────────────────────────────────────────────────────
  {
    name: 'GreenCycle India Pvt Ltd',
    contact_person: 'Amit Sharma',
    phone: '9900112233', email: 'contact@greencycle.in',
    address: 'Plot 45, KIADB Industrial Area, Peenya',
    city: 'Bengaluru', state: 'Karnataka',
    latitude: 13.0280, longitude: 77.5198,
    service_radius_km: 25,
    materials_accepted: JSON.stringify(['E-Waste', 'Batteries', 'Metals', 'PCBs']),
    authorization_status: 'authorized',
    authorization_number: 'KSPCB/EWM/2024/001',
    offered_rate_modifier: 0.95,
    pickup_available: 1, min_pickup_weight_kg: 5,
    rating: 4.7, total_transactions: 124,
  },
  {
    name: 'EcoReclaim Systems',
    contact_person: 'Priya Nair',
    phone: '9811223344', email: 'info@ecoreclaim.co.in',
    address: '12/A, Electronic City Phase 1',
    city: 'Bengaluru', state: 'Karnataka',
    latitude: 12.8458, longitude: 77.6603,
    service_radius_km: 30,
    materials_accepted: JSON.stringify(['E-Waste', 'Plastics', 'Paper', 'LCD Panels', 'Cables']),
    authorization_status: 'authorized',
    authorization_number: 'KSPCB/EWM/2024/002',
    offered_rate_modifier: 0.97,
    pickup_available: 1, min_pickup_weight_kg: 2,
    rating: 4.5, total_transactions: 89,
  },
  {
    name: 'MetalMart Recyclers',
    contact_person: 'Venkat Rao',
    phone: '9722334455', email: 'ops@metalmart.in',
    address: 'Survey No. 78, Whitefield Industrial Zone',
    city: 'Bengaluru', state: 'Karnataka',
    latitude: 12.9698, longitude: 77.7499,
    service_radius_km: 20,
    materials_accepted: JSON.stringify(['Metals', 'Copper Wire', 'Cables', 'Motors & Magnets', 'Steel Scrap']),
    authorization_status: 'authorized',
    authorization_number: 'KSPCB/MWM/2024/003',
    offered_rate_modifier: 0.98,
    pickup_available: 0, min_pickup_weight_kg: 10,
    rating: 4.2, total_transactions: 211,
  },
  {
    name: 'SafeDispose e-Waste Hub',
    contact_person: 'Kavitha B',
    phone: '9633445566', email: 'hello@safedispose.in',
    address: '3rd Floor, Innovator Building, Koramangala 5th Block',
    city: 'Bengaluru', state: 'Karnataka',
    latitude: 12.9279, longitude: 77.6271,
    service_radius_km: 15,
    materials_accepted: JSON.stringify(['E-Waste', 'Batteries', 'Mobiles', 'Computers', 'PCBs', 'LCD Panels']),
    authorization_status: 'authorized',
    authorization_number: 'KSPCB/EWM/2024/004',
    offered_rate_modifier: 0.93,
    pickup_available: 1, min_pickup_weight_kg: 1,
    rating: 4.8, total_transactions: 56,
  },
  {
    name: 'BatteryBack Solutions',
    contact_person: 'Harish Gowda',
    phone: '9544112288', email: 'recycling@batteryback.in',
    address: 'No. 14, 2nd Phase, Peenya Industrial Area',
    city: 'Bengaluru', state: 'Karnataka',
    latitude: 13.0322, longitude: 77.5173,
    service_radius_km: 22,
    materials_accepted: JSON.stringify(['Batteries', 'Lithium-Ion Battery', 'Lead-Acid Battery', 'E-Waste']),
    authorization_status: 'authorized',
    authorization_number: 'KSPCB/BWM/2024/006',
    offered_rate_modifier: 1.02, // pays slightly above market for batteries
    pickup_available: 1, min_pickup_weight_kg: 3,
    rating: 4.6, total_transactions: 73,
  },

  // ── MUMBAI ────────────────────────────────────────────────────────────────
  {
    name: 'Dharavi Recycling Co-op',
    contact_person: 'Salim Ansari',
    phone: '9122334455', email: 'coop@dharavirecycle.in',
    address: '90-Feet Road, Dharavi Industrial Area, Sion',
    city: 'Mumbai', state: 'Maharashtra',
    latitude: 19.0422, longitude: 72.8538,
    service_radius_km: 35,
    materials_accepted: JSON.stringify(['Plastics', 'Paper', 'Metals', 'Cables', 'Mixed Plastics']),
    authorization_status: 'authorized',
    authorization_number: 'MPCB/BMW/2023/041',
    offered_rate_modifier: 0.96,
    pickup_available: 1, min_pickup_weight_kg: 5,
    rating: 4.3, total_transactions: 318,
  },
  {
    name: 'TechWaste Mumbai Pvt Ltd',
    contact_person: 'Neha Kulkarni',
    phone: '9211445566', email: 'ops@techwastemumbai.in',
    address: 'Unit 7, Bhandup Industrial Estate, Bhandup (W)',
    city: 'Mumbai', state: 'Maharashtra',
    latitude: 19.1593, longitude: 72.9257,
    service_radius_km: 28,
    materials_accepted: JSON.stringify(['E-Waste', 'PCBs', 'LCD Panels', 'Cables', 'Motors & Magnets', 'Batteries']),
    authorization_status: 'authorized',
    authorization_number: 'MPCB/EWM/2024/017',
    offered_rate_modifier: 0.94,
    pickup_available: 1, min_pickup_weight_kg: 4,
    rating: 4.4, total_transactions: 145,
  },

  // ── CHENNAI ───────────────────────────────────────────────────────────────
  {
    name: 'SRM E-Waste Handlers',
    contact_person: 'Karthikeyan R',
    phone: '9444556677', email: 'ewaste@srmrecyclers.co.in',
    address: 'Plot C-12, SIDCO Industrial Estate, Ambattur',
    city: 'Chennai', state: 'Tamil Nadu',
    latitude: 13.1135, longitude: 80.1653,
    service_radius_km: 30,
    materials_accepted: JSON.stringify(['E-Waste', 'PCBs', 'Batteries', 'LCD Panels', 'Motors & Magnets', 'Cables']),
    authorization_status: 'authorized',
    authorization_number: 'TNPCB/EWM/2024/088',
    offered_rate_modifier: 0.96,
    pickup_available: 1, min_pickup_weight_kg: 5,
    rating: 4.5, total_transactions: 99,
  },
  // ⚠️  DELIBERATELY NOT AUTHORIZED — for testing authorization filter
  {
    name: 'QuickScrap Informal Traders',
    contact_person: 'Murugan S',
    phone: '9555667788', email: null,
    address: '12, Old Market Road, Perambur',
    city: 'Chennai', state: 'Tamil Nadu',
    latitude: 13.1194, longitude: 80.2441,
    service_radius_km: 10,
    materials_accepted: JSON.stringify(['Metals', 'Plastics', 'Cables', 'E-Waste']),
    authorization_status: 'pending',  // ← NOT authorized; used for filter tests
    authorization_number: null,
    offered_rate_modifier: 1.05, // offers above market to attract collectors — red flag
    pickup_available: 1, min_pickup_weight_kg: 1,
    rating: 3.1, total_transactions: 12,
  },
];

/**
 * Extended material catalog.
 * We add 6 new categories the user specifically requested that aren't in
 * the original 21 rows (PCBs, Coaxial/Shielded Cables, HDD Motors/Magnets,
 * LCD Panels standalone, Neodymium Magnets, Mixed E-Scrap).
 * We keep the original 21 and extend on top — seed script checks for
 * existence before inserting to stay idempotent on the catalog.
 */
const EXTRA_MATERIALS = [
  // PCBs
  {
    category: 'PCBs', sub_category: 'Mixed PCB Scrap',
    description: 'Mixed printed circuit boards from computers, phones, appliances',
    image_ref: 'pcb_mixed.png', unit: 'kg', source_type: 'industrial', hazardous: 1,
    recoverable_materials: JSON.stringify(['gold', 'silver', 'copper', 'palladium', 'tantalum']),
  },
  {
    category: 'PCBs', sub_category: 'Server-Grade PCB',
    description: 'High-grade server and telecom board scrap — richer in precious metals',
    image_ref: 'pcb_server.png', unit: 'kg', source_type: 'institutional', hazardous: 1,
    recoverable_materials: JSON.stringify(['gold', 'silver', 'palladium', 'platinum', 'copper']),
  },
  // Cables
  {
    category: 'Cables', sub_category: 'Coaxial Cable',
    description: 'TV and RF coaxial cables — copper core with shielding',
    image_ref: 'cable_coax.png', unit: 'kg', source_type: 'household', hazardous: 0,
    recoverable_materials: JSON.stringify(['copper', 'aluminium', 'plastic']),
  },
  {
    category: 'Cables', sub_category: 'Power Cable Scrap',
    description: 'Stripped power cables, extension cords, armoured cables',
    image_ref: 'cable_power.png', unit: 'kg', source_type: 'industrial', hazardous: 0,
    recoverable_materials: JSON.stringify(['copper', 'PVC']),
  },
  // Motors & Magnets
  {
    category: 'Motors & Magnets', sub_category: 'AC Induction Motor',
    description: 'Small to medium AC motors from appliances and industrial equipment',
    image_ref: 'motor_ac.png', unit: 'kg', source_type: 'industrial', hazardous: 0,
    recoverable_materials: JSON.stringify(['copper', 'steel', 'aluminium']),
  },
  {
    category: 'Motors & Magnets', sub_category: 'Neodymium Magnet Scrap',
    description: 'NdFeB permanent magnets from HDDs, speakers, EV motors',
    image_ref: 'magnet_ndfeb.png', unit: 'kg', source_type: 'industrial', hazardous: 0,
    recoverable_materials: JSON.stringify(['neodymium', 'iron', 'boron', 'dysprosium']),
  },
  {
    category: 'Motors & Magnets', sub_category: 'Hard Drive Assembly',
    description: 'Complete HDDs including platters, motor, PCB — high value density',
    image_ref: 'hdd.png', unit: 'kg', source_type: 'institutional', hazardous: 1,
    recoverable_materials: JSON.stringify(['neodymium', 'aluminium', 'steel', 'gold', 'copper']),
  },
  // LCD Panels (standalone — more specific than LCD/LED Monitor)
  {
    category: 'LCD Panels', sub_category: 'LCD Panel (Small)',
    description: 'Laptop screens, tablet displays < 15 inch',
    image_ref: 'lcd_small.png', unit: 'kg', source_type: 'household', hazardous: 1,
    recoverable_materials: JSON.stringify(['indium', 'tin', 'copper', 'glass']),
  },
  {
    category: 'LCD Panels', sub_category: 'LCD Panel (Large)',
    description: 'Monitor and TV panels ≥ 24 inch',
    image_ref: 'lcd_large.png', unit: 'kg', source_type: 'household', hazardous: 1,
    recoverable_materials: JSON.stringify(['indium', 'tin', 'copper', 'aluminium', 'glass']),
  },
  // Mixed E-Scrap / general catch-all
  {
    category: 'Mixed E-Scrap', sub_category: 'Mixed Electronics Scrap',
    description: 'Unsorted mixed electronic waste — circuit boards, cables, components',
    image_ref: 'e_scrap_mixed.png', unit: 'kg', source_type: 'household', hazardous: 1,
    recoverable_materials: JSON.stringify(['copper', 'gold', 'silver', 'plastic']),
  },
];

/**
 * Price seed config for ALL material sub-categories we want 60-day history for.
 *
 * Each entry:
 *   sub_category   — must exactly match materials table
 *   basePrice      — approximate current buying price (INR/kg)
 *   sigma          — daily volatility (fraction, e.g. 0.03 = 3%)
 *   drift          — daily trend (positive = rising, negative = falling)
 *   meanRev        — mean reversion strength
 *   quoteMultiplier — quoted_price = buying_price * this (retail markup)
 *   location       — city label
 */
const PRICE_SEEDS = [
  // ── PCBs ─────────────────────────────────────────────────────────────────
  { sub_category: 'Mixed PCB Scrap',  basePrice: 450, sigma: 0.030, drift:  0.0008, meanRev: 0.06, quoteMultiplier: 1.12, location: 'Bengaluru' },
  { sub_category: 'Mixed PCB Scrap',  basePrice: 455, sigma: 0.028, drift:  0.0008, meanRev: 0.06, quoteMultiplier: 1.12, location: 'Mumbai'    },
  { sub_category: 'Mixed PCB Scrap',  basePrice: 440, sigma: 0.032, drift:  0.0007, meanRev: 0.06, quoteMultiplier: 1.12, location: 'Chennai'   },
  { sub_category: 'Server-Grade PCB', basePrice: 800, sigma: 0.025, drift:  0.0012, meanRev: 0.05, quoteMultiplier: 1.10, location: 'Bengaluru' },
  { sub_category: 'Server-Grade PCB', basePrice: 810, sigma: 0.022, drift:  0.0012, meanRev: 0.05, quoteMultiplier: 1.10, location: 'Mumbai'    },

  // ── Cables ───────────────────────────────────────────────────────────────
  { sub_category: 'Copper Wire',      basePrice: 480, sigma: 0.020, drift:  0.0005, meanRev: 0.10, quoteMultiplier: 1.08, location: 'Bengaluru' },
  { sub_category: 'Copper Wire',      basePrice: 490, sigma: 0.020, drift:  0.0005, meanRev: 0.10, quoteMultiplier: 1.08, location: 'Mumbai'    },
  { sub_category: 'Coaxial Cable',    basePrice: 120, sigma: 0.018, drift:  0.0002, meanRev: 0.08, quoteMultiplier: 1.10, location: 'Bengaluru' },
  { sub_category: 'Power Cable Scrap',basePrice: 300, sigma: 0.022, drift:  0.0004, meanRev: 0.09, quoteMultiplier: 1.09, location: 'Bengaluru' },
  { sub_category: 'Power Cable Scrap',basePrice: 305, sigma: 0.022, drift:  0.0004, meanRev: 0.09, quoteMultiplier: 1.09, location: 'Mumbai'    },

  // ── Batteries ────────────────────────────────────────────────────────────
  { sub_category: 'Lithium-Ion Battery', basePrice: 120, sigma: 0.035, drift:  0.0015, meanRev: 0.07, quoteMultiplier: 1.14, location: 'Bengaluru' },
  { sub_category: 'Lithium-Ion Battery', basePrice: 125, sigma: 0.035, drift:  0.0015, meanRev: 0.07, quoteMultiplier: 1.14, location: 'Mumbai'    },
  { sub_category: 'Lithium-Ion Battery', basePrice: 118, sigma: 0.037, drift:  0.0015, meanRev: 0.07, quoteMultiplier: 1.14, location: 'Chennai'   },
  { sub_category: 'Lead-Acid Battery',   basePrice:  90, sigma: 0.015, drift: -0.0003, meanRev: 0.12, quoteMultiplier: 1.10, location: 'Bengaluru' },
  { sub_category: 'Lead-Acid Battery',   basePrice:  92, sigma: 0.015, drift: -0.0003, meanRev: 0.12, quoteMultiplier: 1.10, location: 'Mumbai'    },

  // ── Motors & Magnets ─────────────────────────────────────────────────────
  { sub_category: 'AC Induction Motor',     basePrice: 55, sigma: 0.018, drift: 0.0003, meanRev: 0.10, quoteMultiplier: 1.12, location: 'Bengaluru' },
  { sub_category: 'Neodymium Magnet Scrap', basePrice: 1200, sigma: 0.040, drift: 0.0020, meanRev: 0.05, quoteMultiplier: 1.08, location: 'Bengaluru' },
  { sub_category: 'Neodymium Magnet Scrap', basePrice: 1210, sigma: 0.038, drift: 0.0020, meanRev: 0.05, quoteMultiplier: 1.08, location: 'Mumbai'    },
  { sub_category: 'Hard Drive Assembly',    basePrice: 280, sigma: 0.028, drift: 0.0010, meanRev: 0.06, quoteMultiplier: 1.12, location: 'Bengaluru' },
  { sub_category: 'Hard Drive Assembly',    basePrice: 275, sigma: 0.028, drift: 0.0010, meanRev: 0.06, quoteMultiplier: 1.12, location: 'Chennai'   },

  // ── LCD Panels ───────────────────────────────────────────────────────────
  { sub_category: 'LCD Panel (Small)', basePrice:  65, sigma: 0.022, drift: -0.0005, meanRev: 0.08, quoteMultiplier: 1.12, location: 'Bengaluru' },
  { sub_category: 'LCD Panel (Small)', basePrice:  68, sigma: 0.022, drift: -0.0005, meanRev: 0.08, quoteMultiplier: 1.12, location: 'Mumbai'    },
  { sub_category: 'LCD Panel (Large)', basePrice:  80, sigma: 0.020, drift: -0.0004, meanRev: 0.08, quoteMultiplier: 1.11, location: 'Bengaluru' },
  { sub_category: 'LCD Panel (Large)', basePrice:  82, sigma: 0.020, drift: -0.0004, meanRev: 0.08, quoteMultiplier: 1.11, location: 'Chennai'   },

  // ── Mixed Plastics ───────────────────────────────────────────────────────
  { sub_category: 'Mixed Plastic',     basePrice:   8, sigma: 0.028, drift: -0.0008, meanRev: 0.15, quoteMultiplier: 1.18, location: 'Bengaluru' },
  { sub_category: 'Mixed Plastic',     basePrice:   9, sigma: 0.028, drift: -0.0008, meanRev: 0.15, quoteMultiplier: 1.18, location: 'Mumbai'    },
  { sub_category: 'Mixed Electronics Scrap', basePrice:  90, sigma: 0.025, drift:  0.0005, meanRev: 0.10, quoteMultiplier: 1.13, location: 'Bengaluru' },

  // ── Other key materials (shorter history, Bengaluru only) ─────────────────
  { sub_category: 'Laptop',           basePrice: 200, sigma: 0.022, drift:  0.0006, meanRev: 0.08, quoteMultiplier: 1.10, location: 'Bengaluru' },
  { sub_category: 'Mobile Phone',     basePrice: 300, sigma: 0.025, drift:  0.0008, meanRev: 0.07, quoteMultiplier: 1.10, location: 'Bengaluru' },
  { sub_category: 'Aluminium Scrap',  basePrice:  90, sigma: 0.018, drift:  0.0002, meanRev: 0.10, quoteMultiplier: 1.11, location: 'Bengaluru' },
];

const HISTORY_DAYS = 60; // Generate 60 days of price history per seed entry

// ─── Main Seed Function ───────────────────────────────────────────────────────

function seed() {
  console.log('\n🌱  Kabadiwala Connect — Demo Seed Script');
  console.log('══════════════════════════════════════════');
  if (DRY_RUN) console.log('⚠️   DRY RUN — no data will be written\n');

  // ── 1. Ensure schema is up to date ─────────────────────────────────────────
  console.log('📐  Running schema migration...');
  if (!DRY_RUN) initializeDatabase();
  console.log('    ✓ Schema ready\n');

  // ── 2. Wipe all data tables (preserve schema) ──────────────────────────────
  const WIPE_ORDER = [
    'traceability', 'transactions', 'lot_items', 'lots',
    'prices', 'materials', 'recyclers', 'collectors',
  ];
  console.log('🗑️   Clearing existing data...');
  if (!DRY_RUN) {
    db.exec('PRAGMA foreign_keys = OFF');
    const wipe = db.transaction(() => {
      WIPE_ORDER.forEach(t => {
        const n = db.prepare(`DELETE FROM ${t}`).run().changes;
        console.log(`    Deleted ${n} rows from ${t}`);
      });
      // Reset auto-increment counters
      WIPE_ORDER.forEach(t => db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(t));
    });
    wipe();
    db.exec('PRAGMA foreign_keys = ON');
  }
  console.log('    ✓ Wipe complete\n');

  // ── 3. Insert Collectors ───────────────────────────────────────────────────
  console.log(`👤  Inserting ${COLLECTORS.length} collectors...`);
  const stmtCollector = db.prepare(`
    INSERT INTO collectors (name, phone, preferred_language, operating_location, latitude, longitude, verified)
    VALUES (@name, @phone, @preferred_language, @operating_location, @latitude, @longitude, @verified)
  `);
  let collectorIds = {};
  if (!DRY_RUN) {
    COLLECTORS.forEach(c => {
      const r = stmtCollector.run(c);
      collectorIds[c.name] = r.lastInsertRowid;
    });
  }
  console.log('    ✓ Collectors inserted\n');

  // ── 4. Insert Recyclers ────────────────────────────────────────────────────
  console.log(`🏭  Inserting ${RECYCLERS.length} recyclers...`);
  const stmtRecycler = db.prepare(`
    INSERT INTO recyclers (
      name, contact_person, phone, email, address, city, state,
      latitude, longitude, service_radius_km, materials_accepted,
      authorization_status, authorization_number, offered_rate_modifier,
      pickup_available, min_pickup_weight_kg, rating, total_transactions
    ) VALUES (
      @name, @contact_person, @phone, @email, @address, @city, @state,
      @latitude, @longitude, @service_radius_km, @materials_accepted,
      @authorization_status, @authorization_number, @offered_rate_modifier,
      @pickup_available, @min_pickup_weight_kg, @rating, @total_transactions
    )
  `);
  if (!DRY_RUN) {
    RECYCLERS.forEach(r => stmtRecycler.run(r));
  }
  console.log('    ✓ Recyclers inserted\n');

  // ── 5. Insert Materials ────────────────────────────────────────────────────
  // First insert existing 21 catalog items, then add the new extended ones
  const ORIGINAL_MATERIALS = [
    { category: 'E-Waste',   sub_category: 'Laptop',           description: 'Old laptops, notebooks, netbooks',             image_ref: 'laptop.png',       unit: 'kg', source_type: 'household',    hazardous: 1, recoverable_materials: JSON.stringify(['gold','silver','copper','palladium']) },
    { category: 'E-Waste',   sub_category: 'Mobile Phone',     description: 'Smartphones, feature phones, tablets',         image_ref: 'mobile.png',       unit: 'kg', source_type: 'household',    hazardous: 1, recoverable_materials: JSON.stringify(['gold','silver','copper','cobalt','lithium']) },
    { category: 'E-Waste',   sub_category: 'CRT Monitor',      description: 'Old tube monitors and televisions',            image_ref: 'crt.png',          unit: 'kg', source_type: 'household',    hazardous: 1, recoverable_materials: JSON.stringify(['lead','copper','glass']) },
    { category: 'E-Waste',   sub_category: 'LCD/LED Monitor',  description: 'Flat panel displays and TVs',                  image_ref: 'lcd.png',          unit: 'kg', source_type: 'household',    hazardous: 1, recoverable_materials: JSON.stringify(['indium','copper','aluminium']) },
    { category: 'E-Waste',   sub_category: 'Desktop Computer', description: 'Desktop CPUs and towers',                      image_ref: 'desktop.png',      unit: 'kg', source_type: 'institutional',hazardous: 1, recoverable_materials: JSON.stringify(['gold','copper','aluminium','palladium']) },
    { category: 'E-Waste',   sub_category: 'Refrigerator',     description: 'Old fridges and freezers',                     image_ref: 'fridge.png',       unit: 'kg', source_type: 'household',    hazardous: 1, recoverable_materials: JSON.stringify(['steel','copper','aluminium','refrigerant']) },
    { category: 'E-Waste',   sub_category: 'Washing Machine',  description: 'Front/top load washing machines',              image_ref: 'washer.png',       unit: 'kg', source_type: 'household',    hazardous: 0, recoverable_materials: JSON.stringify(['steel','copper','plastic']) },
    { category: 'E-Waste',   sub_category: 'Printer',          description: 'Inkjet and laser printers',                    image_ref: 'printer.png',      unit: 'kg', source_type: 'institutional',hazardous: 1, recoverable_materials: JSON.stringify(['copper','plastic','steel']) },
    { category: 'Batteries', sub_category: 'Lithium-Ion Battery', description: 'Li-ion from laptops, phones, EVs',          image_ref: 'li_battery.png',   unit: 'kg', source_type: 'household',    hazardous: 1, recoverable_materials: JSON.stringify(['lithium','cobalt','nickel','manganese']) },
    { category: 'Batteries', sub_category: 'Lead-Acid Battery',   description: 'Car and inverter batteries',                image_ref: 'lead_battery.png', unit: 'kg', source_type: 'household',    hazardous: 1, recoverable_materials: JSON.stringify(['lead','sulphuric_acid','polypropylene']) },
    { category: 'Batteries', sub_category: 'NiMH Battery',        description: 'Rechargeable AA/AAA and camera batteries',  image_ref: 'nimh.png',         unit: 'kg', source_type: 'household',    hazardous: 1, recoverable_materials: JSON.stringify(['nickel','manganese','hydrogen']) },
    { category: 'Metals',    sub_category: 'Copper Wire',       description: 'Electrical wiring and cables',                image_ref: 'copper.png',       unit: 'kg', source_type: 'industrial',   hazardous: 0, recoverable_materials: JSON.stringify(['copper']) },
    { category: 'Metals',    sub_category: 'Aluminium Scrap',   description: 'Aluminium sheets, cans, profiles',            image_ref: 'aluminium.png',    unit: 'kg', source_type: 'industrial',   hazardous: 0, recoverable_materials: JSON.stringify(['aluminium']) },
    { category: 'Metals',    sub_category: 'Steel Scrap',       description: 'Iron and steel items',                        image_ref: 'steel.png',        unit: 'kg', source_type: 'industrial',   hazardous: 0, recoverable_materials: JSON.stringify(['steel','iron']) },
    { category: 'Metals',    sub_category: 'Brass Items',       description: 'Brass fittings, taps, fixtures',              image_ref: 'brass.png',        unit: 'kg', source_type: 'household',    hazardous: 0, recoverable_materials: JSON.stringify(['copper','zinc']) },
    { category: 'Plastics',  sub_category: 'PET Bottles',       description: 'Clear plastic bottles (water, soda)',         image_ref: 'pet.png',          unit: 'kg', source_type: 'household',    hazardous: 0, recoverable_materials: JSON.stringify(['PET']) },
    { category: 'Plastics',  sub_category: 'HDPE Plastic',      description: 'Milk jugs, detergent bottles',                image_ref: 'hdpe.png',         unit: 'kg', source_type: 'household',    hazardous: 0, recoverable_materials: JSON.stringify(['HDPE']) },
    { category: 'Plastics',  sub_category: 'Mixed Plastic',     description: 'Assorted plastic waste',                      image_ref: 'plastic_mixed.png',unit: 'kg', source_type: 'household',    hazardous: 0, recoverable_materials: JSON.stringify(['mixed_polymer']) },
    { category: 'Paper',     sub_category: 'Newspaper',         description: 'Old newspapers and magazines',                image_ref: 'newspaper.png',    unit: 'kg', source_type: 'household',    hazardous: 0, recoverable_materials: JSON.stringify(['cellulose']) },
    { category: 'Paper',     sub_category: 'Cardboard/Cartons', description: 'Corrugated boxes and cartons',                image_ref: 'cardboard.png',    unit: 'kg', source_type: 'household',    hazardous: 0, recoverable_materials: JSON.stringify(['cellulose']) },
    { category: 'Paper',     sub_category: 'White Office Paper',description: 'A4 and printing paper',                       image_ref: 'office_paper.png', unit: 'kg', source_type: 'institutional',hazardous: 0, recoverable_materials: JSON.stringify(['cellulose']) },
  ];

  const ALL_MATERIALS = [...ORIGINAL_MATERIALS, ...EXTRA_MATERIALS];
  console.log(`♻️   Inserting ${ALL_MATERIALS.length} materials (${ORIGINAL_MATERIALS.length} original + ${EXTRA_MATERIALS.length} new)...`);

  const stmtMaterial = db.prepare(`
    INSERT INTO materials (category, sub_category, description, image_ref, unit, source_type, hazardous, recoverable_materials)
    VALUES (@category, @sub_category, @description, @image_ref, @unit, @source_type, @hazardous, @recoverable_materials)
  `);

  const matIdMap = {}; // sub_category → id
  if (!DRY_RUN) {
    ALL_MATERIALS.forEach(m => {
      const r = stmtMaterial.run(m);
      matIdMap[m.sub_category] = r.lastInsertRowid;
    });
  }
  console.log('    ✓ Materials inserted\n');

  // ── 6. Insert 60-day Price History ──────────────────────────────────────────
  console.log(`📈  Generating ${HISTORY_DAYS}-day price history for ${PRICE_SEEDS.length} material/location pairs...`);

  const stmtPrice = db.prepare(`
    INSERT INTO prices (material_id, recycler_id, location, date, buying_price, quoted_price, unit, price_trend, source)
    VALUES (@material_id, @recycler_id, @location, @date, @buying_price, @quoted_price, @unit, @price_trend, @source)
  `);

  let totalPriceRows = 0;

  if (!DRY_RUN) {
    const insertPrices = db.transaction(() => {
      PRICE_SEEDS.forEach(seed => {
        const matId = matIdMap[seed.sub_category];
        if (!matId) {
          console.warn(`    ⚠️  No material_id found for "${seed.sub_category}" — skipping`);
          return;
        }

        const walk = priceWalk(seed.basePrice, HISTORY_DAYS, seed.sigma, seed.drift, seed.meanRev);
        const trend = trendLabel(walk);

        walk.forEach((buying_price, idx) => {
          const daysFromToday = HISTORY_DAYS - 1 - idx; // idx 0 = oldest
          const dateStr = daysAgo(daysFromToday);
          const quoted_price = Math.round(buying_price * seed.quoteMultiplier);

          stmtPrice.run({
            material_id:  matId,
            recycler_id:  null,
            location:     seed.location,
            date:         dateStr,
            buying_price,
            quoted_price,
            unit:         'kg',
            price_trend:  trend,
            source:       'market',
          });
          totalPriceRows++;
        });
      });
    });
    insertPrices();
  } else {
    totalPriceRows = PRICE_SEEDS.length * HISTORY_DAYS;
  }

  console.log(`    ✓ ${totalPriceRows} price records inserted\n`);

  // ── 7. Print Summary & Sample Records ──────────────────────────────────────
  if (!DRY_RUN) {
    printSummary();
  } else {
    console.log('ℹ️   DRY RUN complete — no changes made.');
    console.log(`    Would insert: ${COLLECTORS.length} collectors, ${RECYCLERS.length} recyclers, ${ALL_MATERIALS.length} materials, ~${totalPriceRows} price records`);
  }
}

function printSummary() {
  console.log('══════════════════════════════════════════');
  console.log('📊  SEED VERIFICATION — Table Counts\n');

  const tables = ['collectors','recyclers','materials','prices','lots','transactions','traceability'];
  tables.forEach(t => {
    const { n } = db.prepare(`SELECT COUNT(*) as n FROM ${t}`).get();
    console.log(`    ${t.padEnd(15)} ${n} rows`);
  });

  console.log('\n─────────────────────────────────────────');
  console.log('🏭  RECYCLERS (all 9)\n');
  const recyclers = db.prepare('SELECT id, name, city, authorization_status, materials_accepted, rating FROM recyclers ORDER BY id').all();
  recyclers.forEach(r => {
    const mats = JSON.parse(r.materials_accepted).join(', ');
    const authIcon = r.authorization_status === 'authorized' ? '✅' : '⚠️ ';
    console.log(`    [${r.id}] ${authIcon} ${r.name} (${r.city}) ★${r.rating}`);
    console.log(`         Accepts: ${mats}`);
    console.log(`         Status:  ${r.authorization_status}\n`);
  });

  console.log('─────────────────────────────────────────');
  console.log('♻️   MATERIALS — Extended Catalog (first 10 + last 5)\n');
  const allMats = db.prepare('SELECT id, category, sub_category, hazardous FROM materials ORDER BY id').all();
  [...allMats.slice(0, 10), { id: '...', category: '...', sub_category: '...', hazardous: '...' }, ...allMats.slice(-5)].forEach(m => {
    const haz = m.hazardous === 1 ? '⚠️ ' : m.hazardous === '...' ? '   ' : '✓ ';
    console.log(`    [${String(m.id).padStart(2)}] ${haz} ${m.category} / ${m.sub_category}`);
  });

  console.log('\n─────────────────────────────────────────');
  console.log('📈  PRICE SAMPLES — Latest price for 8 key materials (Bengaluru)\n');
  const priceQuery = db.prepare(`
    SELECT m.category, m.sub_category, p.date, p.buying_price, p.quoted_price, p.price_trend
    FROM prices p
    JOIN materials m ON m.id = p.material_id
    WHERE p.location = 'Bengaluru'
      AND p.date = (SELECT MAX(p2.date) FROM prices p2 WHERE p2.material_id = p.material_id AND p2.location = 'Bengaluru')
    GROUP BY p.material_id
    ORDER BY m.category, m.sub_category
    LIMIT 12
  `);
  const samples = priceQuery.all();
  const trendIcon = t => t === 'rising' ? '📈' : t === 'falling' ? '📉' : '➡️ ';
  samples.forEach(s => {
    console.log(`    ${trendIcon(s.price_trend)} ${s.sub_category.padEnd(25)} buy ₹${String(s.buying_price).padStart(5)}/kg  quote ₹${String(s.quoted_price).padStart(5)}/kg  (${s.price_trend})`);
  });

  console.log('\n─────────────────────────────────────────');
  console.log('📅  PRICE HISTORY SAMPLE — Neodymium Magnet Scrap (last 10 days, Bengaluru)\n');
  const neoHistory = db.prepare(`
    SELECT p.date, p.buying_price, p.quoted_price
    FROM prices p
    JOIN materials m ON m.id = p.material_id
    WHERE m.sub_category = 'Neodymium Magnet Scrap' AND p.location = 'Bengaluru'
    ORDER BY p.date DESC LIMIT 10
  `).all();
  neoHistory.reverse().forEach(h => {
    const bar = '█'.repeat(Math.round(h.buying_price / 60));
    console.log(`    ${h.date}  ₹${h.buying_price}/kg  ${bar}`);
  });

  console.log('\n✅  Seed complete — DB is ready for demo.\n');
}

// ─── Run ──────────────────────────────────────────────────────────────────────
try {
  seed();
} catch (err) {
  console.error('\n❌  Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
}

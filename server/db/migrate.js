const db = require('./database');

/**
 * Full database migration / initialization script.
 * Creates all tables with proper schemas if they don't already exist.
 * Also seeds the DB with sample data for demo purposes.
 */

function initializeDatabase() {
  // ─────────────────────────────────────────
  // TABLE: collectors
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS collectors (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT    NOT NULL DEFAULT 'Anonymous Collector',
      phone            TEXT,
      preferred_language TEXT  NOT NULL DEFAULT 'en',
      operating_location TEXT  NOT NULL,
      latitude         REAL,
      longitude        REAL,
      verified         INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ─────────────────────────────────────────
  // TABLE: recyclers
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS recyclers (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      name                  TEXT    NOT NULL,
      contact_person        TEXT,
      phone                 TEXT    NOT NULL,
      email                 TEXT,
      address               TEXT    NOT NULL,
      city                  TEXT    NOT NULL,
      state                 TEXT    NOT NULL DEFAULT 'Karnataka',
      latitude              REAL    NOT NULL,
      longitude             REAL    NOT NULL,
      service_radius_km     REAL    NOT NULL DEFAULT 20,
      materials_accepted    TEXT    NOT NULL,   -- JSON array of material categories
      authorization_status  TEXT    NOT NULL DEFAULT 'authorized',  -- authorized | pending | revoked
      authorization_number  TEXT,
      offered_rate_modifier REAL    NOT NULL DEFAULT 1.0, -- multiplier vs base price (e.g. 0.95 = 5% below market)
      pickup_available      INTEGER NOT NULL DEFAULT 1,
      min_pickup_weight_kg  REAL    NOT NULL DEFAULT 5,
      rating                REAL    NOT NULL DEFAULT 4.0,
      total_transactions    INTEGER NOT NULL DEFAULT 0,
      created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ─────────────────────────────────────────
  // TABLE: materials (catalog of material types)
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      category      TEXT    NOT NULL,        -- e.g. "E-Waste", "Metals", "Plastics"
      sub_category  TEXT    NOT NULL,        -- e.g. "Laptop", "Copper Wire", "PET Bottles"
      description   TEXT,
      image_ref     TEXT,                    -- filename/URL for icon
      unit          TEXT    NOT NULL DEFAULT 'kg',
      source_type   TEXT    NOT NULL DEFAULT 'household',  -- household | industrial | institutional
      hazardous     INTEGER NOT NULL DEFAULT 0,
      recoverable_materials TEXT,            -- JSON: e.g. ["lithium","cobalt"]
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ─────────────────────────────────────────
  // TABLE: prices (current and historical market prices)
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS prices (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id      INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
      recycler_id      INTEGER REFERENCES recyclers(id) ON DELETE SET NULL,
      location         TEXT    NOT NULL DEFAULT 'Bengaluru',
      date             TEXT    NOT NULL DEFAULT (date('now')),
      buying_price     REAL    NOT NULL,   -- price recycler pays (INR per unit)
      quoted_price     REAL    NOT NULL,   -- displayed fair market price (INR per unit)
      unit             TEXT    NOT NULL DEFAULT 'kg',
      price_trend      TEXT    NOT NULL DEFAULT 'stable',  -- rising | falling | stable
      source           TEXT    NOT NULL DEFAULT 'market',  -- market | recycler | estimated
      created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ─────────────────────────────────────────
  // TABLE: lots (a collector's logged batch of materials before handover)
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS lots (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_ref          TEXT    NOT NULL UNIQUE,  -- human-readable ref e.g. LOT-2024-001
      collector_id     INTEGER NOT NULL REFERENCES collectors(id),
      status           TEXT    NOT NULL DEFAULT 'draft',
      -- draft → submitted → matched → confirmed → completed | cancelled
      total_weight_kg  REAL    NOT NULL DEFAULT 0,
      estimated_value  REAL    NOT NULL DEFAULT 0,  -- INR
      notes            TEXT,
      pickup_address   TEXT,
      latitude         REAL,
      longitude        REAL,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ─────────────────────────────────────────
  // TABLE: lot_items (individual material items within a lot)
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS lot_items (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_id          INTEGER NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
      material_id     INTEGER NOT NULL REFERENCES materials(id),
      weight_kg       REAL    NOT NULL,
      condition       TEXT    NOT NULL DEFAULT 'fair',  -- good | fair | poor
      estimated_value REAL    NOT NULL DEFAULT 0,       -- INR, calculated from price table
      notes           TEXT,
      photo_ref       TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ─────────────────────────────────────────
  // TABLE: transactions (matched lot → recycler assignments)
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_id           INTEGER NOT NULL REFERENCES lots(id),
      collector_id     INTEGER NOT NULL REFERENCES collectors(id),
      recycler_id      INTEGER NOT NULL REFERENCES recyclers(id),
      material_summary TEXT    NOT NULL,   -- JSON summary of materials
      total_weight_kg  REAL    NOT NULL,
      quoted_price     REAL    NOT NULL,   -- INR, total quoted at match time
      final_price      REAL,               -- INR, settled at confirmation
      payment_status   TEXT    NOT NULL DEFAULT 'pending',  -- pending | paid | disputed
      payment_method   TEXT    DEFAULT 'cash',
      pickup_scheduled TEXT,               -- ISO datetime
      pickup_location  TEXT,
      latitude         REAL,
      longitude        REAL,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ─────────────────────────────────────────
  // TABLE: traceability (audit trail for each lot handover)
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS traceability (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_id                  INTEGER NOT NULL REFERENCES lots(id),
      transaction_id          INTEGER REFERENCES transactions(id),
      handover_ref            TEXT    NOT NULL UNIQUE,  -- e.g. HO-2024-001-A
      status                  TEXT    NOT NULL DEFAULT 'pending',
      -- pending | in_transit | handed_over | recycler_confirmed | completed
      collector_confirmed_at  TEXT,
      recycler_confirmed_at   TEXT,
      collector_signature     TEXT,   -- could be a simple hash/token for demo
      recycler_signature      TEXT,
      gps_collection          TEXT,   -- JSON: {lat, lng, accuracy}
      gps_handover            TEXT,   -- JSON: {lat, lng, accuracy}
      photo_refs              TEXT,   -- JSON array of photo filenames
      weight_at_handover      REAL,
      weight_variance_pct     REAL,   -- % diff from logged weight (quality check)
      notes                   TEXT,
      blockchain_ref          TEXT,   -- placeholder for future chain anchoring
      created_at              TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at              TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  console.log('✅ All tables created / verified.');

  // ─────────────────────────────────────────
  // SEED DATA
  // ─────────────────────────────────────────
  seedDatabase();
}

function seedDatabase() {
  // Only seed if tables are empty
  const collectorCount = db.prepare('SELECT COUNT(*) as c FROM collectors').get().c;
  if (collectorCount > 0) {
    console.log('ℹ️  Database already seeded — skipping.');
    return;
  }

  console.log('🌱 Seeding database with demo data...');

  // ── Collectors ──
  const insertCollector = db.prepare(`
    INSERT INTO collectors (name, phone, preferred_language, operating_location, latitude, longitude, verified)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const collectors = [
    ['Raju Kabadiwal', '9876543210', 'hi', 'Bengaluru', 12.9716, 77.5946, 1],
    ['Meena Devi', '9765432109', 'kn', 'Bengaluru', 12.9352, 77.6245, 1],
    ['Suresh Kumar', '9654321098', 'en', 'Bengaluru', 13.0358, 77.5970, 0],
  ];
  collectors.forEach(c => insertCollector.run(...c));

  // ── Recyclers ──
  const insertRecycler = db.prepare(`
    INSERT INTO recyclers (
      name, contact_person, phone, email, address, city, state,
      latitude, longitude, service_radius_km, materials_accepted,
      authorization_status, authorization_number, offered_rate_modifier,
      pickup_available, min_pickup_weight_kg, rating, total_transactions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const recyclers = [
    [
      'GreenCycle India Pvt Ltd', 'Amit Sharma', '9900112233',
      'contact@greencycle.in',
      'Plot 45, KIADB Industrial Area, Peenya', 'Bengaluru', 'Karnataka',
      13.0280, 77.5198, 25,
      JSON.stringify(['E-Waste', 'Batteries', 'Metals']),
      'authorized', 'KSPCB/EWM/2024/001', 0.95,
      1, 5, 4.7, 124
    ],
    [
      'EcoReclaim Systems', 'Priya Nair', '9811223344',
      'info@ecoreclaim.co.in',
      '12/A, Electronic City Phase 1', 'Bengaluru', 'Karnataka',
      12.8458, 77.6603, 30,
      JSON.stringify(['E-Waste', 'Plastics', 'Paper']),
      'authorized', 'KSPCB/EWM/2024/002', 0.97,
      1, 2, 4.5, 89
    ],
    [
      'MetalMart Recyclers', 'Venkat Rao', '9722334455',
      'ops@metalmart.in',
      'Survey No. 78, Whitefield Industrial Zone', 'Bengaluru', 'Karnataka',
      12.9698, 77.7499, 20,
      JSON.stringify(['Metals', 'Copper', 'Aluminium', 'Steel']),
      'authorized', 'KSPCB/MWM/2024/003', 0.98,
      0, 10, 4.2, 211
    ],
    [
      'SafeDispose e-Waste Hub', 'Kavitha B', '9633445566',
      'hello@safedispose.in',
      '3rd Floor, Innovator Building, Koramangala', 'Bengaluru', 'Karnataka',
      12.9279, 77.6271, 15,
      JSON.stringify(['E-Waste', 'Batteries', 'Mobiles', 'Computers']),
      'authorized', 'KSPCB/EWM/2024/004', 0.93,
      1, 1, 4.8, 56
    ],
    [
      'PaperPath Eco Solutions', 'Ramesh T', '9544556677',
      'paperpath@eco.in',
      'No. 9, Rajajinagar Industrial Area', 'Bengaluru', 'Karnataka',
      12.9849, 77.5524, 18,
      JSON.stringify(['Paper', 'Cardboard', 'Plastics']),
      'authorized', 'KSPCB/BWM/2024/005', 1.0,
      1, 3, 4.0, 178
    ],
  ];
  recyclers.forEach(r => insertRecycler.run(...r));

  // ── Materials (catalog) ──
  const insertMaterial = db.prepare(`
    INSERT INTO materials (category, sub_category, description, image_ref, unit, source_type, hazardous, recoverable_materials)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const materials = [
    // E-Waste
    ['E-Waste', 'Laptop', 'Old laptops, notebooks, netbooks', 'laptop.png', 'kg', 'household', 1,
      JSON.stringify(['gold', 'silver', 'copper', 'palladium'])],
    ['E-Waste', 'Mobile Phone', 'Smartphones, feature phones, tablets', 'mobile.png', 'kg', 'household', 1,
      JSON.stringify(['gold', 'silver', 'copper', 'cobalt', 'lithium'])],
    ['E-Waste', 'CRT Monitor', 'Old tube monitors and televisions', 'crt.png', 'kg', 'household', 1,
      JSON.stringify(['lead', 'copper', 'glass'])],
    ['E-Waste', 'LCD/LED Monitor', 'Flat panel displays and TVs', 'lcd.png', 'kg', 'household', 1,
      JSON.stringify(['indium', 'copper', 'aluminium'])],
    ['E-Waste', 'Desktop Computer', 'Desktop CPUs and towers', 'desktop.png', 'kg', 'institutional', 1,
      JSON.stringify(['gold', 'copper', 'aluminium', 'palladium'])],
    ['E-Waste', 'Refrigerator', 'Old fridges and freezers', 'fridge.png', 'kg', 'household', 1,
      JSON.stringify(['steel', 'copper', 'aluminium', 'refrigerant'])],
    ['E-Waste', 'Washing Machine', 'Front/top load washing machines', 'washer.png', 'kg', 'household', 0,
      JSON.stringify(['steel', 'copper', 'plastic'])],
    ['E-Waste', 'Printer', 'Inkjet and laser printers', 'printer.png', 'kg', 'institutional', 1,
      JSON.stringify(['copper', 'plastic', 'steel'])],
    // Batteries
    ['Batteries', 'Lithium-Ion Battery', 'Li-ion from laptops, phones, EVs', 'li_battery.png', 'kg', 'household', 1,
      JSON.stringify(['lithium', 'cobalt', 'nickel', 'manganese'])],
    ['Batteries', 'Lead-Acid Battery', 'Car and inverter batteries', 'lead_battery.png', 'kg', 'household', 1,
      JSON.stringify(['lead', 'sulphuric_acid', 'polypropylene'])],
    ['Batteries', 'NiMH Battery', 'Rechargeable AA/AAA and camera batteries', 'nimh.png', 'kg', 'household', 1,
      JSON.stringify(['nickel', 'manganese', 'hydrogen'])],
    // Metals
    ['Metals', 'Copper Wire', 'Electrical wiring and cables', 'copper.png', 'kg', 'industrial', 0,
      JSON.stringify(['copper'])],
    ['Metals', 'Aluminium Scrap', 'Aluminium sheets, cans, profiles', 'aluminium.png', 'kg', 'industrial', 0,
      JSON.stringify(['aluminium'])],
    ['Metals', 'Steel Scrap', 'Iron and steel items', 'steel.png', 'kg', 'industrial', 0,
      JSON.stringify(['steel', 'iron'])],
    ['Metals', 'Brass Items', 'Brass fittings, taps, fixtures', 'brass.png', 'kg', 'household', 0,
      JSON.stringify(['copper', 'zinc'])],
    // Plastics
    ['Plastics', 'PET Bottles', 'Clear plastic bottles (water, soda)', 'pet.png', 'kg', 'household', 0,
      JSON.stringify(['PET'])],
    ['Plastics', 'HDPE Plastic', 'Milk jugs, detergent bottles', 'hdpe.png', 'kg', 'household', 0,
      JSON.stringify(['HDPE'])],
    ['Plastics', 'Mixed Plastic', 'Assorted plastic waste', 'plastic_mixed.png', 'kg', 'household', 0,
      JSON.stringify(['mixed_polymer'])],
    // Paper
    ['Paper', 'Newspaper', 'Old newspapers and magazines', 'newspaper.png', 'kg', 'household', 0,
      JSON.stringify(['cellulose'])],
    ['Paper', 'Cardboard/Cartons', 'Corrugated boxes and cartons', 'cardboard.png', 'kg', 'household', 0,
      JSON.stringify(['cellulose'])],
    ['Paper', 'White Office Paper', 'A4 and printing paper', 'office_paper.png', 'kg', 'institutional', 0,
      JSON.stringify(['cellulose'])],
  ];
  materials.forEach(m => insertMaterial.run(...m));

  // Get the material IDs we just inserted
  const allMaterials = db.prepare('SELECT id, category, sub_category FROM materials').all();
  const matMap = {};
  allMaterials.forEach(m => { matMap[m.sub_category] = m.id; });

  // ── Prices ──
  const insertPrice = db.prepare(`
    INSERT INTO prices (material_id, recycler_id, location, date, buying_price, quoted_price, unit, price_trend, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date().toISOString().slice(0, 10);
  // Base market prices (INR/kg) — based on real Indian scrap market approximations
  const priceData = [
    // [sub_category, buying_price, quoted_price, trend]
    ['Laptop',           200, 220, 'rising'],
    ['Mobile Phone',     300, 330, 'rising'],
    ['CRT Monitor',       25,  30, 'falling'],
    ['LCD/LED Monitor',   60,  70, 'stable'],
    ['Desktop Computer', 150, 170, 'stable'],
    ['Refrigerator',      35,  40, 'stable'],
    ['Washing Machine',   25,  30, 'stable'],
    ['Printer',           30,  35, 'falling'],
    ['Lithium-Ion Battery', 120, 140, 'rising'],
    ['Lead-Acid Battery',   90, 100, 'stable'],
    ['NiMH Battery',        40,  50, 'stable'],
    ['Copper Wire',        480, 500, 'rising'],
    ['Aluminium Scrap',     90, 100, 'stable'],
    ['Steel Scrap',         30,  35, 'stable'],
    ['Brass Items',        340, 360, 'rising'],
    ['PET Bottles',         12,  15, 'stable'],
    ['HDPE Plastic',        18,  22, 'stable'],
    ['Mixed Plastic',        8,  10, 'falling'],
    ['Newspaper',           14,  16, 'stable'],
    ['Cardboard/Cartons',   10,  12, 'stable'],
    ['White Office Paper',  20,  22, 'stable'],
  ];

  priceData.forEach(([sub_cat, buying, quoted, trend]) => {
    const matId = matMap[sub_cat];
    if (!matId) return;
    // Insert market-wide price
    insertPrice.run(matId, null, 'Bengaluru', today, buying, quoted, 'kg', trend, 'market');
  });

  // Add a few historical price points (last 7 days) for trend charts
  const historyDays = 7;
  const historyMaterials = ['Laptop', 'Mobile Phone', 'Copper Wire', 'Lithium-Ion Battery'];
  for (let d = historyDays; d >= 1; d--) {
    const histDate = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
    historyMaterials.forEach(sub_cat => {
      const matId = matMap[sub_cat];
      if (!matId) return;
      const baseIdx = priceData.findIndex(p => p[0] === sub_cat);
      if (baseIdx === -1) return;
      const base = priceData[baseIdx][1];
      const variance = (Math.random() - 0.5) * 0.1; // ±5% variance
      const hp = Math.round(base * (1 + variance));
      const qp = Math.round(hp * 1.1);
      insertPrice.run(matId, null, 'Bengaluru', histDate, hp, qp, 'kg', 'stable', 'market');
    });
  }

  console.log('✅ Seed data inserted successfully.');
}

module.exports = { initializeDatabase };

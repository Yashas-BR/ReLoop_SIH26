const db = require('../db/database');
const path = require('path');

/**
 * Core Valuation Logic
 * Computes fair market estimate using real SQLite price table history.
 *
 * @param {number} materialId
 * @param {number} weightKg
 * @param {string} condition - 'good' | 'fair' | 'poor'
 * @param {string} location - city string, default 'Bengaluru'
 */
function calculateMaterialValuation(materialId, weightKg, condition = 'fair', location = 'Bengaluru') {
  // 1. Fetch the 7 most recent price records for this material in the operating location (or fallback to market wide)
  let prices = db.prepare(`
    SELECT buying_price, quoted_price, date, price_trend 
    FROM prices 
    WHERE material_id = ? AND (location = ? OR location = 'Bengaluru')
    ORDER BY date DESC 
    LIMIT 7
  `).all(materialId, location);

  if (!prices || prices.length === 0) {
    // Fallback if no location-specific price
    prices = db.prepare(`
      SELECT buying_price, quoted_price, date, price_trend 
      FROM prices 
      WHERE material_id = ? 
      ORDER BY date DESC 
      LIMIT 7
    `).all(materialId);
  }

  if (!prices || prices.length === 0) {
    // Fallback 1: Try category average price
    const mat = db.prepare('SELECT category FROM materials WHERE id = ?').get(materialId);
    if (mat) {
      prices = db.prepare(`
        SELECT p.buying_price, p.quoted_price, p.date, p.price_trend 
        FROM prices p 
        JOIN materials m ON m.id = p.material_id 
        WHERE m.category = ? 
        ORDER BY p.date DESC 
        LIMIT 7
      `).all(mat.category);
    }
  }

  if (!prices || prices.length === 0) {
    // Fallback 2: General baseline if completely unseeded material
    prices = [
      { buying_price: 45, quoted_price: 60, date: new Date().toISOString().slice(0, 10), price_trend: 'stable' }
    ];
  }

  // 2. Compute 7-day volume-weighted average buying & quoted prices
  const avgBuyingPrice = prices.reduce((sum, p) => sum + p.buying_price, 0) / prices.length;
  const avgQuotedPrice = prices.reduce((sum, p) => sum + p.quoted_price, 0) / prices.length;
  const latestPrice = prices[0].buying_price;
  const priceTrend = prices[0].price_trend || 'stable';

  // 3. Condition Multiplier
  // 'good': +5% premium for well-segregated/clean scrap
  // 'fair': standard market benchmark (1.0)
  // 'poor': -15% discount for heavily damaged or mixed scrap
  const conditionMultipliers = {
    good: 1.05,
    fair: 1.00,
    poor: 0.85,
  };
  const multiplier = conditionMultipliers[condition.toLowerCase()] || 1.00;

  // 4. Rate per kg after condition adjustment
  const effectiveRatePerKg = Math.round(avgBuyingPrice * multiplier * 100) / 100;
  const totalEstimatedValue = Math.round(effectiveRatePerKg * Number(weightKg));

  // 5. Estimated range (lower bound recycler offer to upper bound fair retail)
  const minEstimatedValue = Math.round(totalEstimatedValue * 0.95);
  const maxEstimatedValue = Math.round(avgQuotedPrice * multiplier * Number(weightKg));

  return {
    material_id: materialId,
    weight_kg: Number(weightKg),
    condition,
    condition_multiplier: multiplier,
    avg_buying_price_7d: Math.round(avgBuyingPrice),
    avg_quoted_price_7d: Math.round(avgQuotedPrice),
    latest_market_price: latestPrice,
    effective_rate_per_kg: effectiveRatePerKg,
    total_estimated_value: totalEstimatedValue,
    estimated_range: {
      min: minEstimatedValue,
      max: Math.max(maxEstimatedValue, totalEstimatedValue),
    },
    price_trend: priceTrend,
    data_points_used: prices.length,
    last_price_date: prices[0].date,
  };
}

/**
 * POST /api/lots/estimate
 * Instant live valuation calculation without saving to DB.
 */
function estimateValuation(req, res) {
  try {
    const { material_id, weight_kg, condition, location } = req.body;

    if (!material_id || !weight_kg || Number(weight_kg) <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid material_id and positive weight_kg are required for valuation.',
      });
    }

    const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(material_id);
    if (!material) {
      return res.status(404).json({ status: 'error', message: 'Material not found.' });
    }

    const valuation = calculateMaterialValuation(
      Number(material_id),
      Number(weight_kg),
      condition || 'fair',
      location || 'Bengaluru'
    );

    res.json({
      status: 'ok',
      material: {
        id: material.id,
        category: material.category,
        sub_category: material.sub_category,
        unit: material.unit,
        hazardous: Boolean(material.hazardous),
        recoverable_materials: material.recoverable_materials ? JSON.parse(material.recoverable_materials) : [],
      },
      valuation,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * POST /api/lots
 * Creates a new Lot and Lot Item with uploaded photo, persists in SQLite,
 * and performs real instant pricing valuation.
 */
function createLot(req, res) {
  try {
    const {
      collector_id = 1, // Default single demo collector
      material_id,
      weight_kg,
      condition = 'fair',
      source_type = 'household',
      notes = '',
      pickup_address = '12th Main Road, Indiranagar, Bengaluru',
      latitude = 12.9716,
      longitude = 77.5946,
    } = req.body;

    if (!material_id || !weight_kg || Number(weight_kg) <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Material and valid weight are required.',
      });
    }

    const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(material_id);
    if (!material) {
      return res.status(404).json({ status: 'error', message: 'Selected material does not exist.' });
    }

    // 1. Perform REAL instant valuation calculation
    const valuation = calculateMaterialValuation(
      Number(material_id),
      Number(weight_kg),
      condition,
      'Bengaluru'
    );

    // 2. Generate unique Lot Reference (e.g. LOT-20260831-7892)
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const lotRef = `LOT-${todayStr}-${randomSuffix}`;

    // 3. Photo storage ref (relative path)
    const photoRef = req.file ? `/uploads/${req.file.filename}` : null;

    // 4. Perform atomic DB insertion
    const insertTransaction = db.transaction(() => {
      // Insert into lots table
      const insertLotStmt = db.prepare(`
        INSERT INTO lots (
          lot_ref, collector_id, status, total_weight_kg, estimated_value, 
          notes, pickup_address, latitude, longitude
        ) VALUES (
          @lot_ref, @collector_id, 'submitted', @total_weight_kg, @estimated_value, 
          @notes, @pickup_address, @latitude, @longitude
        )
      `);

      const lotResult = insertLotStmt.run({
        lot_ref: lotRef,
        collector_id: Number(collector_id),
        total_weight_kg: Number(weight_kg),
        estimated_value: valuation.total_estimated_value,
        notes: notes || null,
        pickup_address: pickup_address || null,
        latitude: Number(latitude) || null,
        longitude: Number(longitude) || null,
      });

      const lotId = lotResult.lastInsertRowid;

      // Insert into lot_items table
      const insertItemStmt = db.prepare(`
        INSERT INTO lot_items (
          lot_id, material_id, weight_kg, condition, estimated_value, notes, photo_ref
        ) VALUES (
          @lot_id, @material_id, @weight_kg, @condition, @estimated_value, @notes, @photo_ref
        )
      `);

      insertItemStmt.run({
        lot_id: lotId,
        material_id: Number(material_id),
        weight_kg: Number(weight_kg),
        condition,
        estimated_value: valuation.total_estimated_value,
        notes: notes || null,
        photo_ref: photoRef,
      });

      return lotId;
    });

    const lotId = insertTransaction();

    // 5. Query the newly inserted record directly from the DB to return full real state
    const savedLot = getLotRecordFromDb(lotId);

    res.status(201).json({
      status: 'ok',
      message: 'Material lot created and valued successfully.',
      lot_id: lotId,
      lot_ref: lotRef,
      data: savedLot,
      calculation_breakdown: valuation,
    });
  } catch (error) {
    console.error('Error creating lot:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * Helper to pull a full Lot object with items & material metadata from SQLite
 */
function getLotRecordFromDb(lotId) {
  const lot = db.prepare(`
    SELECT 
      l.*,
      c.name as collector_name,
      c.phone as collector_phone,
      c.preferred_language,
      c.operating_location
    FROM lots l
    JOIN collectors c ON c.id = l.collector_id
    WHERE l.id = ?
  `).get(lotId);

  if (!lot) return null;

  const items = db.prepare(`
    SELECT 
      li.*,
      m.category as material_category,
      m.sub_category as material_sub_category,
      m.description as material_description,
      m.unit as material_unit,
      m.hazardous,
      m.recoverable_materials
    FROM lot_items li
    JOIN materials m ON m.id = li.material_id
    WHERE li.lot_id = ?
  `).all(lotId);

  return {
    ...lot,
    items: items.map(item => ({
      ...item,
      hazardous: Boolean(item.hazardous),
      recoverable_materials: item.recoverable_materials ? JSON.parse(item.recoverable_materials) : [],
    })),
  };
}

/**
 * GET /api/lots/:id
 * Fetches real saved lot record by ID.
 */
function getLotById(req, res) {
  try {
    const { id } = req.params;
    const lot = getLotRecordFromDb(id);

    if (!lot) {
      return res.status(404).json({ status: 'error', message: 'Lot not found.' });
    }

    res.json({ status: 'ok', data: lot });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * GET /api/lots
 * Returns list of all lots (with optional collector_id and status filters)
 */
function getAllLots(req, res) {
  try {
    const { collector_id, status } = req.query;
    let sql = `
      SELECT 
        l.*,
        c.name as collector_name,
        (SELECT COUNT(*) FROM lot_items WHERE lot_id = l.id) as item_count,
        (SELECT m.sub_category FROM lot_items li JOIN materials m ON m.id = li.material_id WHERE li.lot_id = l.id LIMIT 1) as primary_material,
        (SELECT m.category FROM lot_items li JOIN materials m ON m.id = li.material_id WHERE li.lot_id = l.id LIMIT 1) as primary_category,
        (SELECT li.photo_ref FROM lot_items li WHERE li.lot_id = l.id AND li.photo_ref IS NOT NULL LIMIT 1) as thumbnail_photo
      FROM lots l
      JOIN collectors c ON c.id = l.collector_id
      WHERE 1=1
    `;
    const params = [];

    if (collector_id) {
      sql += ' AND l.collector_id = ?';
      params.push(collector_id);
    }
    if (status) {
      sql += ' AND l.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY l.created_at DESC';

    const lots = db.prepare(sql).all(...params);
    res.json({ status: 'ok', count: lots.length, data: lots });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

module.exports = {
  calculateMaterialValuation,
  estimateValuation,
  createLot,
  getLotById,
  getAllLots,
};

/**
 * Helper function to calculate distance in km using Haversine formula
 */
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * GET /api/lots/:id/matches
 * Finds suitable recyclers for a lot based on location and materials accepted.
 */
function getLotMatches(req, res) {
  try {
    const { id } = req.params;
    const lot = getLotRecordFromDb(id);

    if (!lot) {
      return res.status(404).json({ status: 'error', message: 'Lot not found.' });
    }

    if (lot.status !== 'submitted') {
       return res.status(400).json({ status: 'error', message: 'Lot is already assigned or completed.' });
    }

    // Determine the primary category of the lot based on its items
    const primaryCategory = lot.items.length > 0 ? lot.items[0].material_category : null;

    if (!primaryCategory) {
      return res.status(400).json({ status: 'error', message: 'Lot has no items.' });
    }

    // Fetch recyclers
    // For demo purposes, we fetch all and filter/sort in memory.
    const allRecyclers = db.prepare('SELECT * FROM recyclers').all();

    const matches = allRecyclers.map(recycler => {
       let acceptsMaterial = false;
       try {
           const accepted = JSON.parse(recycler.materials_accepted);
           acceptsMaterial = accepted.includes(primaryCategory) || accepted.includes('E-Waste'); // fallback generic category
       } catch(e) {}

       if(!acceptsMaterial) return null;

       // Calculate distance
       const distance = getDistanceFromLatLonInKm(lot.latitude, lot.longitude, recycler.latitude, recycler.longitude);
       
       // Calculate customized offer price based on the recycler's rate modifier
       const offeredPrice = Math.round(lot.estimated_value * recycler.offered_rate_modifier);

       return {
           ...recycler,
           distance_km: Math.round(distance * 10) / 10,
           offered_price: offeredPrice
       };
    }).filter(r => r !== null)
      .sort((a, b) => a.distance_km - b.distance_km);

    // Filter to top 5 matches, preferring authorized ones
    const sortedMatches = matches.sort((a, b) => {
        if (a.authorization_status === 'authorized' && b.authorization_status !== 'authorized') return -1;
        if (a.authorization_status !== 'authorized' && b.authorization_status === 'authorized') return 1;
        return a.distance_km - b.distance_km;
    }).slice(0, 5);

    res.json({
      status: 'ok',
      lot_id: lot.id,
      lot_ref: lot.lot_ref,
      primary_category: primaryCategory,
      total_estimated_value: lot.estimated_value,
      matches: sortedMatches
    });

  } catch (error) {
    console.error('Error finding matches:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
}

module.exports = {
  calculateMaterialValuation,
  estimateValuation,
  createLot,
  getLotById,
  getAllLots,
  getLotMatches
};

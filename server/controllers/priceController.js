const db = require('../db/database');

/**
 * GET /api/prices
 * Returns the latest current buying and quoted market prices per material for a given location,
 * along with recent historical sparkline points and price trends.
 */
function getMarketPrices(req, res) {
  try {
    const { location = 'Bengaluru', category, search } = req.query;

    let baseQuery = `
      SELECT 
        m.id as material_id,
        m.category,
        m.sub_category,
        m.description,
        m.unit,
        m.hazardous,
        m.recoverable_materials,
        p.id as price_id,
        p.location,
        p.date as last_updated,
        p.buying_price as current_buying_price,
        p.quoted_price as current_quoted_price,
        p.price_trend,
        p.source
      FROM materials m
      JOIN prices p ON p.material_id = m.id
      WHERE p.location = ?
        AND p.date = (
          SELECT MAX(p2.date) 
          FROM prices p2 
          WHERE p2.material_id = m.id AND p2.location = p.location
        )
    `;

    const params = [location];

    if (category && category !== 'All') {
      baseQuery += ` AND m.category = ?`;
      params.push(category);
    }

    if (search) {
      baseQuery += ` AND (m.sub_category LIKE ? OR m.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    baseQuery += ` ORDER BY m.category ASC, m.sub_category ASC`;

    const rows = db.prepare(baseQuery).all(...params);

    // Attach historical 14-day sparkline points for each material
    const sparklineStmt = db.prepare(`
      SELECT date, buying_price 
      FROM prices 
      WHERE material_id = ? AND location = ?
      ORDER BY date DESC 
      LIMIT 14
    `);

    const result = rows.map(r => {
      const sparklineRaw = sparklineStmt.all(r.material_id, r.location);
      const sparkline = sparklineRaw.reverse(); // chronological (oldest to newest)

      // Calculate percentage change over sparkline period
      let pctChange = 0;
      if (sparkline.length >= 2) {
        const oldest = sparkline[0].buying_price;
        const newest = sparkline[sparkline.length - 1].buying_price;
        pctChange = Math.round(((newest - oldest) / oldest) * 1000) / 10; // e.g. +3.5%
      }

      return {
        ...r,
        hazardous: Boolean(r.hazardous),
        recoverable_materials: r.recoverable_materials ? JSON.parse(r.recoverable_materials) : [],
        pct_change: pctChange,
        sparkline,
      };
    });

    res.json({
      status: 'ok',
      location,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching market prices:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * GET /api/prices/history/:materialId
 * Returns chronological historical price data (up to 60 days) for detailed trend line charts.
 */
function getPriceHistory(req, res) {
  try {
    const { materialId } = req.params;
    const { location = 'Bengaluru', days = 60 } = req.query;

    const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(materialId);
    if (!material) {
      return res.status(404).json({ status: 'error', message: 'Material not found' });
    }

    // Direct SQLite Query for historical price records
    const query = `
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

    const records = db.prepare(query).all(materialId, location, Number(days));

    // Stats calculations from the query output
    const pricesOnly = records.map(r => r.buying_price);
    const minPrice = pricesOnly.length ? Math.min(...pricesOnly) : 0;
    const maxPrice = pricesOnly.length ? Math.max(...pricesOnly) : 0;
    const avgPrice = pricesOnly.length
      ? Math.round(pricesOnly.reduce((a, b) => a + b, 0) / pricesOnly.length)
      : 0;

    res.json({
      status: 'ok',
      material: {
        id: material.id,
        category: material.category,
        sub_category: material.sub_category,
        unit: material.unit,
        recoverable_materials: material.recoverable_materials ? JSON.parse(material.recoverable_materials) : [],
      },
      location,
      records_count: records.length,
      stats: {
        min: minPrice,
        max: maxPrice,
        avg: avgPrice,
        latest: records.length ? records[records.length - 1].buying_price : 0,
      },
      data: records,
    });
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * GET /api/prices/locations
 * Returns list of distinct locations available in the prices database.
 */
function getPriceLocations(req, res) {
  try {
    const locations = db.prepare(`
      SELECT DISTINCT location, COUNT(*) as count 
      FROM prices 
      GROUP BY location 
      ORDER BY location ASC
    `).all();

    res.json({ status: 'ok', data: locations.map(l => l.location) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

module.exports = {
  getMarketPrices,
  getPriceHistory,
  getPriceLocations,
};

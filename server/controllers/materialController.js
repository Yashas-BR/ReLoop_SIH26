const db = require('../db/database');

/**
 * GET /api/materials
 * Returns all materials, grouped or flat, with latest market price info.
 */
function getAllMaterials(req, res) {
  try {
    const { category, search } = req.query;
    let query = `
      SELECT 
        m.id, 
        m.category, 
        m.sub_category, 
        m.description, 
        m.image_ref, 
        m.unit, 
        m.source_type, 
        m.hazardous, 
        m.recoverable_materials,
        (
          SELECT p.buying_price 
          FROM prices p 
          WHERE p.material_id = m.id 
          ORDER BY p.date DESC, p.id DESC 
          LIMIT 1
        ) as latest_buying_price,
        (
          SELECT p.quoted_price 
          FROM prices p 
          WHERE p.material_id = m.id 
          ORDER BY p.date DESC, p.id DESC 
          LIMIT 1
        ) as latest_quoted_price,
        (
          SELECT p.price_trend 
          FROM prices p 
          WHERE p.material_id = m.id 
          ORDER BY p.date DESC, p.id DESC 
          LIMIT 1
        ) as price_trend
      FROM materials m
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ` AND m.category = ?`;
      params.push(category);
    }

    if (search) {
      query += ` AND (m.sub_category LIKE ? OR m.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY m.category ASC, m.sub_category ASC`;

    const materials = db.prepare(query).all(...params);

    const formatted = materials.map(m => ({
      ...m,
      hazardous: Boolean(m.hazardous),
      recoverable_materials: m.recoverable_materials ? JSON.parse(m.recoverable_materials) : [],
    }));

    res.json({ status: 'ok', count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * GET /api/materials/categories
 * Returns distinct material categories list.
 */
function getCategories(req, res) {
  try {
    const categories = db.prepare(`
      SELECT DISTINCT category, COUNT(*) as count 
      FROM materials 
      GROUP BY category 
      ORDER BY category ASC
    `).all();

    res.json({ status: 'ok', data: categories });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * GET /api/materials/:id
 */
function getMaterialById(req, res) {
  try {
    const { id } = req.params;
    const material = db.prepare(`
      SELECT * FROM materials WHERE id = ?
    `).get(id);

    if (!material) {
      return res.status(404).json({ status: 'error', message: 'Material not found' });
    }

    // Get 30-day price trend
    const recentPrices = db.prepare(`
      SELECT date, buying_price, quoted_price, price_trend 
      FROM prices 
      WHERE material_id = ? 
      ORDER BY date DESC 
      LIMIT 30
    `).all(id);

    res.json({
      status: 'ok',
      data: {
        ...material,
        hazardous: Boolean(material.hazardous),
        recoverable_materials: material.recoverable_materials ? JSON.parse(material.recoverable_materials) : [],
        price_history: recentPrices.reverse(),
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

module.exports = {
  getAllMaterials,
  getCategories,
  getMaterialById,
};

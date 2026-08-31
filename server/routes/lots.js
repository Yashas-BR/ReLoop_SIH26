const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  estimateValuation,
  createLot,
  getLotById,
  getAllLots,
  getLotMatches
} = require('../controllers/lotController');

// POST /api/lots/estimate - Instant live price valuation calculation
router.post('/estimate', estimateValuation);

// GET /api/lots - List all lots
router.get('/', getAllLots);

// GET /api/lots/:id/matches - Find suitable recyclers for a lot
router.get('/:id/matches', getLotMatches);

// GET /api/lots/:id - Get full lot details with items & calculations
router.get('/:id', getLotById);

// POST /api/lots - Create new lot with optional photo upload
router.post('/', upload.single('photo'), createLot);

module.exports = router;

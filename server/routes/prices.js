const express = require('express');
const router = express.Router();
const {
  getMarketPrices,
  getPriceHistory,
  getPriceLocations,
} = require('../controllers/priceController');

// GET /api/prices/locations - Available cities in prices database
router.get('/locations', getPriceLocations);

// GET /api/prices/history/:materialId - 60-day historical time-series for Recharts
router.get('/history/:materialId', getPriceHistory);

// GET /api/prices - Latest market prices by location & category
router.get('/', getMarketPrices);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getMatches } = require('../controllers/matchController');

// GET /api/match?lot_id=<id>[&collector_lat=&collector_lon=&authorized_only=true&max_distance_km=100&top_n=5]
router.get('/', getMatches);

module.exports = router;

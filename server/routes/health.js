const express = require('express');
const router = express.Router();
const { healthCheck } = require('../controllers/healthController');

/**
 * GET /api/health
 * Live DB + server health check.
 */
router.get('/', healthCheck);

module.exports = router;

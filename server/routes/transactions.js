const express = require('express');
const router = express.Router();
const {
  getTransactions,
  updatePaymentStatus,
  recordHandover,
} = require('../controllers/transactionController');

// GET    /api/transactions              - list transactions & totals (filter by ?collector_id=)
router.get('/', getTransactions);

// PUT    /api/transactions/:id/payment  - update payment status (e.g. mark as 'paid')
router.put('/:id/payment', updatePaymentStatus);

// POST   /api/transactions/handover     - record handover
router.post('/handover', recordHandover);

module.exports = router;

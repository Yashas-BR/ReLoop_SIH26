const express = require('express');
const router = express.Router();
const { recordHandover } = require('../controllers/transactionController');

// GET    /api/transactions              - list transactions (by collector or recycler)
// GET    /api/transactions/:id          - get transaction detail
// POST   /api/transactions              - create transaction (from lot match)
// PUT    /api/transactions/:id/confirm  - recycler confirms transaction
// PUT    /api/transactions/:id/payment  - update payment status

router.get('/', (req, res) => res.json({ message: 'transactions route – coming soon', data: [] }));
router.get('/:id', (req, res) => res.json({ message: 'get transaction by id – coming soon' }));
router.post('/', (req, res) => res.json({ message: 'create transaction – coming soon' }));

// POST /api/transactions/handover
router.post('/handover', recordHandover);

module.exports = router;

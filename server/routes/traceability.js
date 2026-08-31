const express = require('express');
const router = express.Router();
const {
  getByLot,
  getPendingForRecycler,
  confirmReceipt,
  getAllForRecycler,
} = require('../controllers/traceabilityController');

// GET /api/traceability/pending?recycler_id=N  — must come BEFORE /:lotId
router.get('/pending', getPendingForRecycler);

// GET /api/traceability/all?recycler_id=N
router.get('/all', getAllForRecycler);

// GET /api/traceability/lot/:lotId  — collector polling their lot's status
router.get('/lot/:lotId', getByLot);

// PUT /api/traceability/:id/confirm  — recycler confirms receipt
router.put('/:id/confirm', confirmReceipt);

module.exports = router;

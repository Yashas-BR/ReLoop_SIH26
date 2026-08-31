const express = require('express');
const router = express.Router();
// GET    /api/traceability/:lotId       - get traceability record for a lot
// POST   /api/traceability              - create traceability record (at handover)
// PUT    /api/traceability/:id/confirm  - recycler confirms receipt

router.get('/:lotId', (req, res) => res.json({ message: 'get traceability by lot – coming soon' }));
router.post('/', (req, res) => res.json({ message: 'create traceability record – coming soon' }));

module.exports = router;

const express = require('express');
const router = express.Router();
// Controllers will be filled in as features are built
// GET    /api/collectors        - list all collectors
// GET    /api/collectors/:id    - get one collector
// POST   /api/collectors        - create collector
// PUT    /api/collectors/:id    - update collector

router.get('/', (req, res) => res.json({ message: 'collectors route – coming soon', data: [] }));
router.get('/:id', (req, res) => res.json({ message: 'get collector by id – coming soon' }));
router.post('/', (req, res) => res.json({ message: 'create collector – coming soon' }));

module.exports = router;

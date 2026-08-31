const express = require('express');
const router = express.Router();
// GET    /api/recyclers          - list with optional query filters (location, material, etc.)
// GET    /api/recyclers/:id      - get recycler detail
// POST   /api/recyclers          - create recycler
// PUT    /api/recyclers/:id      - update recycler profile

router.get('/', (req, res) => res.json({ message: 'recyclers route – coming soon', data: [] }));
router.get('/:id', (req, res) => res.json({ message: 'get recycler by id – coming soon' }));
router.post('/', (req, res) => res.json({ message: 'create recycler – coming soon' }));

module.exports = router;

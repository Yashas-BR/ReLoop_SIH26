const express = require('express');
const router = express.Router();
const {
  getAllMaterials,
  getCategories,
  getMaterialById,
} = require('../controllers/materialController');

router.get('/categories', getCategories);
router.get('/', getAllMaterials);
router.get('/:id', getMaterialById);

module.exports = router;

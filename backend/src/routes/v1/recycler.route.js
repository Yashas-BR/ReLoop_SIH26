import express from 'express';
import * as recyclerController from '../../controllers/recycler.controller.js';
import * as recyclerCrudController from '../../controllers/recyclerCrud.controller.js';
import { validate } from '../../middlewares/validate.js';
import { matchRecyclersSchema } from '../../validations/recycler.validation.js';
import {
  createRecyclerSchema,
  updateRecyclerSchema,
  getRecyclerSchema,
  listRecyclersSchema,
} from '../../validations/recyclerCrud.validation.js';

const router = express.Router();

// Matching
router.get(
  '/match',
  validate(matchRecyclersSchema),
  recyclerController.getMatchedRecyclers
);

// CRUD
router.post(
  '/',
  validate(createRecyclerSchema),
  recyclerCrudController.createRecycler
);

router.get(
  '/',
  validate(listRecyclersSchema),
  recyclerCrudController.listRecyclers
);

router.get(
  '/:id',
  validate(getRecyclerSchema),
  recyclerCrudController.getRecycler
);

router.put(
  '/:id',
  validate(updateRecyclerSchema),
  recyclerCrudController.updateRecycler
);

router.delete(
  '/:id',
  validate(getRecyclerSchema),
  recyclerCrudController.deleteRecycler
);

export default router;

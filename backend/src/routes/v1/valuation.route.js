import express from 'express';
import * as valuationController from '../../controllers/valuation.controller.js';
import { validate } from '../../middlewares/validate.js';
import { getValuationSchema } from '../../validations/valuation.validation.js';

const router = express.Router();

router.get(
  '/instant',
  validate(getValuationSchema),
  valuationController.getInstantValuation
);

export default router;

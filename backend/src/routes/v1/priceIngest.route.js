import express from 'express';
import * as priceIngestController from '../../controllers/priceIngest.controller.js';
import { validate } from '../../middlewares/validate.js';
import { bulkUpsertPricesSchema, getRecyclerRatesSchema, getRecyclerRateBoardSchema } from '../../validations/priceIngest.validation.js';

const router = express.Router();

router.post(
  '/bulk',
  validate(bulkUpsertPricesSchema),
  priceIngestController.bulkUpsertPrices
);

router.get(
  '/recycler-rates',
  validate(getRecyclerRateBoardSchema),
  priceIngestController.getRecyclerRateBoard
);

router.get(
  '/recyclers/:recyclerId',
  validate(getRecyclerRatesSchema),
  priceIngestController.getRecyclerRates
);

export default router;

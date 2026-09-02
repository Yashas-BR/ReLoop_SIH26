import express from 'express';
import * as anomalyController from '../../controllers/anomaly.controller.js';
import { validate } from '../../middlewares/validate.js';
import { checkTransactionSchema, getAnomaliesSchema } from '../../validations/anomaly.validation.js';

const router = express.Router();

router.post(
  '/check',
  validate(checkTransactionSchema),
  anomalyController.checkTransaction
);

router.get(
  '/',
  validate(getAnomaliesSchema),
  anomalyController.getAnomalies
);

export default router;

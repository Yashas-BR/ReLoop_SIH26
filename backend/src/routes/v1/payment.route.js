import express from 'express';
import * as paymentController from '../../controllers/payment.controller.js';
import { validate } from '../../middlewares/validate.js';
import { updatePaymentSchema, getEarningsSchema } from '../../validations/payment.validation.js';

const router = express.Router();

router.patch(
  '/:lotId',
  validate(updatePaymentSchema),
  paymentController.updatePayment
);

router.get(
  '/earnings/:collectorId',
  validate(getEarningsSchema),
  paymentController.getEarnings
);

router.get(
  '/history/:collectorId',
  validate(getEarningsSchema),
  paymentController.getPaymentHistory
);

export default router;

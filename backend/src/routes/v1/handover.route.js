import express from 'express';
import * as handoverController from '../../controllers/handover.controller.js';
import { validate } from '../../middlewares/validate.js';
import {
  createLotSchema,
  initiateHandoverSchema,
  confirmHandoverSchema,
  getHandoverSchema,
  getHandoversByLotSchema,
} from '../../validations/handover.validation.js';

const router = express.Router();

// Lot creation
router.post(
  '/lots',
  validate(createLotSchema),
  handoverController.createLot
);

// Collector's lots
router.get(
  '/lots/collector/:collectorId',
  handoverController.getLotsByCollector
);

// Handover initiation
router.post(
  '/initiate',
  validate(initiateHandoverSchema),
  handoverController.initiateHandover
);

// Recycler confirms handover
router.post(
  '/confirm/:reference',
  validate(confirmHandoverSchema),
  handoverController.confirmHandover
);

// Get handover by reference
router.get(
  '/:reference',
  validate(getHandoverSchema),
  handoverController.getHandover
);

// Get handovers by lot
router.get(
  '/lot/:lotId',
  validate(getHandoversByLotSchema),
  handoverController.getHandoversByLot
);

export default router;

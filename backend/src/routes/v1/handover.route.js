import express from 'express';
import * as handoverController from '../../controllers/handover.controller.js';
import { validate } from '../../middlewares/validate.js';
import {
  createLotSchema,
  initiateHandoverSchema,
  confirmHandoverSchema,
  getHandoverSchema,
  getHandoversByLotSchema,
  getLotsByRecyclerSchema,
} from '../../validations/handover.validation.js';

const router = express.Router();

// Lot creation
router.post(
  '/lots',
  validate(createLotSchema),
  handoverController.createLot
);

// Collector's lots — must be before /:reference to avoid wildcard capture
router.get(
  '/lots/collector/:collectorId',
  handoverController.getLotsByCollector
);

// Get handovers by lot — must be before /:reference
router.get(
  '/lot/:lotId',
  validate(getHandoversByLotSchema),
  handoverController.getHandoversByLot
);

// Recycler's incoming lots — must be before /:reference wildcard
router.get(
  '/lots/recycler/:recyclerId',
  validate(getLotsByRecyclerSchema),
  handoverController.getLotsByRecycler
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

// Get handover by reference — wildcard, must be last
router.get(
  '/:reference',
  validate(getHandoverSchema),
  handoverController.getHandover
);

export default router;

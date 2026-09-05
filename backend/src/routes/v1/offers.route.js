import express from 'express';
import * as offersController from '../../controllers/offers.controller.js';
import { validate } from '../../middlewares/validate.js';
import {
  requestQuoteSchema,
  sendOfferSchema,
  respondToOfferSchema,
  offerIdSchema,
  getOffersByLotSchema,
  getAvailableLotsSchema,
} from '../../validations/offers.validation.js';

const router = express.Router();

// Lots a recycler can quote on (recycler "marketplace" browse)
router.get('/available', validate(getAvailableLotsSchema), offersController.getAvailableLots);

// Offers on a specific lot (collector view)
router.get('/lot/:lotId', validate(getOffersByLotSchema), offersController.getOffersByLot);

// Collector requests a quote from a recycler
router.post('/request', validate(requestQuoteSchema), offersController.requestQuote);

// Recycler sends a priced offer proactively on an open lot
router.post('/send', validate(sendOfferSchema), offersController.sendOffer);

// Recycler fills in a price for a 'requested' offer
router.post('/:id/respond', validate(respondToOfferSchema), offersController.respondToOffer);

// Collector accepts / rejects an offer
router.post('/:id/accept', validate(offerIdSchema), offersController.acceptOffer);
router.post('/:id/reject', validate(offerIdSchema), offersController.rejectOffer);

export default router;
import { z } from 'zod';

const lotIdSchema = z.string().min(1, 'Lot ID is required');

export const requestQuoteSchema = {
  body: z.object({
    lot_id: lotIdSchema,
    recycler_id: z.coerce.number().int().positive(),
  }),
};

export const sendOfferSchema = {
  body: z.object({
    lot_id: lotIdSchema,
    recycler_id: z.coerce.number().int().positive(),
    offered_price: z.coerce.number().positive('Offer price must be greater than 0'),
    offer_valid_until: z.string().optional(),
  }),
};

export const respondToOfferSchema = {
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    offered_price: z.coerce.number().positive('Offer price must be greater than 0'),
    offer_valid_until: z.string().optional(),
  }),
};

export const offerIdSchema = {
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
};

export const getOffersByLotSchema = {
  params: z.object({
    lotId: lotIdSchema,
  }),
};

export const getAvailableLotsSchema = {
  query: z.object({
    recycler_id: z.coerce.number().int().positive(),
  }),
};
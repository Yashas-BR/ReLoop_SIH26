import { z } from 'zod';

const materialCategory = z.enum([
  'PCB', 'Battery', 'Cable', 'Motor/Magnet Assembly',
  'LCD Panel', 'CRT', 'Mixed Plastic',
]);

export const createLotSchema = {
  body: z.object({
    collector_id: z.coerce.number().int().positive(),
    category: materialCategory,
    sub_category: z.string().optional(),
    description: z.string().optional(),
    image_ref: z.string().optional(),
    approx_weight_kg: z.coerce.number().positive('Weight must be positive'),
    condition: z.string().optional(),
    source_type: z.string().optional(),
    location: z.string().min(1, 'Location is required for valuation'),
  }),
};

export const initiateHandoverSchema = {
  body: z.object({
    lot_id: z.string().min(1, 'Lot ID is required'),
    collector_id: z.coerce.number().int().positive(),
    recycler_id: z.coerce.number().int().positive(),
    photo_refs: z.array(z.string()).optional().default([]),
    weight_kg: z.coerce.number().positive(),
    gps_lat: z.coerce.number().min(-90).max(90),
    gps_lng: z.coerce.number().min(-180).max(180),
    handover_location: z.string().optional(),
  }),
};

export const confirmHandoverSchema = {
  params: z.object({
    reference: z.string().min(1, 'Handover reference number is required'),
  }),
  body: z.object({
    recycler_id: z.coerce.number().int().positive(),
  }),
};

export const getHandoverSchema = {
  params: z.object({
    reference: z.string().min(1),
  }),
};

export const getHandoversByLotSchema = {
  params: z.object({
    lotId: z.string().min(1),
  }),
};

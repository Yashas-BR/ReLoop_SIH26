import { z } from 'zod';

export const checkTransactionSchema = {
  body: z.object({
    lot_id: z.string().min(1),
    material_category: z.string().min(1),
    quoted_price: z.coerce.number().positive(),
    final_price: z.coerce.number().positive().optional(),
    weight_kg: z.coerce.number().positive(),
    recycler_id: z.coerce.number().int().positive().optional(),
    location: z.string().optional(),
  }),
};

export const getAnomaliesSchema = {
  query: z.object({
    category: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
};

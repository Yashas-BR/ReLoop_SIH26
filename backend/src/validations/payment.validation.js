import { z } from 'zod';

export const updatePaymentSchema = {
  params: z.object({
    lotId: z.string().min(1),
  }),
  body: z.object({
    payment_status: z.enum(['pending', 'paid']),
    final_price: z.coerce.number().positive().optional(),
    payment_method: z.enum(['cash', 'upi', 'bank_transfer', 'other']).optional(),
  }),
};

export const getEarningsSchema = {
  params: z.object({
    collectorId: z.coerce.number().int().positive(),
  }),
};

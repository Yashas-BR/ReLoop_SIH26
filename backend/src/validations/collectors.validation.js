import { z } from 'zod';

export const loginCollectorSchema = {
  body: z.object({
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian phone number'),
  }),
};
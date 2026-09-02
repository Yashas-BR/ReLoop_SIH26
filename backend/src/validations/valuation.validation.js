import { z } from 'zod';

export const getValuationSchema = {
  query: z.object({
    category: z.string({ required_error: 'Material category is required' }),
    location: z.string({ required_error: 'Location is required' }),
    weight: z.coerce
      .number({ message: 'Weight must be a number' })
      .positive('Weight must be a positive number'),
  }),
};

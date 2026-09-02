import { z } from 'zod';

export const getPriceTrendSchema = {
  query: z.object({
    category: z.string({ required_error: 'Material category is required' }),
    location: z.string({ required_error: 'Location is required' }),
    days: z.string().optional().default('30').transform((val) => parseInt(val, 10)),
  }),
};

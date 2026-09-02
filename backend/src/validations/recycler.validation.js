import { z } from 'zod';

export const matchRecyclersSchema = {
  query: z.object({
    category: z.string({ required_error: 'Material category is required' }),
    lat: z.string({ required_error: 'Latitude is required' }).transform(Number),
    lng: z.string({ required_error: 'Longitude is required' }).transform(Number),
    maxDistanceKm: z.string().optional().default('50').transform(Number),
  }),
};

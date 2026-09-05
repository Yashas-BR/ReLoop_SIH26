import { z } from 'zod';

const materialsAcceptedItem = z.enum([
  'PCB', 'Battery', 'Cable', 'Motor/Magnet Assembly',
  'LCD Panel', 'CRT', 'Mixed Plastic',
]);

export const createRecyclerSchema = {
  body: z.object({
    name: z.string().min(1, 'Recycler name is required'),
    facility_location: z.string().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    materials_accepted: z.array(materialsAcceptedItem).min(1, 'At least one material category required'),
    authorization_status: z.enum(['authorized', 'unauthorized', 'pending']).default('pending'),
    authorization_details: z.string().optional(),
    authorization_number: z.string().optional(),
    verification_source: z.string().optional(),
    contact_details: z.string().optional(),
    pickup_availability: z.enum(['daily', 'weekly', 'on_request']).optional(),
    service_area: z.string().optional(),
  }),
};

export const onboardRecyclerSchema = {
  body: z.object({
    name: z.string().min(1, 'Company name is required'),
    facility_location: z.string().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    materials_accepted: z.array(materialsAcceptedItem).min(1, 'At least one material category required'),
    authorization_number: z.string().optional(),
    contact_details: z.string().optional(),
    pickup_availability: z.enum(['daily', 'weekly', 'on_request']).optional(),
    service_area: z.string().optional(),
  }),
};

export const loginRecyclerSchema = {
  body: z.object({
    recycler_id: z.coerce.number().int().positive(),
  }),
};

export const updateRecyclerSchema = {
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    facility_location: z.string().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    materials_accepted: z.array(materialsAcceptedItem).min(1).optional(),
    authorization_status: z.enum(['authorized', 'unauthorized', 'pending']).optional(),
    authorization_details: z.string().optional(),
    authorization_number: z.string().optional(),
    verification_source: z.string().optional(),
    contact_details: z.string().optional(),
    pickup_availability: z.enum(['daily', 'weekly', 'on_request']).optional(),
    service_area: z.string().optional(),
  }),
};

export const getRecyclerSchema = {
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
};

export const listRecyclersSchema = {
  query: z.object({
    authorization_status: z.enum(['authorized', 'unauthorized', 'pending']).optional(),
    material: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
};

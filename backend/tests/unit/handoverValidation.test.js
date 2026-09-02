import { describe, it, expect } from 'vitest';
import {
  createLotSchema,
  initiateHandoverSchema,
  confirmHandoverSchema,
} from '../../src/validations/handover.validation.js';

describe('Handover Validation', () => {
  describe('createLotSchema', () => {
    const schema = createLotSchema.body;

    it('accepts valid lot data', () => {
      const result = schema.safeParse({
        collector_id: 1,
        category: 'PCB',
        approx_weight_kg: 5.5,
        location: 'Bengaluru',
      });
      expect(result.success).toBe(true);
    });

    it('accepts all optional fields', () => {
      const result = schema.safeParse({
        collector_id: 1,
        category: 'Battery',
        sub_category: 'Li-ion',
        description: 'Old batteries',
        image_ref: '/img/test.jpg',
        approx_weight_kg: 2.0,
        condition: 'intact',
        source_type: 'household',
        location: 'Bengaluru',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid category', () => {
      const result = schema.safeParse({
        collector_id: 1,
        category: 'InvalidMaterial',
        approx_weight_kg: 5,
        location: 'Bengaluru',
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative weight', () => {
      const result = schema.safeParse({
        collector_id: 1,
        category: 'PCB',
        approx_weight_kg: -1,
        location: 'Bengaluru',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing location', () => {
      const result = schema.safeParse({
        collector_id: 1,
        category: 'PCB',
        approx_weight_kg: 5,
      });
      expect(result.success).toBe(false);
    });

    it('accepts all valid categories', () => {
      const categories = ['PCB', 'Battery', 'Cable', 'Motor/Magnet Assembly', 'LCD Panel', 'CRT', 'Mixed Plastic'];
      for (const category of categories) {
        const result = schema.safeParse({
          collector_id: 1,
          category,
          approx_weight_kg: 1,
          location: 'Bengaluru',
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('initiateHandoverSchema', () => {
    const schema = initiateHandoverSchema.body;

    it('accepts valid handover data', () => {
      const result = schema.safeParse({
        lot_id: 'LOT-001',
        collector_id: 1,
        recycler_id: 2,
        weight_kg: 5.5,
        gps_lat: 12.97,
        gps_lng: 77.59,
      });
      expect(result.success).toBe(true);
    });

    it('accepts photo_refs array', () => {
      const result = schema.safeParse({
        lot_id: 'LOT-001',
        collector_id: 1,
        recycler_id: 2,
        photo_refs: ['img1.jpg', 'img2.jpg'],
        weight_kg: 5,
        gps_lat: 12.97,
        gps_lng: 77.59,
      });
      expect(result.success).toBe(true);
      expect(result.data.photo_refs).toEqual(['img1.jpg', 'img2.jpg']);
    });

    it('defaults photo_refs to empty array', () => {
      const result = schema.safeParse({
        lot_id: 'LOT-001',
        collector_id: 1,
        recycler_id: 2,
        weight_kg: 5,
        gps_lat: 12.97,
        gps_lng: 77.59,
      });
      expect(result.success).toBe(true);
      expect(result.data.photo_refs).toEqual([]);
    });

    it('rejects out-of-range latitude', () => {
      const result = schema.safeParse({
        lot_id: 'LOT-001',
        collector_id: 1,
        recycler_id: 2,
        weight_kg: 5,
        gps_lat: 91,
        gps_lng: 77.59,
      });
      expect(result.success).toBe(false);
    });

    it('rejects out-of-range longitude', () => {
      const result = schema.safeParse({
        lot_id: 'LOT-001',
        collector_id: 1,
        recycler_id: 2,
        weight_kg: 5,
        gps_lat: 12.97,
        gps_lng: 181,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('confirmHandoverSchema', () => {
    it('accepts valid reference and recycler_id', () => {
      const result = confirmHandoverSchema.body.safeParse({ recycler_id: 1 });
      expect(result.success).toBe(true);
    });

    it('rejects missing recycler_id', () => {
      const result = confirmHandoverSchema.body.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects negative recycler_id', () => {
      const result = confirmHandoverSchema.body.safeParse({ recycler_id: -1 });
      expect(result.success).toBe(false);
    });
  });
});

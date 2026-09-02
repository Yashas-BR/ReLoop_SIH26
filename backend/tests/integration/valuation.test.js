import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/db.js';
import { resetAndSeed } from '../helpers/db.js';

let server;

beforeAll(async () => {
  await resetAndSeed();
  return new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

describe('Instant Valuation API', () => {
  it('GET /v1/valuation/instant returns estimated value', async () => {
    const res = await request(server)
      .get('/v1/valuation/instant')
      .query({ category: 'PCB', location: 'Bengaluru', weight: '5' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.estimated_value).toBeGreaterThan(0);
    expect(res.body.data.unit_price).toBeGreaterThan(0);
    expect(res.body.data.weight_kg).toBe(5);
    expect(res.body.data.category).toBe('PCB');
    expect(res.body.data.location).toBe('Bengaluru');
  });

  it('validates estimated_value = unit_price * weight', async () => {
    const res = await request(server)
      .get('/v1/valuation/instant')
      .query({ category: 'PCB', location: 'Bengaluru', weight: '10' })
      .expect(200);

    const { estimated_value, unit_price } = res.body.data;
    expect(Math.abs(estimated_value - unit_price * 10)).toBeLessThan(0.01);
  });

  it('returns 400 for missing category', async () => {
    const res = await request(server)
      .get('/v1/valuation/instant')
      .query({ location: 'Bengaluru', weight: '5' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid weight', async () => {
    const res = await request(server)
      .get('/v1/valuation/instant')
      .query({ category: 'PCB', location: 'Bengaluru', weight: '-5' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown category', async () => {
    const res = await request(server)
      .get('/v1/valuation/instant')
      .query({ category: 'Unknown', location: 'Bengaluru', weight: '5' });

    expect(res.status).toBe(404);
  });
});

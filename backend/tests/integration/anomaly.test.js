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

describe('Anomaly Detection API', () => {
  it('POST /v1/anomaly/check flags statistically anomalous values', async () => {
    // Use an extreme price so it's an obvious outlier
    const res = await request(server)
      .post('/v1/anomaly/check')
      .send({
        lot_id: 'TEST-LOT-ANOMALY',
        material_category: 'PCB',
        quoted_price: 50000,
        weight_kg: 5,
        location: 'Bengaluru',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.is_anomalous).toBe(true);
    expect(res.body.data.flags.length).toBeGreaterThan(0);
    expect(res.body.data.unit_price).toBe(10000);
  });

  it('POST /v1/anomaly/check returns market range info', async () => {
    const res = await request(server)
      .post('/v1/anomaly/check')
      .send({
        lot_id: 'TEST-LOT-2',
        material_category: 'PCB',
        quoted_price: 1350,
        weight_kg: 5,
        location: 'Bengaluru',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.market_range).toBeDefined();
    expect(res.body.data.market_range.high).toBeGreaterThan(0);
  });

  it('POST /v1/anomaly/check accepts plausible value without error', async () => {
    const res = await request(server)
      .post('/v1/anomaly/check')
      .send({
        lot_id: 'TEST-LOT-3',
        material_category: 'Cable',
        quoted_price: 1700,
        weight_kg: 5,
        location: 'Bengaluru',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    // May or may not be anomalous, but must not error
    expect(typeof res.body.data.is_anomalous).toBe('boolean');
  });

  it('POST /v1/anomaly/check rejects invalid data', async () => {
    const res = await request(server)
      .post('/v1/anomaly/check')
      .send({
        lot_id: 'TEST',
        material_category: 'PCB',
        quoted_price: -100,
        weight_kg: 5,
      });

    expect(res.status).toBe(400);
  });

  it('GET /v1/anomaly returns list (may be empty)', async () => {
    const res = await request(server)
      .get('/v1/anomaly')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.anomalies)).toBe(true);
  });

  it('GET /v1/anomaly supports category filter', async () => {
    const res = await request(server)
      .get('/v1/anomaly')
      .query({ category: 'PCB' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

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

describe('Price Ingestion API', () => {
  it('POST /v1/prices/ingest/bulk inserts new prices', async () => {
    const res = await request(server)
      .post('/v1/prices/ingest/bulk')
      .send({
        recycler_id: 1,
        location: 'Bengaluru',
        prices: [
          { material_category: 'PCB', buying_price: 268.0, quoted_price: 278.0 },
        ],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.recycler_id).toBe(1);
    expect(res.body.data.inserted).toBe(1);
    expect(res.body.data.updated).toBe(0);
  });

  it('GET /v1/prices/ingest/recyclers/:recyclerId returns rates', async () => {
    const res = await request(server)
      .get('/v1/prices/ingest/recyclers/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const rate of res.body.data) {
      expect(rate.recycler_id).toBe(1);
    }
  });

  it('POST /v1/prices/ingest/bulk upserts market-wide (no recycler)', async () => {
    const res = await request(server)
      .post('/v1/prices/ingest/bulk')
      .send({
        location: 'Bengaluru',
        prices: [
          { material_category: 'CRT', buying_price: 17.0 },
        ],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.recycler_id).toBe(null);
    expect(res.body.data.inserted).toBe(1);
  });

  it('POST /v1/prices/ingest/bulk returns 404 for unknown recycler', async () => {
    const res = await request(server)
      .post('/v1/prices/ingest/bulk')
      .send({
        recycler_id: 9999,
        location: 'Bengaluru',
        prices: [{ material_category: 'PCB', buying_price: 100 }],
      });

    expect(res.status).toBe(404);
  });

  it('POST /v1/prices/ingest/bulk rejects invalid data', async () => {
    const res = await request(server)
      .post('/v1/prices/ingest/bulk')
      .send({
        location: 'Bengaluru',
        prices: [{ material_category: 'Invalid', buying_price: 100 }],
      });

    expect(res.status).toBe(400);
  });

  it('POST /v1/prices/ingest/bulk rejects empty prices', async () => {
    const res = await request(server)
      .post('/v1/prices/ingest/bulk')
      .send({ location: 'Bengaluru', prices: [] });

    expect(res.status).toBe(400);
  });
});

describe('Price Trend API', () => {
  it('GET /v1/prices/trends returns historical price data', async () => {
    const res = await request(server)
      .get('/v1/prices/trends')
      .query({ category: 'PCB', location: 'Bengaluru', days: '90' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const first = res.body.data[0];
    expect(first.buying_price).toBeDefined();
    expect(first.price_date).toBeDefined();
  });

  it('GET /v1/prices/trends returns data sorted by date ascending', async () => {
    const res = await request(server)
      .get('/v1/prices/trends')
      .query({ category: 'PCB', location: 'Bengaluru' });

    const dates = res.body.data.map((d) => new Date(d.price_date).getTime());
    const sorted = [...dates].sort((a, b) => a - b);
    expect(dates).toEqual(sorted);
  });

  it('GET /v1/prices/trends returns 400 for missing category', async () => {
    const res = await request(server)
      .get('/v1/prices/trends')
      .query({ location: 'Bengaluru' });

    expect(res.status).toBe(400);
  });
});

describe('Health Check', () => {
  it('GET /v1/health returns UP', async () => {
    const res = await request(server)
      .get('/v1/health')
      .expect(200);

    expect(res.body.status).toBe('UP');
  });
});

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

async function createOpenLot(collectorId = 2, category = 'Cable', weight = 5) {
  const res = await request(server)
    .post('/v1/handover/lots')
    .send({ collector_id: collectorId, category, approx_weight_kg: weight, location: 'Peenya, Bengaluru' })
    .expect(201);
  return res.body.data.lot.lot_id;
}

describe('Quote / Offer Marketplace API', () => {
  it('collector requests a quote from an authorized recycler', async () => {
    const res = await request(server)
      .post('/v1/quotes/request')
      .send({ lot_id: 'LOT-2026-0001', recycler_id: 5 })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.offer_status).toBe('requested');
    expect(res.body.data.collector_id).toBe(1);
    expect(res.body.data.recycler_id).toBe(5);
  });

  it('requesting the same quote again returns the existing open offer', async () => {
    const first = await request(server)
      .post('/v1/quotes/request')
      .send({ lot_id: 'LOT-2026-0001', recycler_id: 5 });

    const res = await request(server)
      .post('/v1/quotes/request')
      .send({ lot_id: 'LOT-2026-0001', recycler_id: 5 })
      .expect(201);

    expect(res.body.data.id).toBe(first.body.data.id);
  });

  it('rejects a request to a recycler that does not accept the material', async () => {
    const res = await request(server)
      .post('/v1/quotes/request')
      .send({ lot_id: 'LOT-2026-0001', recycler_id: 8 }) // Demo D: Cable/Mixed Plastic/CRT
      .expect(400);

    expect(res.body.code).toBe(400);
    expect(res.body.message).toMatch(/does not accept/i);
  });

  it('rejects a request to a recycler pending authorization', async () => {
    const res = await request(server)
      .post('/v1/quotes/request')
      .send({ lot_id: 'LOT-2026-0001', recycler_id: 7 }) // Demo C: pending
      .expect(400);

    expect(res.body.code).toBe(400);
    expect(res.body.message).toMatch(/authorized/i);
  });

  it('recycler fills in a price on a requested offer', async () => {
    const req = await request(server)
      .post('/v1/quotes/request')
      .send({ lot_id: 'LOT-2026-0001', recycler_id: 1 });

    const res = await request(server)
      .post(`/v1/quotes/${req.body.data.id}/respond`)
      .send({ offered_price: 240 })
      .expect(200);

    expect(res.body.data.offer_status).toBe('offered');
    expect(Number(res.body.data.offered_price)).toBe(240);
  });

  it('collector accepts an offer → transaction becomes accepted at the offer price', async () => {
    const req = await request(server)
      .post('/v1/quotes/request')
      .send({ lot_id: 'LOT-2026-0001', recycler_id: 5 });

    // Respond as the recycler first
    await request(server)
      .post(`/v1/quotes/${req.body.data.id}/respond`)
      .send({ offered_price: 250 });

    const res = await request(server)
      .post(`/v1/quotes/${req.body.data.id}/accept`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.offer.offer_status).toBe('accepted');
    expect(res.body.data.transaction.transaction_status).toBe('accepted');
    expect(res.body.data.transaction.recycler_id).toBe(5);
    expect(Number(res.body.data.transaction.quoted_price)).toBe(250);
  });

  it('an accepted lot cannot be quoted again', async () => {
    const res = await request(server)
      .post('/v1/quotes/request')
      .send({ lot_id: 'LOT-2026-0001', recycler_id: 1 })
      .expect(400);

    expect(res.body.message).toMatch(/already has an accepted quote/i);
  });

  it('collector can reject an offer and the lot opens back up', async () => {
    const lotId = await createOpenLot();

    const req = await request(server)
      .post('/v1/quotes/request')
      .send({ lot_id: lotId, recycler_id: 8 });

    await request(server)
      .post(`/v1/quotes/${req.body.data.id}/respond`)
      .send({ offered_price: 300 });

    const res = await request(server)
      .post(`/v1/quotes/${req.body.data.id}/reject`)
      .expect(200);

    expect(res.body.data.offer_status).toBe('rejected');

    // The lot shows up again in the recycler's available pool
    const avail = await request(server)
      .get('/v1/quotes/available')
      .query({ recycler_id: 8 })
      .expect(200);

    expect(avail.body.data.map((l) => l.lot_id)).toContain(lotId);
  });

  it('GET /v1/quotes/available only lists lots matching the recycler materials', async () => {
    // Recycler 3 (Samarthanam) accepts Cable/Mixed Plastic/CRT — created Cable lot should appear,
    // but the PCB lot must not (recycler does not accept PCB).
    const freshLot = await createOpenLot(2, 'Cable', 6);

    const res = await request(server)
      .get('/v1/quotes/available')
      .query({ recycler_id: 3 })
      .expect(200);

    const lotIds = res.body.data.map((l) => l.lot_id);
    expect(lotIds).toContain(freshLot);
    expect(lotIds).not.toContain('LOT-2026-0001');
  });

  it('GET /v1/quotes/lot/:lotId returns offers for a lot', async () => {
    const res = await request(server)
      .get('/v1/quotes/lot/LOT-2026-0001')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const ids = res.body.data.map((o) => o.recycler_id);
    expect(ids).toContain(5);
  });
});
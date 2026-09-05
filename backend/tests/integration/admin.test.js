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

describe('Admin + Recycler Onboarding API', () => {
  it('POST /v1/admin/login rejects an invalid admin code', async () => {
    const res = await request(server)
      .post('/v1/admin/login')
      .send({ code: 'wrong-code' })
      .expect(401);

    expect(res.body.code).toBe(401);
  });

  it('POST /v1/admin/login accepts the demo admin code', async () => {
    const res = await request(server)
      .post('/v1/admin/login')
      .send({ code: 'KBC-ADMIN-2026' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.admin.role).toBe('admin');
    expect(res.body.data.token).toMatch(/^mock-admin-/);
  });

  it('GET /v1/admin/summary returns dashboard counts', async () => {
    const res = await request(server).get('/v1/admin/summary').expect(200);

    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.collectors)).toBe(2);
    expect(Number(res.body.data.recyclers)).toBe(10);
    expect(Number(res.body.data.pending_recyclers)).toBe(1);
    expect(Number(res.body.data.lots)).toBe(6);
    expect(Number(res.body.data.price_sources)).toBe(4);
  });

  it('POST /v1/recyclers/onboard creates a pending authorization application', async () => {
    const res = await request(server)
      .post('/v1/recyclers/onboard')
      .send({
        name: 'Green E-Waste Solutions',
        facility_location: 'Peenya, Bengaluru',
        materials_accepted: ['PCB', 'Battery'],
        authorization_number: 'KSPCB/EW/2026/0042',
        contact_details: 'info@greenewaste.example',
        service_area: 'Peenya, 10 km radius',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.authorization_status).toBe('pending');
    expect(res.body.data.authorization_number).toBe('KSPCB/EW/2026/0042');
    expect(res.body.data.id).toBeDefined();
  });

  it('admin verifies a pending recycler', async () => {
    const res = await request(server)
      .post('/v1/admin/recyclers/7/verify')
      .send({ decision: 'authorized', verification_source: 'KSPCB list 31.01.2023 + EPR check' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.authorization_status).toBe('authorized');
    expect(res.body.data.last_verified_at).toBeTruthy();
  });

  it('admin can also revoke authorization', async () => {
    const res = await request(server)
      .post('/v1/admin/recyclers/7/verify')
      .send({ decision: 'unauthorized' })
      .expect(200);

    expect(res.body.data.authorization_status).toBe('unauthorized');
  });

  it('verify endpoint returns 404 for a missing recycler', async () => {
    const res = await request(server)
      .post('/v1/admin/recyclers/9999/verify')
      .send({ decision: 'authorized' })
      .expect(404);

    expect(res.body.code).toBe(404);
  });

  it('GET /v1/admin/price-sources lists the provenance registry', async () => {
    const res = await request(server).get('/v1/admin/price-sources').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(4);
    const types = res.body.data.map((s) => s.source_type);
    expect(types).toContain('MARKET_REFERENCE');
    expect(types).toContain('REGULATORY');
  });
});
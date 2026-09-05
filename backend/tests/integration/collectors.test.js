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

describe('Collector Auth API', () => {
  it('GET /v1/collectors lists seeded collector accounts', async () => {
    const res = await request(server).get('/v1/collectors').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    const names = res.body.data.map((c) => c.name);
    expect(names).toContain('Ramesh Kumar');
    expect(names).toContain('Suresh Patil');
  });

  it('POST /v1/collectors/login returns collector + token for a valid phone', async () => {
    const res = await request(server)
      .post('/v1/collectors/login')
      .send({ phone: '9876543210' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.collector.name).toBe('Ramesh Kumar');
    expect(res.body.data.collector.phone).toBe('9876543210');
    expect(res.body.data.token).toMatch(/^mock-login-1-/);
  });

  it('POST /v1/collectors/login rejects an unknown phone', async () => {
    const res = await request(server)
      .post('/v1/collectors/login')
      .send({ phone: '9000000000' })
      .expect(404);

    expect(res.body.code).toBe(404);
    expect(res.body.message).toMatch(/collector/i);
  });

  it('POST /v1/collectors/login rejects a malformed phone', async () => {
    const res = await request(server)
      .post('/v1/collectors/login')
      .send({ phone: '123' })
      .expect(400);

    expect(res.body.code).toBe(400);
  });
});
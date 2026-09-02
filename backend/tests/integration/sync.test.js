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

describe('Offline Sync API', () => {
  it('POST /v1/sync/batch processes a batch of records', async () => {
    const res = await request(server)
      .post('/v1/sync/batch')
      .send({
        records: [
          {
            client_id: 'int-test-lot-1',
            type: 'lot',
            collector_id: 1,
            category: 'Cable',
            approx_weight_kg: 15,
            location: 'Bengaluru',
          },
        ],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.total).toBe(1);
    expect(res.body.data.summary.successful).toBe(1);
    expect(res.body.data.results[0].status).toBe('success');
  });

  it('POST /v1/sync/batch detects and skips duplicates', async () => {
    const batch = {
      records: [
        {
          client_id: 'dup-test-1',
          type: 'lot',
          collector_id: 1,
          category: 'Battery',
          approx_weight_kg: 2,
          location: 'Bengaluru',
        },
      ],
    };

    // First submit
    await request(server).post('/v1/sync/batch').send(batch).expect(200);

    // Resubmit - should be duplicate
    const res = await request(server)
      .post('/v1/sync/batch')
      .send(batch)
      .expect(200);

    expect(res.body.data.summary.duplicates).toBe(1);
    expect(res.body.data.results[0].status).toBe('duplicate');
  });

  it('POST /v1/sync/batch handles mixed success and errors', async () => {
    const res = await request(server)
      .post('/v1/sync/batch')
      .send({
        records: [
          {
            client_id: 'int-test-lot-2',
            type: 'lot',
            collector_id: 2,
            category: 'CRT',
            approx_weight_kg: 10,
            location: 'Bengaluru',
          },
          {
            // Invalid handover - lot doesn't exist
            client_id: 'int-test-bad-handover',
            type: 'handover',
            lot_id: 'NONEXISTENT-LOT',
            collector_id: 1,
            recycler_id: 1,
            weight_kg: 5,
            gps_lat: 12.97,
            gps_lng: 77.59,
          },
        ],
      })
      .expect(200);

    expect(res.body.data.summary.total).toBe(2);
    expect(res.body.data.summary.successful).toBe(1);
    expect(res.body.data.summary.errors).toBe(1);
  });

  it('POST /v1/sync/batch rejects empty records', async () => {
    const res = await request(server)
      .post('/v1/sync/batch')
      .send({ records: [] });

    expect(res.status).toBe(400);
  });

  it('POST /v1/sync/batch rejects records without client_id', async () => {
    const res = await request(server)
      .post('/v1/sync/batch')
      .send({
        records: [{
          type: 'lot',
          collector_id: 1,
          category: 'PCB',
          approx_weight_kg: 5,
          location: 'Bengaluru',
        }],
      });

    expect(res.status).toBe(400);
  });
});

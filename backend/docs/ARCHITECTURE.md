# Kabadiwala Connect — Backend Architecture

## Overview

Kabadiwala Connect (SIH26229) is a platform that connects informal scrap
collectors (kabadiwalas) with authorized e-waste recyclers. It digitizes the
entire flow — instant valuation, recycler matching, handover with traceability,
anomaly detection, offline sync, and payments — to make informal e-waste
collection safer, fairer, and traceable.

## Technology Stack

| Layer        | Choice                                             |
|--------------|----------------------------------------------------|
| Runtime      | Node.js (ES Modules)                               |
| Framework    | Express                                            |
| Language     | Plain JavaScript with JSDoc type hints             |
| Validation   | Zod                 |
| Database     | PostgreSQL (local `kabadiwala_connect`)            |
| Query access | `pg` connection pool                               |
| Logging      | Pino                                              |
| Errors       | Custom `ApiError` + centralized error handler       |
| Tests        | Vitest + Supertest                                 |

## Layered Architecture

Code follows a strict request flow:

```
HTTP request
   │
   ▼
routes/v1/*.route.js        ── mount path, pick validation + controller
   │
   ▼
middlewares/validate.js      ── Zod schema parse → 400 on failure
   │
   ▼
controllers/*.controller.js  ── extract req, delegate to service, shape response
   │
   ▼
services/*.service.js        ── business logic, SQL via db.js
   │
   ▼
db.js                        ── pg Pool + query helper → PostgreSQL
```

### src/app.js

Builds the Express app: security headers (helmet-style), CORS, JSON body
parsing, Pino request logging, mounts the `/api/v1` router, and registers the
central error handler. `express-async-errors` ensures rejected async
controllers route to the error middleware automatically.

### src/db.js

Exports a single `pool` (pg `Pool` from `.env` connection vars) and a `query`
helper used by every service.

### src/middlewares/validate.js

Framework-agnostic Zod validation middleware. Accepts `{ params, query, body }`
schemas, calls `.parse()` on each, and converts `ZodError` into a `400 ApiError`
(reads `error.issues`, the Zod v4 field).

### src/middlewares/errorHandler.js

Central handler that translates `ApiError` instances into the standard error
envelope and logs anything unexpected as a `500`.

## Domain Services

| Service               | Responsibility                                                        |
|-----------------------|-----------------------------------------------------------------------|
| `valuation`           | Per-kg price lookup + instant estimate from market rate data          |
| `recycler`            | Weighted matching of authorized recyclers                             |
| `recyclerCrud`        | Create / read / update / delete recyclers                            |
| `price`               | Historical price trends                                               |
| `priceIngest`         | Bulk price upsert linking rates to recyclers                          |
| `handover`            | Lots, handover initiation, recycler confirmation, traceability        |
| `anomaly`             | Market-range + z-score outlier detection                              |
| `sync`                | Offline batch ingestion with `sync_log` deduplication                 |
| `payment`             | Payment status transitions + earnings / history reporting             |

## Recycler Matching Algorithm

`match_score = 0.5 · normDistance + 0.3 · normRate + 0.2 · pickupPenalty`

Implemented in a single SQL query with window functions that normalise
`distance_km` and `offered_rate` between 0 and 1 across the candidate set.
Only `authorized` recyclers that accept the requested material are candidates;
the `pickupPenalty` favours recyclers with a local `service_area`. Results are
ordered ascending by `match_score`.

## Handover & Traceability

- `POST /handover/lots` creates a lot and computes its estimated value.
- `POST /handover/initiate` produces a unique `HO-...` reference and records the
  first traceability event; rejects unauthorized recyclers.
- `POST /handover/confirm/:reference` lets the recycler confirm receipt, flipping
  `status = confirmed` and recording a confirmation timestamp.
- Every transition appends an immutable audit event to `traceability` for a
  full chain of custody.

## Anomaly Detection

Two signals per quoted price:

1. **Market range** — outside the category's `market_range_low/high` for the
   location → `exceeds_market_range`.
2. **Statistical outlier** — a z-score past a threshold relative to recent
   transactions → `statistical_outlier`.

## Offline Sync

Collector app submits batches of locally-queued records. A `sync_log` table
stores each client-sourced record (`client_id`); re-submitting the same
`client_id` is detected as a duplicate and skipped, making syncing idempotent
over flaky connectivity.

## Database

Schema and seed data live in `sql/`, run in order:

| File                      | Purpose                                            |
|---------------------------|----------------------------------------------------|
| `01_schema.sql`           | Full schema (incl. unique budget constraint)       |
| `02_seed_recyclers_prices.sql` | Seeding recyclers, materials, base prices      |
| `03_seed_transactions.sql`    | Demo transactions / traceability sample         |
| `04_reset.sql`            | Truncate all tables / reset identity columns       |
| `05_seed_recycler_rates.sql`  | Recycler-specific rate rows (bulk linkage)      |

Scripts: `npm run migrate`, `npm run seed`, `npm run reset`.

Expected counts after seed: recyclers = 10, prices = 77, collectors = 2,
materials = 6, transactions = 6, traceability = 3.

Key tables: `collectors`, `recyclers`, `materials`, `prices`, `transactions`,
`lots`, `handovers`, `traceability`, `sync_log`.

## Configuration

`.env`:

```
PGHOST=localhost
PGPORT=5432
PGDATABASE=kabadiwala_connect
PGUSER=postgres
PGPASSWORD=Password@postgresql
PORT=3000
```

## Testing

- Unit tests: `tests/unit/*.test.js` (ApiError, Zod validation schemas).
- Integration tests: `tests/integration/*.test.js` spin up a real server +
  Postgres via Supertest.
- Isolation: `tests/helpers/db.js` resets + reseeds before each integration
  file; tests run serially (`fileParallelism: false`) because they share one DB.
- Run with `npm test` (or `test:unit`, `test:integration`, `test:watch`).

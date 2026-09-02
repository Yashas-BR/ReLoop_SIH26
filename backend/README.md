# Kabadiwala Connect — Database Layer (PostgreSQL)

Fully tested and verified — schema, seed data, and connection layer for SIH26229.

## What's in here
```
kabadiwala-db/
├── package.json
├── .env.example          # copy to .env and fill in your DB credentials
├── sql/
│   ├── 01_schema.sql               # all 6 required tables + indexes
│   ├── 02_seed_recyclers_prices.sql # 10 recyclers, 49 price records
│   ├── 03_seed_transactions.sql     # collectors, materials, transactions, traceability
│   └── 04_reset.sql                 # truncates everything, resets IDs
└── src/
    ├── db.js              # connection pool (import { pool } from here)
    ├── test-connection.js # verifies DB is reachable
    ├── migrate.js         # runs schema.sql
    ├── seed.js             # runs seed files + verifies row counts
    └── reset.js            # clears data for a clean demo state
```

## Setup

1. Install PostgreSQL locally, or create a free instance on Neon/Supabase.
2. `npm install`
3. `cp .env.example .env` and fill in your real credentials (either the
   individual `PGHOST`/`PGUSER`/etc fields for local Postgres, or just
   `DATABASE_URL` if using a hosted provider — the code prefers
   `DATABASE_URL` automatically if it's set).
4. Create the database if it doesn't exist yet:
   ```
   psql -U postgres -c "CREATE DATABASE kabadiwala_connect;"
   ```
5. `npm run test-connection` — should print a ✅ and your Postgres version.
6. `npm run migrate` — creates all 6 tables.
7. `npm run seed` — loads seed data and verifies counts automatically.

## Verified row counts (confirmed by actually running this)
| Table | Count |
|---|---|
| recyclers | 10 |
| prices | 49 |
| collectors | 2 |
| materials | 6 |
| transactions | 6 |
| traceability | 3 |

## Resetting for a clean demo
```
npm run reset
npm run seed
```

## For Vedanth (backend integration)
Import the shared connection pool directly instead of creating a new one:
```js
import { pool, query } from './db.js';

const result = await query('SELECT * FROM recyclers WHERE authorization_status = $1', ['authorized']);
```

**Exact enum string values used in the schema** (match these exactly in any filtering logic):
- `category`: `'PCB'`, `'Battery'`, `'CRT'`, `'LCD Panel'`, `'Cable'`, `'Motor/Magnet Assembly'`, `'Mixed Plastic'`
- `authorization_status`: `'authorized'`, `'unauthorized'`, `'pending'`
- `transaction_status`: `'quoted'`, `'matched'`, `'handed_over'`, `'confirmed'`
- `payment_status`: `'pending'`, `'paid'`
- `condition`: `'intact'`, `'damaged'`, `'partially_dismantled'`
- `source_type`: `'household'`, `'commercial'`, `'industrial'`

## Known data notes
- Recycler names, phone numbers, and CPCB registration numbers in the seed
  data are **illustrative/synthetic**, not real verified businesses —
  state this clearly if asked by judges.
- Prices are anchored to real researched Bengaluru e-waste market rates
  (scraprates.in, resale.todaypricerates.com, June-Aug 2026) with
  realistic variation applied — not arbitrary numbers, but not live
  market data either.
- `LOT-2026-0006` is intentionally `handed_over` with no matching
  traceability row — a deliberate edge case for testing data-integrity
  handling before the real demo.

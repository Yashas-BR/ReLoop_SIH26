# Kabadiwala Connect — Run the Backend & Connect a Frontend

This guide is for **Tanush (frontend)** (and anyone else) who needs to get the
backend up locally and point a UI at it.

## 0. What you need installed

- **Node.js** 18+ (LTS recommended)
- **PostgreSQL** running locally (the backend connects to `localhost:5432`)
- A terminal

## 1. Install backend dependencies

```bash
cd backend
npm install
```

## 2. Configure the database connection

A `.env` file already exists in `backend/` (git-ignored). Typical local config:

```
PGHOST=localhost
PGPORT=5432
PGDATABASE=kabadiwala_connect
PGUSER=postgres
PGPASSWORD=your_password
```

- If you use a hosted/remote Postgres (Neon/Supabase), put its connection string
  in `DATABASE_URL=` instead — the code prefers it automatically.
- If the password isn't yours, create your own `.env` from `backend/.env.example`
  and use your local Postgres password.
- Create the database if it doesn't exist:
  `createdb kabadiwala_connect` (or via pgAdmin/psql).

## 3. Create the schema and load seed data

```bash
cd backend
npm run migrate   # runs sql/01_schema.sql
npm run seed      # loads demo data (10 recyclers, 77 prices, ...)
```

Verify: `npm run reset && npm run seed` gives a clean state and prints
"All seed data loaded correctly."

## 4. Start the backend

```bash
cd backend
npm start         # production (node src/server.js)
# or
npm run dev       # dev with auto-restart (nodemon)
```

You should see:

```
Connected to PostgreSQL database
Listening to port 3000
```

**Base URL:** `http://localhost:3000/v1`

Quick sanity check — open `http://localhost:3000/v1/health` → `{"status":"UP"}`

**Port:** defaults to `3000`; override with `PORT=4000 npm start`.

## 5. How a frontend connects

The backend calls **CORS `*`** (`app.use(cors())`) so a frontend running on any
port (e.g. Vite's `http://localhost:5173`) can call it directly from the
browser — no proxy needed.

All endpoints are under `/v1`. Examples the frontend will use first:

| Purpose             | Endpoint                          |
|---------------------|-----------------------------------|
| Health check        | `GET /v1/health`                  |
| Instant valuation   | `GET /v1/valuation/instant?category=PCB&location=Bengaluru&weight=5` |
| Recycler matching   | `GET /v1/recyclers/match?category=PCB&lat=12.9716&lng=77.5946` |
| Price trends        | `GET /v1/prices/trends?category=PCB&location=Bengaluru&days=90` |

Minimal fetch example:

```js
const res = await fetch(
  'http://localhost:3000/v1/valuation/instant?category=PCB&location=Bengaluru&weight=5'
);
const { data } = await res.json();
console.log(data.estimated_value);
```

Full request/response shapes: see [API.md](./API.md).

### Recommended: a dev proxy (Vite)

If you use Vite, add to `vite.config.js` so you can call a clean `/v1` path and
avoid hardcoding `localhost:3000`:

```js
export default defineConfig({
  server: {
    proxy: {
      '/v1': 'http://localhost:3000',
    },
  },
});
```

Then in the browser fetch `/v1/...` directly — Vite forwards to the backend.

## 6. Troubleshooting

| Symptom                                | Fix                                                        |
|----------------------------------------|------------------------------------------------------------|
| `Unable to connect to the database`    | Postgres not running, or wrong creds in `.env` / database not created |
| `404 Not found`                        | Route is under `/v1/...` — you hit `/api/...` by mistake   |
| CORS blocked                           | Shouldn't happen (CORS `*`); if it does, check proxy config |
| Port 3000 already in use               | Set `PORT=3000` free, or use another port and update proxy |

## 7. Rules of thumb for the frontend

- Backend responses always wrap data: `{ "success": true, "data": ... }` — read
  `data`, not the top-level object.
- Errors are `{ "success": false, "message": "..." }` with HTTP 400/404/409.
- Auth/roles aren't implemented yet — endpoints are open during development.
- If the backend changes, re-run `npm run migrate && npm run seed` to stay in
  sync (Yashas owns the schema/datasets).

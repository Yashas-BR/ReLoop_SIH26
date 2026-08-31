# Kabadiwala Connect

> **Smart India Hackathon 2026 Demo Prototype**
>
> A platform bridging informal scrap/e-waste collectors with authorized recyclers in India —
> enabling fair price discovery, traceable handovers, and safer material recovery.

---

## Project Structure

```
SIH/
├── client/          # React (Vite) + Tailwind CSS frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js
│   └── package.json
│
├── server/          # Node.js + Express backend
│   ├── db/
│   │   ├── database.js   # SQLite connection singleton
│   │   └── migrate.js    # Table creation + seed data
│   ├── controllers/
│   │   └── healthController.js
│   ├── routes/
│   │   ├── health.js
│   │   ├── collectors.js
│   │   ├── recyclers.js
│   │   ├── materials.js
│   │   ├── prices.js
│   │   ├── lots.js
│   │   ├── transactions.js
│   │   └── traceability.js
│   ├── index.js     # Express app entry point
│   ├── .env
│   └── package.json
│
├── data/            # SQLite database file (auto-created)
│   └── kabadiwala.db
│
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js ≥ 18 (tested on v25)
- npm ≥ 9

### 1. Start the Backend

```bash
cd server
npm install          # first time only
npm run dev          # starts with nodemon on port 5000
```

### 2. Start the Frontend

Open a **second terminal**:

```bash
cd client
npm install          # first time only
npm run dev          # starts Vite dev server on port 5173
```

### 3. Open the App

Navigate to: **http://localhost:5173**

The frontend's Vite dev server proxies all `/api/*` requests to `http://localhost:5000`, so no CORS issues.

---

## API Endpoints

### Health Check
```
GET http://localhost:5000/api/health
```
Returns real DB query results (table counts, SQLite version, DB size) to confirm connectivity.

**Sample Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-08-31T...",
  "database": {
    "connected": true,
    "sqlite_version": "3.x.x",
    "size_bytes": 45056,
    "table_counts": {
      "collectors": 3,
      "recyclers": 5,
      "materials": 21,
      "prices": 49,
      "lots": 0,
      "transactions": 0,
      "traceability": 0
    }
  },
  "server": {
    "node_version": "v25.x.x",
    "uptime_seconds": 12,
    "env": "development"
  }
}
```

### Planned Endpoints (implemented feature-by-feature)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/materials` | List material catalog |
| GET | `/api/prices` | Current market prices |
| GET | `/api/recyclers` | List recyclers (with distance filter) |
| POST | `/api/lots` | Create a material lot |
| POST | `/api/lots/:id/match` | Run recycler matching algorithm |
| POST | `/api/transactions` | Create transaction from match |
| GET | `/api/traceability/:lotId` | Get handover traceability record |

---

## Database Schema

The SQLite database (`data/kabadiwala.db`) is auto-created and seeded on first startup.

| Table | Description |
|-------|-------------|
| `collectors` | Informal waste collector profiles |
| `recyclers` | Authorized recycler profiles with location & materials |
| `materials` | Catalog of material types (e-waste, metals, plastics, etc.) |
| `prices` | Current + historical market prices per material |
| `lots` | Batches of materials a collector has logged |
| `lot_items` | Individual material items within a lot |
| `transactions` | Matched lot → recycler assignments |
| `traceability` | Audit trail / digital handover records |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Dev Server | nodemon |

---

## Hackathon Context

**Problem Statement:** India's e-waste is predominantly handled by informal scrap dealers with no visibility into fair prices, authorized recyclers, or traceable handover documentation. This drives unsafe backyard processing (cable burning, acid leaching) and loses valuable critical minerals (lithium, cobalt, neodymium, indium, gallium, tantalum).

**Solution:** A two-sided digital platform:
- **Collector side** — Material logging, real-time fair price discovery, nearby authorized recycler matching, digital handover certificate generation
- **Recycler side** — Incoming lot management, lot confirmation, rate & materials profile management, traceability verification

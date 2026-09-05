# Kabadiwala Connect — Backend API Reference

Base URL: `http://localhost:3000/v1`

All responses follow a consistent envelope:

```json
{ "success": true, "data": { ... } }
```

Errors are normalized by the global error handler into:

```json
{ "success": false, "message": "<human-readable error>" }
```

- `400` — request validation failed (Zod schema errors)
- `404` — resource not found
- `409` — conflict (e.g. duplicate record)
- `409`/`500` — integrity / unexpected errors

---

## Health Check

### `GET /health`

Returns service liveness.

```json
{ "status": "UP" }
```

---

## Instant Valuation

### `GET /valuation/instant`

Compute an instant per-kg and total estimate for a material in a location.

| Query param | Type   | Required | Description                    |
|-------------|--------|----------|--------------------------------|
| `category`  | string | yes      | Material category (e.g. `PCB`) |
| `location`  | string | yes      | City / region                  |
| `weight`    | number | yes      | Weight in kg (must be > 0)     |

Response `data`:

```json
{
  "estimated_value": 700.00,
  "unit_price": 140,
  "unit": "per_kg",
  "market_range_low": 100.00,
  "market_range_high": 180.00,
  "weight_kg": 5,
  "category": "PCB",
  "location": "Bengaluru"
}
```

---

## Recycler Matching & CRUD

### `GET /recyclers/match`

Rank **authorized** recyclers that accept a material, using a weighted score:

`match_score = 0.5·norm_distance + 0.3·norm_rate + 0.2·pickup_penalty` (lower is better).

| Query param   | Type   | Required | Description                              |
|---------------|--------|----------|------------------------------------------|
| `category`    | string | yes      | Material category                        |
| `lat`         | number | yes      | Collector latitude                       |
| `lng`         | number | yes      | Collector longitude                      |
| `maxDistanceKm` | number | no     | Maximum match distance in km (filter)    |

Response:

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "recycler_id": 1,
      "name": "E-Parisaraa Pvt. Ltd.",
      "materials_accepted": ["PCB"],
      "distance_km": 5.2,
      "offered_rate": 140.0,
      "match_score": 0.42,
      "service_area": "Bengaluru"
    }
  ]
}
```

> Unauthorized recyclers (e.g. `authorization_status = 'unauthorized'`) are always excluded.

### `GET /recyclers`

List recyclers (with optional pagination / filter query params).

### `POST /recyclers`

Create a recycler.

```json
{
  "name": "Green Recycle Ltd.",
  "facility_location": "Mumbai",
  "materials_accepted": ["PCB", "Battery"],
  "authorization_status": "pending",
  "service_area": "Mumbai"
}
```

Assets: `authorization_status` defaults to `pending`.

### `GET /recyclers/:id`

Fetch a single recycler.

### `PUT /recyclers/:id`

Update a recycler (partial update allowed).

### `DELETE /recyclers/:id`

Delete a recycler.

---

## Price Trends

### `GET /prices/trends`

Historical buying prices for a category/location over a lookback window.

| Query param | Type   | Required | Description                          |
|-------------|--------|----------|--------------------------------------|
| `category`  | string | yes      | Material category                    |
| `location`  | string | no       | Location filter                      |
| `days`      | number | no       | Lookback window in days (default 90) |

Response `data`: array of `{ price_date, buying_price, location }` sorted ascending by date.

---

## Price Ingestion (bulk linkage)

### `POST /prices/ingest/bulk`

Bulk upsert prices (market-wide or recycler-specific). Idempotent per
`(category, location, date, recycler)`.

```json
{
  "recycler_id": 1,
  "location": "Bengaluru",
  "prices": [
    { "material_category": "PCB", "buying_price": 268.0, "quoted_price": 278.0 }
  ]
}
```

- `recycler_id` is optional; omit for market-wide prices.
- Unknown `recycler_id` → `404`.

Response:

```json
{
  "success": true,
  "data": { "recycler_id": 1, "inserted": 1, "updated": 0 }
}
```

### `GET /prices/ingest/recyclers/:recyclerId`

Latest rate per category for a recycler. Response `data` is an array of
`{ material_category, location, price_date, buying_price, quoted_price, unit, recycler_id }`.

---

## Handover & Traceability

### `POST /handover/lots`

Create a collection lot with instant valuation.

```json
{
  "collector_id": 1,
  "category": "PCB",
  "approx_weight_kg": 4.0,
  "location": "Bengaluru",
  "description": "Optional notes"
}
```

Response `data`: `{ lot: { lot_id, ... }, estimated_value, ... }`.

### `POST /handover/initiate`

Create a handover for a lot to a recycler. Generates a unique reference
(`HO-...`) and validates the recycler is **authorized**.

```json
{
  "lot_id": "LOT-1",
  "collector_id": 1,
  "recycler_id": 1,
  "photo_refs": ["/img/a.jpg"],
  "weight_kg": 4.0,
  "gps_lat": 12.97,
  "gps_lng": 77.59,
  "handover_location": "Bengaluru"
}
```

### `POST /handover/confirm/:reference`

Recycler confirms a handover (via `{ "recycler_id": 1 }`). Sets
`status = confirmed` and `recycler_confirmation = true`. Re-confirmation → `400`.

### `GET /handover/:reference`

Fetch a handover by reference (includes category, status, recycler, timestamps).

### `GET /handover/lot/:lotId`

All handovers for a lot.

### `GET /handover/lots/collector/:collectorId`

All lots for a collector.

### `GET /handover/lots/recycler/:recyclerId`

All lots **assigned to a recycler** (matched / handed_over / confirmed), joined
with the latest traceability record so the recycler can act on pending
confirmations directly from the incoming-lots list.

Response `data` rows include:

```json
{
  "lot_id": "LOT-2026-0002",
  "category": "Battery",
  "transaction_status": "matched",
  "handover_reference_number": "HOV-2026-K1L2M3",
  "traceability_status": "pending_confirmation",
  "recycler_name": "E-R3 Solutions Pvt. Ltd."
}
```

---

## Anomaly Detection

### `POST /anomaly/check`

Evaluate a quoted price against category market data. Flags values outside the
market range or statistical (z-score) outliers.

```json
{
  "lot_id": "LOT-1",
  "material_category": "PCB",
  "quoted_price": 50000,
  "weight_kg": 5,
  "location": "Bengaluru"
}
```

Response `data`:

```json
{
  "is_anomalous": true,
  "unit_price": 10000,
  "flags": ["exceeds_market_range", "statistical_outlier"],
  "market_range": { "low": 100, "high": 180 }
}
```

### `GET /anomaly`

List flagged anomalies (optional `?category=` filter).

---

## Offline Sync

### `POST /sync/batch`

Process a batch of offline (client-generated) records. Duplicate-safe via a
`sync_log` table keyed by `client_id`.

```json
{
  "records": [
    {
      "client_id": "int-test-lot-1",
      "type": "lot",
      "collector_id": 1,
      "category": "Cable",
      "approx_weight_kg": 15,
      "location": "Bengaluru"
    }
  ]
}
```

Supported `type` values: `lot`, `handover`.

Response `data`:

```json
{
  "summary": { "total": 1, "successful": 1, "errors": 0, "duplicates": 0 },
  "results": [ { "client_id": "int-test-lot-1", "status": "success" } ]
}
```

---

## Payments

### `GET /payments/earnings/:collectorId`

Earnings summary:

```json
{
  "success": true,
  "data": {
    "total_earned": 1000.0,
    "total_paid": 800.0,
    "total_pending": 200.0,
    "total_transactions": 6
  }
}
```

### `GET /payments/history/:collectorId`

List payment transactions for a collector (`data` is an array).

### `PATCH /payments/:lotId`

Update the payment status and/or final price of a lot.

```json
{ "payment_status": "paid", "final_price": 220 }
```

Valid `payment_status` values are defined in the payment service (e.g. `pending`,
`partially_paid`, `paid`). Invalid status or negative price → `400`; unknown lot → `404`.

# Kabadiwala Connect — Datasets & Data Strategy

This document describes the six problem-statement datasets implemented in
`sql/01_schema.sql`, the seed data, and how the schema is positioned to support
the AI/ML price-prediction pipeline described in the proposal.

## The Six Core Datasets

The schema implements all six datasets required by the SIH26229 problem
statement.

| # | Dataset        | Table          | Purpose                                    |
|---|----------------|----------------|--------------------------------------------|
| 1 | Recycler       | `recyclers`    | Authorized vs unauthorized recyclers, materials accepted, service area, geo |
| 2 | Materials      | `materials`    | Collectors' lots (category, weight, value, source) |
| 3 | Prices         | `prices`       | Market + per-recycler rates, market ranges, timestamps |
| 4 | Transactions   | `transactions` | Quoted vs final price, payment status, chain status |
| 5 | Traceability   | `traceability` | Chain-of-custody events, GPS, photo refs, confirmation |
| 6 | Collectors     | `collectors`   | Collector profiles, language, operating area |

`sync_log` is an auxiliary table (not one of the six) that powers duplicate-safe
offline sync.

## Public vs Private Datasets

Mirroring the problem statement's "public" / "private" split:

- **Public glanceable datasets** — recycler list and material rates can be
  consumed by any stakeholder without registration. Relevant columns are
  already anonymized / non-PII.
- **Private datasets** — transactions, traceability, and collector identities
  carry PII / business-sensitive data and are only surfaced through authed,
  role-scoped endpoints.

## Prices: Market vs Recycler-Specific

The `prices` table stores both market-wide rows (`recycler_id IS NULL`) and
recycler-specific rows (`recycler_id` set). The unique constraint
`(material_category, location, price_date, recycler_id)` treats those two
classes as distinct (Postgres `UNIQUE` ignores `NULL`), so bulk upserts never
collide. Each row carries `market_range_low` / `market_range_high`, which drive
instant valuation and anomaly detection.

Seed totals: **77 price rows** across 6 material categories and multiple
locations, with 28 recycler-specific rates.

## AI/ML Price-Prediction Dataset Requirements

To train the price-prediction model described in the proposal, the schema
already captures most required features. The table below maps each model input
to its source column.

| Model feature              | Source column(s)                    | Notes                              |
|----------------------------|-------------------------------------|------------------------------------|
| Material category          | `prices.material_category`          | Categorical encoding               |
| Location / region          | `prices.location`                   | Encode city + distance to market   |
| Date (seasonality)         | `prices.price_date`                 | Day-of-week, month, holiday flags  |
| Historical price           | `prices.buying_price` (trend)       | Lag features / rolling means       |
| Recycler rate               | `prices.quoted_price`               | Recycler-specific offer            |
| Market range               | `market_range_low/high`             | Cap / floor priors                 |
| Weight / quantity          | `transactions.quantity_weight_kg`   | Quantity discount features         |
| Recycler characteristics   | `recyclers.*`                       | Auth status, service area, pickup  |
| Outcome label              | `transactions.final_price`          | Training target                    |

### Data-Volume Growth Strategy

The seed dataset is intentionally small (demo scale). For production training
the pipeline should:

1. **Backfill history** — import 3+ years of scrap rate history (CPCB / market
   reports, recycler rate sheets) so `prices` has enough `price_date` depth for
   seasonal and trend features.
2. **Continuous capture** — every `POST /prices/ingest/bulk` and every finalized
   `transactions.final_price` becomes a new labeled sample, growing the dataset
   automatically.
3. **Join views** — expose prepared training tables (one row per transaction
   with lagged price features + label) as SQL views so the ML team does not join
   raw tables.

### Suggested Modeling Approach

- Baseline: gradient-boosted trees (LightGBM / XGBoost) on historical
  `buying_price` + date + location + category.
- Enhance with serving-time features from `recyclers` and `prices.market_range_*`.
- Validate with time-series split (train on earlier dates, test on later dates),
  not random split, to avoid look-ahead leakage.
- Guardrails: clamp model output within `market_range_low/high`; run it through
  the existing `/anomaly/check` endpoint before a price is shown to a collector.

## Dataset Lifecycle & Governance

- **Anonymization** — collector PII is isolated in `collectors` and never
  surfaced in public glanceable endpoints.
- **Reset** — `sql/04_reset.sql` truncates all data and resets identity columns
  for clean demo re-seeding.
- **Logging** — `traceability` provides an append-only chain of custody; any
  price/payment change is auditable.
- **Offline resilience** — `sync_log` ensures collector-submitted records are
  inserted exactly once even over flaky connectivity, keeping the dataset free
  of duplicate rows.

## Seed Verification

After `npm run seed`, expected row counts (also asserted by the seed script):

| Table          | Count |
|----------------|-------|
| recyclers      | 10    |
| prices         | 77    |
| collectors     | 2     |
| materials      | 6     |
| transactions   | 6     |
| traceability   | 3     |

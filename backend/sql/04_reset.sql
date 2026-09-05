-- reset.sql
-- Clears all data and resets auto-increment IDs, keeping the schema intact.
-- Use this before re-running the seed scripts for a clean demo state.

TRUNCATE offers, traceability, transactions, materials, prices, price_sources, recyclers, collectors, sync_log, lot_images, lot_events
RESTART IDENTITY CASCADE;

-- Schema alignment (idempotent) — keeps pre-existing databases current with 01_schema.sql.
ALTER TABLE traceability ADD COLUMN IF NOT EXISTS scan_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cg_quantity_weight_kg NUMERIC(8,2);

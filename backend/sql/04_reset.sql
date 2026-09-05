-- reset.sql
-- Clears all data and resets auto-increment IDs, keeping the schema intact.
-- Use this before re-running the seed scripts for a clean demo state.

TRUNCATE traceability, transactions, materials, prices, recyclers, collectors, sync_log
RESTART IDENTITY CASCADE;

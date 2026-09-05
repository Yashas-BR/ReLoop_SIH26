-- 06_lot_system.sql
-- SIH26229 — Lot system additions
--
-- Adds:
--   1. LOT_IMAGES      — immutable evidence photos linked to a lot (NEVER updated)
--   2. LOT_EVENTS      — append-only traceability event log (one row per lifecycle event)
--   3. display_lot_id  — human-readable structured ID on materials (LOT-YYYY-CTY-NNNNNN)
--   4. GPS columns on  transactions for collection_lat/lng + handover_lat/lng
--
-- Safe to run on an existing database — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- ── 1. LOT_IMAGES ─────────────────────────────────────────────────────────────
-- One row per photograph attached to a lot. image_type indicates the lifecycle
-- stage at which the photo was taken. Rows are NEVER updated — new photos get
-- new rows (different image_type). This creates an immutable photo evidence chain.
CREATE TABLE IF NOT EXISTS lot_images (
    id                SERIAL PRIMARY KEY,
    lot_id            VARCHAR(30) NOT NULL REFERENCES materials(lot_id),

    -- URL / data-URL returned by cloud storage (or base64 stand-in in prototype)
    image_url         TEXT NOT NULL,

    -- Lifecycle stage of the photo — drives the evidence chain display
    image_type        VARCHAR(30) NOT NULL DEFAULT 'COLLECTION'
        CHECK (image_type IN (
            'COLLECTION',          -- collector's initial photo at lot creation
            'WEIGHING',            -- photo taken at or near the scale
            'HANDOVER',            -- recycler takes a photo at pickup
            'RECYCLER_CONFIRMATION' -- confirmation photo recorded at handover
        )),

    uploaded_by_role  VARCHAR(20) NOT NULL DEFAULT 'collector'
        CHECK (uploaded_by_role IN ('collector', 'recycler', 'admin')),

    -- Actor IDs — only the relevant one will be non-null
    uploaded_by_collector_id   INTEGER REFERENCES collectors(id),
    uploaded_by_recycler_id    INTEGER REFERENCES recyclers(id),

    -- GPS at the time the photo was taken (optional but preferred)
    latitude          DOUBLE PRECISION,
    longitude         DOUBLE PRECISION,

    -- File metadata (optional — useful for integrity checks)
    file_size_bytes   INTEGER,
    mime_type         VARCHAR(50) DEFAULT 'image/jpeg',

    uploaded_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lot_images_lot   ON lot_images(lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_images_type  ON lot_images(lot_id, image_type);


-- ── 2. LOT_EVENTS ─────────────────────────────────────────────────────────────
-- Append-only event log — one row per meaningful lifecycle event.
-- Events are never deleted or updated; each action is inserted as a new row.
-- This is the foundation of the full traceability history the spec requires.
--
-- Supported event types (matches the 20-step flow in the SIH spec):
--   LOT_CREATED           collector creates the lot
--   IMAGE_UPLOADED        a photo is attached to the lot
--   PRICE_ESTIMATED       system computes the instant valuation
--   RECYCLER_MATCHED      a recycler is discovered / matched
--   QUOTE_RECEIVED        recycler sends a priced quote
--   QUOTE_ACCEPTED        collector accepts a quote
--   QR_SCANNED            recycler scans the lot QR at pickup
--   LOT_VERIFIED          recycler confirms the lot details match
--   FINAL_WEIGHT_RECORDED weighed at handover (may differ from approx_weight)
--   HANDOVER_PHOTO        handover evidence photo captured
--   GPS_CAPTURED          GPS recorded at handover
--   HANDOVER_CONFIRMED    recycler confirms receipt (digital handover record)
--   PAYMENT_COMPLETED     payment recorded (cash / UPI / bank)
--   DISPUTE_RAISED        admin dispute opened (future)
CREATE TABLE IF NOT EXISTS lot_events (
    id            SERIAL PRIMARY KEY,
    lot_id        VARCHAR(30) NOT NULL REFERENCES materials(lot_id),

    event_type    VARCHAR(40) NOT NULL
        CHECK (event_type IN (
            'LOT_CREATED', 'IMAGE_UPLOADED', 'PRICE_ESTIMATED',
            'RECYCLER_MATCHED', 'QUOTE_RECEIVED', 'QUOTE_ACCEPTED',
            'QR_SCANNED', 'LOT_VERIFIED', 'FINAL_WEIGHT_RECORDED',
            'HANDOVER_PHOTO', 'GPS_CAPTURED', 'HANDOVER_CONFIRMED',
            'PAYMENT_COMPLETED', 'DISPUTE_RAISED'
        )),

    -- Who triggered this event
    actor_role    VARCHAR(20) NOT NULL DEFAULT 'system'
        CHECK (actor_role IN ('collector', 'recycler', 'admin', 'system')),
    actor_id      INTEGER,          -- collector_id or recycler_id depending on role

    -- Flexible JSON payload for event-specific data
    -- e.g. { "weight_kg": 19.6 }, { "image_type": "HANDOVER" }, { "amount": 4312 }
    metadata      JSONB DEFAULT '{}'::jsonb,

    -- GPS at the time of the event (not all events have location)
    latitude      DOUBLE PRECISION,
    longitude     DOUBLE PRECISION,

    occurred_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lot_events_lot        ON lot_events(lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_events_type       ON lot_events(lot_id, event_type);
CREATE INDEX IF NOT EXISTS idx_lot_events_time       ON lot_events(lot_id, occurred_at);


-- ── 3. STRUCTURED DISPLAY LOT ID on materials ────────────────────────────────
-- Adds a human-readable display ID (LOT-2026-BLR-000001) alongside the
-- internal generated lot_id. The internal lot_id stays as the FK everywhere;
-- display_lot_id is for user-facing labels, QR content, and search.
ALTER TABLE materials
    ADD COLUMN IF NOT EXISTS display_lot_id VARCHAR(30) UNIQUE,
    ADD COLUMN IF NOT EXISTS collection_lat  DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS collection_lng  DOUBLE PRECISION;


-- ── 4. GPS on transactions ────────────────────────────────────────────────────
-- Separate collection and handover coordinates so the traceability chain has
-- two distinct GPS points: where the material was collected vs where it was
-- handed over to the recycler.
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS collection_lat  DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS collection_lng  DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS handover_lat    DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS handover_lng    DOUBLE PRECISION;


-- ── 5. LOT ID COUNTER ─────────────────────────────────────────────────────────
-- Simple serial counter used to produce the NNNNNN suffix of display_lot_id.
-- One sequence per year is overkill for a prototype, so a single global sequence
-- gives collision-free ordering for the demo.
CREATE SEQUENCE IF NOT EXISTS lot_display_seq START 1;


-- ── Done ──────────────────────────────────────────────────────────────────────

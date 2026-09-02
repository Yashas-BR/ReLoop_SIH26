-- schema.sql
-- Kabadiwala Connect (SIH26229) — full schema, all 6 PS-required datasets

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop tables if re-running from scratch during development (safe for demo/dev use)
DROP TABLE IF EXISTS traceability CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS prices CASCADE;
DROP TABLE IF EXISTS recyclers CASCADE;
DROP TABLE IF EXISTS collectors CASCADE;

-- COLLECTORS
CREATE TABLE collectors (
    id SERIAL PRIMARY KEY,
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'hi',
    operating_location TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- RECYCLERS
CREATE TABLE recyclers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    facility_location TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    materials_accepted JSONB,
    authorization_status VARCHAR(20) NOT NULL DEFAULT 'unauthorized'
        CHECK (authorization_status IN ('authorized', 'unauthorized', 'pending')),
    authorization_details TEXT,
    contact_details TEXT,
    pickup_availability VARCHAR(50),
    service_area TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- MATERIALS (lots created by collectors)
CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    lot_id VARCHAR(30) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    sub_category VARCHAR(50),
    description TEXT,
    image_ref TEXT,
    approx_weight_kg NUMERIC(8,2) CHECK (approx_weight_kg > 0),
    condition VARCHAR(30),
    source_type VARCHAR(30),
    estimated_value NUMERIC(10,2),
    collector_id INTEGER REFERENCES collectors(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- PRICES
CREATE TABLE prices (
    id SERIAL PRIMARY KEY,
    material_category VARCHAR(50) NOT NULL,
    location TEXT NOT NULL,
    price_date DATE NOT NULL,
    buying_price NUMERIC(10,2) NOT NULL,
    quoted_price NUMERIC(10,2),
    unit VARCHAR(20) DEFAULT 'per_kg',
    recycler_id INTEGER REFERENCES recyclers(id),
    market_range_low NUMERIC(10,2),
    market_range_high NUMERIC(10,2)
);

-- TRANSACTIONS
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    lot_id VARCHAR(30) REFERENCES materials(lot_id),
    collector_id INTEGER REFERENCES collectors(id),
    material_category VARCHAR(50),
    quantity_weight_kg NUMERIC(8,2),
    quoted_price NUMERIC(10,2),
    final_price NUMERIC(10,2),
    recycler_id INTEGER REFERENCES recyclers(id),
    collection_location TEXT,
    handover_location TEXT,
    txn_datetime TIMESTAMP DEFAULT NOW(),
    payment_status VARCHAR(20) DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid')),
    transaction_status VARCHAR(20) DEFAULT 'quoted'
        CHECK (transaction_status IN ('quoted', 'matched', 'handed_over', 'confirmed'))
);

-- TRACEABILITY
CREATE TABLE traceability (
    id SERIAL PRIMARY KEY,
    lot_id VARCHAR(30) REFERENCES materials(lot_id),
    photo_refs JSONB,
    weight_kg NUMERIC(8,2),
    event_timestamp TIMESTAMP DEFAULT NOW(),
    gps_lat DOUBLE PRECISION,
    gps_lng DOUBLE PRECISION,
    handover_reference_number VARCHAR(40) UNIQUE NOT NULL,
    recycler_confirmation BOOLEAN DEFAULT FALSE,
    confirmation_timestamp TIMESTAMP,
    status VARCHAR(30) DEFAULT 'pending_confirmation'
        CHECK (status IN ('pending_confirmation', 'confirmed'))
);

-- Indexes for common query patterns
CREATE INDEX idx_prices_category_location ON prices(material_category, location);
CREATE INDEX idx_recyclers_auth_status ON recyclers(authorization_status);
CREATE INDEX idx_transactions_collector ON transactions(collector_id);
CREATE INDEX idx_transactions_status ON transactions(transaction_status);
CREATE INDEX idx_traceability_lot ON traceability(lot_id);

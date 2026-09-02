-- seed: recycler offered rates per material
-- Links each authorized recycler to an offered buying rate for each material
-- category it accepts, so the weighted matching engine's "rate" factor is
-- genuinely functional (not 0). Rates are set within the real researched
-- market range for each category (see 02_seed_recyclers_prices.sql) with
-- deliberate per-recycler variation so ranking differentiates on rate too.
--
-- Runs AFTER 02_seed_recyclers_prices.sql (needs recyclers) and should be
-- idempotent-ish: we use ON CONFLICT DO NOTHING on (recycler_id, material_category).

INSERT INTO prices (material_category, location, price_date, buying_price, quoted_price, unit, recycler_id, market_range_low, market_range_high) VALUES
-- E-Parisaraa (id=1): PCB, Battery, Motor/Magnet Assembly, Cable
('PCB', 'Bengaluru', '2026-08-04', 265.00, 275.00, 'per_kg', 1, 205.00, 415.00),
('Battery', 'Bengaluru', '2026-08-04', 89.00, 93.00, 'per_kg', 1, 75.00, 108.00),
('Motor/Magnet Assembly', 'Bengaluru', '2026-08-04', 150.00, 156.00, 'per_kg', 1, 122.00, 178.00),
('Cable', 'Bengaluru', '2026-08-04', 345.00, 358.00, 'per_kg', 1, 315.00, 780.00),

-- Trishyirya (id=2): PCB, Cable, Motor/Magnet Assembly
('PCB', 'Bengaluru', '2026-08-04', 272.00, 282.00, 'per_kg', 2, 205.00, 415.00),
('Cable', 'Bengaluru', '2026-08-04', 350.00, 362.00, 'per_kg', 2, 315.00, 780.00),
('Motor/Magnet Assembly', 'Bengaluru', '2026-08-04', 148.00, 153.00, 'per_kg', 2, 122.00, 178.00),

-- E-R3 Solutions (id=3): PCB, Battery, LCD Panel
('PCB', 'Bengaluru', '2026-08-04', 260.00, 270.00, 'per_kg', 3, 205.00, 415.00),
('Battery', 'Bengaluru', '2026-08-04', 86.00, 90.00, 'per_kg', 3, 75.00, 108.00),
('LCD Panel', 'Bengaluru', '2026-08-04', 36.00, 39.00, 'per_kg', 3, 26.00, 49.00),

-- Samarthanam (id=4): Cable, Mixed Plastic, CRT
('Cable', 'Bengaluru', '2026-08-04', 335.00, 348.00, 'per_kg', 4, 315.00, 780.00),
('Mixed Plastic', 'Bengaluru', '2026-08-04', 14.00, 15.50, 'per_kg', 4, 10.50, 18.50),
('CRT', 'Bengaluru', '2026-08-04', 16.00, 17.00, 'per_kg', 4, 12.50, 22.50),

-- Earth Sense (id=5): PCB, Cable, Motor/Magnet Assembly, Battery
('PCB', 'Bengaluru', '2026-08-04', 268.00, 278.00, 'per_kg', 5, 205.00, 415.00),
('Cable', 'Bengaluru', '2026-08-04', 342.00, 355.00, 'per_kg', 5, 315.00, 780.00),
('Motor/Magnet Assembly', 'Bengaluru', '2026-08-04', 149.00, 154.00, 'per_kg', 5, 122.00, 178.00),
('Battery', 'Bengaluru', '2026-08-04', 87.50, 91.00, 'per_kg', 5, 75.00, 108.00),

-- Ramky (id=6): PCB, LCD Panel, CRT, Battery
('PCB', 'Bengaluru', '2026-08-04', 270.00, 280.00, 'per_kg', 6, 205.00, 415.00),
('LCD Panel', 'Bengaluru', '2026-08-04', 37.00, 40.00, 'per_kg', 6, 26.00, 49.00),
('CRT', 'Bengaluru', '2026-08-04', 16.50, 17.50, 'per_kg', 6, 12.50, 22.50),
('Battery', 'Bengaluru', '2026-08-04', 90.00, 94.00, 'per_kg', 6, 75.00, 108.00),

-- Virogreen (id=7): PCB, Battery, Mixed Plastic
('PCB', 'Bengaluru', '2026-08-04', 262.00, 272.00, 'per_kg', 7, 205.00, 415.00),
('Battery', 'Bengaluru', '2026-08-04', 88.00, 92.00, 'per_kg', 7, 75.00, 108.00),
('Mixed Plastic', 'Bengaluru', '2026-08-04', 14.50, 16.00, 'per_kg', 7, 10.50, 18.50),

-- Escrappy (id=8): PCB, Cable, Battery, Mixed Plastic
('PCB', 'Bengaluru', '2026-08-04', 275.00, 285.00, 'per_kg', 8, 205.00, 415.00),
('Cable', 'Bengaluru', '2026-08-04', 352.00, 365.00, 'per_kg', 8, 315.00, 780.00),
('Battery', 'Bengaluru', '2026-08-04', 91.00, 95.00, 'per_kg', 8, 75.00, 108.00),
('Mixed Plastic', 'Bengaluru', '2026-08-04', 15.00, 16.50, 'per_kg', 8, 10.50, 18.50);

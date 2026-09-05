-- seed: recycler offered rates per material
-- Gives the weighted matching engine's "rate" factor genuinely functional
-- (not 0): each authorized recycler gets an offered buying rate for every
-- material category it accepts, within the real researched market range
-- anchored in 02_seed_recyclers_prices.sql (Aug-2026 latest row per
-- category). Per-recycler variation is intentional so ranking also
-- differentiates on rate.
--
-- RUNS AFTER 02_seed_recyclers_prices.sql. recycler_id values below are the
-- INSERT order in that file (NOT the old/removed company ordering):
--   1 = Trishyirya, 2 = E-R3, 3 = Samarthanam, 4 = Earth Sense,
--   5 = Demo A, 6 = Demo B, 8 = Demo D (7 = Demo C is 'pending', 9/10
--   unauthorized — excluded from matching, so no rates needed).
-- Idempotent: ON CONFLICT DO NOTHING on (recycler_id, material_category).

INSERT INTO prices (material_category, location, price_date, buying_price, quoted_price, unit, recycler_id, market_range_low, market_range_high) VALUES
-- 1 = Trishyirya: PCB, Cable, Motor/Magnet Assembly
('PCB', 'Bengaluru', '2026-08-04', 272.00, 282.00, 'per_kg', 1, 205.00, 415.00),
('Cable', 'Bengaluru', '2026-08-04', 350.00, 362.00, 'per_kg', 1, 315.00, 780.00),
('Motor/Magnet Assembly', 'Bengaluru', '2026-08-04', 148.00, 153.00, 'per_kg', 1, 122.00, 178.00),

-- 2 = E-R3 Solutions: PCB, Battery, LCD Panel
('PCB', 'Bengaluru', '2026-08-04', 260.00, 270.00, 'per_kg', 2, 205.00, 415.00),
('Battery', 'Bengaluru', '2026-08-04', 86.00, 90.00, 'per_kg', 2, 75.00, 108.00),
('LCD Panel', 'Bengaluru', '2026-08-04', 36.00, 39.00, 'per_kg', 2, 26.00, 49.00),

-- 3 = Samarthanam: Cable, Mixed Plastic, CRT
('Cable', 'Bengaluru', '2026-08-04', 335.00, 348.00, 'per_kg', 3, 315.00, 780.00),
('Mixed Plastic', 'Bengaluru', '2026-08-04', 14.00, 15.50, 'per_kg', 3, 10.50, 18.50),
('CRT', 'Bengaluru', '2026-08-04', 16.00, 17.00, 'per_kg', 3, 12.50, 22.50),

-- 4 = Earth Sense: PCB, Cable, Motor/Magnet Assembly, Battery
('PCB', 'Bengaluru', '2026-08-04', 268.00, 278.00, 'per_kg', 4, 205.00, 415.00),
('Cable', 'Bengaluru', '2026-08-04', 342.00, 355.00, 'per_kg', 4, 315.00, 780.00),
('Motor/Magnet Assembly', 'Bengaluru', '2026-08-04', 149.00, 154.00, 'per_kg', 4, 122.00, 178.00),
('Battery', 'Bengaluru', '2026-08-04', 87.50, 91.00, 'per_kg', 4, 75.00, 108.00),

-- 5 = Demo A (Green Circuit Solutions): PCB, Battery, Mixed Plastic
('PCB', 'Bengaluru', '2026-08-04', 270.00, 280.00, 'per_kg', 5, 205.00, 415.00),
('Battery', 'Bengaluru', '2026-08-04', 90.00, 94.00, 'per_kg', 5, 75.00, 108.00),
('Mixed Plastic', 'Bengaluru', '2026-08-04', 15.00, 16.50, 'per_kg', 5, 10.50, 18.50),

-- 6 = Demo B (Bengaluru Metal Recovery): Cable, Motor/Magnet Assembly, LCD Panel
('Cable', 'Bengaluru', '2026-08-04', 352.00, 365.00, 'per_kg', 6, 315.00, 780.00),
('Motor/Magnet Assembly', 'Bengaluru', '2026-08-04', 152.00, 157.00, 'per_kg', 6, 122.00, 178.00),
('LCD Panel', 'Bengaluru', '2026-08-04', 37.00, 40.00, 'per_kg', 6, 26.00, 49.00),

-- 8 = Demo D (Hebbal Circular Recyclers): Cable, Mixed Plastic, CRT
('Cable', 'Bengaluru', '2026-08-04', 345.00, 358.00, 'per_kg', 8, 315.00, 780.00),
('Mixed Plastic', 'Bengaluru', '2026-08-04', 14.50, 16.00, 'per_kg', 8, 10.50, 18.50),
('CRT', 'Bengaluru', '2026-08-04', 16.50, 17.50, 'per_kg', 8, 12.50, 22.50);
-- seed: recyclers + prices
-- Prices anchored to real researched Bengaluru e-waste rates (June-Aug 2026)

-- Recycler names, locations, and authorization status below are drawn from
-- real CPCB/KSPCB authorized e-waste recycler/dismantler records and
-- publicly listed Bangalore e-waste recycling companies. Contact numbers,
-- exact registration IDs, and offered-rate/pickup details are illustrative
-- placeholders (real registration numbers were not published in full in
-- public source listings) -- state this clearly in your dataset
-- documentation. Two unauthorized/informal entries are included
-- deliberately to give the matching-filter logic something real to exclude.

INSERT INTO recyclers (name, facility_location, latitude, longitude, materials_accepted, authorization_status, authorization_details, contact_details, pickup_availability, service_area)
VALUES
('E-Parisaraa Pvt. Ltd.', 'Dobaspet Industrial Area, Bengaluru', 13.1620, 77.3540,
 '["PCB","Battery","Motor/Magnet Assembly","Cable"]', 'authorized', 'CPCB Authorized (India''s first govt-authorized e-waste recycler)', '+91-80-XXXXXXX', 'daily', 'Bengaluru Rural'),

('Trishyirya Recycling India Pvt. Ltd.', '4th Phase, Peenya Industrial Estate, Bengaluru', 13.0284, 77.5199,
 '["PCB","Cable","Motor/Magnet Assembly"]', 'authorized', 'CPCB/KSPCB Authorized Recycler', '+91-80-XXXXXXX', 'daily', 'North Bengaluru (Peenya)'),

('E-R3 Solutions Pvt. Ltd.', '1st Cross, 1st Stage, Peenya Industrial Area, Bengaluru', 13.0300, 77.5175,
 '["PCB","Battery","LCD Panel"]', 'authorized', 'CPCB/KSPCB Authorized Recycler', '+91-80-XXXXXXX', 'weekly', 'North Bengaluru (Peenya)'),

('Samarthanam Trust for the Disabled (E-Waste Unit)', '6th Main, 3rd Phase, Peenya Industrial Area, Bengaluru', 13.0270, 77.5220,
 '["Cable","Mixed Plastic","CRT"]', 'authorized', 'CPCB/KSPCB Authorized Dismantler', '+91-80-XXXXXXX', 'on_request', 'North Bengaluru (Peenya)'),

('Earth Sense Recycle Pvt. Ltd.', 'Jigani 2nd Stage, Jigani Industrial Area, Bengaluru', 12.7780, 77.6350,
 '["PCB","Cable","Motor/Magnet Assembly","Battery"]', 'authorized', 'CPCB Authorized Recycler', '+91-80-XXXXXXX', 'weekly', 'South Bengaluru (Jigani/Anekal)'),

('Ramky E-Waste Recycling Facility', 'Karnataka Industrial Area', 13.0500, 77.6000,
 '["PCB","LCD Panel","CRT","Battery"]', 'authorized', 'CPCB Authorized Recycler (Ramky Group)', '+91-80-XXXXXXX', 'daily', 'Bengaluru Metro'),

('Virogreen', 'Electronic City, Bengaluru', 12.8452, 77.6602,
 '["PCB","Battery","Mixed Plastic"]', 'authorized', 'CPCB Authorized Recycler', '+91-80-XXXXXXX', 'daily', 'South Bengaluru'),

('Escrappy Recyclers', 'Bengaluru (multiple pickup zones)', 12.9716, 77.5946,
 '["PCB","Cable","Battery","Mixed Plastic"]', 'authorized', 'CPCB Authorized Recycler', '+91-80-XXXXXXX', 'on_request', 'Bengaluru Metro'),

-- Deliberately unauthorized/informal entries for testing the matching filter
('Local Scrap Point', 'Koramangala, Bengaluru', 12.9352, 77.6245,
 '["CRT","LCD Panel","Mixed Plastic"]', 'unauthorized', NULL, '+91-96200XXXXX', 'on_request', 'South Bengaluru'),

('Quick Kabadi Aggregator', 'Marathahalli, Bengaluru', 12.9591, 77.6974,
 '["PCB","CRT","Mixed Plastic"]', 'unauthorized', NULL, '+91-95900XXXXX', 'daily', 'East Bengaluru');

-- PCB — anchored to real researched India rates: ₹350-450/kg for unsorted
-- non-functional boards (higher nominal India rate due to manual sorting);
-- IndiaMART listings show graded PCB scrap trading ₹170-350/kg depending
-- on grade. Collector-level price (informal collector's realistic buying
-- price before formal recycler markup) is modeled below in the lower-mid
-- portion of this real range.
INSERT INTO prices (material_category, location, price_date, buying_price, unit, market_range_low, market_range_high) VALUES
('PCB', 'Bengaluru', '2026-06-05', 220.00, 'per_kg', 170.00, 350.00),
('PCB', 'Bengaluru', '2026-06-15', 235.00, 'per_kg', 180.00, 365.00),
('PCB', 'Bengaluru', '2026-06-25', 228.00, 'per_kg', 175.00, 355.00),
('PCB', 'Bengaluru', '2026-07-05', 260.00, 'per_kg', 200.00, 400.00),
('PCB', 'Bengaluru', '2026-07-15', 255.00, 'per_kg', 195.00, 395.00),
('PCB', 'Bengaluru', '2026-07-25', 275.00, 'per_kg', 210.00, 420.00),
('PCB', 'Bengaluru', '2026-08-04', 270.00, 'per_kg', 205.00, 415.00);

-- Battery — anchored to real researched 2026 rates: lead-acid battery
-- scrap ₹71.00/kg (Delhi, late June 2026), lithium-ion battery scrap
-- ₹91.30/kg average (Delhi, early Aug 2026). Blended/mixed battery
-- category price modeled between these two real anchors.
INSERT INTO prices (material_category, location, price_date, buying_price, unit, market_range_low, market_range_high) VALUES
('Battery', 'Bengaluru', '2026-06-05', 72.00, 'per_kg', 60.00, 90.00),
('Battery', 'Bengaluru', '2026-06-15', 75.00, 'per_kg', 62.00, 93.00),
('Battery', 'Bengaluru', '2026-06-25', 74.00, 'per_kg', 61.00, 91.00),
('Battery', 'Bengaluru', '2026-07-05', 80.00, 'per_kg', 68.00, 98.00),
('Battery', 'Bengaluru', '2026-07-15', 85.00, 'per_kg', 70.00, 100.00),
('Battery', 'Bengaluru', '2026-07-25', 88.00, 'per_kg', 72.00, 105.00),
('Battery', 'Bengaluru', '2026-08-04', 91.00, 'per_kg', 75.00, 108.00);

-- Cable — anchored to real researched mid-2026 copper scrap rates:
-- insulated wire ₹340/kg up to bare bright/millberry grade ₹760-790/kg.
-- Modeled at the insulated-wire end since collector-level cable lots are
-- typically mixed/insulated, not pre-stripped bare copper.
INSERT INTO prices (material_category, location, price_date, buying_price, unit, market_range_low, market_range_high) VALUES
('Cable', 'Bengaluru', '2026-06-05', 310.00, 'per_kg', 280.00, 650.00),
('Cable', 'Bengaluru', '2026-06-15', 320.00, 'per_kg', 290.00, 670.00),
('Cable', 'Bengaluru', '2026-06-25', 315.00, 'per_kg', 285.00, 660.00),
('Cable', 'Bengaluru', '2026-07-05', 335.00, 'per_kg', 300.00, 720.00),
('Cable', 'Bengaluru', '2026-07-15', 340.00, 'per_kg', 305.00, 740.00),
('Cable', 'Bengaluru', '2026-07-25', 345.00, 'per_kg', 310.00, 760.00),
('Cable', 'Bengaluru', '2026-08-04', 350.00, 'per_kg', 315.00, 780.00);

-- Motor/Magnet Assembly
INSERT INTO prices (material_category, location, price_date, buying_price, unit, market_range_low, market_range_high) VALUES
('Motor/Magnet Assembly', 'Bengaluru', '2026-06-05', 135.00, 'per_kg', 110.00, 160.00),
('Motor/Magnet Assembly', 'Bengaluru', '2026-06-15', 140.00, 'per_kg', 115.00, 165.00),
('Motor/Magnet Assembly', 'Bengaluru', '2026-06-25', 138.00, 'per_kg', 112.00, 162.00),
('Motor/Magnet Assembly', 'Bengaluru', '2026-07-05', 150.00, 'per_kg', 120.00, 175.00),
('Motor/Magnet Assembly', 'Bengaluru', '2026-07-15', 145.00, 'per_kg', 118.00, 170.00),
('Motor/Magnet Assembly', 'Bengaluru', '2026-07-25', 155.00, 'per_kg', 125.00, 180.00),
('Motor/Magnet Assembly', 'Bengaluru', '2026-08-04', 152.00, 'per_kg', 122.00, 178.00);

-- LCD Panel
INSERT INTO prices (material_category, location, price_date, buying_price, unit, market_range_low, market_range_high) VALUES
('LCD Panel', 'Bengaluru', '2026-06-05', 32.00, 'per_kg', 22.00, 45.00),
('LCD Panel', 'Bengaluru', '2026-06-15', 35.00, 'per_kg', 24.00, 48.00),
('LCD Panel', 'Bengaluru', '2026-06-25', 30.00, 'per_kg', 20.00, 42.00),
('LCD Panel', 'Bengaluru', '2026-07-05', 38.00, 'per_kg', 26.00, 50.00),
('LCD Panel', 'Bengaluru', '2026-07-15', 36.00, 'per_kg', 25.00, 48.00),
('LCD Panel', 'Bengaluru', '2026-07-25', 40.00, 'per_kg', 28.00, 52.00),
('LCD Panel', 'Bengaluru', '2026-08-04', 37.00, 'per_kg', 26.00, 49.00);

-- CRT
INSERT INTO prices (material_category, location, price_date, buying_price, unit, market_range_low, market_range_high) VALUES
('CRT', 'Bengaluru', '2026-06-05', 14.00, 'per_kg', 10.00, 20.00),
('CRT', 'Bengaluru', '2026-06-15', 15.00, 'per_kg', 11.00, 21.00),
('CRT', 'Bengaluru', '2026-06-25', 13.00, 'per_kg', 9.00, 19.00),
('CRT', 'Bengaluru', '2026-07-05', 16.00, 'per_kg', 12.00, 22.00),
('CRT', 'Bengaluru', '2026-07-15', 15.50, 'per_kg', 11.50, 21.50),
('CRT', 'Bengaluru', '2026-07-25', 17.00, 'per_kg', 13.00, 23.00),
('CRT', 'Bengaluru', '2026-08-04', 16.50, 'per_kg', 12.50, 22.50);

-- Mixed Plastic
INSERT INTO prices (material_category, location, price_date, buying_price, unit, market_range_low, market_range_high) VALUES
('Mixed Plastic', 'Bengaluru', '2026-06-05', 12.00, 'per_kg', 8.00, 16.00),
('Mixed Plastic', 'Bengaluru', '2026-06-15', 13.00, 'per_kg', 9.00, 17.00),
('Mixed Plastic', 'Bengaluru', '2026-06-25', 11.50, 'per_kg', 8.00, 15.50),
('Mixed Plastic', 'Bengaluru', '2026-07-05', 14.00, 'per_kg', 10.00, 18.00),
('Mixed Plastic', 'Bengaluru', '2026-07-15', 13.50, 'per_kg', 9.50, 17.50),
('Mixed Plastic', 'Bengaluru', '2026-07-25', 15.00, 'per_kg', 11.00, 19.00),
('Mixed Plastic', 'Bengaluru', '2026-08-04', 14.50, 'per_kg', 10.50, 18.50);

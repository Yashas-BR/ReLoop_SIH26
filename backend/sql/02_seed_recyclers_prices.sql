-- seed: recyclers + prices
-- Prices anchored to real researched Bengaluru e-waste rates (June-Aug 2026)

-- HONEST DATA PROVENANCE — read this before using this data anywhere:
--
-- VERIFIED AUTHORIZATION (name + facility + authorization source): the ONLY
-- two entries with a genuinely verifiable authorization record are:
--   • E-Parisaraa Pvt. Ltd. — CPCB + KSPCB approved; real SPCB authorisation
--     number published on Nokia's responsible-recycling page, plus the KSPCB
--     dismantler/recycler list (31.01.2023). Latitude/longitude approximate.
--   • Cerebra Integrated Technologies Ltd. — KSPCB licensed e-waste processor
--     (Narasapura, Kolar District; 20,000 MT/annum). NB its Peenya site is its
--     manufacturing plant, NOT its recycling facility.
--
-- VERIFIED-EVENT: Trishyirya Recycling India Pvt. Ltd., E-R3 Solutions Pvt.
-- Ltd., Samarthanam Trust for the Disabled, and Earth Sense Recycle Pvt. Ltd.
-- are real companies with real addresses, sourced from an official CPCB-
-- affiliated authorized e-waste recycler/dismantler list (dste.py.gov.in PDF).
-- HOWEVER: their materials_accepted, pickup_availability, service_area, and
-- contact_details below are NOT real — illustrative placeholders invented for
-- this demo. Their authorization fields are NULL (not independently verified).
--
-- ENTIRELY ILLUSTRATIVE (fictional company, standing in for a real one):
-- the remaining "authorized" entries use fictional names rather than
-- attaching invented details to real companies we could not verify.
--
-- ADDITIONAL CAVEAT: latitude/longitude for all entries are approximate
-- coordinates for their general industrial area, NOT verified precise GPS.
--
-- DELIBERATELY UNAUTHORIZED (always illustrative): the last two entries are
-- fictional, used to test the authorization-status filter.

INSERT INTO recyclers (name, facility_location, latitude, longitude, materials_accepted, authorization_status, authorization_details, authorization_number, verification_source, last_verified_at, contact_details, pickup_availability, service_area)
VALUES
-- Verified-real name + location; all other fields illustrative; authorization fields NULL (not independently verified)
('Trishyirya Recycling India Pvt. Ltd.', '4th Phase, Peenya Industrial Estate, Bengaluru', 13.0284, 77.5199,
 '["PCB","Cable","Motor/Magnet Assembly"]', 'authorized', 'Illustrative demo data -- real registration ID not independently verified', NULL, NULL, NULL,
 'Illustrative — real contact not sourced', 'daily', 'Peenya Industrial Area, 15 km radius'),

('E-R3 Solutions Pvt. Ltd.', '1st Cross, 1st Stage, Peenya Industrial Area, Bengaluru', 13.0300, 77.5175,
 '["PCB","Battery","LCD Panel"]', 'authorized', 'Illustrative demo data -- real registration ID not independently verified', NULL, NULL, NULL,
 'Illustrative — real contact not sourced', 'daily', 'Peenya Industrial Area, 10 km radius'),

('Samarthanam Trust for the Disabled (E-Waste Unit)', '6th Main, 3rd Phase, Peenya Industrial Area, Bengaluru', 13.0270, 77.5220,
 '["Cable","Mixed Plastic","CRT"]', 'authorized', 'Illustrative demo data -- real registration ID not independently verified', NULL, NULL, NULL,
 'Illustrative — real contact not sourced', 'daily', 'Peenya to Yeshwanthpur, 12 km radius'),

('Earth Sense Recycle Pvt. Ltd.', 'Jigani 2nd Stage, Jigani Industrial Area, Bengaluru', 12.7780, 77.6350,
 '["PCB","Cable","Motor/Magnet Assembly","Battery"]', 'authorized', 'Illustrative demo data -- real registration ID not independently verified', NULL, NULL, NULL,
 'Illustrative — real contact not sourced', 'on_request', 'Jigani to Electronic City, 10 km radius'),

-- E-Parisaraa Pvt. Ltd. — genuinely verified: CPCB + KSPCB approved e-waste &
-- battery recycler. Real SPCB authorisation number published on Nokia's
-- responsible-recycling page; also listed in KSPCB dismantler/recycler list
-- (31.01.2023) at #30-P3 Dobaspet, Bengaluru Rural. Coords approximate.
('E-Parisaraa Pvt. Ltd.', 'KIADB Industrial Area, Dobaspet, Bengaluru Rural, Karnataka', 13.1278, 77.5038,
 '["PCB","Battery","Cable","Motor/Magnet Assembly"]', 'authorized', 'CPCB + KSPCB approved e-waste & battery recycling company',
 'SPCB Auth No. PCB/WMC/3100/E-waste/2019-20/6471 (via Nokia responsible-recycling page)',
 'KSPCB list 31.01.2023 + nokia.com responsible-recycling page', '2026-09-05 00:00:00'::TIMESTAMP,
 'Illustrative contact — via corporate website only', 'on_request', 'Dobaspet / North Bengaluru, 25 km radius'),

-- Cerebra Integrated Technologies Ltd. — KSPCB licensed e-waste processor.
-- NOTE: its e-waste recycling plant is at Narasapura, Kolar District (12-acre
-- KIADB facility, ~20,000 MT/annum capacity), NOT the Peenya plant which is
-- its manufacturing unit. Coords approximate for Narasapura.
('Cerebra Integrated Technologies Ltd.', 'KIADB Industrial Area, Narasapura, Kolar District, Karnataka', 13.1350, 78.0620,
 '["PCB","Cable","Motor/Magnet Assembly","CRT"]', 'authorized', 'KSPCB licensed e-waste processing, recycling, refurbishing; 20,000 MT/annum (Narsapura facility)',
 NULL, 'Company site (recycling page) + DSIJ (Aug 2019)', '2026-09-05 00:00:00'::TIMESTAMP,
 'Illustrative contact — via corporate website only', 'on_request', 'Kolar District to Bengaluru EPR collection base'),

-- Fully fictional demo entries (not attached to any specific real company we couldn't verify)
('Demo Recycler C -- Peenya E-Waste Hub', 'Yeshwanthpur, Bengaluru (fictional demo entry)', 13.0284, 77.5540,
 '["PCB","CRT","Cable"]', 'pending', 'Fictional demo entry, application status illustrative', NULL, NULL, NULL,
 'Demo only — fictional contact', 'daily', 'Yeshwanthpur, 7 km radius'),

('Demo Recycler D -- Hebbal Circular Recyclers', 'Hebbal, Bengaluru (fictional demo entry)', 13.0358, 77.5970,
 '["Cable","Mixed Plastic","CRT"]', 'authorized', 'Fictional demo entry', NULL, NULL, NULL,
 'Demo only — fictional contact', 'on_request', 'Hebbal to Sahakarnagar, 9 km radius'),

-- Deliberately unauthorized/informal entries for testing the matching filter (always fictional)
('Local Scrap Point (fictional demo entry)', 'Koramangala, Bengaluru', 12.9352, 77.6245,
 '["CRT","LCD Panel","Mixed Plastic"]', 'unauthorized', NULL, NULL, NULL, NULL,
 'Demo only — fictional contact', 'on_request', 'Koramangala, 5 km radius'),

('Quick Kabadi Aggregator (fictional demo entry)', 'Marathahalli, Bengaluru', 12.9591, 77.6974,
 '["PCB","CRT","Mixed Plastic"]', 'unauthorized', NULL, NULL, NULL, NULL,
 'Demo only — fictional contact', 'no', 'Marathahalli to Bellandur, 6 km radius');

-- PRICE SOURCES — data provenance for the admin price-source panel.
INSERT INTO price_sources (source_name, source_type, source_url, description, last_collected_at) VALUES
('ScrapRates.in — Bengaluru e-waste market rate', 'MARKET_REFERENCE', 'https://scraprates.in/bangalore/e-waste-scrap-price',
 'Public indicative Bengaluru e-waste rate directory; material grades vary (PCB ₹150-400/kg, Li-ion ~₹92/kg). Not an official CPCB/KSPCB price.', '2026-08-04 00:00:00'::TIMESTAMP),
('CPCB E-Waste Management System', 'REGULATORY', 'https://eprewaste.cpcb.gov.in/',
 'Authoritative central source for the EPR/recycler ecosystem. Portal is login-gated; used as the regulatory reference point.', NULL),
('KSPCB E-Waste Dismantlers & Recyclers list (31.01.2023)', 'REGULATORY', 'https://www.scribd.com/document/754958896/',
 'Official KSPCB Waste Management Cell list of Bengaluru/Karnataka dismantlers and recyclers. Validate current validity before relying on any single entry.', '2026-08-04 00:00:00'::TIMESTAMP),
('Platform field survey', 'FIELD_SURVEY', NULL,
 'Illustrative placeholder for future field-survey prices collected during on-ground interviews (SIH Phase 0 research).', NULL);

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

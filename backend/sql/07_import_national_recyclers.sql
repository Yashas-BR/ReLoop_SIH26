-- 07_import_national_recyclers.sql
-- Imports verified national recyclers from national_recyclers_verified into
-- the main recyclers table so the matching engine (which only queries `recyclers`)
-- can find them. Uses approximate state-capital coordinates — good enough for
-- Haversine distance ranking; real GPS can be updated later via admin panel.
--
-- Safe to re-run: INSERT ... WHERE NOT EXISTS prevents duplicates.

INSERT INTO recyclers (
  name, facility_location, latitude, longitude,
  materials_accepted, authorization_status, authorization_details,
  verification_source, contact_details, pickup_availability, service_area
)
SELECT
  nrv.name,
  nrv.address,
  -- Approximate lat/lng by state (state-capital centroid, ±50 km accuracy)
  CASE nrv.state
    WHEN 'Karnataka'          THEN 12.9716
    WHEN 'Maharashtra'        THEN 19.0760
    WHEN 'Tamil Nadu'         THEN 13.0827
    WHEN 'Delhi'              THEN 28.6139
    WHEN 'Uttar Pradesh'      THEN 26.8467
    WHEN 'Gujarat'            THEN 23.0225
    WHEN 'Rajasthan'          THEN 26.9124
    WHEN 'West Bengal'        THEN 22.5726
    WHEN 'Telangana'          THEN 17.3850
    WHEN 'Andhra Pradesh'     THEN 15.9129
    WHEN 'Kerala'             THEN 8.5241
    WHEN 'Punjab'             THEN 30.7333
    WHEN 'Haryana'            THEN 29.0588
    WHEN 'Madhya Pradesh'     THEN 23.2599
    WHEN 'Odisha'             THEN 20.2961
    WHEN 'Jharkhand'          THEN 23.3441
    WHEN 'Chhattisgarh'       THEN 21.2787
    WHEN 'Bihar'              THEN 25.5941
    WHEN 'Assam'              THEN 26.1445
    WHEN 'Himachal Pradesh'   THEN 31.1048
    WHEN 'Uttarakhand'        THEN 30.3165
    WHEN 'Goa'                THEN 15.2993
    WHEN 'Chandigarh'         THEN 30.7333
    ELSE 20.5937  -- India centroid fallback
  END AS latitude,
  CASE nrv.state
    WHEN 'Karnataka'          THEN 77.5946
    WHEN 'Maharashtra'        THEN 72.8777
    WHEN 'Tamil Nadu'         THEN 80.2707
    WHEN 'Delhi'              THEN 77.2090
    WHEN 'Uttar Pradesh'      THEN 80.9462
    WHEN 'Gujarat'            THEN 72.5714
    WHEN 'Rajasthan'          THEN 75.7873
    WHEN 'West Bengal'        THEN 88.3639
    WHEN 'Telangana'          THEN 78.4867
    WHEN 'Andhra Pradesh'     THEN 79.7400
    WHEN 'Kerala'             THEN 76.9366
    WHEN 'Punjab'             THEN 76.7794
    WHEN 'Haryana'            THEN 76.0856
    WHEN 'Madhya Pradesh'     THEN 77.4126
    WHEN 'Odisha'             THEN 85.8245
    WHEN 'Jharkhand'          THEN 85.3096
    WHEN 'Chhattisgarh'       THEN 81.8661
    WHEN 'Bihar'              THEN 85.1376
    WHEN 'Assam'              THEN 91.7362
    WHEN 'Himachal Pradesh'   THEN 77.1734
    WHEN 'Uttarakhand'        THEN 78.0322
    WHEN 'Goa'                THEN 74.1240
    WHEN 'Chandigarh'         THEN 76.7794
    ELSE 78.9629  -- India centroid fallback
  END AS longitude,
  -- All national recyclers accept the full e-waste spectrum by default
  '["PCB","Cable","Battery","CRT","LCD","Motor","Plastic"]'::jsonb,
  'authorized',
  'CPCB authorized e-waste recycler/dismantler — ' || nrv.activity_type
    || CASE WHEN nrv.installed_capacity_mta IS NOT NULL
            THEN ' — capacity: ' || nrv.installed_capacity_mta || ' MT/annum'
            ELSE '' END,
  nrv.source,
  NULL,   -- contact_details: not in source data
  'on_request',
  nrv.state
FROM national_recyclers_verified nrv
WHERE NOT EXISTS (
  SELECT 1 FROM recyclers r
  WHERE LOWER(r.name) = LOWER(nrv.name)
    AND LOWER(r.facility_location) = LOWER(nrv.address)
);

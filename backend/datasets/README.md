# Kabadiwala Connect — Structured Datasets

These are the 6 datasets explicitly required by SIH26229's "Dataset Requirements"
section, exported directly from the live PostgreSQL database (not hand-typed
or simulated — real query output). A 7th file, `ai_ml_dataset.csv`, maps the
platform's 4 AI/ML models to these datasets (targets, features, and where each
model is used in the app).

## Files

| File | Rows | Maps to PS requirement |
|---|---|---|
| `material_dataset.csv` | 6 | "Material Dataset: category, sub-category, description, image, weight, condition, source type, estimated value" |
| `price_dataset.csv` | 49 | "Price Dataset: category, location, date/time, buying price, quoted price, unit, recycler, historical price info" |
| `recycler_dataset.csv` | 10 | "Recycler Dataset: name, location, materials accepted, authorization status, contact, offered rate, pickup availability, service area" |
| `transaction_dataset.csv` | 6 | "Transaction Dataset: lot ID, collector ID, material category, weight, quoted/final price, recycler ID, locations, date/time, payment/transaction status" |
| `traceability_dataset.csv` | 4 | "Traceability Dataset: lot ID, photographs, weight, timestamp, GPS, handover reference number, recycler confirmation, status" |
| `collector_dataset.csv` | 2 | "Collector Dataset: minimal profile — ID, preferred language, operating location, transaction/earnings history" |
| `ai_ml_dataset.csv` | 4 | "AI/ML Dataset: use-case mapping for the 4 models (price prediction, material classification, recycler ranking, anomaly detection) — targets, feature columns, training datasets, where each runs in the platform" |

## Data provenance (be ready to explain this to judges)

- **Recycler dataset — corrected after audit**: Only 4 entries use real company
  names, and only for **name + general area-level location**, sourced
  directly from an official CPCB-affiliated authorized e-waste recycler
  list (Trishyirya Recycling India Pvt. Ltd., E-R3 Solutions Pvt. Ltd.,
  Samarthanam Trust for the Disabled, Earth Sense Recycle Pvt. Ltd.). Every
  other field for these 4 (materials accepted, contact, rates, pickup,
  exact GPS coordinates) is an **explicitly labeled placeholder**, not
  real data about these companies. The remaining 6 recycler entries are
  **fully fictional demo entries** (clearly named "Demo Recycler
  A/B/C/D" and marked as fictional), used only to give the matching/
  filtering logic realistic variety to work with. We do not attach
  invented operational details to real, identifiable companies we could
  not verify — an earlier draft of this dataset did that, and it was
  corrected on review.
- **PCB, Cable, and Battery prices**: Anchored to real researched 2026
  Indian scrap-price data (IndiaMART listings, national recycling market
  reports, city-specific scrap-rate trackers). Not live market data, but
  not arbitrary numbers either — realistic variation applied around real
  reference points.
- **CRT, LCD Panel, Motor/Magnet Assembly, Mixed Plastic prices**: Based
  on earlier general Bengaluru e-waste market research (~₹45/kg average
  mixed e-waste, ₹10-15/kg plastic casings) — lower confidence than the
  three categories above; flagged as a limitation.
- **Materials, Transactions, Traceability, Collectors**: Synthetic demo
  data designed to exercise every state in the app's workflow (quoted →
  matched → handed_over → confirmed), not real observed transactions.
- **To be updated**: once your team's field research with 2+ real
  collectors is complete, replace/supplement these rows with real
  reported data — this becomes your strongest evidence for the PS's
  dataset-quality expectations and the unit-economics deliverable.

## Regenerating these files
If the database changes, re-export with:
```bash
psql -d kabadiwala_connect -c "\copy (SELECT * FROM materials ORDER BY id) TO 'material_dataset.csv' WITH CSV HEADER"
```
(repeat per table — see the project's main README for the full db setup)

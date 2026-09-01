# 🏆 Kabadiwala Connect (ReLoop) — SIH Hackathon Demo Script & API Walkthrough

**Live Application URLs:**
- **Frontend App:** `http://localhost:5173`
- **Backend API:** `http://localhost:5000`
- **Database:** Local SQLite (WAL Mode) with IndexedDB client synchronization

---

## 🎬 3-Minute Live Demo Walkthrough (Judge Presentation Script)

### Step 1: Open Price Discovery Board (Fair Pricing & Accessibility)
- **Story / Value Prop:** Informal waste pickers (Kabadiwalas) are routinely exploited by middlemen because they don't know the daily wholesale market rates of critical e-waste minerals and metals.
- **Action in UI:** 
  1. Navigate to **"Price Board" / "बाजार भाव"** (`/prices`).
  2. Switch language to **Hindi (हिन्दी)** or **Marathi (मराठी)** in the top bar.
  3. Click **"भाव बोलकर सुनें" (Read Aloud)** on any card (e.g. Lithium-Ion Battery or Copper Wire) to demonstrate accessibility for low-literacy collectors.
  4. Click **"मूल्य रुझान चार्ट देखें" (View Price Trend)** to view the 7-day interactive historical price series.
- **Under the Hood (API):**
  - `GET /api/prices?location=Bengaluru` (Fetches dynamic prices and 7-day sparklines from SQLite).
  - `GET /api/materials` (Categorized list of 31 materials & recoverable elements).

---

### Step 2: Create a Material Lot (Offline-First Resiliency)
- **Story / Value Prop:** Kabadiwalas work in scrap yards, basements, and alleys with zero internet connectivity. The app must never fail or lose data when offline.
- **Action in UI:**
  1. Click the **"🧪 Test Offline"** toggle in the header (or simulate offline in Chrome DevTools).
  2. Observe the badge turns amber: `Offline Mode (0 pending)`.
  3. Click **"➕ Create Lot" / "नया लॉट बनाएं"**.
  4. Select **"Laptop" (लपटॉप)**, enter **15 kg**, condition **"Good"**.
  5. Notice the **instant estimated valuation** calculated offline using local fallback rates.
  6. Click **"Save Lot"** → Lot is saved immediately into client **IndexedDB**.
  7. Notice header updates to: `Offline Mode (1 pending)`.
  8. Click **"🧪 Test Offline"** to turn connectivity back ON → Notice automated sync triggers and uploads the lot directly to SQLite server!
- **Under the Hood (API & Storage):**
  - **Offline:** Written to Dexie.js / IndexedDB store `lots` with `sync_status = "pending_sync"`.
  - **Online Sync:** `POST /api/lots` (Multipart FormData with image blob, payload inserted to SQLite `lots` and `lot_items`).

---

### Step 3: Match with Authorized Recyclers (Traceability & Fair Match Score)
- **Story / Value Prop:** Instead of selling to uncertified backyard smelters that cause toxic fires, our algorithm matches collectors directly with KSPCB/CPCB authorized recyclers based on proximity, best price, and compliance.
- **Action in UI:**
  1. View the ranked list of matched recyclers.
  2. Notice the top-ranked recycler: **"SafeDispose e-Waste Hub"** (KSPCB Authorized, Best Price ₹/kg, Distance ~6 km).
  3. Notice informal unauthorized traders are filtered out or flagged.
  4. Click **"Initiate Handover"** to SafeDispose e-Waste Hub.
- **Under the Hood (API):**
  - `GET /api/match?lot_id=1&authorized_only=true` (Executes Haversine distance calculations, compliance filtering, and weighted multi-factor ranking).

---

### Step 4: Digital Handover & Geolocation Proof (Chain of Custody)
- **Story / Value Prop:** CPCB E-Waste Rules 2022 mandate end-to-end digital traceability. We capture dual GPS coordinates and generate a tamper-evident digital handover certificate.
- **Action in UI:**
  1. Capture Collector GPS location (or use default coordinates).
  2. Click **"Confirm Handover"** → A cryptographically unique `HDO-UUID` receipt is generated.
- **Under the Hood (API & DB State):**
  - `POST /api/transactions/handover`
  - Creates row in `traceability` table with `status = "pending_confirmation"`.
  - Creates row in `transactions` table with `payment_status = "pending"`.
  - Updates `lots` status to `"pending_confirmation"`.

---

### Step 5: Recycler Confirmation Portal (Completing the Loop)
- **Story / Value Prop:** In the dual-stakeholder model, the recycler logs into their dashboard, inspects incoming scrap, records their receiving GPS, and signs off.
- **Action in UI:**
  1. Click **"Recycler Portal" / "रीसाइक्लर पोर्टल"** in the top navigation.
  2. Select **"SafeDispose e-Waste Hub"** from the persona dropdown.
  3. Locate the pending handover card matching the created lot.
  4. Click **"📍 Capture My GPS Location"**.
  5. Click **"✓ Confirm Material Receipt"**.
- **Under the Hood (API & DB State):**
  - `PUT /api/traceability/:id/confirm`
  - Updates `traceability.status = "recycler_confirmed"`, sets `recycler_confirmed_at = CURRENT_TIMESTAMP`.
  - Automatically updates `transactions.payment_status = "paid"`.
  - Updates `lots.status = "completed"`.

---

### Step 6: Collector Earnings & Settlements Ledger (Financial Inclusion)
- **Story / Value Prop:** Kabadiwalas get transparent accounting of their daily earnings, pending dues from buyers, and historical settlement proof to access micro-credit.
- **Action in UI:**
  1. Click **"Earnings Ledger" / "कमाई का बहीखाता"**.
  2. View **Total Earned (Settled)**, **Pending Dues**, and total volume traded.
  3. Point out that these totals are computed in real-time from SQLite database transactions using SQL aggregation `SUM()`.
  4. Test toggling payment status between "Paid" and "Pending" to demonstrate live re-calculation.
- **Under the Hood (API):**
  - `GET /api/transactions?collector_id=1` (Executes live SQL `SUM(CASE WHEN payment_status='paid'...)`).
  - `PUT /api/transactions/:id/payment` (Updates `payment_status`).

---

### Step 7: Safety & Hazardous Waste Guidance (E-Waste Rules Compliance)
- **Story / Value Prop:** Educates informal workers against lethal informal practices (burning PVC cables, aqua regia acid leaching, smashing CRT vacuum tubes).
- **Action in UI:**
  1. Click **"Safety Rules" / "सुरक्षा नियम"** (`/safety`).
  2. Highlight the 3 core safety modules with clear pictorial visual cues.
  3. Click **"🔊 सुनो (Listen in Hindi/Marathi)"** for speech synthesis.

---

## 📊 Complete API Reference Table

| Endpoint | Method | Purpose & Query Params |
|----------|--------|------------------------|
| `/api/health` | `GET` | Health check + Live DB table counts |
| `/api/materials` | `GET` | Catalog of 31 materials & recoverable elements |
| `/api/prices` | `GET` | `?location=Bengaluru&category=E-Waste` — Live buying/quoted rates + sparklines |
| `/api/prices/history` | `GET` | `?material_id=1&location=Bengaluru&days=30` — Historical price time series |
| `/api/lots/estimate` | `POST` | Dynamic lot valuation based on 7-day weighted average price |
| `/api/lots` | `POST` | Create a new scrap lot (Supports multipart/form-data with photo) |
| `/api/lots` | `GET` | Retrieve logged lots for collector |
| `/api/match` | `GET` | `?lot_id=1&authorized_only=true` — Ranked recycler matching with Haversine distances |
| `/api/transactions/handover` | `POST` | Initiate digital handover & generate certificate |
| `/api/traceability/pending` | `GET` | `?recycler_id=4` — Pending handovers awaiting recycler confirmation |
| `/api/traceability/:id/confirm` | `PUT` | Recycler confirmation with GPS coordinates |
| `/api/transactions` | `GET` | `?collector_id=1` — Real-time earnings summary & transaction list |
| `/api/transactions/:id/payment`| `PUT` | Mark payment status (`paid` / `pending`) |

---

## 🎯 Key Hackathon Takeaways for Judges
1. **100% Real Code & Real Database:** No mock data or fake timers — all state transitions mutate actual SQLite records.
2. **True Offline-First Architecture:** Full IndexedDB sync queue handles spotty network conditions seamlessly.
3. **Multilingual Inclusivity:** Complete Hindi, Marathi, and English UI with Web Speech API voice readouts for low-literacy informal workers.
4. **End-to-End Regulatory Traceability:** Meets CPCB/KSPCB E-Waste Management Rules 2022 guidelines for digital chain of custody.

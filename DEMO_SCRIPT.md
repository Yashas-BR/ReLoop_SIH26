# Kabadiwala Connect — SIH Judge Demo Script

**Team:** utkarsh-shukla · Shashank K. · Weaselbiddu | **Problem:** SIH26229
**Stack:** Node.js + Express (backend :3000) · React + Vite (frontend :5173, proxied `/v1`)

> Start commands (two terminals):
> - backend: `cd backend && npm run dev`
> - frontend: `cd frontend && npm run dev`
>
> The seeded demo set is restored any time with `npm run reset && npm run seed` (in `backend/`).

---

## 0. One-line pitch (open with)

> "Kabadiwala Connect is a *verified, fair-price* e-waste marketplace that links street kabadiwalas directly with **CPCB/SPCB-authorized recyclers** — transparent quoted prices, live market-rate comparison, and a fully traceable, GPS-stamped handover with the receipt confirmed and paid on the recycler side."

---

## 1. Walk-in: login screen (30s)

- Unified portal — one login for everyone.
- Tap the **Ramesh Kumar / 9876543210** demo chip → lands on collector Dashboard.
- *(Optional, 20s)* Scroll to bottom of login: **"Create an account"** → live registration creates a real account row (phone-unique) and signs in instantly. Use a fresh 10-digit number, e.g. `98250 12346`.

**Say:** "Account creation is phone-based — real collectors carry one phone; the backend returns a session, roles power the portal switch."

---

## 2. Collector: create a quick lot (2 min)

Dashboard → **Create Lot** → add 1 photo (or skip) → category **Cables** → weight **5 kg** → location **Whitefield/Bengaluru** → review → **Instant Estimate** shows the live market price (`₹/kg`, market range low–high).

**Say:** "The estimate isn't a random guess — it pulls today's market inputs from the price-source registry (ScrapRates.in, CPCB & KSPCB lists) that the admin panel shows later. This is price *transparency*: the kabadiwala now knows what their scrap is worth before anyone quotes."

Submit the lot. *(Add a note: "Office renovation copper wiring".)*

> Faster path for a rushed demo: use the pre-seeded open lot **LOT-2026-0001 (PCB 3.5 kg)** instead.

---

## 3. Collector: request quotes, compare, accept (2 min)

- Open the new lot → **"Compare recyclers & request quotes"** → Matched Recyclers page.
- The map + cards show **authorized recyclers only**, with match score, distance, pickup.
- Tap **Request Quote** on **E-Parisaraa** and **Trishyirya** (2 cards).

**Say:** "Only *authorized* facilities are reachable — our platform refuses to route e-waste to un-licensed aggregators. Notice E-Parisaraa is the real, independently verified CPCB + KSPCB recycler; note the honest data sourcing, the admin panel shows the provenance."

- Switch persona: logout → recycler tile **"Enter Recycler Portal"** (single-one-tap, demo persona account).

---

## 4. Recycler: price the requests (1.5 min)

- Recycler Portal → **Incoming Lots** tab → **"Quote Requests"** section at top shows the two lots waiting on *your* price.
- Type `820` and `800` (a market benchmark is prefilled in the lot page) → **Submit Quote**.

**Say:** "The recycler fills real prices — no fixed platform rate-card, so the marketplace stays competitive. The collector now sees two live offers."

- *(Optional)* Open the lot detail → **"Quote this Lot"** card with the live market-estimate hint.

---

## 5. Collector: accept the best quote → handover (2 min)

- Back to collector → Matched Recyclers → **Quotes Received** panel shows `E-Parisaraa ₹800` and `Trishyirya ₹820`.
- **Accept ₹820** — the accepted recycler's card is highlighted (green), everything else mutes.
- Tap **Select this Recycler** → handover initiated → **reference number** issued (`HOV-…`).
- Lot detail → **Traceability** timeline: created → valued estimate → recycler matched → handover initiated (awaiting receipt).

**Say:** "Accepting a quote **binds the lot to that recycler at that price** — no more 'market-rate guess' fights at the weighing scale. Every hop after this has a timestamp + GPS + reference."

---

## 6. Recycler: confirm receipt → pay (AI/ML moment, 1.5 min)

- Recycler Portal → Incoming Lots → open the lot → **Confirm Receipt** (fills confirmation timestamp).
- **Record Payment**: type a price **below** the market range (e.g. `350` for a PCB lot) — the **anomaly detector fires** a "Unusual transaction value" warning with the market range (AI/ML use case §11-D).
- Correct to `815` → "within normal range" → record **cash/UPI/bank**.

**Say:** "The system flags price manipulation in real time — protecting the *kabadiwala*, which is the point of the problem statement."

- Collector dashboard → Earnings ledger now shows the paid transaction.

---

## 7. Admin: governance + data provenance (1.5 min)

`/admin` via the navbar (admin chip works), code **`KBC-ADMIN-2026`**.

- **Overview**: live counters — collectors, recyclers, pending authorizations, expiring-60-day alert block, lots, transactions, open quotes, price sources.
- **Recycler Verification**: queue shows **Demo Recycler C — pending**. Approve it (SPCB check note auto-stamped). Demo how a *fictional* entry is still labeled honestly.
- **Price Sources tab**: the registry — ScrapRates.in (market reference), CPCB E-Waste Management System, KSPCB list 31.01.2023 (regulatory), platform field survey. Each with last-collected date.

**Say:** "Everything traceable — even our *proof* of a market price is public on this screen. That's the trust layer the informal scrap economy is missing."

---

## 8. Bonus claims to riff on if time allows

- **Offline-first:** toggle the network offline while creating a lot / initiating a handover → "Saved offline" chip; it syncs on reconnect (IndexedDB queue). Great field-story: kabadiwalas work where Jio bars drop.
- **Localized:** switch हिंदी / मराठी in the navbar — the whole app (including quotes + admin) translates; Ramesh's account defaults to Hindi.
- **Honest data:** verified-vs-illustrative labeling, SPCB numbers as-sourced; Cerebra is *Kolar-district* KSPCB licensed, not Peenya — we don't fake proximity.

---

## Walkthrough cheat sheet (key facts to have ready)

| Item | Value |
|---|---|
| Demo collector | Ramesh Kumar · 9876543210 (or 98250 12345 to register) |
| Second collector | Suresh Patil · 9876501234 |
| Admin code | KBC-ADMIN-2026 |
| Ready-made open lot | LOT-2026-0001 · PCB · 3.5 kg · est ₹857.50 |
| Authorized PCB buyers | Trishyirya, E-R3, Earth Sense, E-Parisaraa, Cerebra |
| Verified recyclers (real data) | E-Parisaraa (SPCB `PCB/WMC/3100/E-waste/2019-20/6471`), Cerebra (Kolar facility) |
| Prices source | ScrapRates Bengaluru mixed e-waste ≈ ₹44.74/kg; PCB ₹150–400/kg; Li-ion ≈ ₹92/kg |

## Scripted one-liners by feature

- **Fair price:** "Market-derived estimate before negotiations — the kabadiwala is never blind at the scale."
- **Verified recyclers:** "Only SPCB/CPCB-authorized facilities can appear in a match, and the admin shows *why* they're trusted."
- **Quote marketplace:** "Collectors compare competing bids; recyclers compete on real prices, not doorstep bargaining."
- **Traceability:** "Lot → quote → handover → receipt → payment: every step stamped and auditable."
- **Offline:** "The job happens in the field; the app works when the network doesn't."
- **Localization + speech:** "Built for India's polyglot field workforce."
- **Governance:** "A regulator/operator panel with verification workflow, expiry alerts and a price-source registry."
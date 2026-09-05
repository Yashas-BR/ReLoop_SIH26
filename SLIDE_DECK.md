# Kabadiwala Connect — SIH 26229 Slide Deck Outline

**Purpose:** Copy-paste-ready slides for the presentation + the judges' live demo. Pair with `DEMO_SCRIPT.md` (the timed live walkthrough). Target 8–10 min of slides, then the 3–4 min live demo.

---

## Elevator version (3 minutes, timed) — use if the room wants speed

> **0:00** "India's kabadiwalas move the country's electronic waste, but they do it blind — paid whatever a dealer feels like, with zero proof of what their scrap is worth, zero choice of buyers, and zero record that the load was handled by a licensed recycler. SIH26229 asks us to fix that.
>
> **0:30** "Kabadiwala Connect is a **verified, fair-price e-waste marketplace**. The kabadiwala scans their scrap, and we show a **live market-derived estimate** from a public price-source registry — CPCB and KSPCB lists, ScrapRates.in. Positioned honest data: today the platform only routes to **SPCB/CPCB-authorized recyclers**.
>
> **1:00** "The kabadiwala **requests quotes** from several authorized recyclers, compares them like a marketplace, and accepts the best bid — the lot is **bound to that recycler at that price**. No more haggling at the scale.
>
> **1:30** "Every handover after that is **traceable** — a reference number, GPS, timestamps, and a receipt the recycler confirms and pays. An **AI anomaly check** flags any payment pushed below the market range, protecting the kabadiwala's earnings.
>
> **2:10** "It's built for the field: an **offline-first** app that queues operations when signal drops, and fully localized in **हिंदी and मराठी**, with prices read aloud.
>
> **2:50** "And there's a three-sided platform: a **recycler portal** to bid and manage handovers, plus an **admin governance panel** with a verification workflow, expiry alerts, and a price-source registry. Live demo now."

---

## Slide 1 — Title

> **Kabadiwala Connect**
> *Verified, fair-price e-waste marketplace connecting street kabadiwalas to authorized recyclers.*
> Team: utkarsh-shukla · Shashank K. · Weaselbiddu
> Smart India Hackathon 2026 — Problem SIH26229

*Speaker note: open with the problem magnitude, not the product.*

---

## Slide 2 — The Unseen Economy

**Ever heard of the kabadiwala?** India's informal scrap collectors keep e-waste out of landfills — alone.

- **~1.6M+** informal scrap workers; the sector handles a major share of India's e-waste
- E-waste grows with every festive sale; TV/phone/laptop cycles shorten every year
- Today the ecosystem runs on **doorstep bargaining** with no record, no reference, no rights

> The kabadiwala is paid whatever a dealer feels like. There is no price discovery, no buyer choice, and no proof the load reached a licensed recycler.

---

## Slide 3 — What Actually Breaks

| Problem (from the SIH statement) | Today's reality |
|---|---|
| Unfair, non-transparent pricing | Lump-sum bargaining; prices vary 2–3× by dealer mood |
| Unverified recyclers | E-waste can flow to informal, unlicensed units |
| No traceability | No record of where scrap lands or how it's handled |
| Disproportionate burden | Collectors in lower socio-economic brackets lose most at the scale |
| Weak enforcement data | Regulators can't see flow or pricing outliers |

---

## Slide 4 — Our Solution: Three Sides, One Platform

**Collector** — photo the scrap → get a market estimate → compare verified recyclers → accept a real quote → traceable, paid handover.

**Recycler** — see matching lots, quote real prices, confirm receipts, record payments (with fairness checks).

**Admin / Regulator** — verification workflow, authorization expiry alerts, and a public price-source registry.

> One unified portal. One login. Two work personas. One governance layer.

---

## Slide 5 — Fair Price, Proven

- **Instant estimate** from live market data, region-aware (`₹/kg`, low–high market range)
- **Quote marketplace**: collector requests quotes; recyclers compete on real prices
- Accepting a bid **binds the lot to that recycler at that price** — the estimate is never a bluff
- **AI anomaly detection** flags payments outside the market range (protects the collector)

*Demo hook: we'll get two recyclers bidding on one lot live.*

---

## Slide 6 — Verified Recyclers Only

- Matching is restricted to **authorized** facilities (SPCB/CPCB)
- Honestly labeled data: verified **E-Parisaraa** (CPCB + KSPCB, real SPCB number) and **Cerebra** (KSPCB-licensed, Kolar facility) — positioned accurately
- Fictional/demo facilities are visibly marked as such; admin review is the quality gate
- **Price-source registry** shows the receiver of truth for every `₹/kg`

> Trust is engineered into the platform — not a feature claim.

---

## Slide 7 — Traceability, End to End

`Lot → Quote → Handover → Receipt → Payment`

- Handover reference + **GPS + timestamps** at every hop
- Recycler confirms receipt; payment status follows
- Work/manifest-style audit trail for the admin view

---

## Slide 8 — Built for the Field

- **Offline-first**: create lots and handovers offline — queued and replayed on reconnect (IndexedDB sync)
- **Localized** in हिंदी and मराठी (English default); prices can be read aloud
- Mobile-first UI; works on low-end devices and flaky networks

---

## Slide 9 — AI/ML Use Case (per the statement)

- Anomaly detection on payment vs. market range → **real-time "unusual transaction value" alert**
- Feeds the fairness guarantee; logged for the admin/regulator
- *(Roadmap: lot-value prediction, price-index forecasting, map clustering)*

---

## Slide 10 — Architecture

```
┌─ React 19 + Vite (PWA, mobile-first)
│   └─ Offline layer: IndexedDB cache + sync queue
├─ Express API (/v1) — Zod-validated, role-aware
└─ PostgreSQL — lots, transactions, traceability,
       recyclers (auth status), offers, price_sources
```
- REST + validation envelopes; single unified frontend, three personas
- Demo-friendly: `npm run reset && npm run seed` restores canonical data

---

## Slide 11 — Roadmap

1. **OTP + real session auth** (UPI-linked payout identity)
2. **UPI auto-payout** on receipt confirmation
3. **Regulator API / export** of flow & pricing stats
4. **Multi-city price index** + Hindi/Marathi speech everywhere
5. **NGO + producer-takeback onboarding** (EPR credits)

---

## Slide 12 — Close

> **"Fair price, verified buyers, total traceability — for the person who keeps Bangalore's e-waste out of the ground."**
>
> Thank you — live demo, or questions?

---

## Suggested visuals / demo timings

| Slide | Visual cue | Live demo link |
|---|---|---|
| 4 | Product screenshot (3 portals) | — |
| 5 | Estimate → quotes → accept (live) | `DEMO_SCRIPT.md` §3–5 |
| 6 | Admin → Price Sources + verification queue | `DEMO_SCRIPT.md` §7 |
| 7 | Traceability timeline screenshot | `DEMO_SCRIPT.md` §5–6 |
| 8 | Offline toggle + हिंदी switch | `DEMO_SCRIPT.md` §8 |
| 9 | Anomaly warning screenshot | `DEMO_SCRIPT.md` §6 |
| 10 | Architecture diagram | — |

## Build cheat sheet

- Run: `cd backend && npm run dev` · `cd frontend && npm run dev` · open `http://localhost:5173`
- Login: demo chip **Ramesh · 9876543210** · Recycler: recycler tile · Admin: **KBC-ADMIN-2026**
- Reseed canonical data: `npm run reset && npm run seed`
- Backend tests: `npm test` (**154 passing**); Frontend: `npm run build` + `npm run lint`
# Verified National E-Waste Recycler Dataset

## Source (real, checkable)
Pulled directly from two official CPCB-affiliated authorized e-waste
recycler/dismantler lists:

1. **State-level list (Karnataka)**: dste.py.gov.in/ppcc/pdf/Authorization/E-Waste-Recycler.pdf
   — 84 entries, all Karnataka, with full addresses and Working/YTC status.
2. **National list**: ndmc.gov.in/pdf/cpcb_approved_list_of_e-waste_recyclers_dismantler.pdf
   — "List of Dismantlers/Recyclers as per the authorisation issued by
   SPCBs/PCCs under E-Waste (Management) Rules" — covers all states,
   569 total entries nationally, including 140 in Maharashtra alone,
   with installed capacity (Metric Tons per Annum) for most entries.

## What's in this file
39 entries: 15 from Karnataka, 20 from Maharashtra (as requested), plus
3 from Tamil Nadu and 1 from Kerala for broader national context —
selected as a representative geographic spread, not the full 569-entry
national list (which is available in full at the source PDF above if
you want more).

## What's real vs. what's NOT included (honesty check)
| Field | Status |
|---|---|
| Company name | **Real** — verbatim from source |
| Address | **Real** — verbatim from source |
| State | **Real** |
| Activity type (recycler/dismantler) | **Real** — from source |
| Installed capacity (MTA) | **Real**, where the source listed it (some entries left blank where source didn't specify) |
| Working/YTC status | **Real** — from source ("YTC" = Yet To Commission) |
| Materials accepted | **NOT included** — source doesn't specify this per company, so we don't invent it |
| Contact details | **NOT included** — not in source |
| Offered rate | **NOT included** — not in source |
| Pickup availability | **NOT included** — not in source |
| Exact GPS coordinates | **NOT included** — source gives street addresses only, not coordinates |

## Important note on "authorized" status
Every company in this file is authorized by definition — inclusion in
an official CPCB-affiliated state/national authorization list under the
E-Waste (Management) Rules is what "authorized" means. This is
genuinely verifiable, unlike our earlier synthetic demo data's
authorization_status field.

## Using this in your app
This is real name/address/capacity data — good for grounding your pitch
and for populating the recycler_dataset with genuinely authentic
company records. For fields the app needs but the source doesn't
provide (materials accepted, exact coordinates, contact info, rates),
either:
1. Leave them explicitly blank/unknown in the UI for these real entries, or
2. Supplement with your own field research (e.g., calling a few of
   these real companies to confirm what they accept), or
3. Keep using clearly-labeled fictional demo entries alongside these
   real ones for the fields the demo needs to function end-to-end.

Don't fill in the missing fields with invented data attached to these
real company names — that was the exact mistake corrected in the main
recycler_dataset.csv earlier in this project.

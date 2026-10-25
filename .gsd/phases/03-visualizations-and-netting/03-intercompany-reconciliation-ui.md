---
phase: 3
plan: 3
wave: 2
gap_closure: false
---

# Plan 3.3: Inter-Company Reconciliation Center UI with Contra Badges & Overrides

## Objective
Construct the Inter-Company Netting Reconciliation Center (`/intercompany`) interface for financial controllers and promoters. Displays gross vs. net group inflow/outflow metrics (showing artificial inflation removed), contra matching tables with confidence scores, sister entity source-destination pathways, and manual contra dissolution/override actions with mandatory MCA audit reason input.

## Context
Load these files for context:
- `ubfd_engineering_project_report.md` (Section 3.3, Section 4.1)
- `frontend/src/types/finance.ts`
- `frontend/src/components/inspector/ContraBadge.tsx`

## Tasks

<task type="auto" effort="medium">
  <name>Build Inter-Company Netting Center Page & Override Modal</name>
  <files>
    frontend/src/pages/IntercompanyNettingPage.tsx
    frontend/src/App.tsx
  </files>
  <action>
    1. Implement `IntercompanyNettingPage.tsx`:
       - High-level Gross vs. Net comparison cards:
         - "Gross Group Movements" (Gross Inflow + Gross Outflow)
         - "Contra Netting Eliminated" (Total paired transfers, e.g. ₹2,00,000 removed)
         - "Net Real Business Cash Inflow" (True revenue receipts without inter-co noise)
         - "GST Schedule I Compliance Status" (Auto-tagged contra logs)
       - Contra Pair Matching Roster:
         - Source Entity & Bank (e.g. Alpha Retailers HDFC)
         - Destination Entity & Bank (e.g. Sister Logistics ICICI)
         - Netted Amount (with `CurrencyDisplay`)
         - Confidence Score (`98.50%`)
         - Status badge (`ELIMINATED`)
         - Actions: "View Audit Trail", "Manual Override / Dissolve Pair"
       - Manual Override modal with mandatory audit reason capture (satisfying MCA Rule 3).
    2. Wire `IntercompanyNettingPage` into `frontend/src/App.tsx` under the `intercompany` tab.
  </action>
  <verify>
    npm --prefix frontend run build
  </verify>
  <done>
    Inter-Company Netting Center page compiles and renders with active data.
  </done>
</task>

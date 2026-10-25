---
phase: 2
plan: 3
wave: 2
gap_closure: false
---

# Plan 2.3: Frontend Date Inspector Picker, 4-Metric Tiles & Virtualized Transaction Register

## Objective
Construct the user interface for the Daily Cash Inspector, including the instant date selector, 4-metric summary tiles (`Opening Balance`, `Total Credited`, `Total Debited`, `Closing Balance`, plus `Net Velocity`), contra exclusion toggle, real-time search input, and high-performance transaction register table with category badges and contra tags.

## Context
Load these files for context:
- `ubfd_engineering_project_report.md` (Section 4.1)
- `frontend/src/types/finance.ts`
- `frontend/src/components/shared/CurrencyDisplay.tsx`

## Tasks

<task type="auto" effort="medium">
  <name>Build Date Inspector Picker, MetricsBar & ContraBadge Components</name>
  <files>
    frontend/src/components/inspector/DateInspectorPicker.tsx
    frontend/src/components/inspector/MetricsBar.tsx
    frontend/src/components/inspector/ContraBadge.tsx
  </files>
  <action>
    1. `DateInspectorPicker.tsx`: Fast date switcher with quick-jump controls (Yesterday, Target Date `2026-10-25`, Next Day, native HTML5 date input).
    2. `MetricsBar.tsx`: 4 high-contrast financial metric tiles:
       - Opening Balance
       - Total Credited (Green font/indicator, with count)
       - Total Debited (Rose font/indicator, with count)
       - Closing Balance (Large font with net velocity badge: `+₹3,29,500.00` or `-₹X`)
       - Cache indicator pill showing "⚡ Cached (<10ms)" or "🔄 Dynamic Fallback"
    3. `ContraBadge.tsx`: Distinctive GST Schedule I contra tag indicator with tooltip explaining eliminated inter-company contra flow.
  </action>
  <verify>
    npm --prefix frontend run build
  </verify>
  <done>
    Inspector sub-components compile without errors.
  </done>
</task>

<task type="auto" effort="medium">
  <name>Build Daily Inspector Page & Transaction Register Table</name>
  <files>
    frontend/src/components/inspector/TransactionRegister.tsx
    frontend/src/pages/DailyInspectorPage.tsx
    frontend/src/App.tsx
  </files>
  <action>
    1. Implement `TransactionRegister.tsx`:
       - Transaction table displaying: Time, Narration & Counterparty, Reference Number, Category badge, Debit, Credit, Running Balance, and Contra tag.
       - Real-time search keyword input filtering narration and counterparty names.
       - "Exclude Inter-Company Contra" toggle switch.
       - Visual highlights for inflows (green), outflows (rose), and contra pairs (purple).
    2. Implement `DailyInspectorPage.tsx`:
       - Account selector dropdown switching across all 6 group accounts.
       - Connects `useQuery` to `GET /api/v1/accounts/{account_id}/daily-ledger?date=...`.
       - Renders `DateInspectorPicker`, `MetricsBar`, and `TransactionRegister`.
    3. Wire `DailyInspectorPage` into `App.tsx` under the `inspector` tab.
  </action>
  <verify>
    npm --prefix frontend run build
  </verify>
  <done>
    Daily Cash Inspector UI renders with live API queries and zero TypeScript errors.
  </done>
</task>

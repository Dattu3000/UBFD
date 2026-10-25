---
phase: 4
plan: 2
wave: 2
gap_closure: false
---

# Plan 4.2: Statement Upload Wizard, Column Mapper & Reconciliation Reviewer UI

## Objective
Build the Statement Ingestion Rail frontend interface (`/ingestion`) allowing finance controllers and accountants to drag-and-drop bank statement files (PDF, CSV, Excel), select target commercial accounts, preview extracted transactions, review detected inter-company contra candidates, and commit transactions into the master ledger with real-time feedback.

## Context
Load these files for context:
- `ubfd_engineering_project_report.md` (Section 1, Section 7 Sprint 4)
- `frontend/src/types/finance.ts`

## Tasks

<task type="auto" effort="medium">
  <name>Build Ingestion Wizard Component & Review Table</name>
  <files>
    frontend/src/pages/StatementIngestionPage.tsx
    frontend/src/App.tsx
  </files>
  <action>
    1. Implement `StatementIngestionPage.tsx`:
       - Account Selector: Choose which commercial bank account the statement belongs to.
       - File Dropzone: Drag-and-drop or file upload supporting `.csv`, `.pdf`, `.xlsx`.
       - Sample Statement Templates: One-click "Load Sample HDFC Statement" and "Load Sample SBI Statement" for instant interactive verification.
       - Extraction Preview Grid: Shows parsed lines (Date, Ref, Counterparty, Narration, Debit, Credit, Running Balance).
       - Ingestion Summary: Ingestion status badge, total records parsed, total inflow volume, total outflow volume, auto-paired contra transfers count.
       - "Commit to Live Ledger" button with feedback.
    2. Wire `StatementIngestionPage` into `frontend/src/App.tsx` under the `ingestion` tab.
  </action>
  <verify>
    npm --prefix frontend run build
  </verify>
  <done>
    `StatementIngestionPage` compiles and renders with active data.
  </done>
</task>

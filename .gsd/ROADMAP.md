---
milestone: Phase 1 MVP Delivery
version: 1.0.0
updated: 2026-10-25T18:50:00+05:30
---

# Roadmap: Unified Business Finance Dashboard (UBFD) / Group Cash OS

> **Current Phase:** Phase 1 - Foundation & Data Architecture
> **Status:** Planning Ready

## Must-Haves (from SPEC)

- [ ] Multi-tenant backend operational with FastAPI, SQLAlchemy 2.0 Async, Pydantic v2 schemas, and RLS session controls.
- [ ] Daily Ledger Inspector endpoint (`GET /api/v1/accounts/{account_id}/daily-ledger`) calculates opening balance, debits, credits, closing balance, and net velocity with dynamic transaction rollback in <150ms.
- [ ] Inter-Company Netting Engine accurately detects and links matching debit-credit pairs between sister entities within ±48h window with contra tags and audit log generation.
- [ ] PDF parser extracts transaction tabular data accurately for SBI, ICICI, and HDFC account statements.
- [ ] Next.js 15 + React 19 frontend renders Group Overview, Daily Cash Inspector (with 4-metric summary tiles & virtualized register), Inter-Company Netting Center, and Ingestion Wizard.
- [ ] Chart.js waterfall sequence visually displays opening-to-closing balance trajectory per account and entity.
- [ ] Full automated test suite verifying daily roll-forward calculations, contra-pairing edge cases, and RLS tenant isolation.

---

## Phases

### Phase 1: Foundation & Data Architecture
**Status:** 🔄 Ready to Execute
**Objective:** Establish core backend infrastructure, multi-tenant database models with RLS, authentication, and Next.js 15 frontend shell with design system tokens and navigation layout.
**Requirements:** REQ-01, REQ-02, REQ-05

**Plans:**
- [ ] Plan 1.1: Backend Core Setup, SQLAlchemy Async Models & Tenant RLS (`01-backend-core-and-models.md`)
- [ ] Plan 1.2: Authentication, Tenant Context & Entity/Account API Endpoints (`02-auth-and-account-endpoints.md`)
- [ ] Plan 1.3: Frontend Shell, Design System, Nav Layout & Global State (`03-frontend-scaffold-and-layout.md`)

---

### Phase 2: Core Daily Cash Inspector Engine
**Status:** ⬜ Not Started
**Objective:** Implement the sub-150ms Daily Cash Inspector engine with dual-mode calculation (cached summary vs. dynamic ledger rollback), and construct the Daily Bank Inspector frontend page with 4-metric summary tiles and virtualized register.
**Depends on:** Phase 1
**Requirements:** REQ-03, REQ-06

**Plans:**
- [ ] Plan 2.1: `DailyCashInspectorService` & Dynamic Fallback Engine with Automated Tests (`01-daily-inspector-service.md`)
- [ ] Plan 2.2: Daily Inspector API Route (`/daily-ledger`) with Filters & Aggregation (`02-daily-ledger-api.md`)
- [ ] Plan 2.3: Frontend Date Inspector Picker, 4-Metric Tiles & Virtualized Transaction Register (`03-inspector-ui-and-register.md`)

---

### Phase 3: Visualizations & Inter-Company Contra Netting Engine
**Status:** ⬜ Not Started
**Objective:** Build the Inter-Company Netting Engine with ±48h auto-pairing, contra tag propagation, MCA Rule 3 immutable audit trails, and integrate Chart.js intraday waterfall visualizer.
**Depends on:** Phase 2
**Requirements:** REQ-04, REQ-08

**Plans:**
- [ ] Plan 3.1: Inter-Company Netting Engine, Contra Pairing Logic & Audit Log Service (`01-netting-engine.md`)
- [ ] Plan 3.2: Chart.js Canvas Waterfall Sequence & Group Cash Rollup Trajectory (`02-waterfall-chart-and-group-summary.md`)
- [ ] Plan 3.3: Inter-Company Reconciliation Center UI with Contra Badges & Overrides (`03-intercompany-reconciliation-ui.md`)

---

### Phase 4: Statement Ingestion Rail & Verification
**Status:** ⬜ Not Started
**Objective:** Implement multi-bank PDF/CSV table extraction for SBI, ICICI, and HDFC statements, create the Ingestion Wizard UI, and execute comprehensive end-to-end verification.
**Depends on:** Phase 3
**Requirements:** REQ-07, REQ-09

**Plans:**
- [ ] Plan 4.1: PDF Parser Engine for SBI, ICICI, HDFC Statements with Regex Fallback (`01-pdf-parsers.md`)
- [ ] Plan 4.2: Statement Upload Wizard, Column Mapper & Reconciliation Reviewer UI (`02-ingestion-wizard-ui.md`)
- [ ] Plan 4.3: End-to-End System Verification, Performance Benchmarks & Final Delivery (`03-e2e-verification.md`)

---

## Progress Summary

| Phase | Status | Plans Total | Plans Complete | Target |
|-------|--------|-------------|----------------|--------|
| Phase 1: Foundation & Data Architecture | 🔄 Ready | 3 | 0 | Sprint 1 |
| Phase 2: Core Daily Cash Inspector | ⬜ Not Started | 3 | 0 | Sprint 2 |
| Phase 3: Visualizations & Inter-Co Netting | ⬜ Not Started | 3 | 0 | Sprint 3 |
| Phase 4: Ingestion Rail & Verification | ⬜ Not Started | 3 | 0 | Sprint 4 |
| **Total** | | **12** | **0** | |

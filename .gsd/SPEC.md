# SPEC.md — Project Specification

> **Status**: `FINALIZED`
>
> ⚠️ **Planning Lock**: Specification finalized from UBFD Engineering Project Report v1.0.0 and Production PRD.

## Vision
Unified Business Finance Dashboard (UBFD) / Group Cash OS is a high-throughput, low-latency financial aggregation and reporting platform designed for multi-entity Indian SME promoters and corporate groups. It aggregates cleared bank statement feeds across dozens of commercial accounts (SBI, ICICI, HDFC, Axis, Kotak, BOB), computes intraday Opening/Credited/Debited/Closing daily roll-forwards in <150ms, automatically detects and nets out inter-company contra fund movements within a ±24-48h window to eliminate gross cash inflation, and provides an immutable audit trail adhering to MCA Rule 3(1) and GST Schedule I compliance without disrupting existing ERPs (Tally, BUSY).

---

## Goals

1. **Multi-Entity Cash Aggregation**: Single-pane consolidated liquidity tracking across multiple legal entities (`PVT_LTD`, `LLP`, `PROPRIETORSHIP`, `PARTNERSHIP`) and their commercial bank accounts.
2. **Sub-150ms Daily Cash Inspector**: Real-time opening, credits, debits, closing roll-forward balances with dynamic ledger fallback and pre-aggregated summary caching.
3. **Inter-Company Contra-Netting Engine**: Automated bidirectional pairing of transfers across sister entity accounts within ±24-48 hours with confidence scoring to prevent gross inflow/outflow distortion.
4. **Resilient Bank Statement Ingestion**: Automated parsing of bank statements (PDF, CSV, Excel) for top Indian commercial banks (SBI, ICICI, HDFC) with table extraction and regex fallback repair.
5. **Regulatory Compliance & Data Isolation**: Multi-tenant Row-Level Security (RLS) enforcement at PostgreSQL session level, immutable audit trails for categorization/netting overrides, and INR-formatted financial visualizations.

---

## Non-Goals (Out of Scope for Phase 1 MVP)

- **ERP Two-Way Write-Back**: Direct push to TallyPrime / BUSY via XML/ODBC will not occur in Phase 1 (UBFD remains a non-invasive read-heavy analytics layer).
- **Automated Bank Payment Execution**: UBFD will not trigger payment disbursements or initiate RTGS/NEFT/IMPS transfers via corporate banking APIs in Phase 1.
- **Foreign Currency Multi-FX Hedging**: Non-INR transactions will be stored at face value; multi-currency forex hedging engine is deferred to Phase 2.
- **Credit Card / Personal Account Aggregation**: Only commercial current, overdraft (OD), cash credit (CC), and business savings accounts are supported.

---

## Constraints

- **Performance**: Daily cash metrics calculation must return in `<150ms`; initial frontend hydration `<1.2s`; intraday balance waterfall charts render in `<200ms`.
- **Database Architecture**: PostgreSQL 16 with Row-Level Security (`SET LOCAL app.current_tenant_id`) and AES-256 field encryption for sensitive account details. Local/CI environment uses aiosqlite/asyncpg pluggable SQLAlchemy 2.0 Async driver.
- **Precision**: Monetary figures must strictly use `Decimal` (Python) and fixed-precision numbers (Frontend) to eliminate floating-point drift.
- **Compliance**: MCA Rule 3(1) requires immutable, append-only logs for transaction categorization and netting tag modifications.
- **Currency Standard**: Strict Indian numbering format (Lakhs: `₹1,00,000`, Crores: `₹1,00,00,000`).

---

## Success Criteria

- [ ] Multi-tenant backend operational with FastAPI, SQLAlchemy 2.0 Async, Pydantic v2 schemas, and RLS session controls.
- [ ] Daily Ledger Inspector endpoint (`GET /api/v1/accounts/{account_id}/daily-ledger`) calculates opening balance, debits, credits, closing balance, and net velocity with dynamic transaction rollback in <150ms.
- [ ] Inter-Company Netting Engine accurately detects and links matching debit-credit pairs between sister entities within ±48h window with contra tags and audit log generation.
- [ ] PDF parser extracts transaction tabular data accurately for SBI, ICICI, and HDFC account statements.
- [ ] Next.js 15 + React 19 frontend renders Group Overview, Daily Cash Inspector (with 4-metric summary tiles & virtualized register), Inter-Company Netting Center, and Ingestion Wizard.
- [ ] Chart.js waterfall sequence visually displays opening-to-closing balance trajectory per account and entity.
- [ ] Full automated test suite verifying daily roll-forward calculations, contra-pairing edge cases, and RLS tenant isolation.

---

## Technical Requirements & Prioritization

| Requirement | Priority | Module | Description |
|-------------|----------|--------|-------------|
| REQ-01 | Must-Have | Backend Core | FastAPI + SQLAlchemy 2.0 Async models (`Tenant`, `Entity`, `BankAccount`, `Transaction`, `AuditLog`, `IntercompanyNettingLog`) |
| REQ-02 | Must-Have | Backend Core | Multi-tenant session RLS context & JWT Authentication |
| REQ-03 | Must-Have | Daily Inspector | `DailyCashInspectorService` with pre-aggregated read + fallback running balance calculator |
| REQ-04 | Must-Have | Netting Engine | `InterCompanyNettingEngine` with ±48h window matching and immutable audit logging |
| REQ-05 | Must-Have | Frontend Shell | Next.js 15 App Router shell with Tailwind CSS, Radix UI, TanStack Query v5, and INR formatters |
| REQ-06 | Must-Have | Frontend UI | Daily Bank Inspector with date picker, 4-metric tiles, waterfall chart, and virtualized register |
| REQ-07 | Must-Have | Ingestion | PDF statement parser service for SBI, ICICI, and HDFC statements |
| REQ-08 | Should-Have | Group Liquidity | Consolidated multi-entity cash position rollup & facility type filtering |
| REQ-09 | Should-Have | Ingestion UI | Statement upload wizard with preview and column mapping |

---

*Last updated: 2026-10-25*

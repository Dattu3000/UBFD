# ARCHITECTURE.md — System Architecture & Design

> Unified Business Finance Dashboard (UBFD) / Group Cash OS
> Version: 1.0.0 (Engineering Architecture & Implementation Plan)

## 1. System Architecture Overview

UBFD operates as a high-throughput, low-latency financial aggregation and reporting platform. The architecture separates compute-intensive data ingestion and reconciliation pipelines from the high-read-frequency dashboard API.

```
 [ Clients: Next.js 15 / React 19 SPA ]
                │  HTTPS / WSS
                ▼
      [ Cloudflare / Envoy API Gateway ]
                │
                ├─────────────────────────────────────────────┐
                │                                             │
                ▼                                             ▼
     [ FastAPI Core Web Service ]                   [ Ingestion Service ]
     - Multi-Entity Cash Aggregation                - PDF Parser (pdfplumber)
     - Daily Ledger Inspector Engine                 - AA Webhook Handlers
     - Inter-Co Netting Engine                      - CSV/XLSX Adapters
                │                                             │
                ├──────────────────────┬──────────────────────┤
                │                      │                      │
                ▼                      ▼                      ▼
      [ Redis 7 Cluster ]     [ PostgreSQL 16 ]      [ Celery Workers ]
      - Session & Token Cache - Multi-Tenant RLS     - Async Parsing
      - Daily Summary Caching - Immutable Audits     - WhatsApp Digest Bot
      - Idempotency Locks     - Partitioned Ledgers  - Predictive ML
```

---

## 2. Component Breakdown

### 2.1 Backend Core Service (`backend/app/`)
- **API Layer (`app/api/v1/`)**: RESTful routers organized by domain: `auth`, `accounts`, `daily_ledger`, `intercompany`, `ingestion`, `group_summary`.
- **Core (`app/core/`)**: Application configuration (`pydantic-settings`), async database session pool, JWT security, custom exceptions and error handlers.
- **Data Models (`app/models/`)**: Declarative SQLAlchemy 2.0 async models with strict UUID primary keys and Decimal monetary fields:
  - `Tenant`: Multi-tenant boundary
  - `Entity`: Legal entities (`PVT_LTD`, `LLP`, `PROPRIETORSHIP`, `PARTNERSHIP`)
  - `BankAccount`: Accounts per entity (`SBI`, `ICICI`, `HDFC`, `AXIS`, `KOTAK`, `BOB`)
  - `DailyAccountSummary`: Pre-aggregated daily roll-forward cache
  - `Transaction`: Full immutable ledger entries with running balance
  - `IntercompanyNettingLog`: Pairing records for eliminated contra flows
  - `AuditLog`: MCA Rule 3(1) append-only audit trail
- **Schemas (`app/schemas/`)**: Pydantic v2 schemas for strict serialization and validation.
- **Services (`app/services/`)**:
  - `DailyCashInspectorService`: Sub-150ms opening/closing balance calculator with cached-read and dynamic fallback ledger queries.
  - `InterCompanyNettingEngine`: Sister entity debit-credit detection within ±48h window.
  - `PDFParserService`: Specialized bank table extractors (`sbi_parser`, `icici_parser`, `hdfc_parser`).
  - `AuditService`: Append-only immutable log manager.

### 2.2 Frontend SPA (`frontend/`)
- **Framework**: Next.js 15 (React 19, App Router) with edge caching and static route optimization.
- **State & Server Sync**: TanStack Query (React Query v5) for optimistic mutations and automatic query cache invalidation.
- **UI & Design System**: Tailwind CSS with Radix UI (shadcn/ui primitives), dark/light theme support, responsive sidebar, high-contrast financial data tables.
- **Data Visualization**: Chart.js (`react-chartjs-2`) for intraday balance waterfall charts and group cash trajectories under 200ms.
- **Data Tables**: TanStack Table v8 for virtualized line-item transaction browsing with search, category filtering, and contra-tag toggles.

---

## 3. Data Flow & Core Algorithms

### 3.1 Daily Roll-Forward & Cash Inspector Engine
```
User requests: GET /api/v1/accounts/{account_id}/daily-ledger?date=YYYY-MM-DD
  │
  ▼
1. Check `DailyAccountSummary` (Pre-aggregated Cache)
   ├─ If found: Return opening, credits, debits, closing, velocity directly (<10ms)
   └─ If not found: Trigger Dynamic Fallback (<100ms)
        │
        ├─ SUM(credit_amount) & SUM(debit_amount) on target_date
        ├─ Find latest transaction on target_date for `closing_balance`
        ├─ If no tx on target_date: Fetch nearest prior closing balance
        │    └─ If no prior tx: Fetch BankAccount.opening_balance
        └─ Calculate opening_balance = closing_balance - credits + debits
```

### 3.2 Inter-Company Transfer Contra-Netting Engine
```
Source Transaction (Entity A Debit ₹X)
  │
  ▼
Search sister entity accounts (Entity B, C...) within [Date - 48h, Date + 48h]
  │
  ├─ Match condition: credit_amount == source.debit_amount AND is_intercompany == False
  ├─ When candidate found:
  │    ├─ Mark source.is_intercompany = True, pair_id = candidate.id
  │    ├─ Mark candidate.is_intercompany = True, pair_id = source.id
  │    ├─ Insert IntercompanyNettingLog (status='ELIMINATED', confidence=98.50%)
  │    └─ Commit transaction & log MCA Rule 3 audit record
  └─ Consolidated Group Inflow/Outflow excludes contra transfers
```

---

## 4. Multi-Tenancy & Security Architecture

1. **Row-Level Security (RLS)**:
   - PostgreSQL RLS enabled on all core tables (`entities`, `bank_accounts`, `transactions`, `audit_logs`).
   - Session policy: `SET LOCAL app.current_tenant_id = :tenant_id;` injected via FastAPI dependency.
2. **MCA Rule 3(1) Immutable Audit Logs**:
   - Triggers prohibit `UPDATE` or `DELETE` operations on `audit_logs`.
   - Every categorization change, contra manual override, or account edit records user_id, timestamp, old_state, and new_state.
3. **Data Residency & Field Encryption**:
   - Indian data sovereignty (AWS Mumbai / GCP asia-south1).
   - Sensitive account numbers masked in UI (`•••• 9482`) and encrypted in DB via AES-256.

---

## 5. Development & Testing Conventions

- **Database Compatibility**: Dual-mode async engine supporting SQLite (via `aiosqlite`) for zero-dependency local runs/tests, and PostgreSQL (via `asyncpg`) for staging/production.
- **Monetary Types**: Strictly `Decimal` (Python) and fixed 2-decimal floats (TypeScript). No floating point arithmetic in backend services.
- **Currency Presentation**: Standard Indian numbering format (`₹1,25,000.00`, Lakhs/Crores helper functions).
- **Testing Standard**: Pytest with async fixtures validating ledger calculations, contra-matching edge cases, and tenant boundary enforcement.

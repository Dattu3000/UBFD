# Engineering Project Report: Unified Business Finance Dashboard (UBFD) / Group Cash OS

| Parameter | Specification |
| :--- | :--- |
| **System** | Unified Business Finance Dashboard (UBFD) / Group Cash OS |
| **Document Version** | 1.0.0 (Engineering Architecture & Implementation Plan) |
| **Authors** | Principal Systems Architect & Lead Software Engineers |
| **Target Teams** | Backend Engineering (Python), Frontend Engineering (TypeScript/React), DevOps, QA |
| **Target Release** | Phase 1 MVP Delivery |

---

## 1. System Architecture Overview

UBFD operates as a high-throughput, low-latency financial aggregation and reporting platform. The architecture separates compute-intensive data ingestion and reconciliation pipelines from the high-read-frequency dashboard API.

```
 [ Clients: Next.js / React SPA ]
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

## 2. Technology Stack Selection & Rationales

### 2.1 Backend Stack (Python Ecosystem)

| Component | Selected Technology | Technical Justification |
| :--- | :--- | :--- |
| **Language** | **Python 3.12+** | Robust ecosystem for financial number manipulation, high-performance async capabilities, rich data science/parsing libraries. |
| **API Framework** | **FastAPI + Pydantic v2** | High-performance asynchronous execution (ASGI via `uvloop`), strict schema enforcement, auto-generated OpenAPI 3.1 documentation, native typing validation. |
| **ORM / Query Engine**| **SQLAlchemy 2.0 (Async) + Alembic** | Explicit transactional control, async pooling, full typing support, seamless complex CTE queries for multi-entity rollups. |
| **Task Queue** | **Celery + Redis / RabbitMQ** | Reliable background worker execution for statement parsing, inter-company contra matching, and morning WhatsApp dispatch. |
| **Document Parsing** | **pdfplumber + PyMuPDF + Tabula-py** | High-precision table extraction from password-protected bank PDFs with fallback regular expression repair engines. |
| **Testing** | **Pytest + FactoryBoy + Testcontainers** | Fast unit testing with isolated, ephemeral PostgreSQL Docker containers to validate financial calculations against real database constraints. |

### 2.2 Frontend Stack

| Component | Selected Technology | Technical Justification |
| :--- | :--- | :--- |
| **Language** | **TypeScript 5.x** | Static type safety prevents runtime `undefined` errors across complex financial data structures. |
| **Framework** | **Next.js 15 (React 19, App Router)** | Server-side rendering (SSR) for initial state hydration (<1.2s target), edge caching, and unified client routing. |
| **State & Server Sync** | **TanStack Query (React Query v5)** | Declarative data fetching, aggressive caching, optimistic balance updates, and background revalidation. |
| **Styling & Components**| **Tailwind CSS + Radix UI (shadcn/ui)** | Zero-runtime CSS bundle, high-contrast accessible financial UI primitives, dark/light theme support. |
| **Data Visualization** | **Chart.js + react-chartjs-2** | Ultra-fast canvas-based rendering for intraday balance waterfalls and multi-bank cash flow trajectories under 200ms. |
| **Grid / Data Table** | **TanStack Table v8** | Virtualized row rendering for handling 5,000+ line-item transactions smoothly in the Daily Bank Inspector. |

---

## 3. Backend Architecture & Implementation Blueprint

### 3.1 Domain-Driven Directory Layout

```
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py
│   │   │   │   ├── accounts.py
│   │   │   │   ├── daily_ledger.py
│   │   │   │   ├── intercompany.py
│   │   │   │   ├── ingestion.py
│   │   │   │   └── group_summary.py
│   │   │   └── router.py
│   │   └── dependencies.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── security.py
│   │   └── exceptions.py
│   ├── models/             # SQLAlchemy declarative models
│   │   ├── tenant.py
│   │   ├── entity.py
│   │   ├── account.py
│   │   ├── transaction.py
│   │   └── audit.py
│   ├── schemas/            # Pydantic validation models
│   │   ├── ledger_schema.py
│   │   ├── account_schema.py
│   │   └── netting_schema.py
│   ├── services/           # Pure business logic engines
│   │   ├── daily_calculator.py
│   │   ├── netting_engine.py
│   │   ├── pdf_parser/
│   │   │   ├── sbi_parser.py
│   │   │   ├── icici_parser.py
│   │   │   └── hdfc_parser.py
│   │   └── audit_service.py
│   └── workers/            # Celery tasks
│       ├── statement_worker.py
│       └── digest_worker.py
├── alembic/
├── tests/
└── pyproject.toml
```

### 3.2 Key Core Algorithm: Daily Roll-Forward & Cash Inspector Engine

The Daily Cash Inspector must compute opening balance, credits, debits, and closing balance in $<150\text{ ms}$.

```python
# app/services/daily_calculator.py
from datetime import date
from decimal import Decimal
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models.transaction import Transaction
from app.models.account import BankAccount, DailyAccountSummary

class DailyCashInspectorService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_daily_metrics(self, account_id: UUID, target_date: date):
        # 1. Attempt read from pre-aggregated summary table
        cached_summary = await self.db.scalar(
            select(DailyAccountSummary).where(
                and_(
                    DailyAccountSummary.account_id == account_id,
                    DailyAccountSummary.summary_date == target_date
                )
            )
        )
        if cached_summary:
            return {
                "opening_balance": cached_summary.opening_balance,
                "total_credited": cached_summary.total_credited,
                "total_debited": cached_summary.total_debited,
                "closing_balance": cached_summary.closing_balance,
                "net_velocity": cached_summary.total_credited - cached_summary.total_debited,
                "is_cached": True
            }

        # 2. Dynamic Fallback: Calculate from Transaction Ledger
        # Compute total credits & debits on target_date
        stmt = select(
            func.coalesce(func.sum(Transaction.credit_amount), Decimal("0.00")).label("credits"),
            func.coalesce(func.sum(Transaction.debit_amount), Decimal("0.00")).label("debits"),
            func.count(Transaction.transaction_id).label("tx_count")
        ).where(
            and_(
                Transaction.account_id == account_id,
                Transaction.transaction_date == target_date
            )
        )
        result = await self.db.execute(stmt)
        credits, debits, tx_count = result.one()

        # Find closing running_balance from latest transaction on target_date
        latest_tx_stmt = select(Transaction.running_balance).where(
            and_(
                Transaction.account_id == account_id,
                Transaction.transaction_date == target_date
            )
        ).order_by(Transaction.transaction_time.desc(), Transaction.created_at.desc()).limit(1)
        
        closing_balance = await self.db.scalar(latest_tx_stmt)

        if closing_balance is None:
            # No transactions on target_date; fetch nearest prior closing balance
            prior_tx_stmt = select(Transaction.running_balance).where(
                and_(
                    Transaction.account_id == account_id,
                    Transaction.transaction_date < target_date
                )
            ).order_by(Transaction.transaction_date.desc(), Transaction.transaction_time.desc()).limit(1)
            
            prior_balance = await self.db.scalar(prior_tx_stmt)
            if prior_balance is None:
                # Default to base account initial opening balance
                account_stmt = select(BankAccount.opening_balance).where(BankAccount.account_id == account_id)
                prior_balance = await self.db.scalar(account_stmt) or Decimal("0.00")
            
            opening_balance = prior_balance
            closing_balance = prior_balance
        else:
            opening_balance = closing_balance - credits + debits

        return {
            "opening_balance": opening_balance,
            "total_credited": credits,
            "total_debited": debits,
            "closing_balance": closing_balance,
            "net_velocity": credits - debits,
            "transaction_count": tx_count,
            "is_cached": False
        }
```

### 3.3 Inter-Company Transfer Contra-Netting Engine

```python
# app/services/netting_engine.py
from datetime import timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.transaction import Transaction
from app.models.netting import IntercompanyNettingLog

class InterCompanyNettingEngine:
    """
    Identifies and nets out matching debit-credit pairs across sister entities
    within a +/- 24-48 hour window to avoid gross inflow/outflow inflation.
    """
    def __init__(self, db: AsyncSession):
        self.db = db

    async def detect_and_pair(self, source_tx: Transaction, max_hours_delta: int = 48):
        if source_tx.debit_amount <= Decimal("0.00"):
            return None

        time_window_start = source_tx.transaction_date - timedelta(hours=max_hours_delta)
        time_window_end = source_tx.transaction_date + timedelta(hours=max_hours_delta)

        # Look for matching credit in sister entity accounts
        potential_match_stmt = select(Transaction).where(
            and_(
                Transaction.account_id != source_tx.account_id,
                Transaction.credit_amount == source_tx.debit_amount,
                Transaction.transaction_date.between(time_window_start, time_window_end),
                Transaction.is_intercompany.is_(False)
            )
        )
        potential_matches = (await self.db.scalars(potential_match_stmt)).all()

        for candidate in potential_matches:
            # Pair found: apply contra tags & log
            source_tx.is_intercompany = True
            source_tx.intercompany_pair_id = candidate.transaction_id
            
            candidate.is_intercompany = True
            candidate.intercompany_pair_id = source_tx.transaction_id

            netting_log = IntercompanyNettingLog(
                source_transaction_id=source_tx.transaction_id,
                destination_transaction_id=candidate.transaction_id,
                netted_amount=source_tx.debit_amount,
                match_confidence=Decimal("98.50"),
                status="ELIMINATED"
            )
            self.db.add(netting_log)
            await self.db.commit()
            return netting_log

        return None
```

---

## 4. Frontend Architecture & UI Component Plan

### 4.1 Component Tree & Page Hierarchy

```
frontend/src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── sso-callback/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Context providers & global sidebar
│   │   ├── page.tsx                  # Group Overview (Consolidated Cash)
│   │   ├── inspector/
│   │   │   └── page.tsx              # Core Daily Cash Inspector
│   │   ├── intercompany/
│   │   │   └── page.tsx              # Netting & Contra Reconciliation
│   │   └── ingestion/
│   │       └── page.tsx              # Bank Statement PDF/CSV Ingestion
├── components/
│   ├── ui/                           # Radix primitives (Button, Modal, Popover)
│   ├── inspector/
│   │   ├── DateInspectorPicker.tsx   # Instant date switcher
│   │   ├── MetricsBar.tsx            # 4-Metric summary tiles (Opening/Cr/Dr/Closing)
│   │   ├── CashWaterfallChart.tsx    # Chart.js waterfall sequence
│   │   ├── TransactionRegister.tsx   # Virtualized search table
│   │   └── ContraBadge.tsx           # GST Schedule I contra tag indicator
│   └── shared/
│       ├── EntityFilterBadge.tsx
│       └── CurrencyDisplay.tsx       # Standardized INR formatting (e.g. ₹1,25,000.00)
├── hooks/
│   ├── useDailyLedger.ts
│   ├── useGroupSummary.ts
│   └── useNettingOverrides.ts
└── lib/
    ├── api-client.ts                 # Axios / Fetch client with bearer token injection
    └── formatters.ts                 # Lakh/Crore and Indian Rupee formatters
```

### 4.2 Frontend State Contract (TypeScript Interfaces)

```typescript
// frontend/src/types/finance.ts

export type BankCode = 'SBI' | 'ICICI' | 'HDFC' | 'AXIS' | 'KOTAK' | 'BOB' | 'CUSTOM';
export type FacilityType = 'CURRENT' | 'SAVINGS' | 'OVERDRAFT' | 'CASH_CREDIT';

export interface BankAccount {
  account_id: string;
  entity_id: string;
  entity_name: string;
  bank_name: string;
  bank_code: BankCode;
  account_number_mask: string;
  ifsc_code: string;
  account_type: FacilityType;
  custom_tag?: string;
  current_cleared_balance: number;
}

export interface DailyLedgerSummary {
  account_id: string;
  date: string; // YYYY-MM-DD
  opening_balance: number;
  total_credited: number;
  total_debited: number;
  closing_balance: number;
  net_velocity: number;
  transaction_count: number;
}

export interface TransactionItem {
  transaction_id: string;
  date: string;
  time?: string;
  reference_number: string;
  counterparty_name: string;
  narration: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  category: string;
  is_intercompany: boolean;
  contra_pair_id?: string;
}

export interface DailyLedgerResponse {
  summary: DailyLedgerSummary;
  transactions: TransactionItem[];
}
```

---

## 5. RESTful API Contract & Payload Definitions

### 5.1 Endpoint: Daily Cash Inspector

* **Path:** `GET /api/v1/accounts/{account_id}/daily-ledger`
* **Query Parameters:**
  * `date` (ISO date, e.g., `2026-10-25`, required)
  * `search` (Narration or counterparty keyword filter, optional)
  * `exclude_contra` (Boolean, default: `false`)

**Response:**
```json
{
  "status": "success",
  "data": {
    "account": {
      "account_id": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
      "bank_name": "HDFC Bank",
      "bank_code": "HDFC",
      "account_mask": "•••• 9482",
      "custom_tag": "PRIMARY OPERATING"
    },
    "summary": {
      "date": "2026-10-25",
      "opening_balance": 1850420.50,
      "total_credited": 450000.00,
      "total_debited": 120500.00,
      "closing_balance": 2179920.50,
      "net_velocity": 329500.00,
      "transaction_count": 8
    },
    "transactions": [
      {
        "transaction_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "time": "10:14:22",
        "reference_number": "CMS2948201948",
        "counterparty_name": "Alpha Retailers Pvt Ltd",
        "narration": "NEFT CR-CMS2948201948-ALPHA RET-HDF0000240",
        "debit_amount": 0.00,
        "credit_amount": 250000.00,
        "running_balance": 2100420.50,
        "category": "Customer Receipt",
        "is_intercompany": false
      },
      {
        "transaction_id": "c9a646d3-9c61-4cfa-89a3-05c0ff899a7b",
        "time": "14:20:05",
        "reference_number": "HDFC0092841029",
        "counterparty_name": "Sister Logistics LLP",
        "narration": "RTGS DR-HDFC0092841029-SISTER LOGISTICS-ICIC0000102",
        "debit_amount": 100000.00,
        "credit_amount": 0.00,
        "running_balance": 2000420.50,
        "category": "Inter-Company Fund",
        "is_intercompany": true,
        "contra_pair_id": "a18b7623-2894-47c1-bf61-68beaf59cd12"
      }
    ]
  }
}
```

---

## 6. Security, Compliance & Data Isolation Standards

1. **Multi-Tenancy via Row-Level Security (RLS):**
   * PostgreSQL RLS policies enforce tenant separation using session-level parameters:
     ```sql
     SET LOCAL app.current_tenant_id = 'tenant-uuid';
     ```
   * Zero raw cross-tenant leaks are permitted in any query.

2. **MCA Rule 3(1) Immutable Audit Logs:**
   * Every edit to a categorization tag or inter-company pairing creates an append-only entry in `audit_logs`.
   * Log mutations or deletions are disallowed at the database trigger level.

3. **Data Residency & Encryption:**
   * Primary database hosted in AWS `ap-south-1` (Mumbai) or GCP `asia-south1`.
   * Columns storing sensitive account numbers use PostgreSQL pgcrypto or field-level AES-256-GCM before write.

---

## 7. Team Delivery Roadmap & Sprint Milestones

```
Sprint 1 (Weeks 1-2): Foundation & DB Setup
├── Backend: Setup FastAPI, PostgreSQL RLS schema, Alembic migrations, Auth/JWT
└── Frontend: Scaffold Next.js 15, TanStack Query, shadcn/ui components, Auth views

Sprint 2 (Weeks 3-4): Core Daily Cash Inspector
├── Backend: Implement DailyCashInspectorService, fallback ledger queries, caching
└── Frontend: Build DatePicker, 4-Metric Tiles, virtualized transaction register

Sprint 3 (Weeks 5-6): Visualizations & Inter-Company Netting
├── Backend: Build InterCompanyNettingEngine, auto-contra pair algorithms
└── Frontend: Integrate Chart.js Waterfall chart, contra toggle, line-item badges

Sprint 4 (Weeks 7-8): Statement Ingestion & Testing
├── Backend: Implement pdfplumber parser for top 3 banks (SBI, ICICI, HDFC)
└── Frontend: Build Statement Upload Wizard, column mapper, QA reconciliation
```
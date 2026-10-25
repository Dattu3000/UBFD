---
phase: 1
plan: 1
wave: 1
gap_closure: false
---

# Plan 1.1: Backend Core Setup, SQLAlchemy Async Models & Tenant RLS

## Objective
Establish the foundational Python backend structure for UBFD, configure the async database connection pool with dual SQLite/PostgreSQL support, and define all domain models (`Tenant`, `Entity`, `BankAccount`, `DailyAccountSummary`, `Transaction`, `IntercompanyNettingLog`, `AuditLog`) with Decimal numeric precision and tenant isolation.

## Context
Load these files for context:
- `.gsd/SPEC.md`
- `.gsd/ARCHITECTURE.md`
- `.gsd/STACK.md`
- `ubfd_engineering_project_report.md`

## Tasks

<task type="auto" effort="medium">
  <name>Initialize Backend Directory, Virtual Environment & Dependencies</name>
  <files>
    backend/pyproject.toml
    backend/app/core/config.py
    backend/app/core/database.py
    backend/app/core/exceptions.py
  </files>
  <action>
    1. Create `backend/pyproject.toml` with dependencies: `fastapi`, `uvicorn`, `pydantic`, `pydantic-settings`, `sqlalchemy>=2.0.36`, `aiosqlite`, `asyncpg`, `python-jose`, `passlib[bcrypt]`, `pytest`, `pytest-asyncio`, `httpx`.
    2. Implement `app/core/config.py` using `pydantic_settings.BaseSettings` loading `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, and `PROJECT_NAME`.
    3. Implement `app/core/database.py` providing `create_async_engine`, `async_sessionmaker`, `Base = declarative_base()`, and an async `get_db()` dependency with tenant session hooks (`SET LOCAL app.current_tenant_id`).
    4. Implement `app/core/exceptions.py` with standard financial application errors (`TenantAccessDenied`, `AccountNotFound`, `InvalidTransactionData`, `ConcurrencyConflict`).

    AVOID: Using sync SQLAlchemy engines or blocking I/O calls.
    USE: Async SQLAlchemy 2.0 sessions with explicit async context management.
  </action>
  <verify>
    python -c "import sys; sys.path.insert(0, 'backend'); from app.core.config import settings; from app.core.database import Base; print('Config & DB loaded successfully')"
  </verify>
  <done>
    Settings, async database engine, Base class, and custom exceptions import cleanly.
  </done>
</task>

<task type="auto" effort="medium">
  <name>Implement Core Domain Models with RLS and Audit Fields</name>
  <files>
    backend/app/models/tenant.py
    backend/app/models/entity.py
    backend/app/models/account.py
    backend/app/models/transaction.py
    backend/app/models/netting.py
    backend/app/models/audit.py
    backend/app/models/__init__.py
  </files>
  <action>
    1. `tenant.py`: `Tenant` model with UUID `id`, `name`, `slug`, `created_at`.
    2. `entity.py`: `Entity` model with `id`, `tenant_id`, `name`, `entity_type` (`PVT_LTD`, `LLP`, `PROPRIETORSHIP`, `PARTNERSHIP`), `gstin`, `pan`, `created_at`.
    3. `account.py`: `BankAccount` with `account_id`, `tenant_id`, `entity_id`, `bank_name`, `bank_code` (`SBI`, `ICICI`, `HDFC`, `AXIS`, `KOTAK`, `BOB`, `CUSTOM`), `account_number_mask`, `ifsc_code`, `account_type` (`CURRENT`, `SAVINGS`, `OVERDRAFT`, `CASH_CREDIT`), `opening_balance` (`Numeric(18, 2)`), `custom_tag`. Also `DailyAccountSummary` with `summary_id`, `account_id`, `summary_date`, `opening_balance`, `total_credited`, `total_debited`, `closing_balance`.
    4. `transaction.py`: `Transaction` model with `transaction_id`, `tenant_id`, `account_id`, `transaction_date`, `transaction_time`, `reference_number`, `counterparty_name`, `narration`, `debit_amount`, `credit_amount`, `running_balance`, `category`, `is_intercompany` (boolean), `intercompany_pair_id` (nullable UUID), `created_at`.
    5. `netting.py`: `IntercompanyNettingLog` with `log_id`, `source_transaction_id`, `destination_transaction_id`, `netted_amount`, `match_confidence`, `status`, `created_at`.
    6. `audit.py`: `AuditLog` model adhering to MCA Rule 3(1) with `audit_id`, `tenant_id`, `table_name`, `record_id`, `action`, `old_values`, `new_values`, `user_id`, `timestamp`.
    7. Expose all models cleanly in `backend/app/models/__init__.py`.

    AVOID: Using Float for financial amounts.
    USE: SQLAlchemy `Numeric(precision=18, scale=2)` and Python `Decimal` across all balance and transaction columns.
  </action>
  <verify>
    python -c "import sys; sys.path.insert(0, 'backend'); from app.models import Tenant, Entity, BankAccount, Transaction, DailyAccountSummary, IntercompanyNettingLog, AuditLog; print('All models imported without error')"
  </verify>
  <done>
    All 7 domain models import with correct relationships, indices, and Decimal column types.
  </done>
</task>

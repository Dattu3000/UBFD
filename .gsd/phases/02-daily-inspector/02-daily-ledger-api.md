---
phase: 2
plan: 2
wave: 2
gap_closure: false
---

# Plan 2.2: Daily Inspector API Route (/daily-ledger) with Filters & Aggregation

## Objective
Implement the RESTful endpoint `GET /api/v1/accounts/{account_id}/daily-ledger` matching the API contract in Section 5.1 of the Engineering Report. Supports `date` parameter, optional narration/counterparty `search` filter, and `exclude_contra` toggle to omit inter-company fund movements from view.

## Context
Load these files for context:
- `ubfd_engineering_project_report.md` (Section 5.1)
- `backend/app/schemas/ledger_schema.py`
- `backend/app/services/daily_calculator.py`

## Tasks

<task type="auto" effort="medium">
  <name>Build Daily Ledger API Endpoint with Query Filters</name>
  <files>
    backend/app/api/v1/endpoints/daily_ledger.py
    backend/app/api/v1/router.py
  </files>
  <action>
    1. Implement `app/api/v1/endpoints/daily_ledger.py` providing:
       - `GET /accounts/{account_id}/daily-ledger`:
         - Parameters: `account_id: UUID`, `date: date`, `search: Optional[str]`, `exclude_contra: bool = False`.
         - Validates tenant access to requested `account_id`.
         - Calls `DailyCashInspectorService(db).get_daily_metrics(account_id, date)`.
         - Queries transaction register for target date matching `search` keyword and applying `is_intercompany == False` if `exclude_contra` is True.
         - Returns `DailyLedgerResponse` with `account`, `summary`, and `transactions`.
    2. Register `daily_ledger.router` in `app/api/v1/router.py`.

    AVOID: Permitting queries across different tenants.
    USE: Scoped tenant verification dependency.
  </action>
  <verify>
    .venv\Scripts\python.exe -c "import sys; sys.path.insert(0, 'backend'); from app.api.v1.endpoints.daily_ledger import router; print('daily_ledger router loaded cleanly')"
  </verify>
  <done>
    `daily_ledger` endpoint compiles and exports with strict Pydantic v2 validation.
  </done>
</task>

<task type="auto" effort="medium">
  <name>Create Integration Tests for Daily Ledger API</name>
  <files>
    backend/tests/test_daily_ledger_api.py
  </files>
  <action>
    Write `tests/test_daily_ledger_api.py` validating:
    1. `GET /accounts/{account_id}/daily-ledger?date=2026-10-25` returns 200 with summary and 4 transactions.
    2. `search=Packaging` filter returns only the vendor payout item.
    3. `exclude_contra=true` excludes the inter-company debit item.
    4. Non-existent account returns 404.
  </action>
  <verify>
    .venv\Scripts\python.exe -m pytest tests/test_daily_ledger_api.py -v
  </verify>
  <done>
    All API contract and query filter tests pass.
  </done>
</task>

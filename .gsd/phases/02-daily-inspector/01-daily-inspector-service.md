---
phase: 2
plan: 1
wave: 1
gap_closure: false
---

# Plan 2.1: DailyCashInspectorService & Dynamic Fallback Engine with Automated Tests

## Objective
Implement the core `DailyCashInspectorService` in pure Python/SQLAlchemy 2.0 Async, achieving sub-150ms daily roll-forward metrics calculation (`opening_balance`, `total_credited`, `total_debited`, `closing_balance`, `net_velocity`, `transaction_count`) with dual-mode execution: reading pre-aggregated `DailyAccountSummary` records (<10ms) and dynamically calculating from the raw transaction ledger when no summary exists (<100ms).

## Context
Load these files for context:
- `ubfd_engineering_project_report.md` (Section 3.2)
- `backend/app/models/transaction.py`
- `backend/app/models/account.py`

## Tasks

<task type="auto" effort="medium">
  <name>Implement DailyCashInspectorService with Fallback Ledger Rollback</name>
  <files>
    backend/app/services/daily_calculator.py
    backend/app/services/__init__.py
  </files>
  <action>
    1. Implement `DailyCashInspectorService` class taking an `AsyncSession`.
    2. Implement `get_daily_metrics(account_id: UUID, target_date: date)`:
       - Step 1: Check `DailyAccountSummary` for `(account_id, target_date)`. If found, return cached metrics with `"is_cached": True`.
       - Step 2: Fallback to dynamic transaction query:
         - Aggregate `SUM(credit_amount)`, `SUM(debit_amount)`, and `COUNT(transaction_id)` for `target_date`.
         - Determine closing balance by querying the latest transaction on `target_date` (`ORDER BY transaction_time DESC, created_at DESC LIMIT 1`).
         - If no transactions on `target_date`: query the nearest prior transaction (`transaction_date < target_date ORDER BY transaction_date DESC, transaction_time DESC LIMIT 1`). If no prior transaction, fallback to `BankAccount.opening_balance`.
         - Derive opening balance: `opening_balance = closing_balance - credits + debits`.
         - Derive net velocity: `net_velocity = credits - debits`.
    3. Expose service cleanly in `app/services/__init__.py`.

    AVOID: Unbounded full-table scans.
    USE: Indexed queries on `(account_id, transaction_date)` and `Decimal` arithmetic.
  </action>
  <verify>
    .venv\Scripts\python.exe -c "import sys; sys.path.insert(0, 'backend'); from app.services.daily_calculator import DailyCashInspectorService; print('DailyCashInspectorService imported cleanly')"
  </verify>
  <done>
    `DailyCashInspectorService` is successfully implemented and exposes dual-path calculation methods.
  </done>
</task>

<task type="auto" effort="medium">
  <name>Create Comprehensive Unit Test Suite for Daily Roll-Forward Scenarios</name>
  <files>
    backend/tests/test_daily_calculator.py
  </files>
  <action>
    Write `tests/test_daily_calculator.py` testing 4 distinct financial scenarios:
    1. Pre-aggregated cache hit (HDFC Retail account on 2026-10-25 -> `is_cached: True`).
    2. Dynamic fallback with intraday transactions (delete cache for target date -> verifies mathematical identity `opening + credits - debits == closing`).
    3. Quiescent account date with zero transactions (verifies roll-forward preserves prior day's closing balance).
    4. Account with zero transaction history (verifies fallback to `BankAccount.opening_balance`).
  </action>
  <verify>
    .venv\Scripts\python.exe -m pytest tests/test_daily_calculator.py -v
  </verify>
  <done>
    All 4 calculation edge-case tests pass with 100% assertions satisfied.
  </done>
</task>

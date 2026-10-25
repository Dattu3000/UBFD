---
phase: 4
plan: 3
wave: 2
gap_closure: false
---

# Plan 4.3: End-to-End System Verification, Performance Benchmarks & Final Delivery

## Objective
Execute complete end-to-end integration testing across the entire UBFD / Group Cash OS application suite, verify all performance budgets (<150ms Daily Inspector derivation, <200ms Chart.js waterfall render, <1.2s frontend load), validate multi-tenant isolation, and launch the development servers with interactive verification evidence.

## Context
Load these files for context:
- `.gsd/SPEC.md`
- `.gsd/ROADMAP.md`
- `ubfd_engineering_project_report.md`

## Tasks

<task type="auto" effort="medium">
  <name>Run Full Test Suite & Performance Benchmark</name>
  <files>
    backend/tests/
  </files>
  <action>
    1. Run complete backend test suite across all modules:
       - `test_accounts.py` (Auth, tenants, entities, bank accounts)
       - `test_daily_calculator.py` (DailyCashInspectorService 4 scenarios)
       - `test_daily_ledger_api.py` (Daily ledger API and filters)
       - `test_netting_engine.py` (Netting contra pairing and MCA audit log)
       - `test_statement_parsers.py` (SBI, ICICI, HDFC statement parsing)
    2. Benchmark execution latency of `DailyCashInspectorService.get_daily_metrics` to ensure sub-150ms execution.
  </action>
  <verify>
    .venv\Scripts\python.exe -m pytest tests/ -v
  </verify>
  <done>
    Entire test suite passes with 100% success rate.
  </done>
</task>

<task type="auto" effort="medium">
  <name>Validate Frontend Production Bundle & Live Server Health</name>
  <files>
    frontend/
  </files>
  <action>
    1. Run `npm run build` in `frontend/` to ensure zero compilation or bundling errors.
    2. Validate health check response from FastAPI service.
  </action>
  <verify>
    npm --prefix frontend run build
  </verify>
  <done>
    Production bundle built cleanly and ready for deployment.
  </done>
</task>

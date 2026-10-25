---
phase: 3
plan: 1
wave: 1
gap_closure: false
---

# Plan 3.1: Inter-Company Netting Engine, Contra Pairing Logic & Audit Log Service

## Objective
Implement `InterCompanyNettingEngine` matching Section 3.3 of the Engineering Report. Automatically identifies matching debit-credit pairs across sister entities within a ±24-48 hour window, applies bidirectional contra flags (`is_intercompany = True`, `intercompany_pair_id`), creates `IntercompanyNettingLog` records, and writes append-only audit entries complying with MCA Rule 3(1).

## Context
Load these files for context:
- `ubfd_engineering_project_report.md` (Section 3.3, Section 6)
- `backend/app/models/netting.py`
- `backend/app/models/audit.py`
- `backend/app/models/transaction.py`

## Tasks

<task type="auto" effort="medium">
  <name>Implement InterCompanyNettingEngine & AuditService</name>
  <files>
    backend/app/services/audit_service.py
    backend/app/services/netting_engine.py
    backend/app/api/v1/endpoints/intercompany.py
    backend/app/api/v1/router.py
  </files>
  <action>
    1. Implement `AuditService`:
       - `log_event(tenant_id, table_name, record_id, action, old_values, new_values, user_id)`: writes immutable entry in `audit_logs`.
    2. Implement `InterCompanyNettingEngine`:
       - `detect_and_pair(source_tx: Transaction, max_hours_delta: int = 48)`:
         - Looks for counterpart transaction where `account_id != source.account_id`, `credit_amount == source.debit_amount`, within `[source.transaction_date - delta, source.transaction_date + delta]`, with `is_intercompany == False`.
         - Applies contra tags to both transactions.
         - Creates `IntercompanyNettingLog` with `status="ELIMINATED"`, `match_confidence=98.50`.
         - Writes audit log.
       - `list_netted_pairs()`: Returns all active inter-company contra pairs.
       - `override_pair(pair_id, action, user_id)`: Allows manual contra confirmation or dissolution with mandatory audit log reason.
    3. Implement `app/api/v1/endpoints/intercompany.py` with:
       - `GET /intercompany/pairs`: List all eliminated contra fund pairs
       - `POST /intercompany/scan`: Trigger contra auto-detection across all accounts
       - `POST /intercompany/override`: Manual unpair/confirm with audit reason
    4. Register `intercompany.router` in `app/api/v1/router.py`.
  </action>
  <verify>
    .venv\Scripts\python.exe -c "import sys; sys.path.insert(0, 'backend'); from app.services.netting_engine import InterCompanyNettingEngine; print('Netting engine loaded cleanly')"
  </verify>
  <done>
    `InterCompanyNettingEngine` and `intercompany` endpoints compile with strict typing.
  </done>
</task>

<task type="auto" effort="medium">
  <name>Write Automated Tests for Netting Detection and MCA Audit Trail</name>
  <files>
    backend/tests/test_netting_engine.py
  </files>
  <action>
    Write `tests/test_netting_engine.py` testing:
    1. Inter-company transfer pairing between Alpha Retailers (HDFC Dr 1,00,000) and Sister Logistics (ICICI Cr 1,00,000) within 48h.
    2. Unrelated transaction outside the 48h window is not paired.
    3. Same-account transaction cannot pair with itself.
    4. MCA Rule 3(1) audit log is generated upon pairing and manual override.
  </action>
  <verify>
    .venv\Scripts\python.exe -m pytest tests/test_netting_engine.py -v
  </verify>
  <done>
    All netting engine and audit trail test cases pass with 100% assertions satisfied.
  </done>
</task>

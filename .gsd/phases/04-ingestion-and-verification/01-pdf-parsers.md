---
phase: 4
plan: 1
wave: 1
gap_closure: false
---

# Plan 4.1: PDF Parser Engine for SBI, ICICI, HDFC Statements with Regex Fallback

## Objective
Implement specialized statement parsers for SBI, ICICI, and HDFC bank statement formats (supporting CSV, Excel, and PDF line-item extraction). Extracts transaction date, reference number, narration, debit, credit, and running balance with automated regex repair for multiline narrations and Indian date/number formats (`DD/MM/YYYY`, `1,25,000.00`).

## Context
Load these files for context:
- `ubfd_engineering_project_report.md` (Section 1, Section 2.1)
- `backend/app/models/transaction.py`

## Tasks

<task type="auto" effort="medium">
  <name>Implement Multi-Bank Statement Ingestion Parsers</name>
  <files>
    backend/app/services/pdf_parser/base_parser.py
    backend/app/services/pdf_parser/hdfc_parser.py
    backend/app/services/pdf_parser/icici_parser.py
    backend/app/services/pdf_parser/sbi_parser.py
    backend/app/services/pdf_parser/__init__.py
    backend/app/api/v1/endpoints/ingestion.py
    backend/app/api/v1/router.py
  </files>
  <action>
    1. `base_parser.py`: Abstract `BaseStatementParser` with utility methods to normalize Indian number formats (`1,25,000.00` -> `Decimal("125000.00")`), parse Indian date formats (`DD/MM/YYYY`, `DD-MM-YYYY`), and repair wrapped multi-line narrations.
    2. `hdfc_parser.py`: Parser tailored for HDFC Bank tabular statements (columns: Date, Narration, Chq/Ref No, Value Dt, Withdrawal Amt, Deposit Amt, Closing Balance).
    3. `icici_parser.py`: Parser tailored for ICICI Bank statements (columns: Value Date, Transaction Date, Cheque No, Transaction Remarks, Debit Amount, Credit Amount, Balance).
    4. `sbi_parser.py`: Parser tailored for State Bank of India (SBI) statements (columns: Txn Date, Value Date, Description, Ref No./Cheque No., Debit, Credit, Balance).
    5. `app/api/v1/endpoints/ingestion.py`:
       - `POST /ingestion/upload`: Accepts file upload (CSV, PDF, XLSX) and target `account_id`.
       - Automatically detects bank code or uses account's bank code.
       - Parses transactions, verifies running balance continuity, and persists transactions to database.
       - Automatically triggers `InterCompanyNettingEngine.detect_and_pair` on new debit lines.
       - Returns parsed summary count and preview rows.
    6. Mount in `backend/app/api/v1/router.py`.
  </action>
  <verify>
    .venv\Scripts\python.exe -c "import sys; sys.path.insert(0, 'backend'); from app.services.pdf_parser import HDFCParser, ICICIParser, SBIParser; print('All bank parsers imported cleanly')"
  </verify>
  <done>
    Statement parser services and `/ingestion/upload` endpoint compile without errors.
  </done>
</task>

<task type="auto" effort="medium">
  <name>Write Parser Unit Tests with Realistic Bank Feeds</name>
  <files>
    backend/tests/test_statement_parsers.py
  </files>
  <action>
    Write `tests/test_statement_parsers.py` testing:
    1. HDFC statement CSV parsing with Indian comma formatting.
    2. ICICI statement CSV parsing with RTGS/NEFT transaction remarks.
    3. SBI statement CSV parsing with multiline description.
    4. Ingestion endpoint persistence and automatic contra pairing trigger.
  </action>
  <verify>
    .venv\Scripts\python.exe -m pytest tests/test_statement_parsers.py -v
  </verify>
  <done>
    All statement parser test cases pass with 100% assertions satisfied.
  </done>
</task>

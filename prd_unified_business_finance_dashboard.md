# Product Requirement Document (PRD)

## Unified Business Finance Dashboard (UBFD) / Group Cash OS

| Document Parameter | Details | 
| ----- | ----- | 
| **Product Name** | Unified Business Finance Dashboard (UBFD) / Group Cash OS | 
| **Document Version** | 1.0.0 (Production Blueprint) | 
| **Document Owner** | Principal Product Manager & Financial Systems Architect | 
| **Target Audience** | Engineering, UI/UX Design, QA, DevOps, Legal & Compliance | 
| **Target Launch** | Phase 1 MVP (Q3 2026) | 

## 1. Executive Summary & Product Vision

### 1.1 Problem Statement

Indian SME promoters and business group owners frequently operate across multiple legal entities (Private Limited companies, LLPs, Partnership firms, Sole Proprietorships) with funds dispersed across dozens of commercial bank accounts (SBI, ICICI, HDFC, Axis, Kotak Mahindra, Bank of Baroda, etc.).

**Existing Gaps:**

1. **Financial Fragmentation:** Promoters waste 45–60 minutes every morning logging into 5–8 net-banking portals or requesting manual WhatsApp balance screenshots from account managers.

2. **Gross vs. Net Inflow Distortion:** Inter-company liquidity movements (e.g., transferring ₹5,00,000 from ICICI to HDFC to cover payroll) are recorded twice, artificially inflating perceived group revenue and expenses by up to 40%.

3. **Lack of Real-Time Daily Cash Velocity:** Traditional accounting desktop apps (TallyPrime, BUSY) fail to provide real-time intraday cash availability, opening-to-closing daily roll-forwards, or predictive liquidity warnings.

### 1.2 Product Vision

UBFD is a non-invasive **Financial Command Overlay** designed for multi-entity business owners. It aggregates cleared bank statement feeds, isolates daily Opening/Credited/Debited/Closing balances per account, automatically nets out inter-company contra transfers, and presents a consolidated group liquidity position without forcing the user to replace their underlying accounting ERPs.

## 2. Target Personas & Primary Use Cases

| Persona | Role & Context | Core Objective | Key Need in UBFD | 
| ----- | ----- | ----- | ----- | 
| **Rajesh Verma** | Group Promoter (3 Entities, 6 Bank Accounts) | Morning group cash position check & inter-co transfer oversight. | Consolidated liquidity snapshot & WhatsApp 8 AM Cash Digest. | 
| **Anand Mehta** | Retail Operations Lead | Store QR code sweep tracking & vendor payment authorization. | Daily Bank Inspector with line-item narration search & waterfall breakdown. | 
| **CA Priya Sharma** | Retained Financial Controller | Tax planning, inter-co loan compliance, & bank reconciliations. | MCA Rule 3(1) audit compliance logs & GST Schedule I contra netting tags. | 

## 3. High-Level Architecture & System Position

UBFD operates as a **Read-Heavy Data Aggregation & Analytics Layer** sitting above bank data feeds and beneath management reporting UI.

```
       [ Indian Banking Ecosystem ]
  (RBI Account Aggregator APIs / Bank Feeds / PDF Parsers)
                    │
                    ▼
     ┌─────────────────────────────┐
     │  UBFD Data Ingestion Rail   │ ──(Decrypt & Standardize)
     └─────────────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────┐
  │   PostgreSQL Financial Engine    │ ──(Multi-Tenant, RLS Scoped)
  ├──────────────────────────────────┤
  │ - Daily Cash Inspector Module    │
  │ - Inter-Co Netting Engine        │
  │ - Categorization & Audit Logger  │
  └──────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────────┐  ┌────────────────────┐
│ Desktop/Mobile   │  │ WhatsApp & Email   │
│ Web SPA Overlay  │  │ Morning Cash Bot   │
└──────────────────┘  └────────────────────┘

```

## 4. Functional Requirements & Feature Specifications

### Module 1: Multi-Entity & Bank Account Management

* **FR-1.1 Business Entity Profiling:** Support creation of legal entities (`PVT_LTD`, `LLP`, `PROPRIETORSHIP`, `PARTNERSHIP`). Store GSTIN, PAN, Financial Year start/end dates, and base currency (INR default).

* **FR-1.2 Multi-Bank Account Linking:** Support linking of multiple bank accounts per entity across major Indian banks:

  * State Bank of India (SBI)

  * ICICI Bank

  * Axis Bank

  * HDFC Bank

  * Kotak Mahindra Bank

  * Bank of Baroda (BOB)

  * Custom Commercial Banks (PNB, IndusInd, Canara, YES Bank, etc.)

* **FR-1.3 Account Classification:** Tag each account by operational facility type: `CURRENT`, `SAVINGS`, `OVERDRAFT (OD)`, `CASH CREDIT (CC)`, `FIXED DEPOSIT (FD)`.

* **FR-1.4 Account Scoping:** Ability to assign custom color badges, shorthand tags (`PRIMARY OPERATING`, `PAYROLL & TAX`, `OD LINE`, `RETAIL SWEEP`), and bank-specific IFSC metadata.

### Module 2: Multi-Channel Bank Data Ingestion Rail *(New Capability)*

* **FR-2.1 RBI Account Aggregator (AA) Rail:** Native integration with licensed AAs (OneMoney, Anumati, Finvu) for automated, consent-driven API fetch of daily bank statements from participating Financial Information Providers (FIPs).

* **FR-2.2 Automated PDF Statement Parser & OCR Engine:**

  * Support drag-and-drop or email-forwarding of bank statement PDFs (including password-protected files with saved pattern decrypt keys).

  * Auto-detect bank format templates (SBI, ICICI, HDFC, etc.) and extract headers, transaction dates, value dates, narrations, debits, credits, and running balances with 99.5%+ accuracy.

* **FR-2.3 CSV/Excel Custom Column Mapper:** Wizard to ingest non-standard bank export files, allowing users to map columns to standard UBFD schema (`Transaction Date`, `Narration`, `Ref/UTR`, `Debit`, `Credit`, `Balance`).

### Module 3: Bank Account Daily Cash Inspector (Core Module)

* **FR-3.1 Dynamic Date Inspector Switcher:** Allows selecting any historical or current date (`YYYY-MM-DD`) to instantly recompute the daily ledger for selected bank accounts.

* **FR-3.2 4-Metric Daily Balance Bar:** Display four mandatory metrics per selected date:

  1. **Opening Balance:** Ledger balance at 00:00:00 hrs of the selected date.

  2. **Total Credited (+):** Sum of all positive transactions received during the date, along with credit transaction count.

  3. **Total Debited (-):** Sum of all negative transactions executed during the date, along with debit transaction count.

  4. **Closing Balance:** Final ledger balance at 23:59:59 hrs (Calculated as `Opening Balance + Credited - Debited`).

* **FR-3.3 Net Day Cash Velocity:** Display clear differential visual indicator: `Net Velocity = Credited - Debited` (Green for net positive, Red for net negative).

* **FR-3.4 Daily Cash Flow Breakdown Chart:** Interactive Chart.js Waterfall chart rendering Opening -> Credits -> Debits -> Closing balance sequence visually.

* **FR-3.5 Line-Item Daily Transaction Register:** Filterable table rendering:

  * Timestamp / UTR / Reference Number

  * Counterparty Name & Cleaned Narration

  * Category Tag

  * Debit Amount (Highlighted in Red)

  * Credit Amount (Highlighted in Green)

  * Running Balance after transaction completion

  * Inter-Company Contra tag indicator

### Module 4: Inter-Company Transfer Netting Engine

* **FR-4.1 Automated Contra Matching:** Algorithmically match outgoing debits from Account A (Entity X) with incoming credits in Account B (Entity Y) occurring within a ±24-hour window for identical or paired amounts.

* **FR-4.2 Group Cash Flow Elimination:** Provide a global toggle to "Eliminate Inter-Co Transfers", removing internal liquidity moves from total consolidated revenue/expense metrics to show true external cash flow.

* **FR-4.3 Inter-Company Loan & Interest Tracker *(New Feature)*:**

  * Track cumulative inter-company transfers between sister entities as Inter-Company Loans.

  * Compute implicit interest obligations per MCA Section 186 guidelines.

  * Generate GST Schedule I cross-charge compliance documentation for tax audit readiness.

### Module 5: Smart Transaction Categorization & Rule Engine *(New Feature)*

* **FR-5.1 Narration Parsing Engine:** Regex and NLP pattern matching to auto-categorize raw bank narrations into standard business categories:

  * `Customer Receipt` (NEFT/RTGS/UPI from buyers)

  * `Vendor Payment` (Supplier transfers)

  * `Payroll & Wages` (Salary payouts)

  * `Tax Payment` (GST, TDS, Advance Tax)

  * `Utilities & Rent` (MSEDCL, Office Rent)

  * `Inter-Company Fund` (Internal transfers)

* **FR-5.2 Custom Rule Creator:** Allow users to define custom categorization rules (e.g., *"If Narration contains 'AWS' or 'AMAZON WEB', set Category to 'IT Infrastructure'"*).

* **FR-5.3 Ambiguous Transaction Flagging:** Mark unknown transactions as `Unclassified` with a dedicated review queue.

### Module 6: Cash Flow Forecasting & Liquidity Alert Engine *(New Feature)*

* **FR-6.1 30/60/90-Day Cash Trajectory Forecasting:** Hybrid trend forecasting combining 30-day historical daily burn rate with scheduled recurring debits (payroll on 1st, GST on 20th, loan EMIs).

* **FR-6.2 Minimum Threshold & Bounce Alerts:**

  * Send instant alerts when an account balance dips below pre-set threshold (e.g., SBI Current Account < ₹2,00,000).

  * Flag potential cheque bounce or mandate failure risks if expected debits exceed available cleared balance.

### Module 7: Morning WhatsApp & Email Cash Digest Engine *(New Feature)*

* **FR-7.1 Automated 8 AM Daily Briefing:** Send a automated WhatsApp message and email summary to the Group Promoter every morning at 08:00 AM IST detailing:

  * Consolidated Group Cash Balance (₹ Total)

  * Yesterday’s Total Inflows & Outflows

  * Top 3 Bank Account Balances (SBI, ICICI, HDFC)

  * Pending Unreconciled / Flagged Inter-Co Transfers

  * Direct deep-link to Web SPA Inspector.

### Module 8: Indian Statutory Compliance Guardrails

* **FR-8.1 MCA Rule 3(1) Audit Log Compliance:** Maintain an immutable, append-only audit trail logging every manual categorization edit, statement re-import, or rule modification with user ID, IP address, and UTC timestamp.

* **FR-8.2 GST Schedule I Cross-Charge Tagging:** Explicitly flag inter-entity transfers to ensure contra cash movements are distinguished from taxable supply of goods/services.

* **FR-8.3 Financial Data Security:** Encrypt financial data at rest (AES-256) and in transit (TLS 1.3). Store data within Indian geographic boundaries (AWS ap-south-1 / GCP Mumbai) per RBI mandates.

### Module 9: External ERP Sync Adapters *(New Feature)*

* **FR-9.1 TallyPrime Sync Bridge:** Export categorized bank feeds into Tally XML format or stream transactions via Tally ODBC connector for seamless ledger posting.

* **FR-9.2 Zoho Books Bi-Directional API Sync:** Push cleared bank transactions to Zoho Books organizations via REST API, avoiding duplicate manual entry.

### Module 10: Role-Based Access Control (RBAC) & Security

* **FR-10.1 Scoped Access Matrix:**

| Role | Entity Visibility | Bank Account Access | Data Editing | Export Reports | Admin Rules | 
| ----- | ----- | ----- | ----- | ----- | ----- | 
| **Super Admin / Group Owner** | All Entities | All Linked Accounts | Full Access | Full Access | Full Access | 
| **Entity Manager** | Assigned Entity Only | Entity Accounts Only | Categorize Only | Entity Reports | No Access | 
| **Retained Accountant / CA** | All Entities | All Accounts | Categorize & Reconcile | Full Audit Exports | Rule Creation | 
| **Read-Only Viewer** | Assigned Entities | Assigned Accounts | Read-Only | Read-Only | No Access | 

## 5. Non-Functional Requirements (NFRs)

* **Performance & Speed:**

  * Page load & account dashboard hydration in under **1.2 seconds**.

  * Dynamic bank account switching & ledger table rendering in under **150 milliseconds**.

  * Daily cash flow waterfall chart rendering in under **200 milliseconds**.

* **Scalability:** System architecture capable of supporting **10,000 group promoters**, **50,000 business entities**, and **5,000,000 daily transaction line items** without database degradation.

* **Availability:** **99.95% uptime** for the Core Web App & Data Ingestion Pipeline.

## 6. Technical Architecture & Relational Schema

### 6.1 Database Schema (PostgreSQL DDL)

```
-- PostgreSQL DDL Blueprint for Unified Business Finance Dashboard

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenants / Group Promoters
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promoter_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Business Entities
CREATE TABLE business_entities (
    entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    legal_name VARCHAR(200) NOT NULL,
    trade_name VARCHAR(200),
    entity_type VARCHAR(50) CHECK (entity_type IN ('PVT_LTD', 'LLP', 'PROPRIETORSHIP', 'PARTNERSHIP')),
    gstin VARCHAR(15) UNIQUE,
    pan VARCHAR(10) NOT NULL,
    base_currency VARCHAR(3) DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Linked Bank Accounts
CREATE TABLE bank_accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES business_entities(entity_id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    bank_code VARCHAR(20) NOT NULL, -- SBI, ICICI, HDFC, AXIS, KOTAK, BOB
    account_number_mask VARCHAR(15) NOT NULL,
    ifsc_code VARCHAR(11) NOT NULL,
    account_type VARCHAR(20) CHECK (account_type IN ('CURRENT', 'SAVINGS', 'OVERDRAFT', 'CASH_CREDIT')),
    custom_tag VARCHAR(50),
    opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    current_cleared_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bank Daily Summaries (Pre-Aggregated for Instant Inspection)
CREATE TABLE daily_account_summaries (
    summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES bank_accounts(account_id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    opening_balance NUMERIC(15, 2) NOT NULL,
    total_credited NUMERIC(15, 2) DEFAULT 0.00,
    total_debited NUMERIC(15, 2) DEFAULT 0.00,
    closing_balance NUMERIC(15, 2) NOT NULL,
    transaction_count INT DEFAULT 0,
    UNIQUE(account_id, summary_date)
);

-- 5. Transactions Ledger
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES bank_accounts(account_id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    value_date DATE,
    transaction_time TIME,
    reference_number VARCHAR(100),
    counterparty_name VARCHAR(200),
    narration TEXT NOT NULL,
    debit_amount NUMERIC(15, 2) DEFAULT 0.00,
    credit_amount NUMERIC(15, 2) DEFAULT 0.00,
    running_balance NUMERIC(15, 2) NOT NULL,
    category VARCHAR(80) DEFAULT 'Unclassified',
    is_intercompany BOOLEAN DEFAULT FALSE,
    intercompany_pair_id UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Inter-Company Netting Pairs
CREATE TABLE intercompany_netting_log (
    netting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_transaction_id UUID REFERENCES transactions(transaction_id),
    destination_transaction_id UUID REFERENCES transactions(transaction_id),
    netted_amount NUMERIC(15, 2) NOT NULL,
    match_confidence NUMERIC(5, 2) DEFAULT 100.00,
    status VARCHAR(20) DEFAULT 'ELIMINATED', -- ELIMINATED, TAGGED, REVIEW_REQUIRED
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. MCA Rule 3(1) Audit Log
CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id),
    user_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- EDIT_CATEGORY, RE-IMPORT, NETTING_OVERRIDE
    target_table VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

```

## 7. Key RESTful API Endpoints

```
# Core API Architecture Blueprint

/api/v1/group/summary:
  get:
    summary: Fetch consolidated cash overview across all entities
    params: date (optional, default today)
    response: { total_balance, total_credited_today, total_debited_today, net_velocity, entity_breakdown }

/api/v1/accounts:
  get:
    summary: List all linked bank accounts (SBI, ICICI, HDFC, Axis, etc.) with current balances

/api/v1/accounts/{account_id}/daily-ledger:
  get:
    summary: Fetch daily metrics (Opening, Credits, Debits, Closing) and line-item transactions for a specific date
    params: date (YYYY-MM-DD), query (search narration)
    response: {
      account_id, bank_name, account_tag, date,
      opening_balance, total_credited, total_debited, closing_balance, net_velocity,
      transactions: [...]
    }

/api/v1/intercompany/netting:
  get:
    summary: List automatically detected inter-company contra transfer pairs
  post:
    summary: Override or manually pair an inter-company transfer line item

/api/v1/ingestion/upload-statement:
  post:
    summary: Upload PDF/CSV statement for parsing
    body: multipart file, account_id, password (optional)

```

## 8. Release Strategy & 3-Phase Roadmap

```
Phase 1: MVP Core (Months 1–3) 🚀
├── Multi-Entity & Multi-Bank Linking (SBI, ICICI, HDFC, Axis, Kotak, BOB)
├── Bank Account Daily Cash Inspector (Opening, Credited, Debited, Closing)
├── Interactive Cash Flow Waterfall Chart & Transaction Register Search
└── Manual Inter-Company Transfer Tagging & Netting View

Phase 2: Automation & Notifications (Months 4–6) ⚡
├── Automated RBI Account Aggregator (AA) Feeds + PDF Parser Engine
├── AI Narration Categorization Rule Engine
├── 8 AM WhatsApp & Email Morning Cash Digest Bot
└── TallyPrime & Zoho Books Export Adapter

Phase 3: Intelligence & Treasury (Months 7–9) 🧠
├── 30/60/90-Day Predictive Cash Flow Trajectory & Runway Forecasting
├── Inter-Company Loan Book & Interest Tracker (MCA Sec 186 & GST Schedule I)
└── Minimum Balance Breach & Cheque Bounce Alert Engine

```

## 9. Key Risks & Mitigation Plan

| Identified Risk | Risk Severity | Mitigation Strategy | 
| ----- | ----- | ----- | 
| **Bank PDF Layout Changes:** Banks modify statement formatting, breaking parsers. | High | Implement adaptive fallback OCR models & layout auto-detection pipelines with automated error alerts. | 
| **User Resistance to Bank Credentials:** Security fears regarding net-banking credentials. | High | Use read-only RBI Account Aggregator rails and statement PDF upload parsing; **never** ask for bank login passwords. | 
| **Complex Inter-Co Transfer Lag:** Money transferred on Friday night lands on Saturday morning, breaking same-day pairing. | Medium | Implement sliding ±48-hour fuzzy matching window based on amount matching & counterparty name parsing. | 

## 10. Direct Strategic Mandate

To capture the Indian SME market effectively:

1. **Focus on Non-Invasive Utility First:** Position UBFD not as a replacement for Tally/Zoho, but as the **Promoter’s Morning Cash Dashboard**.

2. **Prioritize Daily Ledger Speed:** The **Bank Account Daily Cash Inspector** must respond instantaneously (<150ms) to provide a superior user experience compared to logging into slow net-banking portals.

3. **Double-Down on Inter-Company Netting:** Automated contra transfer elimination is the single strongest differentiator separating UBFD from generic expense tracking tools.
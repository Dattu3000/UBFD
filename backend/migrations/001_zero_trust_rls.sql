-- ==============================================================================
-- Unified Business Finance Dashboard (UBFD) / Group Cash OS
-- Zero-Trust Architecture: PostgreSQL Row-Level Security (RLS) & Table Hardening
-- ==============================================================================

-- 1. Enable Row-Level Security (RLS) on all core financial tables
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_consents ENABLE ROW LEVEL SECURITY;

-- 2. Tenant Isolation Policies
-- Evaluates current_setting('app.current_tenant_id', true) set by FastAPI security middleware

-- Legal Entities Isolation Policy
DROP POLICY IF EXISTS entity_tenant_isolation_policy ON entities;
CREATE POLICY entity_tenant_isolation_policy ON entities
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Bank Accounts Isolation Policy
DROP POLICY IF EXISTS account_tenant_isolation_policy ON bank_accounts;
CREATE POLICY account_tenant_isolation_policy ON bank_accounts
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Transactions Isolation Policy
DROP POLICY IF EXISTS transaction_tenant_isolation_policy ON transactions;
CREATE POLICY transaction_tenant_isolation_policy ON transactions
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Bank Consent Isolation Policy
DROP POLICY IF EXISTS consent_tenant_isolation_policy ON bank_consents;
CREATE POLICY consent_tenant_isolation_policy ON bank_consents
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Audit Logs Isolation Policy
DROP POLICY IF EXISTS audit_tenant_isolation_policy ON audit_logs;
CREATE POLICY audit_tenant_isolation_policy ON audit_logs
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 3. MCA Rule 3(1) Immutable Audit Log Hardening
-- Prevents any database user from modifying or truncating the audit ledger
REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM PUBLIC;
-- Only allow INSERT and SELECT
GRANT INSERT, SELECT ON audit_logs TO PUBLIC;

-- 4. Blind Index & Cryptographic Lookup Indices
CREATE INDEX IF NOT EXISTS ix_entities_pan_blind_index ON entities(pan_blind_index);
CREATE INDEX IF NOT EXISTS ix_entities_gstin_blind_index ON entities(gstin_blind_index);
CREATE INDEX IF NOT EXISTS ix_bank_accounts_num_blind_index ON bank_accounts(account_number_blind_index);
CREATE INDEX IF NOT EXISTS ix_audit_hash_chain_lookup ON audit_logs(tenant_id, timestamp, row_hash);

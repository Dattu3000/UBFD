export type BankCode =
  | 'SBI'
  | 'ICICI'
  | 'HDFC'
  | 'AXIS'
  | 'KOTAK'
  | 'BOB'
  | 'YESB'
  | 'YES'
  | 'INDUSIND'
  | 'IDFC'
  | 'PNB'
  | 'CANARA'
  | 'UNION'
  | 'FEDERAL'
  | 'RBL'
  | 'BOI'
  | 'CBI'
  | 'SCB'
  | 'HSBC'
  | 'CUSTOM'
  | string;
export type FacilityType = 'CURRENT' | 'SAVINGS' | 'OVERDRAFT' | 'CASH_CREDIT';
export type LegalEntityType = 'PVT_LTD' | 'LLP' | 'PROPRIETORSHIP' | 'PARTNERSHIP';

export interface LegalEntity {
  id: string;
  tenant_id: string;
  name: string;
  entity_type: LegalEntityType;
  gstin?: string;
  pan?: string;
  base_currency: string;
  total_liquidity: number;
  account_count: number;
}

export interface BankAccount {
  account_id: string;
  tenant_id: string;
  entity_id: string;
  entity_name: string;
  bank_name: string;
  bank_code: BankCode;
  account_number_mask: string;
  ifsc_code: string;
  account_type: FacilityType;
  custom_tag?: string;
  opening_balance: number;
  current_cleared_balance: number;
  is_live?: boolean;
  consent_id?: string;
}

export interface BankConsent {
  id: string;
  consent_handle: string;
  consent_id?: string;
  entity_name: string;
  mobile_number: string;
  bank_codes: string[];
  status: 'PENDING_OTP' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  consent_duration_years: number;
  consent_start: string;
  consent_expiry: string;
  valid_until: string;
  last_sync_at?: string;
  linked_accounts_count: number;
  accounts: BankAccount[];
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
  is_cached?: boolean;
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
  status: string;
  data: {
    account: {
      account_id: string;
      bank_name: string;
      bank_code: string;
      account_mask: string;
      custom_tag?: string;
      account_type?: string;
    };
    summary: DailyLedgerSummary;
    transactions: TransactionItem[];
  };
}

export interface GroupLiquiditySummary {
  total_cleared_cash: number;
  total_overdraft_utilized: number;
  net_group_liquidity: number;
  entities_count: number;
  accounts_count: number;
  unreconciled_transactions_count: number;
  accounts: BankAccount[];
}

export interface NettingPairLog {
  log_id: string;
  source_transaction_id: string;
  destination_transaction_id: string;
  netted_amount: number;
  match_confidence: number;
  status: string;
  created_at: string;
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Shield, Zap, X, Building2, CreditCard, ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api-client';

interface VaultSearchResult {
  query: string;
  detected_type: string;
  blind_index: string;
  execution_time_ms: number;
  total_matches: number;
  matches: {
    entities: Array<{
      id: string;
      name: string;
      entity_type: string;
      pan?: string;
      gstin?: string;
      linked_accounts_count: number;
    }>;
    accounts: Array<{
      account_id: string;
      bank_name: string;
      bank_code: string;
      account_number_mask: string;
      current_cleared_balance: number;
      entity_name: string;
    }>;
    transactions: Array<{
      id: string;
      transaction_date: string;
      amount: number;
      transaction_type: string;
      narration: string;
      reference_number: string;
      account_mask?: string;
    }>;
  };
}

interface VaultSearchBarProps {
  value: string;
  onChange: (val: string, searchType?: string) => void;
  onSelectResult?: (type: 'entity' | 'account' | 'tx', id: string) => void;
  placeholder?: string;
  className?: string;
}

export const VaultSearchBar: React.FC<VaultSearchBarProps> = ({
  value,
  onChange,
  onSelectResult,
  placeholder = 'Search narration, PAN (ABCDE1234F), GSTIN, or Account #...',
  className = '',
}) => {
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<VaultSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // 1. Classify Input Regex
  const { normalized, detectedType, chipColor, searchTypeParam } = useMemo(() => {
    const clean = value.trim().toUpperCase().replace(/\s+/g, '');
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const acctRegex = /^[A-Z0-9]{11,22}$/;

    if (panRegex.test(clean)) {
      return {
        normalized: clean,
        detectedType: 'BLIND-INDEX: PAN',
        chipColor: 'bg-amber-950/80 border-amber-500 text-amber-300',
        searchTypeParam: 'blind_pan',
      };
    }
    if (gstinRegex.test(clean)) {
      return {
        normalized: clean,
        detectedType: 'BLIND-INDEX: GSTIN',
        chipColor: 'bg-indigo-950/80 border-indigo-500 text-indigo-300',
        searchTypeParam: 'blind_gstin',
      };
    }
    if (acctRegex.test(clean) && clean.length >= 11 && /\d/.test(clean)) {
      return {
        normalized: clean,
        detectedType: 'BLIND-INDEX: A/C / UTR',
        chipColor: 'bg-emerald-950/80 border-emerald-500 text-emerald-300',
        searchTypeParam: 'blind_account',
      };
    }
    return {
      normalized: value,
      detectedType: value ? 'NARRATION SEARCH' : '',
      chipColor: 'bg-[#004741] border-[#134e48] text-teal-200',
      searchTypeParam: 'auto',
    };
  }, [value]);

  // 2. Debounced Vault Search for Exact Blind Indexes
  useEffect(() => {
    if (!value || value.trim().length < 3) {
      setSearchResults(null);
      setDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const data = await api.get<VaultSearchResult>('/accounts/vault-search', {
          q: normalized,
          search_type: searchTypeParam,
        });
        setSearchResults(data);
        if (data.total_matches > 0) {
          setDropdownOpen(true);
        }
      } catch (err) {
        console.warn('[VaultSearch] Search query failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [normalized, searchTypeParam, value]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value, searchTypeParam);
  };

  const clearSearch = () => {
    onChange('', 'auto');
    setSearchResults(null);
    setDropdownOpen(false);
  };

  return (
    <div ref={searchContainerRef} className={`relative flex-1 ${className}`}>
      <div className="relative flex items-center">
        {isSearching ? (
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        ) : (
          <Search className="w-4 h-4 text-[#a2b8b5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}

        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (searchResults && searchResults.total_matches > 0) {
              setDropdownOpen(true);
            }
          }}
          placeholder={placeholder}
          className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl pl-10 pr-28 py-2 text-xs text-[#F0EDE4] placeholder-[#a2b8b5]/60 focus:outline-none focus:border-[#F0EDE4] transition-colors"
        />

        {/* Dynamic Pattern Indicator Badge */}
        {detectedType && (
          <div className="absolute right-9 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <span
              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border tracking-wider uppercase shadow-sm ${chipColor}`}
            >
              {detectedType}
            </span>
          </div>
        )}

        {/* Clear Button */}
        {value && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#a2b8b5] hover:text-[#F0EDE4] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Fast-Lookup Results Dropdown */}
      {dropdownOpen && searchResults && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[#031d1a] border border-[#134e48] rounded-2xl shadow-2xl overflow-hidden z-40 text-xs text-[#F0EDE4] max-h-96 overflow-y-auto">
          {/* Dropdown Header with Benchmark Metrics */}
          <div className="p-3 bg-[#072b27] border-b border-[#0e3a34] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-[11px] text-[#F0EDE4]">
                Blind Index Matches ({searchResults.total_matches})
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#a2b8b5] font-mono">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>
                Resolved in <span className="text-emerald-300 font-bold">{searchResults.execution_time_ms}ms</span>
              </span>
            </div>
          </div>

          {/* Matched Legal Entities */}
          {searchResults.matches.entities.length > 0 && (
            <div className="p-3 border-b border-[#0e3a34] space-y-2">
              <span className="text-[10px] font-bold uppercase text-[#a2b8b5] tracking-wider block">
                Matching Legal Entities
              </span>
              <div className="space-y-1.5">
                {searchResults.matches.entities.map((ent) => (
                  <div
                    key={ent.id}
                    onClick={() => {
                      onSelectResult?.('entity', ent.id);
                      setDropdownOpen(false);
                    }}
                    className="p-2 rounded-xl bg-[#072b27] hover:bg-[#0c3a35] border border-[#134e48] flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-xs text-[#F0EDE4]">{ent.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#a2b8b5]">
                      {ent.pan && <span>PAN: {ent.pan}</span>}
                      {ent.gstin && <span>GST: {ent.gstin}</span>}
                      <ArrowRight className="w-3 h-3 text-[#a2b8b5]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Bank Accounts */}
          {searchResults.matches.accounts.length > 0 && (
            <div className="p-3 border-b border-[#0e3a34] space-y-2">
              <span className="text-[10px] font-bold uppercase text-[#a2b8b5] tracking-wider block">
                Matching Bank Accounts
              </span>
              <div className="space-y-1.5">
                {searchResults.matches.accounts.map((acc) => (
                  <div
                    key={acc.account_id}
                    onClick={() => {
                      onSelectResult?.('account', acc.account_id);
                      setDropdownOpen(false);
                    }}
                    className="p-2 rounded-xl bg-[#072b27] hover:bg-[#0c3a35] border border-[#134e48] flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <div>
                        <span className="font-semibold text-xs text-[#F0EDE4] block leading-none">
                          {acc.bank_name} • {acc.account_number_mask}
                        </span>
                        <span className="text-[10px] text-[#a2b8b5] leading-none">{acc.entity_name}</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-300">
                      ₹{acc.current_cleared_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Transactions */}
          {searchResults.matches.transactions.length > 0 && (
            <div className="p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase text-[#a2b8b5] tracking-wider block">
                Matching Transactions (Top 10)
              </span>
              <div className="space-y-1.5">
                {searchResults.matches.transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2 rounded-xl bg-[#072b27] border border-[#134e48] flex items-center justify-between text-[11px]"
                  >
                    <div className="space-y-0.5 truncate max-w-[260px]">
                      <span className="font-medium text-[#F0EDE4] block truncate">{tx.narration}</span>
                      <span className="text-[10px] text-[#a2b8b5] font-mono">
                        Ref: {tx.reference_number} • {tx.transaction_date}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        tx.transaction_type === 'CREDIT' ? 'text-emerald-300' : 'text-amber-300'
                      }`}
                    >
                      {tx.transaction_type === 'CREDIT' ? '+' : '-'}₹
                      {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

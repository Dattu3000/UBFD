import React from 'react';
import { Search } from 'lucide-react';
import { TransactionItem } from '@/types/finance';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { ContraBadge } from '@/components/inspector/ContraBadge';

interface TransactionRegisterProps {
  transactions: TransactionItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  excludeContra: boolean;
  onExcludeContraChange: (exclude: boolean) => void;
  isLoading?: boolean;
}

export const TransactionRegister: React.FC<TransactionRegisterProps> = ({
  transactions,
  searchQuery,
  onSearchChange,
  excludeContra,
  onExcludeContraChange,
  isLoading = false,
}) => {
  return (
    <div className="bg-[#072b27] border border-[#134e48] rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#a2b8b5] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search narration, counterparty, or UTR/CMS reference..."
            className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl pl-10 pr-4 py-2 text-xs text-[#F0EDE4] placeholder-[#a2b8b5]/60 focus:outline-none focus:border-[#F0EDE4]"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#F0EDE4] bg-[#031d1a] hover:bg-[#0c3a35] border border-[#134e48] px-3.5 py-2 rounded-xl transition-colors select-none">
            <input
              type="checkbox"
              checked={excludeContra}
              onChange={(e) => onExcludeContraChange(e.target.checked)}
              className="rounded bg-[#072b27] border-[#134e48] text-[#004741] focus:ring-0 cursor-pointer"
            />
            <span>Exclude Contra Transfers (GST Sch-I)</span>
          </label>

          <span className="text-xs font-mono text-[#a2b8b5] bg-[#031d1a] px-3 py-2 rounded-xl border border-[#134e48]">
            {transactions.length} Line {transactions.length === 1 ? 'Item' : 'Items'}
          </span>
        </div>
      </div>

      {/* Table Register */}
      <div className="overflow-x-auto rounded-xl border border-[#0e3a34]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#05221e] text-[#a2b8b5] uppercase font-semibold border-b border-[#0e3a34]">
            <tr>
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4">Narration & Counterparty</th>
              <th className="py-3 px-3">Reference No</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-4 text-right">Debit (Dr)</th>
              <th className="py-3 px-4 text-right">Credit (Cr)</th>
              <th className="py-3 px-4 text-right">Running Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e3a34]">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#a2b8b5]">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#F0EDE4] animate-ping" />
                    <span>Loading daily transaction ledger...</span>
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#a2b8b5]">
                  <p className="font-semibold text-[#F0EDE4]">No transactions recorded for this criteria</p>
                  <p className="text-[11px] text-[#a2b8b5] mt-1">
                    Try switching date or adjusting the search keyword
                  </p>
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isContra = tx.is_intercompany;
                return (
                  <tr
                    key={tx.transaction_id}
                    className={`hover:bg-[#0a3832] transition-colors ${
                      isContra ? 'bg-[#004741]/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono text-[#a2b8b5] whitespace-nowrap">
                      {tx.time || '12:00:00'}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="font-semibold text-[#F0EDE4] truncate">
                        {tx.counterparty_name}
                      </div>
                      <div className="text-[11px] font-mono text-[#a2b8b5] truncate mt-0.5" title={tx.narration}>
                        {tx.narration}
                      </div>
                      {isContra && (
                        <div className="mt-1">
                          <ContraBadge pairId={tx.contra_pair_id} />
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[#a2b8b5] text-[11px] whitespace-nowrap">
                      {tx.reference_number}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#031d1a] text-[#F0EDE4] border border-[#134e48]">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {tx.debit_amount > 0 ? (
                        <span className="text-rose-400 font-mono font-semibold">
                          -<CurrencyDisplay amount={tx.debit_amount} size="sm" colored={false} className="text-rose-400" />
                        </span>
                      ) : (
                        <span className="text-[#a2b8b5]/40 font-mono">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {tx.credit_amount > 0 ? (
                        <span className="text-emerald-400 font-mono font-semibold">
                          +<CurrencyDisplay amount={tx.credit_amount} size="sm" colored={false} className="text-emerald-400" />
                        </span>
                      ) : (
                        <span className="text-[#a2b8b5]/40 font-mono">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#F0EDE4] whitespace-nowrap">
                      <CurrencyDisplay amount={tx.running_balance} size="sm" colored={false} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

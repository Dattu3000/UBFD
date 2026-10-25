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
    <div className="bg-[#0e1626] border border-[#1a253a] rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search narration, counterparty, or UTR/CMS reference..."
            className="w-full bg-[#131d31] border border-[#21304a] rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/60"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300 bg-[#131d31] hover:bg-[#1a2740] border border-[#21304a] px-3.5 py-2 rounded-xl transition-colors select-none">
            <input
              type="checkbox"
              checked={excludeContra}
              onChange={(e) => onExcludeContraChange(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-brand-500 focus:ring-0 cursor-pointer"
            />
            <span>Exclude Contra Transfers (GST Sch-I)</span>
          </label>

          <span className="text-xs font-mono text-slate-400 bg-[#131d31] px-3 py-2 rounded-xl border border-[#21304a]">
            {transactions.length} Line {transactions.length === 1 ? 'Item' : 'Items'}
          </span>
        </div>
      </div>

      {/* Table Register */}
      <div className="overflow-x-auto rounded-xl border border-[#182338]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#121c2e] text-slate-400 uppercase font-semibold border-b border-[#182338]">
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
          <tbody className="divide-y divide-[#172338]">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
                    <span>Loading daily transaction ledger...</span>
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <p className="font-semibold text-slate-300">No transactions recorded for this criteria</p>
                  <p className="text-[11px] text-slate-500 mt-1">
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
                    className={`hover:bg-[#131e33] transition-colors ${
                      isContra ? 'bg-contra-DEFAULT/5' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {tx.time || '12:00:00'}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="font-semibold text-slate-200 truncate">
                        {tx.counterparty_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5" title={tx.narration}>
                        {tx.narration}
                      </div>
                      {isContra && (
                        <div className="mt-1">
                          <ContraBadge pairId={tx.contra_pair_id} />
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {tx.reference_number}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {tx.debit_amount > 0 ? (
                        <span className="text-rose-400 font-mono font-semibold">
                          -<CurrencyDisplay amount={tx.debit_amount} size="sm" colored={false} className="text-rose-400" />
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {tx.credit_amount > 0 ? (
                        <span className="text-emerald-400 font-mono font-semibold">
                          +<CurrencyDisplay amount={tx.credit_amount} size="sm" colored={false} className="text-emerald-400" />
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200 whitespace-nowrap">
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

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api-client';
import { BankAccount, DailyLedgerResponse } from '@/types/finance';
import { DateInspectorPicker } from '@/components/inspector/DateInspectorPicker';
import { MetricsBar } from '@/components/inspector/MetricsBar';
import { CashWaterfallChart } from '@/components/inspector/CashWaterfallChart';
import { TransactionRegister } from '@/components/inspector/TransactionRegister';

interface DailyInspectorPageProps {
  initialAccountId?: string | null;
  accounts: BankAccount[];
  onBackToOverview?: () => void;
}

export const DailyInspectorPage: React.FC<DailyInspectorPageProps> = ({
  initialAccountId,
  accounts,
  onBackToOverview,
}) => {
  // Select first account if initial not set
  const defaultAccountId =
    initialAccountId ||
    (accounts.length > 0 ? accounts[0].account_id : 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6');

  const [selectedAccountId, setSelectedAccountId] = useState<string>(defaultAccountId);
  const [currentDate, setCurrentDate] = useState<string>('2026-10-25');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [excludeContra, setExcludeContra] = useState<boolean>(false);

  // Fetch daily ledger data for selected account and date
  const {
    data: ledgerResponse,
    isLoading,
    isError,
    error,
  } = useQuery<DailyLedgerResponse>({
    queryKey: ['daily-ledger', selectedAccountId, currentDate, searchQuery, excludeContra],
    queryFn: () =>
      api.get<DailyLedgerResponse>(`/accounts/${selectedAccountId}/daily-ledger`, {
        date: currentDate,
        search: searchQuery || undefined,
        exclude_contra: excludeContra ? true : undefined,
      }),
    enabled: Boolean(selectedAccountId),
  });

  const selectedAccount = accounts.find((a) => a.account_id === selectedAccountId);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Account Selector & Meta Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0e1626] border border-[#1a253a] shadow-lg">
        <div className="flex items-center gap-3">
          {onBackToOverview && (
            <button
              onClick={onBackToOverview}
              className="w-9 h-9 rounded-xl bg-[#141d31] hover:bg-[#1b2742] text-slate-300 border border-[#21304a] flex items-center justify-center transition-colors"
              title="Return to Group Overview"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
              Active Commercial Account:
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-[#141d31] border border-[#21304a] rounded-xl px-3 py-1.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-brand-500/60 cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.account_id} value={acc.account_id} className="bg-[#101827]">
                    {acc.bank_name} ({acc.account_number_mask}) — {acc.entity_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Current Account Meta Badges */}
        {selectedAccount && (
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-950/50 text-brand-300 border border-brand-800/50">
              {selectedAccount.account_type}
            </span>
            {selectedAccount.custom_tag && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {selectedAccount.custom_tag}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono text-slate-400 bg-[#141d31] border border-[#21304a]">
              IFSC: {selectedAccount.ifsc_code}
            </span>
          </div>
        )}
      </div>

      {/* 2. Date Switcher */}
      <DateInspectorPicker currentDate={currentDate} onDateChange={setCurrentDate} />

      {/* 3. Metrics Summary Tiles */}
      {isError ? (
        <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-800/40 text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Error loading daily roll-forward: {(error as Error)?.message || 'Account not found'}</span>
        </div>
      ) : ledgerResponse ? (
        <>
          <MetricsBar summary={ledgerResponse.data.summary} />
          <CashWaterfallChart
            summary={ledgerResponse.data.summary}
            transactions={ledgerResponse.data.transactions}
          />
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          <div className="h-28 bg-[#121b2d] rounded-2xl" />
          <div className="h-28 bg-[#121b2d] rounded-2xl" />
          <div className="h-28 bg-[#121b2d] rounded-2xl" />
          <div className="h-28 bg-[#121b2d] rounded-2xl" />
        </div>
      )}

      {/* 4. Line-Item Transaction Register */}
      <TransactionRegister
        transactions={ledgerResponse?.data.transactions || []}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        excludeContra={excludeContra}
        onExcludeContraChange={setExcludeContra}
        isLoading={isLoading}
      />
    </div>
  );
};

import React from 'react';
import {
  Wallet,
  ArrowDownRight,
  TrendingUp,
  Building2,
  Landmark,
  Search,
} from 'lucide-react';
import { GroupLiquiditySummary, LegalEntity } from '@/types/finance';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { EntityFilterBadge } from '@/components/shared/EntityFilterBadge';

interface GroupOverviewPageProps {
  summary: GroupLiquiditySummary | null;
  entities: LegalEntity[];
  selectedEntityId: string | null;
  onInspectAccount: (accountId: string) => void;
  isLoading?: boolean;
}

export const GroupOverviewPage: React.FC<GroupOverviewPageProps> = ({
  summary,
  entities,
  selectedEntityId,
  onInspectAccount,
  isLoading = false,
}) => {
  if (isLoading || !summary) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="h-32 bg-[#121b2d] rounded-2xl" />
          <div className="h-32 bg-[#121b2d] rounded-2xl" />
          <div className="h-32 bg-[#121b2d] rounded-2xl" />
        </div>
        <div className="h-96 bg-[#121b2d] rounded-2xl" />
      </div>
    );
  }

  // Filter accounts if entity selected
  const displayedAccounts = selectedEntityId
    ? summary.accounts.filter((a) => a.entity_id === selectedEntityId)
    : summary.accounts;

  // Filter entities if selected
  const displayedEntities = selectedEntityId
    ? entities.filter((e) => e.id === selectedEntityId)
    : entities;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* 1. KPI Metric Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Cleared Cash */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#101b30] to-[#0d1526] border border-[#1d2a45] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Cleared Cash
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 text-emerald-400 flex items-center justify-center border border-emerald-800/40">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <CurrencyDisplay amount={summary.total_cleared_cash} size="2xl" colored={false} />
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">Positive funds</span> across {summary.accounts_count} commercial accounts
          </p>
        </div>

        {/* Overdraft / Credit Drawn */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#101b30] to-[#0d1526] border border-[#1d2a45] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Working Capital Drawn (OD/CC)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-950/60 text-rose-400 flex items-center justify-center border border-rose-800/40">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <CurrencyDisplay amount={summary.total_overdraft_utilized} size="2xl" colored={false} />
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <span className="text-rose-400 font-medium">Credit lines</span> currently utilized
          </p>
        </div>

        {/* Net Consolidated Cash */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141b36] to-[#0f172a] border border-brand-500/30 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-brand-300 uppercase tracking-wider">
              Net Group Liquidity
            </span>
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-300 flex items-center justify-center border border-brand-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <CurrencyDisplay amount={summary.net_group_liquidity} size="2xl" colored={true} />
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            Net real available liquidity after debt lines
          </p>
        </div>
      </section>

      {/* 2. Legal Entity Breakdown Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-400" />
            Legal Entity Liquidity Distribution
          </h2>
          <span className="text-xs text-slate-400">
            {displayedEntities.length} Registered {displayedEntities.length === 1 ? 'Entity' : 'Entities'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {displayedEntities.map((ent) => (
            <div
              key={ent.id}
              className="p-5 rounded-xl bg-[#0e1626] border border-[#1e2a42] hover:border-brand-500/40 transition-all shadow-md space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{ent.name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    GSTIN: {ent.gstin || 'N/A'}
                  </p>
                </div>
                <EntityFilterBadge type={ent.entity_type} />
              </div>

              <div className="pt-2 border-t border-[#182338] flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Total Liquidity:</span>
                <CurrencyDisplay amount={ent.total_liquidity} size="lg" colored={true} />
              </div>

              <div className="text-[11px] text-slate-500 flex justify-between">
                <span>Linked Bank Accounts: {ent.account_count}</span>
                <span className="text-brand-400 font-medium">INR Base</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Commercial Bank Accounts Roster */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Landmark className="w-4 h-4 text-brand-400" />
              Commercial Bank Accounts & Cleared Balances
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live position aggregated from cleared bank statements feeds
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-[#121c2e] px-3 py-1 rounded-lg border border-[#1f2d42]">
            {displayedAccounts.length} Accounts
          </span>
        </div>

        <div className="bg-[#0e1626] border border-[#1a253a] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#121c2e] text-slate-400 text-xs uppercase font-semibold border-b border-[#1a253a]">
                <tr>
                  <th className="py-3.5 px-5">Bank & Account</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Facility Type</th>
                  <th className="py-3.5 px-4">Custom Tag</th>
                  <th className="py-3.5 px-5 text-right">Cleared Balance</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#172338]">
                {displayedAccounts.map((acc) => {
                  const bankBadgeColors: Record<string, string> = {
                    HDFC: 'bg-blue-950/70 text-blue-300 border-blue-800/60',
                    ICICI: 'bg-orange-950/70 text-orange-300 border-orange-800/60',
                    SBI: 'bg-sky-950/70 text-sky-300 border-sky-800/60',
                    AXIS: 'bg-pink-950/70 text-pink-300 border-pink-800/60',
                    KOTAK: 'bg-red-950/70 text-red-300 border-red-800/60',
                    BOB: 'bg-amber-950/70 text-amber-300 border-amber-800/60',
                  };
                  const bankBadge = bankBadgeColors[acc.bank_code] || 'bg-slate-800 text-slate-300';

                  return (
                    <tr key={acc.account_id} className="hover:bg-[#131d33] transition-colors group">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${bankBadge}`}>
                            {acc.bank_code}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-200">
                              {acc.bank_name}
                            </div>
                            <div className="text-xs font-mono text-slate-400">
                              {acc.account_number_mask} • {acc.ifsc_code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-300 font-medium">
                        {acc.entity_name}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {acc.account_type}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {acc.custom_tag ? (
                          <span className="text-xs font-medium text-brand-300 bg-brand-950/40 px-2 py-0.5 rounded border border-brand-800/40">
                            {acc.custom_tag}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <CurrencyDisplay
                          amount={acc.current_cleared_balance}
                          size="lg"
                          colored={true}
                        />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => onInspectAccount(acc.account_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 text-xs font-medium transition-all group-hover:scale-105"
                          title="Open in Daily Cash Inspector"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

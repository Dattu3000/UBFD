import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';
import { DailyLedgerSummary } from '@/types/finance';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';

interface MetricsBarProps {
  summary: DailyLedgerSummary;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ summary }) => {
  const isNetPositive = summary.net_velocity >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Opening Balance */}
      <div className="p-5 rounded-2xl bg-[#072b27] border border-[#134e48] shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between text-xs font-semibold text-[#a2b8b5] uppercase tracking-wider mb-2">
          <span>Opening Balance</span>
          <Layers className="w-4 h-4 text-[#a2b8b5]" />
        </div>
        <div className="mt-1 text-[#F0EDE4]">
          <CurrencyDisplay amount={summary.opening_balance} size="xl" colored={false} />
        </div>
        <p className="text-[11px] text-[#a2b8b5] mt-2 font-mono">
          Roll-forward start 00:00:00 IST
        </p>
      </div>

      {/* 2. Total Inflows (Credited) */}
      <div className="p-5 rounded-2xl bg-[#072b27] border border-[#134e48] shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
        <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
          <span>Total Credited</span>
          <div className="w-6 h-6 rounded-md bg-[#004741] text-[#F0EDE4] flex items-center justify-center border border-[#134e48]">
            <ArrowDownLeft className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1">
          <CurrencyDisplay amount={summary.total_credited} size="xl" colored={true} />
        </div>
        <p className="text-[11px] text-emerald-400/80 mt-2 font-medium flex items-center gap-1">
          <span>+ Inflow liquidity</span>
        </p>
      </div>

      {/* 3. Total Outflows (Debited) */}
      <div className="p-5 rounded-2xl bg-[#072b27] border border-[#134e48] shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl" />
        <div className="flex items-center justify-between text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">
          <span>Total Debited</span>
          <div className="w-6 h-6 rounded-md bg-[#004741] text-rose-300 flex items-center justify-center border border-[#134e48]">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1">
          <span className="font-mono text-xl font-bold tracking-tight text-rose-400">
            -<CurrencyDisplay amount={summary.total_debited} size="xl" colored={false} className="text-rose-400" />
          </span>
        </div>
        <p className="text-[11px] text-rose-400/80 mt-2 font-medium flex items-center gap-1">
          <span>- Outflow payments</span>
        </p>
      </div>

      {/* 4. Closing Balance & Net Velocity */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0a3a34] to-[#052622] border border-[#1b635c] shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-28 h-28 bg-[#004741]/20 rounded-full blur-xl" />
        <div className="flex items-center justify-between text-xs font-semibold text-[#F0EDE4] uppercase tracking-wider mb-1">
          <span>Closing Balance</span>
          {summary.is_cached ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#004741] text-[#F0EDE4] border border-[#134e48] text-[10px] font-bold">
              <Zap className="w-3 h-3 text-[#F0EDE4]" /> &lt;10ms Pre-Agg
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#004741] text-[#F0EDE4] border border-[#134e48] text-[10px] font-bold">
              <Activity className="w-3 h-3 text-[#F0EDE4]" /> Dynamic Rollback
            </span>
          )}
        </div>
        <div className="mt-1 text-[#F0EDE4]">
          <CurrencyDisplay amount={summary.closing_balance} size="xl" colored={false} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-[#a2b8b5]">Net Velocity:</span>
          <span
            className={`font-mono font-semibold px-1.5 py-0.5 rounded ${
              isNetPositive
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                : 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
            }`}
          >
            {isNetPositive ? '+' : ''}
            <CurrencyDisplay amount={summary.net_velocity} size="sm" colored={false} />
          </span>
        </div>
      </div>
    </div>
  );
};

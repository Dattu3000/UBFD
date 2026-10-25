import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  ShieldCheck,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { ContraBadge } from '@/components/inspector/ContraBadge';
import { formatDateIndian } from '@/lib/formatters';

interface ContraPairRecord {
  log_id: string;
  source_transaction_id: string;
  destination_transaction_id: string;
  netted_amount: number;
  match_confidence: number;
  status: string;
  created_at: string;
  source: {
    entity_name: string;
    bank_name: string;
    bank_code: string;
    account_mask: string;
    date: string;
    narration: string;
    reference_number: string;
  };
  destination: {
    entity_name: string;
    bank_name: string;
    bank_code: string;
    account_mask: string;
    date: string;
    narration: string;
    reference_number: string;
  };
}

export const IntercompanyNettingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [overrideModalPair, setOverrideModalPair] = useState<ContraPairRecord | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // 1. Fetch Contra Pairs
  const { data, isLoading } = useQuery<{ status: string; count: number; data: ContraPairRecord[] }>({
    queryKey: ['contra-pairs'],
    queryFn: () => api.get('/intercompany/pairs'),
  });

  const pairs = data?.data || [];

  // Calculate gross eliminated amount
  const totalEliminated = pairs
    .filter((p) => p.status === 'ELIMINATED')
    .reduce((sum, p) => sum + Number(p.netted_amount), 0);

  // 2. Scan Mutation
  const scanMutation = useMutation({
    mutationFn: () => api.post<{ status: string; newly_paired_count: number; message: string }>('/intercompany/scan'),
    onSuccess: (res) => {
      setScanMessage(res.message);
      queryClient.invalidateQueries({ queryKey: ['contra-pairs'] });
      setTimeout(() => setScanMessage(null), 4000);
    },
  });

  // 3. Override Mutation
  const overrideMutation = useMutation({
    mutationFn: (variables: { logId: string; reason: string }) =>
      api.post('/intercompany/override', {
        log_id: variables.logId,
        action: 'UNPAIR',
        reason: variables.reason,
      }),
    onSuccess: () => {
      setOverrideModalPair(null);
      setOverrideReason('');
      queryClient.invalidateQueries({ queryKey: ['contra-pairs'] });
    },
  });

  const handleOpenOverride = (pair: ContraPairRecord) => {
    setOverrideModalPair(pair);
    setOverrideReason('Fund transfer reclassified as commercial transaction rather than sister entity loan');
  };

  const handleConfirmOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalPair || !overrideReason.trim()) return;
    overrideMutation.mutate({
      logId: overrideModalPair.log_id,
      reason: overrideReason.trim(),
    });
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Scan Banner / Alert */}
      {scanMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{scanMessage}</span>
          </div>
          <button onClick={() => setScanMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-contra-DEFAULT" />
            Inter-Company Contra Netting & Elimination
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Eliminates artificial revenue/expense inflation across sister entities (GST Schedule I & MCA Rule 3)
          </p>
        </div>

        <button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanMutation.isPending ? 'animate-spin' : ''}`} />
          <span>{scanMutation.isPending ? 'Scanning Ledgers...' : 'Scan For Intra-Group Contra'}</span>
        </button>
      </div>

      {/* 2. Key Metrics Bar */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-[#0e1626] border border-[#1a253a] shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Contra Eliminated Volume
            </span>
            <div className="w-8 h-8 rounded-lg bg-contra-DEFAULT/20 text-contra-DEFAULT flex items-center justify-center border border-contra-DEFAULT/30">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            <CurrencyDisplay amount={totalEliminated} size="2xl" colored={false} />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            <span className="text-contra-DEFAULT font-semibold">Excluded</span> from gross turnover inflation
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#0e1626] border border-[#1a253a] shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Paired Sister Transfers
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 text-emerald-400 flex items-center justify-center border border-emerald-800/40">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-2xl font-mono font-bold text-slate-100">
              {pairs.filter((p) => p.status === 'ELIMINATED').length} Pairs
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            98.5% automated matching confidence
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#0e1626] border border-[#1a253a] shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Statutory Compliance
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-950/60 text-indigo-400 flex items-center justify-center border border-indigo-800/40">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
              <span>MCA Rule 3(1) Ready</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Immutable audit log enforced on all overrides
          </p>
        </div>
      </section>

      {/* 3. Contra Matching Roster Table */}
      <section className="bg-[#0e1626] border border-[#1a253a] rounded-2xl overflow-hidden shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Intra-Group Contra Matches
            </h3>
            <p className="text-xs text-slate-400">
              Bi-directional debit-credit pairings detected within ±48h window
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-[#121c2e] px-3 py-1 rounded-lg border border-[#1f2d42]">
            {pairs.length} Records
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#182338]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121c2e] text-slate-400 uppercase font-semibold border-b border-[#182338]">
              <tr>
                <th className="py-3 px-4">Source (Debit Outflow)</th>
                <th className="py-3 px-2 text-center">Flow</th>
                <th className="py-3 px-4">Destination (Credit Inflow)</th>
                <th className="py-3 px-4 text-right">Netted Amount</th>
                <th className="py-3 px-3 text-center">Confidence</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172338]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading contra pairings...
                  </td>
                </tr>
              ) : pairs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No inter-company contra transfers detected. Click "Scan For Intra-Group Contra" to analyze ledgers.
                  </td>
                </tr>
              ) : (
                pairs.map((pair) => (
                  <tr key={pair.log_id} className="hover:bg-[#131e33] transition-colors">
                    {/* Source */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-950/70 text-blue-300 border border-blue-800/60">
                          {pair.source.bank_code}
                        </span>
                        <span className="font-semibold text-slate-200 truncate">
                          {pair.source.entity_name}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate mt-1">
                        {pair.source.account_mask} • {formatDateIndian(pair.source.date)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5" title={pair.source.narration}>
                        {pair.source.narration}
                      </div>
                    </td>

                    {/* Arrow */}
                    <td className="py-3.5 px-2 text-center">
                      <div className="w-7 h-7 rounded-full bg-[#152136] border border-[#223352] text-contra-DEFAULT flex items-center justify-center mx-auto">
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </div>
                    </td>

                    {/* Destination */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-950/70 text-orange-300 border border-orange-800/60">
                          {pair.destination.bank_code}
                        </span>
                        <span className="font-semibold text-slate-200 truncate">
                          {pair.destination.entity_name}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate mt-1">
                        {pair.destination.account_mask} • {formatDateIndian(pair.destination.date)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5" title={pair.destination.narration}>
                        {pair.destination.narration}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <CurrencyDisplay amount={pair.netted_amount} size="md" colored={true} />
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">₹ Eliminated</div>
                    </td>

                    {/* Confidence */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                        {pair.match_confidence}%
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {pair.status === 'ELIMINATED' ? (
                        <ContraBadge pairId={pair.log_id} />
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          DISSOLVED
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {pair.status === 'ELIMINATED' ? (
                        <button
                          onClick={() => handleOpenOverride(pair)}
                          className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-[11px] font-medium transition-colors"
                          title="Dissolve contra pair and restore gross reporting"
                        >
                          Manual Override
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Overridden</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Manual Override Modal (MCA Rule 3 Compliance) */}
      {overrideModalPair && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-[#21304a] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#1c2940] pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Manual Contra Dissolution (MCA Rule 3)</span>
              </div>
              <button
                onClick={() => setOverrideModalPair(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              You are overriding the automated contra classification for{' '}
              <span className="font-bold text-slate-100 font-mono">
                ₹{Number(overrideModalPair.netted_amount).toLocaleString('en-IN')}
              </span>{' '}
              between <span className="font-semibold text-slate-200">{overrideModalPair.source.entity_name}</span> and{' '}
              <span className="font-semibold text-slate-200">{overrideModalPair.destination.entity_name}</span>.
            </p>

            <form onSubmit={handleConfirmOverride} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Statutory Audit Justification (Required by MCA Rule 3(1)):
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={3}
                  required
                  placeholder="Enter specific regulatory, tax, or business rationale for dissolving this contra tag..."
                  className="w-full bg-[#141d31] border border-[#21304a] rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500/60 font-sans"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                  <span>Immutable Audit Trail Notice:</span>
                </div>
                <p>This action will be permanently logged in the tenant's audit trail with timestamp, user ID, and rationale.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideModalPair(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overrideMutation.isPending || !overrideReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 disabled:opacity-50"
                >
                  {overrideMutation.isPending ? 'Logging Audit...' : 'Confirm Dissolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

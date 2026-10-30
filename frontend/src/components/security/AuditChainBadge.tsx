import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api-client';

interface AuditVerifyChainResponse {
  is_valid: boolean;
  total_records: number;
  genesis_hash: string;
  latest_hash: string;
  status: string;
  tampered_at_index?: number;
  tampered_record_id?: string;
  action?: string;
  reason?: string;
}

interface AuditLogEntry {
  audit_id: string;
  table_name: string;
  record_id: string;
  action: string;
  user_id: string;
  prev_hash: string;
  row_hash: string;
  timestamp: string;
  old_values?: string | null;
  new_values?: string | null;
}

export const AuditChainBadge: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [verificationBenchmarkMs, setVerificationBenchmarkMs] = useState<number | null>(null);

  // 1. Poll audit chain verification every 60 seconds
  const {
    data: chainStatus,
    isFetching,
    refetch: refetchVerification,
  } = useQuery<AuditVerifyChainResponse>({
    queryKey: ['audit-verify-chain'],
    queryFn: async () => {
      const start = performance.now();
      const res = await api.get<AuditVerifyChainResponse>('/audit/verify-chain');
      const duration = Math.round(performance.now() - start);
      setVerificationBenchmarkMs(duration);
      return res;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // 2. Fetch recent hash-chain blocks when drawer opens
  const { data: auditLogs = [], isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery<AuditLogEntry[]>({
    queryKey: ['audit-logs'],
    queryFn: () => api.get<AuditLogEntry[]>('/audit/logs?limit=30'),
    enabled: isDrawerOpen,
  });

  const handleManualVerify = async () => {
    await Promise.all([refetchVerification(), refetchLogs()]);
  };

  const isValid = chainStatus?.is_valid ?? true;
  const totalRecords = chainStatus?.total_records ?? 0;
  const shortHash = chainStatus?.latest_hash
    ? `${chainStatus.latest_hash.slice(0, 6)}...${chainStatus.latest_hash.slice(-4)}`
    : 'genesis';

  return (
    <>
      {/* Critical Tamper Alert Banner across full width if invalid */}
      {!isValid && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-rose-950/95 border-b border-rose-500 text-rose-100 px-6 py-2.5 shadow-2xl flex items-center justify-between backdrop-blur-md animate-pulse">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold tracking-wide uppercase text-rose-300">
                MCA Rule 3(1) Cryptographic Integrity Alert:
              </span>{' '}
              Tampering detected at block index #{chainStatus?.tampered_at_index} (Record ID:{' '}
              <span className="font-mono text-rose-200">{chainStatus?.tampered_record_id}</span>).{' '}
              {chainStatus?.reason || 'Cryptographic row integrity check failed.'}
            </div>
          </div>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow transition-colors shrink-0"
          >
            Inspect Tamper Proof
          </button>
        </div>
      )}

      {/* Header Status Pill */}
      <button
        onClick={() => setIsDrawerOpen(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition-all cursor-pointer ${
          !isValid
            ? 'bg-rose-950/80 border-rose-500 text-rose-200 hover:bg-rose-900/90'
            : 'bg-[#004741]/90 border-emerald-500/40 text-emerald-100 hover:bg-[#005750] hover:border-emerald-400'
        }`}
        title="Click to inspect MCA Rule 3(1) Cryptographic Hash Chain Audit Ledger"
      >
        <div className="relative flex items-center justify-center">
          {isValid ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
            </>
          ) : (
            <Lock className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
          )}
        </div>

        <span className="hidden sm:inline font-mono">
          {isValid ? 'MCA 3(1)' : 'TAMPER DETECTED'}
        </span>

        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 border border-white/10 text-[#F0EDE4]">
          {isValid ? `#${shortHash}` : 'ERR'}
        </span>

        <span className="text-[10px] text-emerald-200/80 font-normal hidden md:inline">
          ({totalRecords} {totalRecords === 1 ? 'block' : 'blocks'})
        </span>
      </button>

      {/* Slide-over Drawer / Cryptographic Inspector Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-xl bg-[#031d1a] border-l border-[#134e48] shadow-2xl flex flex-col z-10 text-[#F0EDE4]">
            {/* Header */}
            <div className="p-6 border-b border-[#0e3a34] flex items-center justify-between bg-[#072b27]">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {isValid ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F0EDE4] flex items-center gap-2">
                    MCA Rule 3(1) Cryptographic Ledger
                  </h3>
                  <p className="text-xs text-[#a2b8b5]">
                    Immutable SHA-256 Hash Chaining (WORM • Write Once, Read Many)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[#a2b8b5] hover:text-[#F0EDE4] hover:bg-[#0e3a34] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Proof Card & Manual Run Verification */}
            <div className="p-6 bg-[#04211e] border-b border-[#0e3a34] space-y-4">
              <div
                className={`p-4 rounded-xl border flex items-start justify-between ${
                  isValid
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500 text-rose-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="font-bold text-xs">
                      {isValid ? 'Ledger Chain 100% Cryptographically Verified' : 'Chain Broken • Tampering Detected'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-90 leading-relaxed font-mono">
                    {isValid
                      ? `Traversed ${totalRecords} sequential blocks. All previous hashes link seamlessly to head #${shortHash}.`
                      : chainStatus?.reason}
                  </p>
                  {verificationBenchmarkMs !== null && (
                    <div className="text-[10px] text-[#a2b8b5] flex items-center gap-1.5 pt-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>
                        Verified in <span className="font-bold text-[#F0EDE4]">{verificationBenchmarkMs}ms</span> (
                        <span className="text-emerald-300">target &lt;150ms</span>)
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleManualVerify}
                  disabled={isFetching}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#004741] hover:bg-[#005750] border border-[#134e48] text-xs font-semibold text-[#F0EDE4] transition-colors shadow disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                  <span>Re-Verify</span>
                </button>
              </div>

              {/* Cryptographic Ledger Summary Chips */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#072b27] border border-[#134e48]">
                  <span className="text-[10px] uppercase font-bold text-[#a2b8b5] block">Total Audit Blocks</span>
                  <span className="text-base font-bold font-mono text-[#F0EDE4]">{totalRecords}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#072b27] border border-[#134e48]">
                  <span className="text-[10px] uppercase font-bold text-[#a2b8b5] block">Compliance Standard</span>
                  <span className="text-xs font-semibold text-emerald-300">MCA Rule 3(1) / ReBIT FIU</span>
                </div>
              </div>
            </div>

            {/* Hash Chain Block Register */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-[#a2b8b5] pb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Sequential Hash Chain Trail (Latest 30)
                </span>
                <span className="text-[10px] font-mono">prev_hash → row_hash</span>
              </div>

              {isLoadingLogs ? (
                <div className="py-12 text-center text-[#a2b8b5] text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Loading cryptographic proof blocks...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-[#a2b8b5] text-xs bg-[#072b27] rounded-xl border border-[#134e48]">
                  No audit logs recorded yet. Genesis block ready.
                </div>
              ) : (
                auditLogs.map((log, index) => {
                  const blockIndex = totalRecords - index;
                  return (
                    <div
                      key={log.audit_id}
                      className="p-3.5 rounded-xl bg-[#072b27] border border-[#134e48] hover:border-emerald-500/40 transition-colors space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-400 text-[11px]">
                            Block #{blockIndex}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#031d1a] border border-[#134e48] text-[#F0EDE4]">
                            {log.action}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#a2b8b5] font-mono">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-IN') : ''}
                        </span>
                      </div>

                      <div className="font-mono text-[10px] bg-[#031d1a] p-2 rounded-lg border border-[#0e3a34] space-y-1">
                        <div className="flex items-center gap-1.5 text-[#a2b8b5] truncate">
                          <span className="text-[#a2b8b5]/60 w-12 shrink-0">prev:</span>
                          <span className="truncate">{log.prev_hash}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-300 truncate">
                          <span className="text-emerald-500/80 w-12 shrink-0 font-bold">row:</span>
                          <span className="truncate">{log.row_hash}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#a2b8b5]">
                        <span>Table: <span className="text-[#F0EDE4] font-medium">{log.table_name}</span></span>
                        <span>User: <span className="text-[#F0EDE4] font-medium">{log.user_id}</span></span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#0e3a34] bg-[#072b27] text-center text-[11px] text-[#a2b8b5]">
              Cryptographic integrity is continuously asserted per Companies (Accounts) Rules, 2014.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

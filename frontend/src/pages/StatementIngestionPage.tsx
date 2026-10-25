import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { BankAccount } from '@/types/finance';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';

interface StatementIngestionPageProps {
  accounts: BankAccount[];
}

export const StatementIngestionPage: React.FC<StatementIngestionPageProps> = ({
  accounts,
}) => {
  const queryClient = useQueryClient();

  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts.length > 0 ? accounts[0].account_id : ''
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (variables: { accountId: string; file: File }) => {
      const formData = new FormData();
      formData.append('account_id', variables.accountId);
      formData.append('file', variables.file);

      const token = localStorage.getItem('ubfd_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/ingestion/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Statement ingestion failed');
      }

      return res.json();
    },
    onSuccess: (data) => {
      setUploadResult(data);
      setErrorMessage(null);
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['group-liquidity'] });
      queryClient.invalidateQueries({ queryKey: ['daily-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['contra-pairs'] });
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Error uploading file');
      setUploadResult(null);
    },
  });

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSampleStatement = (bank: 'HDFC' | 'SBI' | 'ICICI') => {
    let content = '';
    let filename = '';

    if (bank === 'HDFC') {
      filename = 'hdfc_statement_oct2026.csv';
      content = `Date,Narration,Chq/Ref No,Value Dt,Withdrawal Amt,Deposit Amt,Closing Balance
26/10/2026,NEFT CR-CMS889900-OMEGA PHARMA-HDF0000240,CMS889900,26/10/2026,,175000.00,2354920.50
26/10/2026,RTGS DR-HDFC554433-SISTER LOGISTICS-ICIC0000102,HDFC554433,26/10/2026,120000.00,,2234920.50
26/10/2026,NEFT DR-OFFICE LEASE-OCT26,NEFT990011,26/10/2026,45000.00,,2189920.50
`;
    } else if (bank === 'SBI') {
      filename = 'sbi_tax_statutory_oct2026.csv';
      content = `Txn Date,Value Date,Description,Ref No./Cheque No.,Debit,Credit,Balance
26/10/2026,26/10/2026,GST PAYMENT CHALLAN OCT26,SBIN009944,28500.00,0.00,786500.00
26/10/2026,26/10/2026,INTEREST CREDIT H1,SBIN009945,0.00,3200.00,789700.00
`;
    } else {
      filename = 'icici_collections_oct2026.csv';
      content = `Value Date,Transaction Date,Cheque No,Transaction Remarks,Debit Amount,Credit Amount,Balance
26/10/2026,26/10/2026,001234,RTGS CR-HDFC554433-ALPHA RETAILERS-HDF0000240,0.00,120000.00,1460000.00
26/10/2026,26/10/2026,001235,FREIGHT DISPATCH FUEL PAY,15400.00,0.00,1444600.00
`;
    }

    const blob = new Blob([content], { type: 'text/csv' });
    const file = new File([blob], filename, { type: 'text/csv' });
    setSelectedFile(file);

    // Auto-select corresponding account if available
    const matchedAccount = accounts.find((a) => a.bank_code === bank);
    if (matchedAccount) {
      setSelectedAccountId(matchedAccount.account_id);
    }
  };

  const handleUploadSubmit = () => {
    if (!selectedAccountId || !selectedFile) return;
    uploadMutation.mutate({
      accountId: selectedAccountId,
      file: selectedFile,
    });
  };

  const selectedAccount = accounts.find((a) => a.account_id === selectedAccountId);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-[#F0EDE4] flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-[#F0EDE4]" />
          Bank Statement Ingestion Rail
        </h2>
        <p className="text-xs text-[#a2b8b5] mt-1">
          Direct ingestion for SBI, ICICI, and HDFC bank statements (PDF table extracts & CSV feeds)
        </p>
      </div>

      {/* Main Grid: Upload Controls + Quick Samples */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Upload Form */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#072b27] border border-[#134e48] shadow-xl space-y-5">
          {/* Target Account Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#a2b8b5] uppercase tracking-wider mb-2">
              Select Destination Commercial Account:
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl px-4 py-2.5 text-xs font-bold text-[#F0EDE4] focus:outline-none focus:border-[#F0EDE4]"
            >
              {accounts.map((acc) => (
                <option key={acc.account_id} value={acc.account_id} className="bg-[#072b27] text-[#F0EDE4]">
                  {acc.bank_name} ({acc.account_number_mask}) — {acc.entity_name} [{acc.account_type}]
                </option>
              ))}
            </select>
            {selectedAccount && (
              <p className="text-[11px] text-[#a2b8b5] mt-1.5 font-mono">
                Bank Code: <span className="text-[#F0EDE4] font-semibold">{selectedAccount.bank_code}</span> • IFSC: {selectedAccount.ifsc_code}
              </p>
            )}
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-[#134e48] hover:border-[#1b635c] rounded-2xl p-8 text-center bg-[#031d1a]/50 transition-all flex flex-col items-center justify-center space-y-3 cursor-pointer group"
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <input
              id="file-upload-input"
              type="file"
              accept=".csv,.pdf,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
            />
            <div className="w-12 h-12 rounded-2xl bg-[#004741] group-hover:bg-[#065b53] text-[#F0EDE4] flex items-center justify-center transition-colors border border-[#134e48]">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-bold text-[#F0EDE4]">
                {selectedFile ? selectedFile.name : 'Click or drag bank statement here'}
              </p>
              <p className="text-xs text-[#a2b8b5] mt-0.5">
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB • Ready for extraction`
                  : 'Supports CSV feeds & PDF table exports'}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {selectedFile && (
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="px-4 py-2 rounded-xl bg-[#031d1a] border border-[#134e48] text-[#a2b8b5] text-xs font-semibold hover:text-[#F0EDE4]"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleUploadSubmit}
              disabled={!selectedFile || !selectedAccountId || uploadMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#F0EDE4] hover:bg-[#e4dfd3] text-[#004741] text-xs font-bold shadow-lg shadow-[#004741]/20 disabled:opacity-50 transition-all"
            >
              <span>{uploadMutation.isPending ? 'Extracting & Netting...' : 'Parse & Ingest Into Ledger'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Instant Pre-loaded Samples for Validation */}
        <div className="p-6 rounded-2xl bg-[#072b27] border border-[#134e48] shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#F0EDE4] uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#F0EDE4]" />
            <span>Interactive Sample Statements</span>
          </div>
          <p className="text-xs text-[#a2b8b5]">
            Click to load realistic commercial bank statements for instant test ingestion:
          </p>

          <div className="space-y-2.5">
            <button
              onClick={() => handleLoadSampleStatement('HDFC')}
              className="w-full p-3 rounded-xl bg-[#031d1a] hover:bg-[#0c3a35] border border-[#134e48] text-left transition-colors flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-blue-300">HDFC Bank Operating Feed</span>
                <p className="text-[11px] text-[#a2b8b5]">Includes customer receipts + Sister intra-group transfer</p>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#004741] text-[#F0EDE4] border border-[#134e48]">
                Load
              </span>
            </button>

            <button
              onClick={() => handleLoadSampleStatement('ICICI')}
              className="w-full p-3 rounded-xl bg-[#031d1a] hover:bg-[#0c3a35] border border-[#134e48] text-left transition-colors flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-orange-300">ICICI Bank Logistics Counterpart</span>
                <p className="text-[11px] text-[#a2b8b5]">Matching ₹1,20,000 contra credit + fuel expense</p>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#004741] text-[#F0EDE4] border border-[#134e48]">
                Load
              </span>
            </button>

            <button
              onClick={() => handleLoadSampleStatement('SBI')}
              className="w-full p-3 rounded-xl bg-[#031d1a] hover:bg-[#0c3a35] border border-[#134e48] text-left transition-colors flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-sky-300">State Bank of India (SBI)</span>
                <p className="text-[11px] text-[#a2b8b5]">GST statutory challan + interest credits</p>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#004741] text-[#F0EDE4] border border-[#134e48]">
                Load
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Successful Ingestion Report */}
      {uploadResult && (
        <div className="p-6 rounded-2xl bg-[#072b27] border border-[#134e48] shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#0e3a34] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#004741] text-emerald-400 flex items-center justify-center border border-[#134e48]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F0EDE4]">
                  Statement Successfully Ingested & Verified
                </h3>
                <p className="text-xs text-[#a2b8b5]">
                  Target Account: {uploadResult.bank_name} • File: {uploadResult.filename}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-[#031d1a] border border-[#134e48]">
                <span className="text-[#a2b8b5]">Ingested: </span>
                <span className="font-bold text-[#F0EDE4] font-mono">{uploadResult.ingested_count} rows</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[#004741] border border-[#134e48] text-[#F0EDE4]">
                <span>Contra Auto-Paired: </span>
                <span className="font-bold font-mono">{uploadResult.contra_paired_count}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[#031d1a] border border-[#134e48]">
                <span className="text-[#a2b8b5]">New Cleared Balance: </span>
                <CurrencyDisplay amount={uploadResult.latest_cleared_balance} size="md" colored={true} />
              </div>
            </div>
          </div>

          {/* Preview Lines */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-[#a2b8b5] uppercase tracking-wider">
              Ingestion Extraction Sample:
            </h4>
            <div className="overflow-x-auto rounded-xl border border-[#0e3a34]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#05221e] text-[#a2b8b5] uppercase font-semibold border-b border-[#0e3a34]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3">Narration</th>
                    <th className="py-2.5 px-3 text-right">Debit</th>
                    <th className="py-2.5 px-3 text-right">Credit</th>
                    <th className="py-2.5 px-3 text-right">Running Balance</th>
                    <th className="py-2.5 px-3">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0e3a34]">
                  {uploadResult.preview.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#0a3832]">
                      <td className="py-2.5 px-3 font-mono text-[#a2b8b5]">{row.date}</td>
                      <td className="py-2.5 px-3 font-mono text-[#F0EDE4] text-[11px]">{row.ref}</td>
                      <td className="py-2.5 px-3 max-w-xs truncate text-[#F0EDE4]">{row.narration}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-400 font-semibold">
                        {row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-semibold">
                        {row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#F0EDE4] font-bold">
                        ₹{row.running_balance.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#031d1a] text-[#F0EDE4] border border-[#134e48]">
                          {row.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

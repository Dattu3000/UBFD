import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Landmark,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Plus,
  Building2,
  Smartphone,
  ArrowRight,
  Sparkles,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { LegalEntity, BankConsent, BankCode, FacilityType } from '@/types/finance';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';

interface LiveBankConnectPageProps {
  entities: LegalEntity[];
}

const INDIAN_BANKS: { code: BankCode; name: string; color: string }[] = [
  { code: 'HDFC', name: 'HDFC Bank', color: 'from-blue-600 to-blue-800' },
  { code: 'ICICI', name: 'ICICI Bank', color: 'from-orange-600 to-orange-800' },
  { code: 'SBI', name: 'State Bank of India', color: 'from-sky-600 to-sky-800' },
  { code: 'AXIS', name: 'Axis Bank', color: 'from-rose-600 to-rose-800' },
  { code: 'KOTAK', name: 'Kotak Mahindra Bank', color: 'from-red-600 to-red-800' },
  { code: 'BOB', name: 'Bank of Baroda', color: 'from-amber-600 to-amber-800' },
];

export const LiveBankConnectPage: React.FC<LiveBankConnectPageProps> = ({ entities }) => {
  const queryClient = useQueryClient();

  // Active Consents Query
  const { data: consents = [], isLoading } = useQuery<BankConsent[]>({
    queryKey: ['aa-consents'],
    queryFn: () => api.get<BankConsent[]>('/aa/consents'),
  });

  // Modal States
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showDirectModal, setShowDirectModal] = useState(false);

  // Consent Wizard Form State
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [selectedEntityId, setSelectedEntityId] = useState<string>(
    entities.length > 0 ? entities[0].id : ''
  );
  const [mobileNumber, setMobileNumber] = useState<string>('9876543210');
  const [selectedBankCodes, setSelectedBankCodes] = useState<string[]>(['HDFC', 'ICICI']);
  const [durationYears, setDurationYears] = useState<number>(3);
  const [activeConsentHandle, setActiveConsentHandle] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState<string>('123456');

  // Custom Actual Account Fields (Optional)
  const [specifyCustomAccount, setSpecifyCustomAccount] = useState<boolean>(true);
  const [customBankCode, setCustomBankCode] = useState<string>('HDFC');
  const [customAccountNumber, setCustomAccountNumber] = useState<string>('50200098765432');
  const [customIfsc, setCustomIfsc] = useState<string>('HDFC0000240');
  const [customAccountType, setCustomAccountType] = useState<FacilityType>('CURRENT');
  const [customOpeningBal, setCustomOpeningBal] = useState<string>('850000.00');

  // Status Banners
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Direct Account Form State
  const [directEntityId, setDirectEntityId] = useState<string>(
    entities.length > 0 ? entities[0].id : ''
  );
  const [directBankName, setDirectBankName] = useState<string>('HDFC Bank');
  const [directBankCode, setDirectBankCode] = useState<string>('HDFC');
  const [directAccNumber, setDirectAccNumber] = useState<string>('');
  const [directIfsc, setDirectIfsc] = useState<string>('HDFC0000240');
  const [directType, setDirectType] = useState<FacilityType>('CURRENT');
  const [directBalance, setDirectBalance] = useState<string>('500000.00');

  // 1. Initiate Consent Mutation
  const initiateMutation = useMutation({
    mutationFn: (data: any) => api.post<any>('/aa/consent/initiate', data),
    onSuccess: (data) => {
      setActiveConsentHandle(data.consent_handle);
      setWizardStep(2);
      setErrorBanner(null);
    },
    onError: (err: any) => {
      setErrorBanner(err.message || 'Failed to initiate consent');
    },
  });

  // 2. Verify OTP Mutation
  const verifyMutation = useMutation({
    mutationFn: (data: any) => api.post<any>('/aa/consent/verify-otp', data),
    onSuccess: (data) => {
      setShowConsentModal(false);
      setWizardStep(1);
      setSuccessBanner(
        `3-Year Background Consent Activated! Linked ${data.accounts_linked?.length || 0} commercial accounts. 0 daily OTPs needed.`
      );
      setErrorBanner(null);
      queryClient.invalidateQueries({ queryKey: ['aa-consents'] });
      queryClient.invalidateQueries({ queryKey: ['group-liquidity'] });
      queryClient.invalidateQueries({ queryKey: ['daily-ledger'] });
    },
    onError: (err: any) => {
      setErrorBanner(err.message || 'Invalid OTP code');
    },
  });

  // 3. Sync Accounts Mutation
  const syncMutation = useMutation({
    mutationFn: (consentId: string) => api.post<any>(`/aa/sync/${consentId}`),
    onSuccess: (data) => {
      setSuccessBanner(
        `Automated Sync Complete: Pulled live delta for ${data.accounts_synced} accounts with 0 OTP friction. Real-time ledger updated.`
      );
      queryClient.invalidateQueries({ queryKey: ['aa-consents'] });
      queryClient.invalidateQueries({ queryKey: ['group-liquidity'] });
      queryClient.invalidateQueries({ queryKey: ['daily-ledger'] });
    },
    onError: (err: any) => {
      setErrorBanner(err.message || 'Sync failed');
    },
  });

  // 4. Direct Account Mutation
  const directAccountMutation = useMutation({
    mutationFn: (data: any) => api.post<any>('/aa/accounts/add-direct', data),
    onSuccess: (data) => {
      setShowDirectModal(false);
      setSuccessBanner(
        `Live Bank Account ${data.account_number_mask} (${data.bank_name}) successfully linked.`
      );
      queryClient.invalidateQueries({ queryKey: ['aa-consents'] });
      queryClient.invalidateQueries({ queryKey: ['group-liquidity'] });
    },
    onError: (err: any) => {
      setErrorBanner(err.message || 'Failed to add bank account');
    },
  });

  const toggleBankSelection = (bankCode: string) => {
    if (selectedBankCodes.includes(bankCode)) {
      if (selectedBankCodes.length > 1) {
        setSelectedBankCodes(selectedBankCodes.filter((b) => b !== bankCode));
      }
    } else {
      setSelectedBankCodes([...selectedBankCodes, bankCode]);
    }
  };

  const handleStartConsent = () => {
    initiateMutation.mutate({
      entity_id: selectedEntityId,
      mobile_number: mobileNumber,
      bank_codes: selectedBankCodes,
      duration_years: durationYears,
    });
  };

  const handleVerifyOtp = () => {
    if (!activeConsentHandle) return;

    const declaredAccounts = specifyCustomAccount
      ? [
          {
            bank_code: customBankCode,
            bank_name: `${customBankCode} Bank`,
            account_number: customAccountNumber,
            ifsc_code: customIfsc,
            account_type: customAccountType,
            opening_balance: parseFloat(customOpeningBal) || 0,
          },
        ]
      : undefined;

    verifyMutation.mutate({
      consent_handle: activeConsentHandle,
      otp: otpCode,
      declared_accounts: declaredAccounts,
    });
  };

  const handleAddDirect = () => {
    directAccountMutation.mutate({
      entity_id: directEntityId,
      bank_name: directBankName,
      bank_code: directBankCode,
      account_number: directAccNumber,
      ifsc_code: directIfsc,
      account_type: directType,
      opening_balance: parseFloat(directBalance) || 0,
    });
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header & Architecture Badge */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-brand-400" />
              Live Bank Connect
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
              RBI Account Aggregator Rail
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated multi-bank daily transaction fetching with <strong>1-time OTP setup valid for 3 years</strong> (0 daily OTP friction)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDirectModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111927] hover:bg-[#192437] border border-[#212f45] text-slate-200 text-xs font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account Number Directly</span>
          </button>

          <button
            onClick={() => {
              setWizardStep(1);
              setShowConsentModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-brand-500/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Connect via RBI AA (3-Year Consent)</span>
          </button>
        </div>
      </div>

      {/* Compliance / Architecture Banner */}
      <div className="p-4 rounded-2xl bg-[#0c1424] border border-[#1b2840] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-200">RBI Master Directions Compliant (NBFC-AA Framework)</p>
            <p className="text-slate-400 text-[11px]">
              Periodic background pull authorization allows UBFD to sync intraday bank statements multiple times a day without bothering customers for OTPs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 shrink-0 font-mono text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Gateway: ReBIT FIU Standard • Valid 2-3 Years</span>
        </div>
      </div>

      {/* Feedback Messages */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-400 hover:text-emerald-200">
            ✕
          </button>
        </div>
      )}

      {errorBanner && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="text-rose-400 hover:text-rose-200">
            ✕
          </button>
        </div>
      )}

      {/* Active Consents & Connected Accounts Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-brand-400" />
            Active 3-Year Bank Consents ({consents.length})
          </h3>
          <span className="text-xs text-slate-400">Automated Background Engine</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs bg-[#0e1626] rounded-2xl border border-[#1a253a]">
            Loading active bank consents...
          </div>
        ) : consents.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[#0e1626] border border-[#1a253a] text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200">No Live Bank Consents Linked Yet</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Link your commercial bank accounts via the 3-Year RBI Account Aggregator flow, or add your account numbers directly.
              </p>
            </div>
            <button
              onClick={() => {
                setWizardStep(1);
                setShowConsentModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
            >
              Start 1-Time Setup
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {consents.map((consent) => (
              <div
                key={consent.id}
                className="p-6 rounded-2xl bg-[#0e1626] border border-[#1c2940] shadow-xl space-y-5"
              >
                {/* Consent Metadata Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b273d] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100">{consent.entity_name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                          3-Year Consent Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">
                        Linked Mobile: <span className="text-slate-200">+91 {consent.mobile_number}</span> • Valid until: <span className="text-brand-300">{consent.valid_until}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => syncMutation.mutate(consent.id)}
                      disabled={syncMutation.isPending}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141f33] hover:bg-[#1a2944] border border-[#223350] text-slate-200 text-xs font-semibold transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin text-brand-400' : ''}`} />
                      <span>{syncMutation.isPending ? 'Pulling Bank Data...' : 'Sync Now (0 OTP)'}</span>
                    </button>
                  </div>
                </div>

                {/* Linked Accounts Roster */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-semibold">
                    <span>Discovered Commercial Accounts ({consent.accounts.length})</span>
                    <span>Cleared Position</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {consent.accounts.map((acc) => (
                      <div
                        key={acc.account_id}
                        className="p-4 rounded-xl bg-[#121c2e] border border-[#1f2d45] flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-200">{acc.bank_name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                              {acc.account_type}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-slate-400 mt-0.5">{acc.account_number_mask}</p>
                          <p className="text-[11px] text-slate-500 font-mono">IFSC: {acc.ifsc_code}</p>
                        </div>

                        <div className="text-right">
                          <CurrencyDisplay amount={acc.current_cleared_balance} size="md" colored={true} />
                          <span className="text-[10px] text-emerald-400 font-medium">● Live Feed</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: Connect via RBI Account Aggregator Wizard */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-[#0f172a] border border-[#1e2a42] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1e2a42] pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-brand-400" />
                <h3 className="text-base font-bold text-slate-100">
                  {wizardStep === 1 ? 'Step 1: 3-Year Live Bank Consent' : 'Step 2: Enter 1-Time Verification OTP'}
                </h3>
              </div>
              <button
                onClick={() => setShowConsentModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {wizardStep === 1 ? (
              <div className="space-y-4">
                {/* Entity Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Select Legal Entity:
                  </label>
                  <select
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    className="w-full bg-[#131d31] border border-[#21304a] rounded-xl px-4 py-2.5 text-xs font-bold text-slate-200"
                  >
                    {entities.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.name} ({ent.entity_type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Mobile Number Linked to Bank Accounts:
                  </label>
                  <div className="flex items-center bg-[#131d31] border border-[#21304a] rounded-xl px-3 py-2">
                    <span className="text-xs font-mono text-slate-400 mr-2">+91</span>
                    <input
                      type="text"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="bg-transparent text-xs font-mono text-slate-200 w-full focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Different entities can use their own respective registered mobile numbers.
                  </p>
                </div>

                {/* Bank Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Select Commercial Banks to Authorize:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {INDIAN_BANKS.map((b) => {
                      const isSelected = selectedBankCodes.includes(b.code);
                      return (
                        <button
                          key={b.code}
                          type="button"
                          onClick={() => toggleBankSelection(b.code)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                            isSelected
                              ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                              : 'bg-[#131d31] border-[#21304a] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{b.code}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />}
                          </div>
                          <span className="text-[10px] font-normal block truncate mt-0.5">{b.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Consent Duration Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Consent Validity Duration:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setDurationYears(yr)}
                        className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                          durationYears === yr
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-[#131d31] border-[#21304a] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {yr} Year{yr > 1 ? 's' : ''} {yr === 3 ? '(Recommended)' : ''}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-emerald-400 mt-1">
                    ✓ Authorizes 24/7 background sync. Customers are <strong>never</strong> prompted for daily OTPs.
                  </p>
                </div>

                {/* Optional Custom Account Declaration */}
                <div className="pt-2 border-t border-[#1e2a42]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={specifyCustomAccount}
                        onChange={(e) => setSpecifyCustomAccount(e.target.checked)}
                        className="rounded border-[#21304a] bg-[#131d31] text-brand-500 focus:ring-0"
                      />
                      <span>Declare Exact Account Number to Link</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Optional</span>
                  </div>

                  {specifyCustomAccount && (
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#131d31] border border-[#21304a]">
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-1">Bank</label>
                        <select
                          value={customBankCode}
                          onChange={(e) => setCustomBankCode(e.target.value)}
                          className="w-full bg-[#18243b] border border-[#243552] rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                        >
                          {INDIAN_BANKS.map((b) => (
                            <option key={b.code} value={b.code}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-1">Account Type</label>
                        <select
                          value={customAccountType}
                          onChange={(e) => setCustomAccountType(e.target.value as FacilityType)}
                          className="w-full bg-[#18243b] border border-[#243552] rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                        >
                          <option value="CURRENT">Current Account</option>
                          <option value="OVERDRAFT">Overdraft (OD)</option>
                          <option value="CASH_CREDIT">Cash Credit (CC)</option>
                          <option value="SAVINGS">Savings Account</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                          Actual Bank Account Number
                        </label>
                        <input
                          type="text"
                          value={customAccountNumber}
                          onChange={(e) => setCustomAccountNumber(e.target.value)}
                          placeholder="e.g. 50200098765432"
                          className="w-full bg-[#18243b] border border-[#243552] rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-1">IFSC Code</label>
                        <input
                          type="text"
                          value={customIfsc}
                          onChange={(e) => setCustomIfsc(e.target.value)}
                          placeholder="e.g. HDFC0000240"
                          className="w-full bg-[#18243b] border border-[#243552] rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-1">Opening Balance</label>
                        <input
                          type="number"
                          value={customOpeningBal}
                          onChange={(e) => setCustomOpeningBal(e.target.value)}
                          className="w-full bg-[#18243b] border border-[#243552] rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowConsentModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStartConsent}
                    disabled={initiateMutation.isPending || !mobileNumber}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-500/20 disabled:opacity-50"
                  >
                    <span>{initiateMutation.isPending ? 'Generating Consent Handle...' : 'Send 1-Time OTP'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#131d31] border border-[#21304a] text-center space-y-2">
                  <Smartphone className="w-8 h-8 text-brand-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-200">Enter One-Time Verification OTP</h4>
                  <p className="text-xs text-slate-400">
                    OTP sent to registered mobile <span className="text-slate-200 font-mono">+91 {mobileNumber}</span>
                  </p>
                  <div className="inline-flex px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 font-mono text-[11px]">
                    Sandbox Demo Code: <strong>123456</strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 text-center">
                    6-Digit Verification Code:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-48 mx-auto block text-center tracking-[0.5em] text-lg font-mono font-bold bg-[#131d31] border-2 border-brand-500/50 rounded-xl py-2.5 text-slate-100 focus:outline-none focus:border-brand-400"
                  />
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/50 text-[11px] text-emerald-300 text-center">
                  🔒 Approves <strong>3 Years</strong> of recurring automated data sync. No daily OTPs required.
                </div>

                <div className="flex items-center justify-between pt-3">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="text-xs text-slate-400 hover:text-slate-200 font-semibold"
                  >
                    ← Back to parameters
                  </button>

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={verifyMutation.isPending || otpCode.length !== 6}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    <span>{verifyMutation.isPending ? 'Activating 3-Year Token...' : 'Verify & Activate'}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Add Actual Account Number Directly */}
      {showDirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0f172a] border border-[#1e2a42] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#1e2a42] pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-400" />
                Add Actual Bank Account Directly
              </h3>
              <button
                onClick={() => setShowDirectModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Legal Entity</label>
                <select
                  value={directEntityId}
                  onChange={(e) => setDirectEntityId(e.target.value)}
                  className="w-full bg-[#131d31] border border-[#21304a] rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  {entities.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Bank</label>
                  <select
                    value={directBankCode}
                    onChange={(e) => {
                      setDirectBankCode(e.target.value);
                      const b = INDIAN_BANKS.find((x) => x.code === e.target.value);
                      if (b) setDirectBankName(b.name);
                    }}
                    className="w-full bg-[#131d31] border border-[#21304a] rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    {INDIAN_BANKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Account Type</label>
                  <select
                    value={directType}
                    onChange={(e) => setDirectType(e.target.value as FacilityType)}
                    className="w-full bg-[#131d31] border border-[#21304a] rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="CURRENT">Current Account</option>
                    <option value="OVERDRAFT">Overdraft (OD)</option>
                    <option value="CASH_CREDIT">Cash Credit (CC)</option>
                    <option value="SAVINGS">Savings Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Actual Account Number</label>
                <input
                  type="text"
                  value={directAccNumber}
                  onChange={(e) => setDirectAccNumber(e.target.value)}
                  placeholder="e.g. 109283746519"
                  className="w-full bg-[#131d31] border border-[#21304a] rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={directIfsc}
                    onChange={(e) => setDirectIfsc(e.target.value)}
                    placeholder="e.g. HDFC0000240"
                    className="w-full bg-[#131d31] border border-[#21304a] rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Opening Cleared Balance</label>
                  <input
                    type="number"
                    value={directBalance}
                    onChange={(e) => setDirectBalance(e.target.value)}
                    className="w-full bg-[#131d31] border border-[#21304a] rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDirectModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddDirect}
                  disabled={directAccountMutation.isPending || !directAccNumber}
                  className="px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-500/20 disabled:opacity-50"
                >
                  {directAccountMutation.isPending ? 'Saving...' : 'Add Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

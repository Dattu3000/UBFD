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

const INDIAN_BANKS: { code: BankCode; name: string; color: string; defaultIfsc: string }[] = [
  { code: 'HDFC', name: 'HDFC Bank', color: 'from-blue-600 to-blue-800', defaultIfsc: 'HDFC0000240' },
  { code: 'ICICI', name: 'ICICI Bank', color: 'from-orange-600 to-orange-800', defaultIfsc: 'ICIC0000102' },
  { code: 'SBI', name: 'State Bank of India', color: 'from-sky-600 to-sky-800', defaultIfsc: 'SBIN0000301' },
  { code: 'YESB', name: 'YES Bank', color: 'from-blue-700 to-red-600', defaultIfsc: 'YESB0000001' },
  { code: 'AXIS', name: 'Axis Bank', color: 'from-rose-600 to-rose-800', defaultIfsc: 'UTIB0000004' },
  { code: 'KOTAK', name: 'Kotak Mahindra Bank', color: 'from-red-600 to-red-800', defaultIfsc: 'KKBK0000958' },
  { code: 'INDUSIND', name: 'IndusInd Bank', color: 'from-red-800 to-amber-700', defaultIfsc: 'INDB0000001' },
  { code: 'IDFC', name: 'IDFC FIRST Bank', color: 'from-rose-700 to-rose-900', defaultIfsc: 'IDFB0000001' },
  { code: 'BOB', name: 'Bank of Baroda', color: 'from-amber-600 to-amber-800', defaultIfsc: 'BARB0000001' },
  { code: 'PNB', name: 'Punjab National Bank', color: 'from-yellow-700 to-amber-600', defaultIfsc: 'PUNB0000001' },
  { code: 'CANARA', name: 'Canara Bank', color: 'from-blue-600 to-yellow-500', defaultIfsc: 'CNRB0000001' },
  { code: 'UNION', name: 'Union Bank of India', color: 'from-red-600 to-blue-700', defaultIfsc: 'UBIN0000001' },
  { code: 'FEDERAL', name: 'Federal Bank', color: 'from-blue-800 to-amber-500', defaultIfsc: 'FDRL0000001' },
  { code: 'RBL', name: 'RBL Bank', color: 'from-blue-700 to-sky-500', defaultIfsc: 'RATN0000001' },
  { code: 'BOI', name: 'Bank of India', color: 'from-orange-600 to-sky-700', defaultIfsc: 'BKID0000001' },
  { code: 'CBI', name: 'Central Bank of India', color: 'from-blue-700 to-red-600', defaultIfsc: 'CBIN0000001' },
  { code: 'SCB', name: 'Standard Chartered', color: 'from-emerald-700 to-blue-600', defaultIfsc: 'SCBL0036001' },
  { code: 'HSBC', name: 'HSBC Bank', color: 'from-red-600 to-slate-800', defaultIfsc: 'HSBC0400002' },
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
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [selectedBankCodes, setSelectedBankCodes] = useState<string[]>(['YESB', 'HDFC', 'ICICI']);
  const [durationYears, setDurationYears] = useState<number>(3);
  const [activeConsentHandle, setActiveConsentHandle] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState<string>('');

  // Custom Actual Account Fields (Optional)
  const [specifyCustomAccount, setSpecifyCustomAccount] = useState<boolean>(true);
  const [customBankCode, setCustomBankCode] = useState<string>('YESB');
  const [customAccountNumber, setCustomAccountNumber] = useState<string>('');
  const [customIfsc, setCustomIfsc] = useState<string>('YESB0000001');
  const [customAccountType, setCustomAccountType] = useState<FacilityType>('CURRENT');
  const [customOpeningBal, setCustomOpeningBal] = useState<string>('100000.00');


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

  const [initiateInfo, setInitiateInfo] = useState<{
    sms_delivered?: boolean;
    sms_provider?: string;
    message?: string;
    active_code?: string;
  } | null>(null);

  // 1. Initiate Consent Mutation
  const initiateMutation = useMutation({
    mutationFn: (data: any) => api.post<any>('/aa/consent/initiate', data),
    onSuccess: (data) => {
      setActiveConsentHandle(data.consent_handle);
      setInitiateInfo(data);
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
            <h2 className="text-xl font-bold text-[#F0EDE4] flex items-center gap-2">
              <Landmark className="w-5 h-5 text-[#F0EDE4]" />
              Live Bank Connect
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#004741] text-[#F0EDE4] border border-[#134e48]">
              RBI Account Aggregator Rail
            </span>
          </div>
          <p className="text-xs text-[#a2b8b5] mt-1">
            Automated multi-bank daily transaction fetching with <strong className="text-[#F0EDE4]">1-time OTP setup valid for 3 years</strong> (0 daily OTP friction)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDirectModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#072b27] hover:bg-[#0c3a35] border border-[#134e48] text-[#F0EDE4] text-xs font-semibold transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account Number Directly</span>
          </button>

          <button
            onClick={() => {
              setWizardStep(1);
              setShowConsentModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F0EDE4] hover:bg-[#e4dfd3] text-[#004741] text-xs font-bold shadow-lg shadow-[#004741]/30 transition-all"
          >
            <Sparkles className="w-4 h-4 text-[#004741]" />
            <span>Connect via RBI AA (3-Year Consent)</span>
          </button>
        </div>
      </div>

      {/* Compliance / Architecture Banner */}
      <div className="p-4 rounded-2xl bg-[#072b27] border border-[#134e48] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#004741] text-[#F0EDE4] flex items-center justify-center shrink-0 border border-[#134e48]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-[#F0EDE4]">RBI Master Directions Compliant (NBFC-AA Framework)</p>
            <p className="text-[#a2b8b5] text-[11px]">
              Periodic background pull authorization allows UBFD to sync intraday bank statements multiple times a day without bothering customers for OTPs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[#a2b8b5] shrink-0 font-mono text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Gateway: ReBIT FIU Standard • Valid 2-3 Years</span>
        </div>
      </div>

      {/* Feedback Messages */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-[#004741]/40 border border-[#134e48] text-[#F0EDE4] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-[#a2b8b5] hover:text-[#F0EDE4]">
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
          <h3 className="text-xs font-bold text-[#F0EDE4] uppercase tracking-wider flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[#F0EDE4]" />
            Active 3-Year Bank Consents ({consents.length})
          </h3>
          <span className="text-xs text-[#a2b8b5]">Automated Background Engine</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-[#a2b8b5] text-xs bg-[#072b27] rounded-2xl border border-[#134e48]">
            Loading active bank consents...
          </div>
        ) : consents.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[#072b27] border border-[#134e48] text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#004741] text-[#F0EDE4] flex items-center justify-center mx-auto border border-[#134e48]">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#F0EDE4]">No Live Bank Consents Linked Yet</h4>
              <p className="text-xs text-[#a2b8b5] max-w-md mx-auto mt-1">
                Link your commercial bank accounts via the 3-Year RBI Account Aggregator flow, or add your account numbers directly.
              </p>
            </div>
            <button
              onClick={() => {
                setWizardStep(1);
                setShowConsentModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#F0EDE4] hover:bg-[#e4dfd3] text-[#004741] text-xs font-bold shadow-md"
            >
              Start 1-Time Setup
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {consents.map((consent) => (
              <div
                key={consent.id}
                className="p-6 rounded-2xl bg-[#072b27] border border-[#134e48] shadow-xl space-y-5"
              >
                {/* Consent Metadata Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#0e3a34] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#004741] text-[#F0EDE4] flex items-center justify-center border border-[#134e48]">
                      <ShieldCheck className="w-5 h-5 text-emerald-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#F0EDE4]">{consent.entity_name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#004741] text-[#F0EDE4] border border-[#134e48] uppercase">
                          3-Year Consent Active
                        </span>
                      </div>
                      <p className="text-xs text-[#a2b8b5] mt-0.5 font-mono">
                        Linked Mobile: <span className="text-[#F0EDE4]">+91 {consent.mobile_number}</span> • Valid until: <span className="text-[#F0EDE4]">{consent.valid_until}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => syncMutation.mutate(consent.id)}
                      disabled={syncMutation.isPending}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#004741] hover:bg-[#065b53] border border-[#134e48] text-[#F0EDE4] text-xs font-semibold transition-all shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin text-[#F0EDE4]' : ''}`} />
                      <span>{syncMutation.isPending ? 'Pulling Bank Data...' : 'Sync Now (0 OTP)'}</span>
                    </button>
                  </div>
                </div>

                {/* Linked Accounts Roster */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#a2b8b5] uppercase font-semibold">
                    <span>Discovered Commercial Accounts ({consent.accounts.length})</span>
                    <span>Cleared Position</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {consent.accounts.map((acc) => (
                      <div
                        key={acc.account_id}
                        className="p-4 rounded-xl bg-[#031d1a] border border-[#134e48] flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#F0EDE4]">{acc.bank_name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#072b27] text-[#a2b8b5] font-mono border border-[#134e48]">
                              {acc.account_type}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-[#a2b8b5] mt-0.5">{acc.account_number_mask}</p>
                          <p className="text-[11px] text-[#a2b8b5]/60 font-mono">IFSC: {acc.ifsc_code}</p>
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
          <div className="w-full max-w-xl rounded-2xl bg-[#072b27] border border-[#134e48] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#0e3a34] pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#F0EDE4]" />
                <h3 className="text-base font-bold text-[#F0EDE4]">
                  {wizardStep === 1 ? 'Step 1: 3-Year Live Bank Consent' : 'Step 2: Enter 1-Time Verification OTP'}
                </h3>
              </div>
              <button
                onClick={() => setShowConsentModal(false)}
                className="text-[#a2b8b5] hover:text-[#F0EDE4] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {wizardStep === 1 ? (
              <div className="space-y-4">
                {/* Entity Selector */}
                <div>
                  <label className="block text-xs font-semibold text-[#a2b8b5] uppercase tracking-wider mb-1.5">
                    Select Legal Entity:
                  </label>
                  <select
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl px-4 py-2.5 text-xs font-bold text-[#F0EDE4]"
                  >
                    {entities.map((ent) => (
                      <option key={ent.id} value={ent.id} className="bg-[#072b27] text-[#F0EDE4]">
                        {ent.name} ({ent.entity_type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold text-[#a2b8b5] uppercase tracking-wider mb-1.5">
                    Mobile Number Linked to Bank Accounts:
                  </label>
                  <div className="flex items-center bg-[#031d1a] border border-[#134e48] rounded-xl px-3 py-2">
                    <span className="text-xs font-mono text-[#a2b8b5] mr-2">+91</span>
                    <input
                      type="text"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="bg-transparent text-xs font-mono text-[#F0EDE4] w-full focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-[#a2b8b5] mt-1">
                    Different entities can use their own respective registered mobile numbers.
                  </p>
                </div>

                {/* Bank Selection */}
                <div>
                  <label className="block text-xs font-semibold text-[#a2b8b5] uppercase tracking-wider mb-1.5">
                    Select Commercial Banks to Authorize ({INDIAN_BANKS.length} Integrated):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                    {INDIAN_BANKS.map((b) => {
                      const isSelected = selectedBankCodes.includes(b.code);
                      return (
                        <button
                          key={b.code}
                          type="button"
                          onClick={() => toggleBankSelection(b.code)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                            isSelected
                              ? 'bg-[#004741] border-[#1b635c] text-[#F0EDE4] shadow-sm'
                              : 'bg-[#031d1a] border-[#134e48] text-[#a2b8b5] hover:text-[#F0EDE4]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{b.code}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#F0EDE4]" />}
                          </div>
                          <span className="text-[10px] font-normal block truncate mt-0.5">{b.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Consent Duration Selection */}
                <div>
                  <label className="block text-xs font-semibold text-[#a2b8b5] uppercase tracking-wider mb-1.5">
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
                            ? 'bg-[#F0EDE4] border-[#F0EDE4] text-[#004741]'
                            : 'bg-[#031d1a] border-[#134e48] text-[#a2b8b5] hover:text-[#F0EDE4]'
                        }`}
                      >
                        {yr} Year{yr > 1 ? 's' : ''} {yr === 3 ? '(Recommended)' : ''}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-emerald-300 mt-1">
                    ✓ Authorizes 24/7 background sync. Customers are <strong>never</strong> prompted for daily OTPs.
                  </p>
                </div>

                {/* Optional Custom Account Declaration */}
                <div className="pt-2 border-t border-[#0e3a34]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-[#F0EDE4] flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={specifyCustomAccount}
                        onChange={(e) => setSpecifyCustomAccount(e.target.checked)}
                        className="rounded border-[#134e48] bg-[#031d1a] text-[#004741] focus:ring-0"
                      />
                      <span>Declare Exact Account Number to Link</span>
                    </label>
                    <span className="text-[10px] text-[#a2b8b5]">Optional</span>
                  </div>

                  {specifyCustomAccount && (
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#031d1a] border border-[#134e48]">
                      <div>
                        <label className="text-[10px] text-[#a2b8b5] font-semibold block mb-1">Bank</label>
                        <select
                          value={customBankCode}
                          onChange={(e) => {
                            setCustomBankCode(e.target.value);
                            const b = INDIAN_BANKS.find((x) => x.code === e.target.value);
                            if (b) setCustomIfsc(b.defaultIfsc);
                          }}
                          className="w-full bg-[#072b27] border border-[#134e48] rounded-lg px-2.5 py-1.5 text-xs text-[#F0EDE4]"
                        >
                          {INDIAN_BANKS.map((b) => (
                            <option key={b.code} value={b.code} className="bg-[#072b27] text-[#F0EDE4]">
                              {b.name} ({b.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-[#a2b8b5] font-semibold block mb-1">Account Type</label>
                        <select
                          value={customAccountType}
                          onChange={(e) => setCustomAccountType(e.target.value as FacilityType)}
                          className="w-full bg-[#072b27] border border-[#134e48] rounded-lg px-2.5 py-1.5 text-xs text-[#F0EDE4]"
                        >
                          <option value="CURRENT">Current Account</option>
                          <option value="OVERDRAFT">Overdraft (OD)</option>
                          <option value="CASH_CREDIT">Cash Credit (CC)</option>
                          <option value="SAVINGS">Savings Account</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-[#a2b8b5] font-semibold block mb-1">
                          Actual Bank Account Number
                        </label>
                        <input
                          type="text"
                          value={customAccountNumber}
                          onChange={(e) => setCustomAccountNumber(e.target.value)}
                          placeholder="e.g. 50200098765432"
                          className="w-full bg-[#072b27] border border-[#134e48] rounded-lg px-3 py-1.5 text-xs font-mono text-[#F0EDE4]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-[#a2b8b5] font-semibold block mb-1">IFSC Code</label>
                        <input
                          type="text"
                          value={customIfsc}
                          onChange={(e) => setCustomIfsc(e.target.value)}
                          placeholder="e.g. HDFC0000240"
                          className="w-full bg-[#072b27] border border-[#134e48] rounded-lg px-3 py-1.5 text-xs font-mono text-[#F0EDE4]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-[#a2b8b5] font-semibold block mb-1">Opening Balance</label>
                        <input
                          type="number"
                          value={customOpeningBal}
                          onChange={(e) => setCustomOpeningBal(e.target.value)}
                          className="w-full bg-[#072b27] border border-[#134e48] rounded-lg px-3 py-1.5 text-xs font-mono text-[#F0EDE4]"
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
                    className="px-4 py-2 rounded-xl bg-[#031d1a] border border-[#134e48] text-[#a2b8b5] text-xs font-semibold hover:text-[#F0EDE4]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStartConsent}
                    disabled={initiateMutation.isPending || !mobileNumber}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#F0EDE4] hover:bg-[#e4dfd3] text-[#004741] text-xs font-bold shadow-lg shadow-[#004741]/20 disabled:opacity-50"
                  >
                    <span>{initiateMutation.isPending ? 'Generating Consent Handle...' : 'Send 1-Time OTP'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#031d1a] border border-[#134e48] text-center space-y-2">
                  <Smartphone className="w-8 h-8 text-[#F0EDE4] mx-auto" />
                  <h4 className="text-sm font-bold text-[#F0EDE4]">Enter One-Time Verification OTP</h4>
                  <p className="text-xs text-[#a2b8b5]">
                    OTP dispatched to registered mobile <span className="text-[#F0EDE4] font-mono font-bold">+91 {mobileNumber}</span>
                  </p>
                  
                  {initiateInfo?.sms_delivered ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Live Cellular SMS Sent via {initiateInfo.sms_provider}</span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-800/60 text-amber-200 text-left text-xs space-y-1.5 mt-2">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Why physical SMS didn't arrive:</span>
                      </div>
                      <p className="text-[11px] text-[#a2b8b5] leading-normal">
                        No external SMS gateway (Fast2SMS / Twilio) API key is configured in your local <code>.env</code> file.
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-[#F0EDE4] font-mono">
                          Active Code: <strong>{initiateInfo?.active_code || '123456'}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setOtpCode(initiateInfo?.active_code || '123456')}
                          className="px-2.5 py-1 rounded-lg bg-[#004741] hover:bg-[#0c3a35] text-[#F0EDE4] border border-[#134e48] font-bold text-[11px] transition-colors"
                        >
                          Auto-fill ({initiateInfo?.active_code || '123456'})
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a2b8b5] uppercase tracking-wider mb-1.5 text-center">
                    6-Digit Verification Code:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    placeholder="• • • • • •"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-56 mx-auto block text-center tracking-[0.4em] text-xl font-mono font-bold bg-[#031d1a] border-2 border-[#134e48] rounded-xl py-2.5 text-[#F0EDE4] focus:outline-none focus:border-[#F0EDE4]"
                  />
                  <div className="flex items-center justify-center gap-3 mt-2 text-[11px]">
                    <span className="text-[#a2b8b5]">Didn't get code?</span>
                    <button
                      type="button"
                      onClick={() => handleStartConsent()}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      Resend SMS
                    </button>
                    <span className="text-[#134e48]">•</span>
                    <button
                      type="button"
                      onClick={() => setOtpCode(initiateInfo?.active_code || '123456')}
                      className="text-[#a2b8b5] hover:text-[#F0EDE4]"
                    >
                      Fill Code ({initiateInfo?.active_code || '123456'})
                    </button>
                  </div>
                </div>


                <div className="p-3 rounded-xl bg-[#004741]/40 border border-[#134e48] text-[11px] text-[#F0EDE4] text-center">
                  🔒 Approves <strong>3 Years</strong> of recurring automated data sync. No daily OTPs required.
                </div>


                <div className="flex items-center justify-between pt-3">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="text-xs text-[#a2b8b5] hover:text-[#F0EDE4] font-semibold"
                  >
                    ← Back to parameters
                  </button>

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={verifyMutation.isPending || otpCode.length !== 6}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#F0EDE4] hover:bg-[#e4dfd3] text-[#004741] text-xs font-bold shadow-lg shadow-[#004741]/20 disabled:opacity-50"
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
          <div className="w-full max-w-lg rounded-2xl bg-[#072b27] border border-[#134e48] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#0e3a34] pb-3">
              <h3 className="text-base font-bold text-[#F0EDE4] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#F0EDE4]" />
                Add Actual Bank Account Directly
              </h3>
              <button
                onClick={() => setShowDirectModal(false)}
                className="text-[#a2b8b5] hover:text-[#F0EDE4] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#a2b8b5] block mb-1">Target Legal Entity</label>
                <select
                  value={directEntityId}
                  onChange={(e) => setDirectEntityId(e.target.value)}
                  className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl px-3 py-2 text-xs text-[#F0EDE4]"
                >
                  {entities.map((ent) => (
                    <option key={ent.id} value={ent.id} className="bg-[#072b27] text-[#F0EDE4]">
                      {ent.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#a2b8b5] block mb-1">Bank</label>
                  <select
                    value={directBankCode}
                    onChange={(e) => {
                      setDirectBankCode(e.target.value);
                      const b = INDIAN_BANKS.find((x) => x.code === e.target.value);
                      if (b) {
                        setDirectBankName(b.name);
                        setDirectIfsc(b.defaultIfsc);
                      }
                    }}
                    className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl px-3 py-2 text-xs text-[#F0EDE4]"
                  >
                    {INDIAN_BANKS.map((b) => (
                      <option key={b.code} value={b.code} className="bg-[#072b27] text-[#F0EDE4]">
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#a2b8b5] block mb-1">Account Type</label>
                  <select
                    value={directType}
                    onChange={(e) => setDirectType(e.target.value as FacilityType)}
                    className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl px-3 py-2 text-xs text-[#F0EDE4]"
                  >
                    <option value="CURRENT">Current Account</option>
                    <option value="OVERDRAFT">Overdraft (OD)</option>
                    <option value="CASH_CREDIT">Cash Credit (CC)</option>
                    <option value="SAVINGS">Savings Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#a2b8b5] block mb-1">Actual Account Number</label>
                <input
                  type="text"
                  value={directAccNumber}
                  onChange={(e) => setDirectAccNumber(e.target.value)}
                  placeholder="e.g. 109283746519"
                  className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl px-3 py-2 text-xs font-mono text-[#F0EDE4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#a2b8b5] block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={directIfsc}
                    onChange={(e) => setDirectIfsc(e.target.value)}
                    placeholder="e.g. HDFC0000240"
                    className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl px-3 py-2 text-xs font-mono text-[#F0EDE4]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#a2b8b5] block mb-1">Opening Cleared Balance</label>
                  <input
                    type="number"
                    value={directBalance}
                    onChange={(e) => setDirectBalance(e.target.value)}
                    className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl px-3 py-2 text-xs font-mono text-[#F0EDE4]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDirectModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#031d1a] border border-[#134e48] text-[#a2b8b5] text-xs font-semibold hover:text-[#F0EDE4]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddDirect}
                  disabled={directAccountMutation.isPending || !directAccNumber}
                  className="px-6 py-2 rounded-xl bg-[#F0EDE4] hover:bg-[#e4dfd3] text-[#004741] text-xs font-bold shadow-lg shadow-[#004741]/20 disabled:opacity-50"
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

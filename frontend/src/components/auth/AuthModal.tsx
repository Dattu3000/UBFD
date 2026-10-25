import React, { useState } from 'react';
import { Mail, Lock, User, Building2, Smartphone, ShieldCheck, ArrowRight, AlertCircle, X, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
}) => {
  const { login, register, loginAsDemo } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please enter both email and password');
        }
        await login(email.trim(), password);
      } else {
        if (!email.trim() || !password.trim() || !fullName.trim()) {
          throw new Error('Full Name, Email, and Password are required');
        }
        await register({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          organizationName: orgName.trim() || undefined,
          mobileNumber: mobileNumber.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await loginAsDemo();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#011a18] border border-[#134e48] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#031d1a] border border-[#134e48] text-[#a2b8b5] hover:text-[#F0EDE4] flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#004741] text-[#F0EDE4] text-xs font-semibold border border-[#134e48]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Bank-Grade Encryption • RBI Compliant</span>
          </div>
          <h2 className="text-xl font-bold text-[#F0EDE4] tracking-tight">
            {mode === 'login' ? 'Sign in with Personal Email' : 'Create Your Treasury Workspace'}
          </h2>
          <p className="text-xs text-[#a2b8b5]">
            {mode === 'login'
              ? 'Access your private company accounts, daily liquidity, and live bank feeds.'
              : 'Set up your dedicated corporate treasury ledger with zero shared demo data.'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#031d1a] border border-[#134e48]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-[#004741] text-[#F0EDE4] shadow-md border border-[#1a665e]'
                : 'text-[#a2b8b5] hover:text-[#F0EDE4]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-[#004741] text-[#F0EDE4] shadow-md border border-[#1a665e]'
                : 'text-[#a2b8b5] hover:text-[#F0EDE4]'
            }`}
          >
            Register Account
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/70 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="text-[11px] font-semibold text-[#a2b8b5] block mb-1">
                Full Legal Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#a2b8b5] absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dattu Sharma"
                  className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#F0EDE4] placeholder-[#557370] focus:outline-none focus:border-[#F0EDE4]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-[#a2b8b5] block mb-1">
              Personal / Corporate Email <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#a2b8b5] absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. founder@yourcompany.com"
                className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#F0EDE4] placeholder-[#557370] focus:outline-none focus:border-[#F0EDE4]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#a2b8b5] block mb-1">
              Password <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#a2b8b5] absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#F0EDE4] placeholder-[#557370] focus:outline-none focus:border-[#F0EDE4]"
              />
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-[#a2b8b5] block mb-1">
                  Company / Organization Name (Optional)
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#a2b8b5] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. My Commercial Treasury Pvt Ltd"
                    className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#F0EDE4] placeholder-[#557370] focus:outline-none focus:border-[#F0EDE4]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#a2b8b5] block mb-1">
                  Registered Mobile Number for Bank AA (Optional)
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-[#a2b8b5] absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="e.g. 7989273914"
                    className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#F0EDE4] placeholder-[#557370] focus:outline-none focus:border-[#F0EDE4]"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-[#F0EDE4] hover:bg-[#e4dfd3] text-[#004741] font-bold text-xs tracking-wide transition-all shadow-lg shadow-[#004741]/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Processing...' : mode === 'login' ? 'Sign In to Dashboard' : 'Create Dedicated Workspace'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fallback */}
        <div className="pt-3 border-t border-[#0d3b36] flex items-center justify-between text-xs">
          <span className="text-[#a2b8b5]">Need a quick test run?</span>
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Demo Treasury</span>
          </button>
        </div>
      </div>
    </div>
  );
};

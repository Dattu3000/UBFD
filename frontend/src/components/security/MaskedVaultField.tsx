import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';

interface MaskedVaultFieldProps {
  value: string | null | undefined;
  type: 'PAN' | 'GSTIN' | 'ACCOUNT' | 'GENERIC';
  className?: string;
  autoRemaskSeconds?: number;
}

export const MaskedVaultField: React.FC<MaskedVaultFieldProps> = ({
  value,
  type,
  className = '',
  autoRemaskSeconds = 10,
}) => {
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(autoRemaskSeconds);
  const [copied, setCopied] = useState<boolean>(false);

  // Auto-remask timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isRevealed) {
      setSecondsRemaining(autoRemaskSeconds);
      timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsRevealed(false);
            return autoRemaskSeconds;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRevealed, autoRemaskSeconds]);

  if (!value) {
    return <span className="text-[#a2b8b5]/50 italic text-xs">Not Available</span>;
  }

  // Derive mask pattern
  const getMaskedValue = (val: string): string => {
    const trimmed = val.trim();
    if (type === 'PAN' && trimmed.length === 10) {
      return `${trimmed.slice(0, 5)}****${trimmed.slice(-1)}`;
    }
    if (type === 'GSTIN' && trimmed.length === 15) {
      return `${trimmed.slice(0, 2)}${trimmed.slice(2, 7)}****${trimmed.slice(-3)}`;
    }
    if (type === 'ACCOUNT' && trimmed.length >= 4) {
      return `•••• •••• ${trimmed.slice(-4)}`;
    }
    if (trimmed.length > 6) {
      return `${trimmed.slice(0, 2)}••••${trimmed.slice(-2)}`;
    }
    return '••••••••';
  };

  const displayValue = isRevealed ? value : getMaskedValue(value);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 font-mono text-xs ${className}`}>
      <span
        className={`px-2 py-0.5 rounded-lg border transition-all ${
          isRevealed
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 shadow-sm'
            : 'bg-[#031d1a] border-[#134e48] text-[#F0EDE4]'
        }`}
      >
        {displayValue}
      </span>

      {/* Reveal Toggle & Countdown Ring */}
      <button
        onClick={() => setIsRevealed(!isRevealed)}
        className="p-1 rounded-md text-[#a2b8b5] hover:text-[#F0EDE4] hover:bg-[#072b27] transition-colors relative"
        title={isRevealed ? 'Mask field immediately' : `Reveal decrypted value (${autoRemaskSeconds}s timer)`}
      >
        {isRevealed ? (
          <div className="flex items-center gap-1">
            <EyeOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 font-mono leading-none">
              {secondsRemaining}s
            </span>
          </div>
        ) : (
          <Eye className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="p-1 rounded-md text-[#a2b8b5] hover:text-[#F0EDE4] hover:bg-[#072b27] transition-colors"
        title="Copy decrypted value"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
};

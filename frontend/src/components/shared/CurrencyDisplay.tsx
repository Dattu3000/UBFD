import React from 'react';
import { formatINR, formatIndianCompact } from '@/lib/formatters';

interface CurrencyDisplayProps {
  amount: number | string | undefined | null;
  compact?: boolean;
  colored?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showDecimals?: boolean;
  className?: string;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  compact = false,
  colored = false,
  size = 'md',
  showDecimals = true,
  className = '',
}) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const formatted = compact ? formatIndianCompact(num) : formatINR(num, showDecimals);

  let colorClass = 'text-[#F0EDE4]';
  if (colored) {
    if (num > 0) {
      colorClass = 'text-emerald-400 font-semibold';
    } else if (num < 0) {
      colorClass = 'text-rose-400 font-semibold';
    } else {
      colorClass = 'text-[#a2b8b5]';
    }
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm font-medium',
    lg: 'text-base font-semibold',
    xl: 'text-xl font-bold tracking-tight',
    '2xl': 'text-2xl lg:text-3xl font-extrabold tracking-tight',
  };

  return (
    <span className={`font-mono inline-flex items-baseline ${sizeClasses[size]} ${colorClass} ${className}`}>
      {formatted}
    </span>
  );
};

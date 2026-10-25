import React from 'react';
import { ArrowLeftRight } from 'lucide-react';

interface ContraBadgeProps {
  pairId?: string;
  className?: string;
}

export const ContraBadge: React.FC<ContraBadgeProps> = ({
  pairId,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-contra-DEFAULT/20 text-contra-light border border-contra-DEFAULT/40 shadow-sm ${className}`}
      title={pairId ? `Inter-Company Contra Match (Pair ID: ${pairId}) - Excluded from gross group revenue` : 'Inter-Company Contra Flow'}
    >
      <ArrowLeftRight className="w-3 h-3 text-contra-DEFAULT" />
      <span>CONTRA (GST SCH-I)</span>
    </span>
  );
};

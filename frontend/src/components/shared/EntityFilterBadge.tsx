import React from 'react';
import { LegalEntityType } from '@/types/finance';

interface EntityFilterBadgeProps {
  type: LegalEntityType | string;
  name?: string;
  className?: string;
}

export const EntityFilterBadge: React.FC<EntityFilterBadgeProps> = ({
  type,
  name,
  className = '',
}) => {
  const styles: Record<string, { label: string; badgeClass: string }> = {
    PVT_LTD: {
      label: 'Pvt Ltd',
      badgeClass: 'bg-indigo-950/70 text-indigo-300 border-indigo-800/60',
    },
    LLP: {
      label: 'LLP',
      badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60',
    },
    PROPRIETORSHIP: {
      label: 'Proprietorship',
      badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-800/60',
    },
    PARTNERSHIP: {
      label: 'Partnership',
      badgeClass: 'bg-purple-950/70 text-purple-300 border-purple-800/60',
    },
  };

  const current = styles[type] || {
    label: type,
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${current.badgeClass} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {name ? `${name} (${current.label})` : current.label}
    </span>
  );
};

import React from 'react';
import { RefreshCw, Calendar, Building2 } from 'lucide-react';
import { LegalEntity } from '@/types/finance';

interface HeaderProps {
  title: string;
  subtitle: string;
  entities?: LegalEntity[];
  selectedEntityId?: string | null;
  onSelectEntity?: (entityId: string | null) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  entities = [],
  selectedEntityId = null,
  onSelectEntity,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <header className="h-16 px-8 border-b border-[#1a2333] bg-[#090d16]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          {title}
        </h1>
        <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Entity Selector Switcher */}
        {entities.length > 0 && onSelectEntity && (
          <div className="flex items-center gap-2 bg-[#101827] border border-[#1f2d42] px-3 py-1.5 rounded-xl">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedEntityId || ''}
              onChange={(e) => onSelectEntity(e.target.value ? e.target.value : null)}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-[#101827] text-slate-200">
                All Legal Entities ({entities.length})
              </option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id} className="bg-[#101827] text-slate-200">
                  {ent.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date context pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#101827] border border-[#1f2d42] text-xs font-medium text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-brand-400" />
          <span>FY 2026-27</span>
        </div>

        {/* Sync / Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#101827] hover:bg-[#1a273b] border border-[#1f2d42] text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
            title="Re-sync cleared balances"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>
    </header>
  );
};

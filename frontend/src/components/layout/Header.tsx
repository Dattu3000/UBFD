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
    <header className="h-16 px-8 border-b border-[#0d3b36] bg-[#031a18]/85 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-bold text-[#F0EDE4] flex items-center gap-2">
          {title}
        </h1>
        <p className="text-xs text-[#a2b8b5] font-medium">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Entity Selector Switcher */}
        {entities.length > 0 && onSelectEntity && (
          <div className="flex items-center gap-2 bg-[#072b27] border border-[#134e48] px-3 py-1.5 rounded-xl shadow-inner">
            <Building2 className="w-3.5 h-3.5 text-[#a2b8b5]" />
            <select
              value={selectedEntityId || ''}
              onChange={(e) => onSelectEntity(e.target.value ? e.target.value : null)}
              className="bg-transparent text-xs font-semibold text-[#F0EDE4] focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-[#072b27] text-[#F0EDE4]">
                All Legal Entities ({entities.length})
              </option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id} className="bg-[#072b27] text-[#F0EDE4]">
                  {ent.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date context pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#072b27] border border-[#134e48] text-xs font-medium text-[#F0EDE4]">
          <Calendar className="w-3.5 h-3.5 text-[#a2b8b5]" />
          <span>FY 2026-27</span>
        </div>

        {/* Sync / Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#072b27] hover:bg-[#0c3a35] border border-[#134e48] text-xs font-medium text-[#F0EDE4] transition-colors disabled:opacity-50"
            title="Re-sync cleared balances"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#F0EDE4]' : 'text-[#a2b8b5]'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>
    </header>
  );
};

import React from 'react';
import { RefreshCw, Building2, Plus, LogIn, UserCircle, LogOut } from 'lucide-react';
import { LegalEntity } from '@/types/finance';

import { useAuth } from '@/lib/auth-context';
import { AuditChainBadge } from '@/components/security/AuditChainBadge';

interface HeaderProps {
  title: string;
  subtitle: string;
  entities?: LegalEntity[];
  selectedEntityId?: string | null;
  onSelectEntity?: (entityId: string | null) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onOpenAuthModal?: () => void;
  onOpenAddEntity?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  entities = [],
  selectedEntityId = null,
  onSelectEntity,
  onRefresh,
  isRefreshing = false,
  onOpenAuthModal,
  onOpenAddEntity,
}) => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="h-16 px-8 border-b border-[#0d3b36] bg-[#031a18]/85 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-bold text-[#F0EDE4] flex items-center gap-2">
          {title}
        </h1>
        <p className="text-xs text-[#a2b8b5] font-medium">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* MCA Rule 3(1) Cryptographic Integrity Badge */}
        <AuditChainBadge />

        {/* Entity Selector & Add Entity */}
        <div className="flex items-center gap-1.5 bg-[#072b27] border border-[#134e48] px-2.5 py-1.5 rounded-xl shadow-inner">
          <Building2 className="w-3.5 h-3.5 text-[#a2b8b5]" />
          <select
            value={selectedEntityId || ''}
            onChange={(e) => onSelectEntity?.(e.target.value ? e.target.value : null)}
            className="bg-transparent text-xs font-semibold text-[#F0EDE4] focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[190px] truncate"
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

          {onOpenAddEntity && (
            <button
              onClick={onOpenAddEntity}
              className="p-1 rounded-lg hover:bg-[#004741] text-[#a2b8b5] hover:text-[#F0EDE4] transition-colors"
              title="Register new legal business entity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
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

        {/* User Account / Sign In Pill */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 bg-[#004741] border border-[#134e48] px-3 py-1.5 rounded-xl shadow-sm">
            <UserCircle className="w-4 h-4 text-emerald-300" />
            <div className="text-left hidden lg:block">
              <span className="text-xs font-bold text-[#F0EDE4] block leading-none truncate max-w-[140px]">
                {user.email}
              </span>
              <span className="text-[10px] text-[#a2b8b5] leading-none">
                {user.tenantName}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-1 text-[#a2b8b5] hover:text-rose-300 transition-colors ml-1"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#F0EDE4] hover:bg-[#e4dfd3] text-[#004741] font-bold text-xs shadow-md transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </header>
  );
};

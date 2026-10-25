import React from 'react';
import {
  LayoutDashboard,
  Search,
  ArrowLeftRight,
  FileSpreadsheet,
  ShieldCheck,
  Landmark,
} from 'lucide-react';

export type NavigationTab = 'overview' | 'inspector' | 'intercompany' | 'ingestion' | 'live-connect';

interface SidebarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  tenantName?: string;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  tenantName = 'Apex Holdings Group',
  userRole = 'Group Promoter',
}) => {
  const navItems = [
    {
      id: 'overview' as NavigationTab,
      label: 'Group Liquidity',
      subtitle: 'Consolidated Cash Position',
      icon: LayoutDashboard,
    },
    {
      id: 'inspector' as NavigationTab,
      label: 'Daily Cash Inspector',
      subtitle: 'Sub-150ms Daily Roll-Forward',
      icon: Search,
    },
    {
      id: 'intercompany' as NavigationTab,
      label: 'Inter-Co Netting',
      subtitle: 'Contra Reconciliation Engine',
      icon: ArrowLeftRight,
    },
    {
      id: 'ingestion' as NavigationTab,
      label: 'Statement Ingestion',
      subtitle: 'PDF & Bank Feeds Ingestion',
      icon: FileSpreadsheet,
    },
    {
      id: 'live-connect' as NavigationTab,
      label: 'Live Bank Connect',
      subtitle: 'RBI Account Aggregator Rail',
      icon: Landmark,
    },
  ];

  return (
    <aside className="w-64 bg-[#090d16] border-r border-[#1a2333] flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1a2333]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 font-bold text-lg tracking-wider">
              UB
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-100 text-sm tracking-wide">UBFD</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  Cash OS
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[140px] font-medium">
                {tenantName}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Cash Management Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600/20 to-indigo-600/10 text-brand-300 font-semibold border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#111928] font-medium'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                      : 'bg-slate-800/80 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-sm truncate">{item.label}</div>
                  <div className="text-[11px] text-slate-500 truncate">{item.subtitle}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Profile & Compliance Badge */}
      <div className="p-4 border-t border-[#1a2333] space-y-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-900/40 text-[11px] text-emerald-300">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
          <span className="truncate">MCA Rule 3(1) Compliant</span>
        </div>

        <div className="flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
              RV
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200 leading-none">Rajesh Verma</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{userRole}</p>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" title="System Live & Connected" />
        </div>
      </div>
    </aside>
  );
};

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
    <aside className="w-64 bg-[#011413] border-r border-[#0d3b36] flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-[#0d3b36]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#004741] to-[#007067] flex items-center justify-center text-[#F0EDE4] shadow-lg shadow-[#004741]/30 font-bold text-lg tracking-wider border border-[#145a53]">
              UB
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#F0EDE4] text-sm tracking-wide">UBFD</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#F0EDE4] text-[#004741] border border-[#e4dfd3] shadow-sm">
                  Cash OS
                </span>
              </div>
              <p className="text-xs text-[#a3b8b5] truncate max-w-[140px] font-medium mt-0.5">
                {tenantName}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-semibold text-[#6d8a87] uppercase tracking-wider">
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
                    ? 'bg-[#004741] text-[#F0EDE4] font-semibold border border-[#18665e] shadow-md shadow-[#004741]/30'
                    : 'text-[#a3b8b5] hover:text-[#F0EDE4] hover:bg-[#072b27] font-medium'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive
                      ? 'bg-[#F0EDE4] text-[#004741] shadow-sm'
                      : 'bg-[#0a2f2b] text-[#86a8a5]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-sm truncate">{item.label}</div>
                  <div className="text-[11px] text-[#789693] truncate">{item.subtitle}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Profile & Compliance Badge */}
      <div className="p-4 border-t border-[#0d3b36] space-y-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#003833]/80 border border-[#0d5952] text-[11px] text-[#7ae0d6]">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#2cd5c4]" />
          <span className="truncate font-medium">MCA Rule 3(1) Compliant</span>
        </div>

        <div className="flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#004741] border border-[#135952] flex items-center justify-center text-xs font-bold text-[#F0EDE4]">
              RV
            </div>
            <div>
              <p className="text-xs font-semibold text-[#F0EDE4] leading-none">Rajesh Verma</p>
              <p className="text-[11px] text-[#829e9b] font-medium mt-0.5">{userRole}</p>
            </div>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-sm shadow-[#10b981]" title="System Live & Connected" />
        </div>
      </div>
    </aside>
  );
};

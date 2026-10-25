import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sidebar, NavigationTab } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { GroupOverviewPage } from '@/pages/GroupOverviewPage';
import { DailyInspectorPage } from '@/pages/DailyInspectorPage';
import { IntercompanyNettingPage } from '@/pages/IntercompanyNettingPage';
import { api } from '@/lib/api-client';
import { LegalEntity, GroupLiquiditySummary } from '@/types/finance';

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [inspectedAccountId, setInspectedAccountId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // 1. Fetch Legal Entities
  const { data: entities = [], isLoading: isLoadingEntities } = useQuery<LegalEntity[]>({
    queryKey: ['entities'],
    queryFn: () => api.get<LegalEntity[]>('/entities'),
  });

  // 2. Fetch Group Liquidity Summary
  const {
    data: summary = null,
    isLoading: isLoadingSummary,
    isFetching: isFetchingSummary,
  } = useQuery<GroupLiquiditySummary>({
    queryKey: ['group-liquidity'],
    queryFn: () => api.get<GroupLiquiditySummary>('/summary/group-liquidity'),
  });

  const handleInspectAccount = (accountId: string) => {
    setInspectedAccountId(accountId);
    setCurrentTab('inspector');
  };

  const pageTitles: Record<NavigationTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Consolidated Group Liquidity',
      subtitle: 'Real-time multi-entity cash positioning across 6 commercial bank accounts',
    },
    inspector: {
      title: 'Daily Cash Inspector',
      subtitle: 'Opening-to-closing ledger roll-forward calculation engine (<150ms)',
    },
    intercompany: {
      title: 'Inter-Company Netting Center',
      subtitle: 'Automated contra matching across sister entities (MCA Rule 3 / GST Schedule I)',
    },
    ingestion: {
      title: 'Bank Statement Ingestion Rail',
      subtitle: 'High-precision PDF & CSV statement parser (SBI, ICICI, HDFC)',
    },
  };

  return (
    <div className="flex min-h-screen bg-[#090d16] text-slate-100 antialiased font-sans">
      {/* Global Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        tenantName="Apex Holdings Group"
        userRole="Group Promoter"
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={pageTitles[currentTab].title}
          subtitle={pageTitles[currentTab].subtitle}
          entities={entities}
          selectedEntityId={selectedEntityId}
          onSelectEntity={setSelectedEntityId}
          onRefresh={() => {
            queryClient.invalidateQueries();
          }}
          isRefreshing={isFetchingSummary}
        />

        <main className="flex-1 overflow-y-auto">
          {currentTab === 'overview' && (
            <GroupOverviewPage
              summary={summary}
              entities={entities}
              selectedEntityId={selectedEntityId}
              onInspectAccount={handleInspectAccount}
              isLoading={isLoadingEntities || isLoadingSummary}
            />
          )}

          {currentTab === 'inspector' && (
            <DailyInspectorPage
              initialAccountId={inspectedAccountId}
              accounts={summary?.accounts || []}
              onBackToOverview={() => setCurrentTab('overview')}
            />
          )}

          {currentTab === 'intercompany' && (
            <IntercompanyNettingPage />
          )}

          {currentTab === 'ingestion' && (
            <div className="p-8 max-w-7xl mx-auto space-y-6">
              <div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e2a42] text-center space-y-3">
                <div className="inline-flex p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="font-mono text-sm">Phase 4 Target: Bank Statement Ingestion Rail</span>
                </div>
                <h3 className="text-xl font-bold text-slate-100">Statement Ingestion & Table Extraction</h3>
                <p className="text-sm text-slate-400 max-w-lg mx-auto">
                  PDF & CSV parsers for SBI, ICICI, and HDFC statements scheduled for Phase 4 delivery.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

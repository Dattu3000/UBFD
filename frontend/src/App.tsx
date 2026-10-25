import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sidebar, NavigationTab } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { GroupOverviewPage } from '@/pages/GroupOverviewPage';
import { DailyInspectorPage } from '@/pages/DailyInspectorPage';
import { IntercompanyNettingPage } from '@/pages/IntercompanyNettingPage';
import { StatementIngestionPage } from '@/pages/StatementIngestionPage';
import { LiveBankConnectPage } from '@/pages/LiveBankConnectPage';
import { AuthModal } from '@/components/auth/AuthModal';
import { AddEntityModal } from '@/components/modals/AddEntityModal';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { LegalEntity, GroupLiquiditySummary } from '@/types/finance';

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [inspectedAccountId, setInspectedAccountId] = useState<string | null>(null);

  // Modals
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAddEntityModal, setShowAddEntityModal] = useState<boolean>(false);

  const { user, token } = useAuth();

  const queryClient = useQueryClient();

  // Invalidate queries when user token changes
  useEffect(() => {
    queryClient.invalidateQueries();
  }, [token, queryClient]);

  // 1. Fetch Legal Entities
  const { data: entities = [], isLoading: isLoadingEntities } = useQuery<LegalEntity[]>({
    queryKey: ['entities', token],
    queryFn: () => api.get<LegalEntity[]>('/entities'),
  });

  // 2. Fetch Group Liquidity Summary
  const {
    data: summary = null,
    isLoading: isLoadingSummary,
    isFetching: isFetchingSummary,
  } = useQuery<GroupLiquiditySummary>({
    queryKey: ['group-liquidity', token],
    queryFn: () => api.get<GroupLiquiditySummary>('/summary/group-liquidity'),
  });

  const handleInspectAccount = (accountId: string) => {
    setInspectedAccountId(accountId);
    setCurrentTab('inspector');
  };

  const pageTitles: Record<NavigationTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Consolidated Group Liquidity',
      subtitle: user
        ? `Real-time position for ${user.tenantName} (${user.email})`
        : 'Real-time multi-entity cash positioning across commercial bank accounts',
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
      subtitle: 'High-precision PDF & CSV statement parser (YES Bank, SBI, ICICI, HDFC)',
    },
    'live-connect': {
      title: 'Live Bank Connect',
      subtitle: 'RBI Account Aggregator 3-Year Background Consent (0 Daily OTPs)',
    },
  };

  return (
    <div className="flex min-h-screen bg-[#031a18] text-[#F0EDE4] antialiased font-sans">
      {/* Global Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        tenantName={user?.tenantName || 'Apex Holdings Group'}
        userRole={user?.role || 'Group Promoter'}
        onOpenAuthModal={() => setShowAuthModal(true)}
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
          onOpenAuthModal={() => setShowAuthModal(true)}
          onOpenAddEntity={() => setShowAddEntityModal(true)}
        />

        <main className="flex-1 overflow-y-auto">
          {currentTab === 'overview' && (
            <GroupOverviewPage
              summary={summary}
              entities={entities}
              selectedEntityId={selectedEntityId}
              onInspectAccount={handleInspectAccount}
              onNavigateToLiveConnect={() => setCurrentTab('live-connect')}
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
            <StatementIngestionPage accounts={summary?.accounts || []} />
          )}

          {currentTab === 'live-connect' && (
            <LiveBankConnectPage entities={entities} />
          )}
        </main>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Add Legal Entity Modal */}
      <AddEntityModal
        isOpen={showAddEntityModal}
        onClose={() => setShowAddEntityModal(false)}
      />
    </div>
  );
};

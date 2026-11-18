import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from '@clm/ui';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout, type AppTab } from './components/layout/AppLayout';
import { PublicHome, PublicAuth } from './features/public';
import { DashboardView } from './features/dashboard';
import { CertificatesView, useCertificates } from './features/certificates';
import { DiscoveryView } from './features/discovery';
import { GatewaysView, useGateways } from './features/gateways';
import { ComplianceView } from './features/compliance';
import { IntegrationsCatalogView } from './features/integrations';
import { SettingsView, useSettings } from './features/settings';
import { AuditLogTable } from './features/audit';
import { AlertsView } from './features/alerts';
import { api } from './config/api';
import { type AuditLog } from '@clm/shared-types';

function AuthenticatedApp() {
  const { currentUser, currentTenant, setCurrentTenant } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);

  // Certificates Feature Hook
  const certsHook = useCertificates();

  // Gateways Feature Hook
  const gatewaysHook = useGateways();

  // Settings Feature Hook (Cloud Accounts, CAs, Members)
  const settingsHook = useSettings();

  // Synchronize all tenant data from PostgreSQL
  const syncAllData = useCallback(async () => {
    await Promise.all([
      certsHook.fetchCertificates(),
      gatewaysHook.fetchGateways(),
      settingsHook.fetchAllSettings(),
      api.audit.list().then(setActivityLogs).catch(() => []),
    ]);
  }, [certsHook.fetchCertificates, gatewaysHook.fetchGateways, settingsHook.fetchAllSettings]);

  useEffect(() => {
    if (currentUser) {
      syncAllData();
    }
  }, [currentUser]);

  const handleManualSync = async () => {
    try {
      const stats = await api.scheduler?.evaluateNow();
      await syncAllData();
      if (stats && stats.autoRenewedCerts > 0) {
        toast.success(
          'Autonomous Renewal Executed',
          `Engine evaluated infrastructure: ${stats.autoRenewedCerts} expiring certificate(s) auto-renewed in database.`
        );
      } else {
        toast.info(
          'Database Synchronized',
          'Fetched latest certificates and gateway telemetry from PostgreSQL.'
        );
      }
    } catch {
      await syncAllData();
    }
  };

  const criticalCount = certsHook.certs.filter(
    (c) => c.daysRemaining <= 7 || c.status === 'EXPIRED'
  ).length;

  return (
    <AppLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      searchTerm={certsHook.searchTerm}
      setSearchTerm={certsHook.setSearchTerm}
      criticalCount={criticalCount}
      dbError={certsHook.dbError}
      onRetryConnection={syncAllData}
      onSyncDb={handleManualSync}
      isSyncing={certsHook.isLoading}
      onOpenAddCert={() => setIsAddModalOpen(true)}
      onOpenEnrollGateway={gatewaysHook.handleOpenEnrollModal}
    >
      {activeTab === 'dashboard' && (
        <DashboardView
          certs={certsHook.certs}
          gateways={gatewaysHook.gateways}
          currentTenant={currentTenant}
          onOpenAddCert={() => setIsAddModalOpen(true)}
          onNavigateToCerts={(filter) => {
            if (filter) certsHook.setStatusFilter(filter);
            setActiveTab('certificates');
          }}
          onNavigateToDiscovery={() => setActiveTab('discovery')}
          onNavigateToGateways={() => setActiveTab('gateways')}
        />
      )}

      {activeTab === 'certificates' && (
        <CertificatesView
          certs={certsHook.certs}
          setCerts={certsHook.setCerts}
          selectedCertId={certsHook.selectedCertId}
          setSelectedCertId={certsHook.setSelectedCertId}
          selectedCert={certsHook.selectedCert}
          gateways={gatewaysHook.gateways}
          cloudAccounts={settingsHook.cloudAccounts}
          caIntegrations={settingsHook.caIntegrations}
          isReprobingCertId={certsHook.isReprobingCertId}
          searchTerm={certsHook.searchTerm}
          setSearchTerm={certsHook.setSearchTerm}
          statusFilter={certsHook.statusFilter}
          setStatusFilter={certsHook.setStatusFilter}
          targetFilter={certsHook.targetFilter}
          setTargetFilter={certsHook.setTargetFilter}
          expiryHistogram={certsHook.expiryHistogram}
          onReprobe={certsHook.handleReprobe}
          onDelete={certsHook.handleDelete}
          onDownloadPem={certsHook.handleDownloadPem}
          exportAsJson={certsHook.exportAsJson}
          exportAsCsv={certsHook.exportAsCsv}
          isAddModalOpen={isAddModalOpen}
          setIsAddModalOpen={setIsAddModalOpen}
          currentTenant={currentTenant}
        />
      )}

      {activeTab === 'discovery' && (
        <DiscoveryView
          gateways={gatewaysHook.gateways}
          onCertImported={(cert) => {
            certsHook.setCerts((prev) => [cert, ...prev]);
            certsHook.setSelectedCertId(cert.id);
          }}
        />
      )}

      {activeTab === 'gateways' && (
        <GatewaysView
          gateways={gatewaysHook.gateways}
          showEnrollModal={gatewaysHook.showEnrollModal}
          setShowEnrollModal={gatewaysHook.setShowEnrollModal}
          enrollToken={gatewaysHook.enrollToken}
          onOpenEnroll={gatewaysHook.handleOpenEnrollModal}
          onSimulateHandshake={gatewaysHook.handleSimulateHandshake}
          isSimulatingHandshake={gatewaysHook.isSimulatingHandshake}
          currentTenant={currentTenant}
        />
      )}

      {activeTab === 'compliance' && <ComplianceView certs={certsHook.certs} />}

      {activeTab === 'integrations' && (
        <IntegrationsCatalogView
          caIntegrations={settingsHook.caIntegrations}
          cloudAccounts={settingsHook.cloudAccounts}
          onIntegrationsUpdated={settingsHook.fetchCaIntegrations}
        />
      )}

      {activeTab === 'audit' && <AuditLogTable logs={activityLogs} />}

      {activeTab === 'alerts' && (
        <AlertsView
          certs={certsHook.certs}
          onRenewCert={(c) => {
            certsHook.setSelectedCertId(c.id);
            setActiveTab('certificates');
          }}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsView
          currentTenant={currentTenant}
          onTenantUpdated={setCurrentTenant}
          settingsSubTab={settingsHook.settingsSubTab}
          setSettingsSubTab={settingsHook.setSettingsSubTab}
          cloudAccounts={settingsHook.cloudAccounts}
          onCloudAccountsUpdated={settingsHook.fetchCloudAccounts}
          caIntegrations={settingsHook.caIntegrations}
          onCaIntegrationsUpdated={settingsHook.fetchCaIntegrations}
          members={settingsHook.members}
          onMembersUpdated={settingsHook.fetchMembers}
        />
      )}
    </AppLayout>
  );
}

function MainContent() {
  const { currentUser, currentTenant, setCurrentUser, setCurrentTenant } = useAuth();
  const [publicView, setPublicView] = useState<'home' | 'auth'>('home');
  const [initialAuthMode, setInitialAuthMode] = useState<'signin' | 'signup'>('signin');

  if (!currentUser || !currentTenant) {
    if (publicView === 'auth') {
      return (
        <PublicAuth
          initialMode={initialAuthMode}
          onBackToHome={() => setPublicView('home')}
          onAuthenticated={(user, tenant) => {
            setCurrentUser(user);
            setCurrentTenant(tenant);
          }}
        />
      );
    }

    return (
      <PublicHome
        onNavigateToAuth={(mode = 'signin') => {
          setInitialAuthMode(mode);
          setPublicView('auth');
        }}
        onLoadDemoSandbox={async () => {
          setInitialAuthMode('signin');
          setPublicView('auth');
        }}
      />
    );
  }

  return <AuthenticatedApp />;
}

export function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <MainContent />
    </AuthProvider>
  );
}

export default App;

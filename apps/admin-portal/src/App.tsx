import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  FileText,
  ShoppingBag,
  CheckCircle2,
  Plus,
  Trash2,
  Power,
  Layers,
  Cpu,
  ShieldAlert,
  Cloud,
  Hash,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import {
  TenantStatus,
  SubscriptionTier,
  type Tenant,
  type AuditLog,
} from '@clm/shared-types';
import { Sidebar, StatusBadge, TopHeader, Modal, ConfirmDialog, Toaster, toast } from '@clm/ui';
import { createApiClient } from '@clm/api-client';

const api = createApiClient({
  baseUrl: (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1',
  defaultHeaders: {
    'x-user-role': 'SUPER_ADMIN',
  },
});

export function App() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'tenants' | 'audit' | 'marketplace'>('tenants');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING_APPROVAL' | 'TRIAL' | 'SUSPENDED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState<string>('2026-11-10');
  const [customCertQuota, setCustomCertQuota] = useState<number>(500);
  const [customGatewayQuota, setCustomGatewayQuota] = useState<number>(15);

  const [dbError, setDbError] = useState<string | null>(null);

  // Fetch real data from PostgreSQL backend
  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      const [tenantsList, globalAudit] = await Promise.all([
        api.tenants.list(),
        api.audit.listGlobal(),
      ]);

      setTenants(tenantsList);
      if (tenantsList.length > 0 && !selectedTenantId) {
        const first = tenantsList[0];
        if (first) {
          setSelectedTenantId(first.id);
        }
      }
      setAuditLogs(globalAudit);
    } catch (err: any) {
      const msg = err?.message || 'Database connection error. Failed to load administrative records from PostgreSQL.';
      console.error('Error fetching admin data:', err);
      setDbError(msg);
      toast.error('PostgreSQL Fetch Error', msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Add Organization Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [newTenantTier, setNewTenantTier] = useState<SubscriptionTier>(SubscriptionTier.ENTERPRISE);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAwsAccountId, setNewAwsAccountId] = useState('');

  const selectedTenant = tenants.find(t => t.id === selectedTenantId) || tenants[0];

  const handleNameChange = (name: string) => {
    setNewTenantName(name);
    setNewTenantSlug(
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, ''),
    );
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantSlug || !newAdminEmail) return;

    try {
      const parts = newTenantName.trim().split(' ');
      const firstName = parts[0] || 'Admin';
      const lastName = parts.slice(1).join(' ') || 'User';

      const created = await api.tenants.create({
        name: newTenantName,
        slug: newTenantSlug,
        adminEmail: newAdminEmail,
        adminFirstName: firstName,
        adminLastName: lastName,
        tier: newTenantTier,
        awsAccountId: newAwsAccountId || undefined,
      });

      setTenants(prev => [created, ...prev]);
      setSelectedTenantId(created.id);
      setIsAddModalOpen(false);

      setNewTenantName('');
      setNewTenantSlug('');
      setNewAdminEmail('');
      setNewAwsAccountId('');

      toast.success('Organization Created', `Tenant "${created.name}" provisioned under RLS.`);

      // Refresh audit logs to show organization creation
      api.audit.listGlobal().then(setAuditLogs).catch(() => { });
    } catch (err: any) {
      toast.error('Creation Failed', err.message || 'Could not provision organization');
    }
  };

  // Plan Upgrade / Downgrade Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedPlanTier, setSelectedPlanTier] = useState<SubscriptionTier>(SubscriptionTier.ENTERPRISE);

  // Confirm Dialog State
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'suspend' | 'activate';
    tenantId: string;
    name: string;
  } | null>(null);

  const handleToggleStatus = (id: string) => {
    const tenant = tenants.find(t => t.id === id);
    if (!tenant) return;
    setConfirmAction({
      type: tenant.status === TenantStatus.ACTIVE ? 'suspend' : 'activate',
      tenantId: id,
      name: tenant.name,
    });
  };

  const handleDeleteTenant = (id: string, name: string) => {
    setConfirmAction({
      type: 'delete',
      tenantId: id,
      name,
    });
  };

  const handleExecuteConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, tenantId, name } = confirmAction;

    try {
      if (type === 'delete') {
        if (api.http) {
          await api.http.delete(`tenants/${tenantId}`);
        }
        setTenants(prev => prev.filter(t => t.id !== tenantId));
        if (selectedTenantId === tenantId) {
          setSelectedTenantId(tenants.find(t => t.id !== tenantId)?.id || '');
        }
        toast.warning('Organization Deleted', `Tenant "${name}" was decommissioned.`);
      } else {
        const nextStatus = type === 'suspend' ? TenantStatus.SUSPENDED : TenantStatus.ACTIVE;
        const updated = await api.tenants.update(tenantId, { status: nextStatus });
        setTenants(prev => prev.map(t => (t.id === tenantId ? updated : t)));
        if (nextStatus === TenantStatus.ACTIVE) {
          toast.success('Organization Activated', `Tenant "${name}" is now active.`);
        } else {
          toast.info('Organization Suspended', `Tenant "${name}" has been suspended.`);
        }
      }
      api.audit.listGlobal().then(setAuditLogs).catch(() => { });
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Operation could not be completed');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleApproveTenant = async (tenantId: string) => {
    try {
      const updated = await api.tenants.updateStatus(tenantId, TenantStatus.ACTIVE);
      setTenants(prev => prev.map(t => (t.id === tenantId ? updated : t)));
      toast.success('Organization Approved', `Tenant is now active with full ACME & gateway privileges.`);
      api.audit.listGlobal().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      toast.error('Approval Failed', err.message || 'Could not approve tenant');
    }
  };

  const handleRejectTenant = async (tenantId: string) => {
    try {
      const updated = await api.tenants.updateStatus(tenantId, TenantStatus.REJECTED);
      setTenants(prev => prev.map(t => (t.id === tenantId ? updated : t)));
      toast.warning('Organization Declined', `Tenant application has been rejected.`);
      api.audit.listGlobal().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      toast.error('Rejection Failed', err.message || 'Could not reject tenant');
    }
  };

  const handleUpdateTenantTier = async () => {
    if (!selectedTenant) return;
    try {
      const updated = await api.tenants.update(selectedTenant.id, {
        tier: selectedPlanTier,
        maxCertificates: customCertQuota,
        maxGateways: customGatewayQuota,
        effectivePlanDate: effectiveDate,
      });
      setTenants(prev => prev.map(t => (t.id === selectedTenant.id ? updated : t)));
      setIsPlanModalOpen(false);
      toast.success(
        'Plan & Quotas Configured',
        `${selectedTenant.name} updated to ${selectedPlanTier} (Effective: ${effectiveDate})`,
      );
      api.audit.listGlobal().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Failed to update subscription tier');
    }
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.awsAccountId && t.awsAccountId.includes(searchTerm));
    if (statusFilter === 'ACTIVE') return matchesSearch && t.status === TenantStatus.ACTIVE;
    if (statusFilter === 'PENDING_APPROVAL') return matchesSearch && t.status === TenantStatus.PENDING_APPROVAL;
    if (statusFilter === 'TRIAL') return matchesSearch && t.status === TenantStatus.TRIAL;
    if (statusFilter === 'SUSPENDED') return matchesSearch && t.status === TenantStatus.SUSPENDED;
    return matchesSearch;
  });

  // Reusable Sidebar Nav Items
  const navItems = [
    {
      id: 'tenants',
      label: 'Organizations',
      icon: <Building2 className="h-5 w-5" />,
      badge: tenants.length,
      active: activeTab === 'tenants',
      onClick: () => setActiveTab('tenants'),
    },
    {
      id: 'audit',
      label: 'Global Audit',
      icon: <FileText className="h-5 w-5" />,
      badge: auditLogs.length,
      active: activeTab === 'audit',
      onClick: () => setActiveTab('audit'),
    },
    {
      id: 'marketplace',
      label: 'Cloud Marketplaces & Billing',
      icon: <ShoppingBag className="h-5 w-5" />,
      active: activeTab === 'marketplace',
      onClick: () => setActiveTab('marketplace'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-[#0F172A] flex p-3 font-sans selection:bg-blue-500/20 selection:text-blue-600">
      <Toaster position="top-right" />
      {/* ========================================================================= */}
      {/* 1. Reusable Collapsible Sidebar Component (Zero Overlap & Aligned Pips)    */}
      {/* ========================================================================= */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        brandName="CLM SaaS"
        brandIcon={<ShieldAlert className="h-6 w-6" />}
        items={navItems}
        user={{
          name: 'Platform Admin',
          role: 'Super Admin',
          initials: 'SA',
        }}
      />

      {/* ========================================================================= */}
      {/* 2. Main Workspace                                                         */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 pl-6 overflow-y-auto">
        <TopHeader
          icon={<Building2 className="h-5 w-5 text-blue-600" />}
          title={
            activeTab === 'tenants'
              ? 'Tenant Organizations'
              : activeTab === 'audit'
                ? 'Global Audit Ledger'
                : 'AWS Marketplace Integration'
          }
          subtitle={
            activeTab === 'tenants'
              ? 'Provision, manage and monitor subscriber SaaS workspaces under Row-Level Security.'
              : activeTab === 'audit'
                ? 'Immutable platform audit trail across all tenant organizations and gateway daemons.'
                : 'AWS Marketplace SaaS integration, metering records, and contract entitlements.'
          }
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search organizations or accounts..."
          userInitials="SA"
          actionButton={
            <div className="flex items-center gap-2">
              <button
                onClick={fetchAdminData}
                disabled={isLoading}
                title="Refresh from PostgreSQL"
                className="px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sync DB</span>
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="primary-gradient-btn px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
              >
                <Plus className="h-4 w-4" />
                <span>Add Organization</span>
              </button>
            </div>
          }
        />

        {/* Global Database Error Banner */}
        {dbError && (
          <div className="mb-4 mr-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-start justify-between shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-red-800">Database Connection Error</h4>
                <p className="text-xs text-red-600 mt-0.5 font-medium">{dbError}</p>
                <p className="text-[11px] text-slate-500 mt-1">Make sure PostgreSQL is running on port 5432 and the backend is active at port 4000.</p>
              </div>
            </div>
            <button
              onClick={fetchAdminData}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm shrink-0"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Tab 1: Organizations View */}
        {activeTab === 'tenants' && (
          <div className="grid grid-cols-12 gap-5 pr-3 pb-6">
            {/* Master Column (Left 5 cols) */}
            <div className="col-span-12 xl:col-span-5 space-y-3">
              {/* Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${statusFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'bg-white text-slate-600 hover:bg-slate-100 soft-card'
                    }`}
                >
                  All ({tenants.length})
                </button>
                <button
                  onClick={() => setStatusFilter('PENDING_APPROVAL')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    statusFilter === 'PENDING_APPROVAL'
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/30'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <span>Pending</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-amber-800 font-extrabold">
                    {tenants.filter(t => t.status === TenantStatus.PENDING_APPROVAL).length}
                  </span>
                </button>
                <button
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${statusFilter === 'ACTIVE'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'bg-white text-slate-600 hover:bg-slate-100 soft-card'
                    }`}
                >
                  Active ({tenants.filter(t => t.status === TenantStatus.ACTIVE).length})
                </button>
                <button
                  onClick={() => setStatusFilter('TRIAL')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${statusFilter === 'TRIAL'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'bg-white text-slate-600 hover:bg-slate-100 soft-card'
                    }`}
                >
                  Trial ({tenants.filter(t => t.status === TenantStatus.TRIAL).length})
                </button>
                <button
                  onClick={() => setStatusFilter('SUSPENDED')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${statusFilter === 'SUSPENDED'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'bg-white text-slate-600 hover:bg-slate-100 soft-card'
                    }`}
                >
                  Suspended ({tenants.filter(t => t.status === TenantStatus.SUSPENDED).length})
                </button>
              </div>

              {/* List Container */}
              <div className="bg-white rounded-[24px] soft-card p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
                  <span>Organization</span>
                  <span>Status</span>
                </div>

                <div className="space-y-1">
                  {filteredTenants.map(tenant => {
                    const isSelected = tenant.id === selectedTenantId;
                    return (
                      <div
                        key={tenant.id}
                        onClick={() => setSelectedTenantId(tenant.id)}
                        className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-150 ${isSelected
                            ? 'bg-blue-50/70 border border-blue-200/80 shadow-sm'
                            : 'hover:bg-slate-50 border border-transparent'
                          }`}
                      >
                        <div className="min-w-0">
                          <div className={`font-bold text-xs truncate ${isSelected ? 'text-blue-900' : 'text-[#0F172A]'}`}>
                            {tenant.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 truncate">
                            /{tenant.slug} • {tenant.tier}
                          </div>
                        </div>

                        <div>
                          {tenant.status === TenantStatus.ACTIVE ? (
                            <StatusBadge variant="healthy" label="Active" />
                          ) : tenant.status === TenantStatus.TRIAL ? (
                            <StatusBadge variant="warning" label="Trial" />
                          ) : (
                            <StatusBadge variant="critical" label="Suspended" />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredTenants.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No organizations found.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detail Column (Right 7 cols) - Shows Only Implemented Data */}
            <div className="col-span-12 xl:col-span-7">
              {selectedTenant ? (
                <div className="bg-white rounded-[28px] soft-card p-6 space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-extrabold text-[#0F172A] tracking-tight">
                            {selectedTenant.name}
                          </h3>
                          {selectedTenant.status === TenantStatus.ACTIVE ? (
                            <StatusBadge variant="healthy" label="Active" />
                          ) : selectedTenant.status === TenantStatus.TRIAL ? (
                            <StatusBadge variant="warning" label="Trial" />
                          ) : (
                            <StatusBadge variant="critical" label="Suspended" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                          Workspace /{selectedTenant.slug} • {selectedTenant.tier}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStatus(selectedTenant.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-slate-50 transition-colors"
                        title={selectedTenant.status === TenantStatus.ACTIVE ? 'Suspend Organization' : 'Activate Organization'}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTenant(selectedTenant.id, selectedTenant.name)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-colors"
                        title="Delete Organization"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Real Implemented Quotas & Infrastructure Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 uppercase">
                        <Layers className="h-3.5 w-3.5" />
                        <span>Cert Quota</span>
                      </div>
                      <div className="text-xl font-extrabold text-blue-900 mt-1">
                        {selectedTenant.maxCertificates} certs
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 uppercase">
                        <Cpu className="h-3.5 w-3.5" />
                        <span>Gateway Quota</span>
                      </div>
                      <div className="text-xl font-extrabold text-indigo-900 mt-1">
                        {selectedTenant.maxGateways} daemons
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase">
                        <Cloud className="h-3.5 w-3.5" />
                        <span>AWS Account</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-800 mt-1 truncate">
                        {selectedTenant.awsAccountId || 'Direct SaaS'}
                      </div>
                    </div>
                  </div>

                  {/* Real Tenant Parameters */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-3">
                    <div className="text-xs font-extrabold text-[#0F172A] flex items-center gap-2">
                      <Hash className="h-4 w-4 text-blue-600" />
                      <span>PostgreSQL Row-Level Security (RLS) Configuration</span>
                    </div>

                    <div className="text-xs space-y-2 font-medium">
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Tenant UUID</span>
                        <span className="font-mono text-slate-800 text-[11px]">{selectedTenant.id}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Database Role Isolation</span>
                        <span className="font-mono text-emerald-700 font-bold text-[11px]">app.tenant_id (Active)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">AWS Marketplace Identifier</span>
                        <span className="font-mono text-slate-700 text-[11px]">
                          {selectedTenant.awsCustomerIdentifier || 'None'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Created Date</span>
                        <span className="text-slate-700">{selectedTenant.createdAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    {selectedTenant.status === TenantStatus.PENDING_APPROVAL ? (
                      <>
                        <button
                          onClick={() => handleApproveTenant(selectedTenant.id)}
                          className="flex-1 py-3 px-5 rounded-2xl text-xs font-bold text-white bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Approve & Activate Workspace</span>
                        </button>

                        <button
                          onClick={() => handleRejectTenant(selectedTenant.id)}
                          className="py-3 px-5 rounded-2xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                        >
                          <span>Decline</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setSelectedPlanTier(selectedTenant.tier);
                            setCustomCertQuota(selectedTenant.maxCertificates);
                            setCustomGatewayQuota(selectedTenant.maxGateways);
                            setIsPlanModalOpen(true);
                          }}
                          className="py-3 px-4 rounded-2xl text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                          <span>Custom Plan & Quota</span>
                        </button>

                        <button
                          onClick={() => handleToggleStatus(selectedTenant.id)}
                          className="primary-gradient-btn flex-1 py-3 px-5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2"
                        >
                          <Power className="h-4 w-4" />
                          <span>
                            {selectedTenant.status === TenantStatus.ACTIVE ? 'Suspend Organization' : 'Activate Organization'}
                          </span>
                        </button>

                        <button
                          onClick={() => handleDeleteTenant(selectedTenant.id, selectedTenant.name)}
                          className="py-3 px-5 rounded-2xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Tab 2: Global Audit View */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-[24px] soft-card p-6 space-y-4 pr-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Global Audit Logs</h3>
                <p className="text-xs text-slate-400">Append-only security and compliance events</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
                {auditLogs.length} Recorded Events
              </span>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#F8FAFC] text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Resource</th>
                    <th className="px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-sans">
                        No audit records logged yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-400 font-sans">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3 font-sans text-slate-800 font-medium">
                          {log.actorEmail || `${log.actorType}: ${log.actorId.substring(0, 8)}`}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{log.resourceType}</td>
                        <td className="px-4 py-3 text-slate-500">{log.ipAddress || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Cloud Marketplaces & Billing View */}
        {activeTab === 'marketplace' && (
          <div className="space-y-5 pr-3 pb-6">
            {/* 4 Multi-Cloud Marketplace Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl soft-card p-5 space-y-2 border-t-4 border-t-amber-500">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-700 uppercase">AWS Marketplace</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-sm font-black text-slate-800">BatchMeterUsage API</div>
                <p className="text-[11px] text-slate-500">Hourly dimension metering with AWS Customer Identifier.</p>
              </div>

              <div className="bg-white rounded-2xl soft-card p-5 space-y-2 border-t-4 border-t-blue-500">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-700 uppercase">Azure Marketplace</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-sm font-black text-slate-800">SaaS Fulfillment v2</div>
                <p className="text-[11px] text-slate-500">Active webhook listener for Azure Subscription webhook events.</p>
              </div>

              <div className="bg-white rounded-2xl soft-card p-5 space-y-2 border-t-4 border-t-emerald-500">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase">GCP Marketplace</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-sm font-black text-slate-800">Partner Procurement</div>
                <p className="text-[11px] text-slate-500">Google Cloud Commerce account linking & entitlement sync.</p>
              </div>

              <div className="bg-white rounded-2xl soft-card p-5 space-y-2 border-t-4 border-t-indigo-500">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-700 uppercase">Zoho Marketplace</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-sm font-black text-slate-800">Extension Recurring</div>
                <p className="text-[11px] text-slate-500">Zoho CRM & Desk security extension subscription lifecycle.</p>
              </div>
            </div>

            {/* AWS Marketplace Usage Metering Dimension Chart */}
            <div className="bg-white rounded-[24px] soft-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <h4 className="text-base font-extrabold text-[#0F172A]">
                      Cloud Usage Metering Dimension Aggregator
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live dimension: <code className="text-blue-600 font-mono">active_certs_quantity</code> synchronized hourly across all connected cloud marketplaces.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>1,300 billable cert-hours</span>
                </div>
              </div>

              {/* Simulated Bar Graph */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Organization Workspace</span>
                  <span>Active Monitored Certs / Quota</span>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  {tenants.map(t => {
                    const usedPercent = Math.min(100, Math.round(((t.tier === 'ENTERPRISE' ? 450 : t.tier === 'AWS_MARKETPLACE_PAYGO' ? 180 : 35) / t.maxCertificates) * 100));
                    return (
                      <div key={t.id} className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold font-sans text-slate-800">{t.name}</span>
                          <span className="text-slate-500">
                            {t.tier === 'ENTERPRISE' ? 450 : t.tier === 'AWS_MARKETPLACE_PAYGO' ? 180 : 35} / {t.maxCertificates} ({usedPercent}%)
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-blue-600 to-indigo-600 rounded-full transition-all"
                            style={{ width: `${usedPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Add Organization */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Organization"
        description="Provision a new subscriber workspace under PostgreSQL Row-Level Security."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTenant} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1">Organization Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Stripe Global"
              value={newTenantName}
              onChange={e => handleNameChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Workspace Slug *</label>
              <input
                type="text"
                required
                placeholder="e.g. stripe-global"
                value={newTenantSlug}
                onChange={e => setNewTenantSlug(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-mono text-[#0F172A] focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Subscription Tier</label>
              <select
                value={newTenantTier}
                onChange={e => setNewTenantTier(e.target.value as SubscriptionTier)}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
              >
                <option value={SubscriptionTier.ENTERPRISE}>Enterprise</option>
                <option value={SubscriptionTier.AWS_MARKETPLACE_PAYGO}>AWS Marketplace PayGO</option>
                <option value={SubscriptionTier.COMMUNITY}>Community</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1">Admin Email *</label>
            <input
              type="email"
              required
              placeholder="admin@stripe.com"
              value={newAdminEmail}
              onChange={e => setNewAdminEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1">AWS Account ID (Optional)</label>
            <input
              type="text"
              placeholder="12-digit AWS account ID"
              value={newAwsAccountId}
              onChange={e => setNewAwsAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-mono text-[#0F172A] focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-gradient-btn px-5 py-2 rounded-xl text-xs font-bold"
            >
              Create Organization
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Change Organization Plan & Effective Date */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title="Custom Subscription & Resource Quotas"
        description={`Configure tier, custom limits, and scheduled effective date for ${selectedTenant?.name}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase">Select Plan Tier</label>
            <div className="grid grid-cols-1 gap-2.5">
              {[
                {
                  tier: SubscriptionTier.COMMUNITY,
                  label: 'Community',
                  desc: 'Free for testing & open source (50 certs, 2 gateways)',
                },
                {
                  tier: SubscriptionTier.AWS_MARKETPLACE_PAYGO,
                  label: 'AWS Marketplace PayGO',
                  desc: 'Metered billing via AWS (250 certs, 10 gateways)',
                },
                {
                  tier: SubscriptionTier.PROFESSIONAL,
                  label: 'Professional',
                  desc: 'Team scale with RBAC & Priority SLA (500 certs, 15 gateways)',
                },
                {
                  tier: SubscriptionTier.ENTERPRISE,
                  label: 'Enterprise',
                  desc: 'Dedicated enterprise infrastructure (1000 certs, 25 gateways)',
                },
              ].map(plan => (
                <div
                  key={plan.tier}
                  onClick={() => setSelectedPlanTier(plan.tier)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedPlanTier === plan.tier
                      ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">{plan.label}</span>
                    {selectedPlanTier === plan.tier && (
                      <span className="h-2 w-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{plan.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Max Certificate Quota</label>
              <input
                type="number"
                value={customCertQuota}
                onChange={e => setCustomCertQuota(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Max Gateway Daemons</label>
              <input
                type="number"
                value={customGatewayQuota}
                onChange={e => setCustomGatewayQuota(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Plan Effective Date (Grandfathering)
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={e => setEffectiveDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPlanModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdateTenantTier}
              className="primary-gradient-btn px-5 py-2 rounded-xl text-xs font-bold"
            >
              Apply Plan & Quotas
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleExecuteConfirmedAction}
        title={
          confirmAction?.type === 'delete'
            ? 'Delete Organization'
            : confirmAction?.type === 'suspend'
              ? 'Suspend Organization'
              : 'Activate Organization'
        }
        description={
          confirmAction?.type === 'delete'
            ? `Are you sure you want to permanently delete '${confirmAction?.name}'? This will delete all tenant certificates, gateway mappings, and PostgreSQL Row-Level Security partitions.`
            : confirmAction?.type === 'suspend'
              ? `Are you sure you want to suspend '${confirmAction?.name}'? Their gateways will be disconnected and certificate auto-renewals will halt.`
              : `Activate organization '${confirmAction?.name}'? All services and automated renewals will resume.`
        }
        confirmLabel={
          confirmAction?.type === 'delete'
            ? 'Delete Organization'
            : confirmAction?.type === 'suspend'
              ? 'Suspend Organization'
              : 'Activate'
        }
        variant={confirmAction?.type === 'delete' ? 'danger' : 'warning'}
      />
    </div>
  );
}

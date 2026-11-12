import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Building2 as Building,
  FileText,
  ShoppingBag,
  CheckCircle2,
  Plus,
  Trash2,
  Power,
  Layers,
  Cpu,
  Shield,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
  Clock,
} from 'lucide-react';
import {
  TenantStatus,
  SubscriptionTier,
  type Tenant,
  type AuditLog,
  type PlanDefinition,
} from '@clm/shared-types';
import { Sidebar, StatusBadge, TopHeader, Modal, ConfirmDialog, Toaster, toast } from '@clm/ui';
import { createApiClient } from '@clm/api-client';

const api = createApiClient({
  baseUrl: (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1',
  getAuthToken: () => localStorage.getItem('clm_admin_access_token'),
  defaultHeaders: {
    'x-user-role': 'SUPER_ADMIN',
  },
});

export function App() {
  const [adminUser, setAdminUser] = useState<{ email: string; firstName?: string; lastName?: string; role?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('clm_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'tenants' | 'plans' | 'audit' | 'marketplace'>('tenants');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING_APPROVAL' | 'TRIAL' | 'SUSPENDED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState<string>('2026-11-10');
  const [customCertQuota, setCustomCertQuota] = useState<number>(500);
  const [customGatewayQuota, setCustomGatewayQuota] = useState<number>(15);

  // Plans Management State
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanDefinition | null>(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanTier, setNewPlanTier] = useState<SubscriptionTier>(SubscriptionTier.ENTERPRISE);
  const [newPlanPrice, setNewPlanPrice] = useState<number>(399);
  const [newPlanCerts, setNewPlanCerts] = useState<number>(500);
  const [newPlanGateways, setNewPlanGateways] = useState<number>(10);
  const [newPlanFeatures, setNewPlanFeatures] = useState<string>('ACME Auto-Renew, Multi-Cloud Deploy, Priority Support');
  const [newPlanEffectiveDate, setNewPlanEffectiveDate] = useState<string>('2026-11-10');

  const [dbError, setDbError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);

  // Fetch real data from PostgreSQL backend
  const fetchAdminData = useCallback(async () => {
    if (!adminUser) return;
    setIsLoading(true);
    setDbError(null);
    try {
      const [tenantsList, globalAudit, plansList, metricsData] = await Promise.all([
        api.tenants.list(),
        api.audit.listGlobal(),
        api.plans ? api.plans.list().catch(() => []) : Promise.resolve([]),
        api.tenants.getMetrics ? api.tenants.getMetrics().catch(() => null) : Promise.resolve(null),
      ]);

      setTenants(tenantsList);
      if (metricsData) {
        setMetrics(metricsData);
      }
      if (plansList && plansList.length > 0) {
        setPlans(plansList);
      }
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
      if (msg.toLowerCase().includes('authentication') || err?.status === 401) {
        localStorage.removeItem('clm_admin_access_token');
        localStorage.removeItem('clm_admin_user');
        setAdminUser(null);
        setLoginError('Session expired. Please sign in again.');
        return;
      }
      setDbError(msg);
      toast.error('PostgreSQL Fetch Error', msg);
    } finally {
      setIsLoading(false);
    }
  }, [adminUser, selectedTenantId]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);
  if (adminUser) {
    fetchAdminData();
  }
  useEffect(() => {
    if (adminUser) {
      fetchAdminData();
    }
  }, [adminUser, fetchAdminData]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res: any = await api.auth.login({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (res?.user?.role !== 'SUPER_ADMIN') {
        setLoginError('Access denied. This portal requires a SUPER_ADMIN account.');
        return;
      }
      if (res?.tokens?.accessToken) {
        localStorage.setItem('clm_admin_access_token', res.tokens.accessToken);
      }
      localStorage.setItem('clm_admin_user', JSON.stringify(res.user));
      setAdminUser(res.user);
      setLoginPassword('');
      toast.success('Signed in', `Welcome back, ${res.user.firstName || res.user.email}`);
    } catch (err: any) {
      setLoginError(err?.message || 'Invalid email or password');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('clm_admin_access_token');
    localStorage.removeItem('clm_admin_user');
    setAdminUser(null);
    setTenants([]);
    setAuditLogs([]);
  };

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
      api.audit.listGlobal().then(setAuditLogs).catch(() => { });
    } catch (err: any) {
      toast.error('Approval Failed', err.message || 'Could not approve tenant');
    }
  };

  const handleRejectTenant = async (tenantId: string) => {
    try {
      const updated = await api.tenants.updateStatus(tenantId, TenantStatus.REJECTED);
      setTenants(prev => prev.map(t => (t.id === tenantId ? updated : t)));
      toast.warning('Organization Declined', `Tenant application has been rejected.`);
      api.audit.listGlobal().then(setAuditLogs).catch(() => { });
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
      api.audit.listGlobal().then(setAuditLogs).catch(() => { });
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Failed to update subscription tier');
    }
  };

  const handleOpenEditPlan = (plan: PlanDefinition) => {
    setEditingPlan(plan);
    setNewPlanName(plan.name);
    setNewPlanTier(plan.tier);
    setNewPlanPrice(plan.priceMonthly);
    setNewPlanCerts(plan.maxCertificates);
    setNewPlanGateways(plan.maxGateways);
    setNewPlanFeatures(plan.features?.join(', ') || '');
    setNewPlanEffectiveDate(plan.effectiveDate?.slice(0, 10) || '2026-11-10');
    setIsEditPlanModalOpen(true);
  };

  const handleSaveEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      const updated = await api.plans.update(editingPlan.tier, {
        name: newPlanName,
        priceMonthly: Number(newPlanPrice),
        maxCertificates: Number(newPlanCerts),
        maxGateways: Number(newPlanGateways),
        effectiveDate: new Date(newPlanEffectiveDate).toISOString(),
        features: newPlanFeatures.split(',').map(s => s.trim()).filter(Boolean),
      });
      setPlans(prev => prev.map(p => (p.tier === updated.tier ? updated : p)));
      setIsEditPlanModalOpen(false);
      toast.success('Plan Updated', `Plan "${updated.name}" updated with effective date ${newPlanEffectiveDate}.`);
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not update plan');
    }
  };

  const handleCreateCustomPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const newPlan: PlanDefinition = {
      id: `plan_${Date.now()}`,
      tier: newPlanTier,
      name: newPlanName,
      priceMonthly: Number(newPlanPrice),
      maxCertificates: Number(newPlanCerts),
      maxGateways: Number(newPlanGateways),
      features: newPlanFeatures.split(',').map(s => s.trim()).filter(Boolean),
      effectiveDate: new Date(newPlanEffectiveDate).toISOString(),
    };
    setPlans(prev => [...prev, newPlan]);
    setIsAddPlanModalOpen(false);
    toast.success('Plan Created', `New plan "${newPlan.name}" created successfully.`);
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
      id: 'plans',
      label: 'Subscription Plans',
      icon: <Layers className="h-5 w-5" />,
      badge: plans.length > 0 ? plans.length : 4,
      active: activeTab === 'plans',
      onClick: () => setActiveTab('plans'),
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
      label: 'Usage & Cloud Billing',
      icon: <BarChart3 className="h-5 w-5" />,
      active: activeTab === 'marketplace',
      onClick: () => setActiveTab('marketplace'),
    },
  ];

  const displayPlans: PlanDefinition[] = plans.length > 0 ? plans : [
    {
      id: 'plan_community',
      tier: SubscriptionTier.COMMUNITY,
      name: 'Community Plan',
      maxCertificates: 50,
      maxGateways: 2,
      priceMonthly: 0,
      features: ['Up to 50 SSL certificates', '2 On-Prem Gateway daemons', 'Community Support', 'Basic Auto-Renewal'],
      effectiveDate: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'plan_paygo',
      tier: SubscriptionTier.AWS_MARKETPLACE_PAYGO,
      name: 'AWS Marketplace PayGO',
      maxCertificates: 250,
      maxGateways: 10,
      priceMonthly: 299,
      features: ['Up to 250 SSL certificates', '10 Local Gateways', 'Hourly Metering via AWS', 'AWS ALB & ACM Integration'],
      effectiveDate: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'plan_pro',
      tier: SubscriptionTier.PROFESSIONAL,
      name: 'Professional Team',
      maxCertificates: 500,
      maxGateways: 15,
      priceMonthly: 599,
      features: ['Up to 500 SSL certificates', '15 Gateways', 'Team RBAC & Audit Trails', 'Priority Email Support'],
      effectiveDate: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'plan_enterprise',
      tier: SubscriptionTier.ENTERPRISE,
      name: 'Enterprise Dedicated',
      maxCertificates: 1000,
      maxGateways: 25,
      priceMonthly: 1299,
      features: ['Unlimited / 1000+ Certificates', '25+ High Availability Gateways', 'Dedicated 24/7 SLA', 'Custom RLS Partitioning'],
      effectiveDate: '2026-01-01T00:00:00.000Z',
    },
  ];

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] text-[#0F172A] flex items-center justify-center p-4 font-sans">
        <Toaster position="top-right" />
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">CLM SaaS</h1>
              <p className="text-xs font-medium text-slate-500">Super Admin Control Plane</p>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Super Admin Email
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="superadmin@globalmindstech.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In to Super Admin'}
            </button>
          </form>
        </div>
      </div>
    );
  }

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
          icon={
            activeTab === 'tenants' ? (
              <Building2 className="h-5 w-5 text-blue-600" />
            ) : activeTab === 'plans' ? (
              <Layers className="h-5 w-5 text-blue-600" />
            ) : activeTab === 'audit' ? (
              <FileText className="h-5 w-5 text-blue-600" />
            ) : (
              <BarChart3 className="h-5 w-5 text-blue-600" />
            )
          }
          title={
            activeTab === 'tenants'
              ? 'Tenant Organizations'
              : activeTab === 'plans'
                ? 'Subscription Plans & Tiers'
                : activeTab === 'audit'
                  ? 'Global Audit Ledger'
                  : 'Workspace Usage & Cloud Billing'
          }
          subtitle={
            activeTab === 'tenants'
              ? 'Provision, manage and monitor subscriber SaaS workspaces under Row-Level Security.'
              : activeTab === 'plans'
                ? 'Configure subscription plan tiers, certificate & gateway quotas, and scheduled effective dates.'
                : activeTab === 'audit'
                  ? 'Immutable platform audit trail across all tenant organizations and gateway daemons.'
                  : 'Live certificate utilization, gateway fleet capacity, and cloud billing breakdown from PostgreSQL.'
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
                onClick={handleAdminLogout}
                title="Sign out of Super Admin"
                className="px-3 py-2 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm"
              >
                Sign Out
              </button>
              {activeTab === 'plans' ? (
                <button
                  onClick={() => setIsAddPlanModalOpen(true)}
                  className="primary-gradient-btn px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Custom Plan</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="primary-gradient-btn px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Organization</span>
                </button>
              )}
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
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${statusFilter === 'PENDING_APPROVAL'
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
                        <Building className="h-3.5 w-3.5 text-blue-600" />
                        <span>Billing Channel</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 mt-1 truncate">
                        {selectedTenant.awsCustomerIdentifier ? 'AWS Marketplace' : 'Direct Enterprise SaaS'}
                      </div>
                    </div>
                  </div>

                  {/* Real Tenant Parameters */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-3">
                    <div className="text-xs font-extrabold text-[#0F172A] flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-600" />
                      <span>Workspace Security & Configuration</span>
                    </div>

                    <div className="text-xs space-y-2 font-medium">
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Workspace Identifier</span>
                        <span className="font-mono text-slate-800 text-[11px]">/{selectedTenant.slug}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Database Role Isolation</span>
                        <span className="font-mono text-emerald-700 font-bold text-[11px]">PostgreSQL RLS Active (app.tenant_id)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Subscription Tier</span>
                        <span className="font-bold text-blue-600 text-[11px]">{selectedTenant.tier}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Created Date</span>
                        <span className="text-slate-700 text-[11px]">
                          {(() => {
                            try {
                              return new Date(selectedTenant.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              });
                            } catch {
                              return selectedTenant.createdAt;
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    {selectedTenant.status === TenantStatus.PENDING_APPROVAL ? (
                      <>
                        <button
                          onClick={() => handleApproveTenant(selectedTenant.id)}
                          className="flex-1 py-3 px-5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all"
                        >
                          <CheckCircle2 className="h-4 w-4 text-white" />
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

        {/* Tab 3: Workspace Usage & Cloud Billing View */}
        {activeTab === 'marketplace' && (
          <div className="space-y-5 pr-3 pb-6">
            {/* Real Aggregated Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl soft-card p-5 space-y-2 border-t-4 border-t-blue-500">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Total Workspaces</span>
                  <Building className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {metrics?.totalTenants ?? tenants.length}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {metrics?.activeTenants ?? tenants.filter(t => t.status === 'ACTIVE').length} Active • {metrics?.pendingTenants ?? tenants.filter(t => t.status === 'PENDING_APPROVAL').length} Pending
                </p>
              </div>

              <div className="bg-white rounded-2xl soft-card p-5 space-y-2 border-t-4 border-t-emerald-500">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Live Certificates</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {metrics?.totalCertificates ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Queried from PostgreSQL RLS tables
                </p>
              </div>

              <div className="bg-white rounded-2xl soft-card p-5 space-y-2 border-t-4 border-t-indigo-500">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Enrolled Gateways</span>
                  <Cpu className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {metrics?.totalGateways ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Satellite daemons in tenant networks
                </p>
              </div>

              <div className="bg-white rounded-2xl soft-card p-5 space-y-2 border-t-4 border-t-amber-500">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Billing Channels</span>
                  <ShoppingBag className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {metrics?.directTenants ?? tenants.length} Direct
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {metrics?.marketplaceTenants ?? 0} Cloud Marketplace contracts
                </p>
              </div>
            </div>

            {/* Billing Mode & Ingestion Status Notice */}
            <div className="bg-white rounded-2xl soft-card p-5 border border-slate-100 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                <Shield className="h-5 w-5" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-extrabold text-sm text-[#0F172A]">
                  Primary Billing Mode: Direct Enterprise SaaS (Active)
                </div>
                <p className="text-slate-500 leading-relaxed max-w-3xl">
                  Subscriber workspaces are currently operating on direct self-serve & enterprise subscription billing. Cloud marketplace ingestion (AWS Marketplace BatchMeterUsage, Azure SaaS Fulfillment v2, GCP Partner Procurement) endpoints are available and will automatically meter organizations that onboard through external marketplace contracts.
                </p>
              </div>
            </div>

            {/* Real Per-Tenant Usage & Quota Ledger */}
            <div className="bg-white rounded-[24px] soft-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <h4 className="text-base font-extrabold text-[#0F172A]">
                      Live Tenant Quota Utilization (Database-Driven)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time certificate counts and gateway capacity queried directly from PostgreSQL.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{metrics?.totalCertificates ?? 0} active certs total</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-1">
                  <span>Workspace Organization</span>
                  <span>Certificate Quota Consumption</span>
                </div>

                <div className="space-y-3 text-xs">
                  {(metrics?.usageByTenant ?? tenants).map((t: any) => {
                    const currentCerts = Number(t.currentCertificates) || 0;
                    const maxCerts = Number(t.maxCertificates) || 50;
                    const percent = Math.min(100, Math.round((currentCerts / maxCerts) * 100));
                    const currentGws = Number(t.currentGateways) || 0;
                    const maxGws = Number(t.maxGateways) || 5;

                    return (
                      <div key={t.id} className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">{t.name}</span>
                            <span className="font-mono text-xs text-slate-400">/{t.slug}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                              {t.tier}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-700'
                              : t.status === 'PENDING_APPROVAL'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                              }`}>
                              {t.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-medium">
                            <span className="text-slate-500">
                              Gateways: <strong className="text-slate-800">{currentGws} / {maxGws}</strong>
                            </span>
                            <span className="text-slate-700 font-semibold font-mono">
                              {currentCerts} / {maxCerts} certs ({percent}%)
                            </span>
                          </div>
                        </div>

                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${percent > 85 ? 'bg-rose-500' : percent > 60 ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                              }`}
                            style={{ width: `${Math.max(percent, currentCerts > 0 ? 4 : 0)}%` }}
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

        {/* Tab 4: Subscription Plans & Tiers */}
        {activeTab === 'plans' && (
          <div className="space-y-6 pr-3 pb-8">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl soft-card p-5 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Active Subscription Tiers</span>
                  <Layers className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-[#0F172A]">{displayPlans.length}</div>
                <p className="text-[11px] text-slate-500">Configured subscription plans for incoming tenant workspaces</p>
              </div>

              <div className="bg-white rounded-2xl soft-card p-5 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Enterprise Dedicated Ceiling</span>
                  <ShieldAlert className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-[#0F172A]">1,000+ Certs</div>
                <p className="text-[11px] text-slate-500">25 High Availability in-VPC gateway daemons allocated</p>
              </div>

              <div className="bg-white rounded-2xl soft-card p-5 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Grandfathering Policy</span>
                  <Clock className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-600">Active</div>
                <p className="text-[11px] text-slate-500">Scheduled effective date model with renewal grace period</p>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {displayPlans.map(plan => (
                <div
                  key={plan.id}
                  className="bg-white rounded-[24px] soft-card p-6 flex flex-col justify-between border border-slate-100 hover:border-blue-200 transition-all shadow-sm"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200">
                        {plan.tier}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {plan.effectiveDate ? `Eff: ${plan.effectiveDate.slice(0, 10)}` : 'Immediate'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-[#0F172A]">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-black text-[#0F172A]">
                          {plan.priceMonthly === 0 ? 'Free' : `$${plan.priceMonthly}`}
                        </span>
                        {plan.priceMonthly > 0 && <span className="text-xs text-slate-500 font-medium">/ month</span>}
                      </div>
                    </div>

                    {/* Quota Specs */}
                    <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Max Certificates:</span>
                        <span className="font-bold text-slate-800 font-mono">{plan.maxCertificates}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Max Gateways:</span>
                        <span className="font-bold text-slate-800 font-mono">{plan.maxGateways}</span>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Features</p>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        {plan.features?.map((f, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 mt-6">
                    <button
                      onClick={() => handleOpenEditPlan(plan)}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200 shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <span>Edit Plan & Quotas</span>
                    </button>
                  </div>
                </div>
              ))}
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
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${selectedPlanTier === plan.tier
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

      {/* Modal: Add Custom Plan */}
      <Modal
        isOpen={isAddPlanModalOpen}
        onClose={() => setIsAddPlanModalOpen(false)}
        title="Create Custom Subscription Plan"
        description="Define a new enterprise plan tier with custom certificate and gateway quotas."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCustomPlan} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Plan Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Growth Scale"
                value={newPlanName}
                onChange={e => setNewPlanName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Monthly Price ($)</label>
              <input
                type="number"
                min="0"
                value={newPlanPrice}
                onChange={e => setNewPlanPrice(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Max Certificates *</label>
              <input
                type="number"
                min="10"
                required
                value={newPlanCerts}
                onChange={e => setNewPlanCerts(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-mono text-[#0F172A] focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Max Gateways *</label>
              <input
                type="number"
                min="1"
                required
                value={newPlanGateways}
                onChange={e => setNewPlanGateways(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-mono text-[#0F172A] focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1">Scheduled Effective Date *</label>
            <input
              type="date"
              required
              value={newPlanEffectiveDate}
              onChange={e => setNewPlanEffectiveDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
            />
            <p className="text-[11px] text-slate-400 mt-1">Existing tenants grandfather their rates until this effective threshold.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1">Features (comma-separated)</label>
            <textarea
              rows={2}
              value={newPlanFeatures}
              onChange={e => setNewPlanFeatures(e.target.value)}
              placeholder="e.g. ACME Auto-Renew, Multi-Cloud Deploy, 24/7 SLA"
              className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddPlanModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-gradient-btn px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
            >
              Create Plan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Existing Plan */}
      <Modal
        isOpen={isEditPlanModalOpen}
        onClose={() => setIsEditPlanModalOpen(false)}
        title={`Edit Plan: ${editingPlan?.name || ''}`}
        description="Update quota limits, pricing, and the scheduled effective date for this tier."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEditPlan} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Plan Name *</label>
              <input
                type="text"
                required
                value={newPlanName}
                onChange={e => setNewPlanName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Monthly Price ($)</label>
              <input
                type="number"
                min="0"
                value={newPlanPrice}
                onChange={e => setNewPlanPrice(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Max Certificates *</label>
              <input
                type="number"
                min="10"
                required
                value={newPlanCerts}
                onChange={e => setNewPlanCerts(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-mono text-[#0F172A] focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Max Gateways *</label>
              <input
                type="number"
                min="1"
                required
                value={newPlanGateways}
                onChange={e => setNewPlanGateways(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-mono text-[#0F172A] focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1">Scheduled Effective Date *</label>
            <input
              type="date"
              required
              value={newPlanEffectiveDate}
              onChange={e => setNewPlanEffectiveDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
            />
            <p className="text-[11px] text-slate-400 mt-1">Changes take effect on this date. Active subscribers keep their grandfathered terms until renewal.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1">Features (comma-separated)</label>
            <textarea
              rows={2}
              value={newPlanFeatures}
              onChange={e => setNewPlanFeatures(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditPlanModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-gradient-btn px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
            >
              Save Plan & Quotas
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

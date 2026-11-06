import { useState } from 'react';
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
} from 'lucide-react';
import {
  TenantStatus,
  SubscriptionTier,
  type Tenant,
  AuditActorType,
  AuditAction,
  type AuditLog,
} from '@clm/shared-types';
import { Sidebar, StatusBadge, TopHeader, Modal } from '@clm/ui';

const INITIAL_TENANTS: Tenant[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Acme Global Corp',
    slug: 'acme-global',
    status: TenantStatus.ACTIVE,
    tier: SubscriptionTier.ENTERPRISE,
    maxCertificates: 1000,
    maxGateways: 25,
    awsAccountId: '123456789012',
    awsCustomerIdentifier: 'aws-cust-acme-prod',
    awsProductCode: 'clm-saas-enterprise-hourly',
    createdAt: 'Nov 10, 2025',
    updatedAt: 'Nov 10, 2026',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    name: 'FinTech Cloud Ltd',
    slug: 'fintech-cloud',
    status: TenantStatus.TRIAL,
    tier: SubscriptionTier.AWS_MARKETPLACE_PAYGO,
    maxCertificates: 250,
    maxGateways: 10,
    awsAccountId: '987654321098',
    awsCustomerIdentifier: 'aws-cust-fintech-sub',
    awsProductCode: 'clm-saas-paygo',
    createdAt: 'Nov 18, 2025',
    updatedAt: 'Nov 18, 2026',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    name: 'Staging Labs Inc',
    slug: 'staging-labs',
    status: TenantStatus.SUSPENDED,
    tier: SubscriptionTier.COMMUNITY,
    maxCertificates: 50,
    maxGateways: 2,
    createdAt: 'Nov 26, 2025',
    updatedAt: 'Nov 26, 2026',
  },
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud_001',
    tenantId: 'a0000000-0000-0000-0000-000000000001',
    actorType: AuditActorType.USER,
    actorId: 'u0000000-0000-0000-0000-000000000001',
    actorEmail: 'admin@acme.com',
    action: AuditAction.TENANT_CREATED,
    resourceType: 'TENANT',
    resourceId: 'a0000000-0000-0000-0000-000000000001',
    metadata: { name: 'Acme Global Corp', tier: 'ENTERPRISE' },
    ipAddress: '198.51.100.42',
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: 'aud_002',
    tenantId: 'a0000000-0000-0000-0000-000000000001',
    actorType: AuditActorType.GATEWAY,
    actorId: '20000000-0000-0000-0000-000000000001',
    action: AuditAction.GATEWAY_HEARTBEAT,
    resourceType: 'GATEWAY',
    resourceId: '20000000-0000-0000-0000-000000000001',
    metadata: { cpu: 2.1, memoryMb: 142 },
    ipAddress: '10.0.1.15',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: 'aud_003',
    tenantId: 'a0000000-0000-0000-0000-000000000002',
    actorType: AuditActorType.SYSTEM,
    actorId: 'AWS_MARKETPLACE_SYNC',
    action: AuditAction.TENANT_UPDATED,
    resourceType: 'TENANT',
    resourceId: 'a0000000-0000-0000-0000-000000000002',
    metadata: { meteringRecordDispatched: true, dimension: 'active_certs_quantity' },
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
  },
];

export function App() {
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(INITIAL_TENANTS[0]?.id ?? '');
  const [activeTab, setActiveTab] = useState<'tenants' | 'audit' | 'marketplace'>('tenants');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'TRIAL' | 'SUSPENDED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantSlug || !newAdminEmail) return;

    const newTenant: Tenant = {
      id: `a0000000-0000-0000-0000-${String(tenants.length + 1).padStart(12, '0')}`,
      name: newTenantName,
      slug: newTenantSlug,
      status: TenantStatus.ACTIVE,
      tier: newTenantTier,
      maxCertificates: 250,
      maxGateways: 10,
      awsAccountId: newAwsAccountId || null,
      awsCustomerIdentifier: newAwsAccountId ? `aws-cust-${newTenantSlug}` : null,
      createdAt: 'Today',
      updatedAt: 'Today',
    };

    setTenants([newTenant, ...tenants]);
    setSelectedTenantId(newTenant.id);
    setIsAddModalOpen(false);

    setNewTenantName('');
    setNewTenantSlug('');
    setNewAdminEmail('');
    setNewAwsAccountId('');
  };

  const handleToggleStatus = (id: string) => {
    setTenants(prev =>
      prev.map(t => {
        if (t.id === id) {
          const nextStatus = t.status === TenantStatus.ACTIVE ? TenantStatus.SUSPENDED : TenantStatus.ACTIVE;
          return { ...t, status: nextStatus };
        }
        return t;
      }),
    );
  };

  const handleDeleteTenant = (id: string, name: string) => {
      if (window.confirm(`Are you sure you want to permanently delete organization '${name}'?`)) {
        setTenants(prev => prev.filter(t => t.id !== id));
        if (selectedTenantId === id) {
          setSelectedTenantId(tenants.find(t => t.id !== id)?.id || '');
        }
    }
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.awsAccountId && t.awsAccountId.includes(searchTerm));
    if (statusFilter === 'ACTIVE') return matchesSearch && t.status === TenantStatus.ACTIVE;
    if (statusFilter === 'TRIAL') return matchesSearch && t.status === TenantStatus.TRIAL;
    if (statusFilter === 'SUSPENDED') return matchesSearch && t.status === TenantStatus.SUSPENDED;
    return matchesSearch;
  });

        // Reusable Sidebar Nav Items
        const navItems= [
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
      badge: 3,
      active: activeTab === 'audit',
      onClick: () => setActiveTab('audit'),
    },
      {
        id: 'marketplace',
      label: 'AWS Marketplace',
      icon: <ShoppingBag className="h-5 w-5" />,
      active: activeTab === 'marketplace',
      onClick: () => setActiveTab('marketplace'),
    },
      ];

      return (
      <div className="min-h-screen bg-[#F4F6FB] text-[#0F172A] flex p-3 font-sans selection:bg-blue-500/20 selection:text-blue-600">
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
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="primary-gradient-btn px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
              >
                <Plus className="h-4 w-4" />
                <span>Add Organization</span>
              </button>
            }
          />

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
                        className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-150 ${
                          isSelected
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
                                                                <button
                                                                  onClick={() => handleToggleStatus(selectedTenant.id)}
                                                                  className="primary-gradient-btn flex-1 py-3 px-5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2"
                                                                >
                                                                  <Power className="h-4 w-4" />
                                                                  <span>{selectedTenant.status === TenantStatus.ACTIVE ? 'Suspend Organization' : 'Activate Organization'}</span>
                                                                </button>

                                                                  <button
                                                                    onClick={() => handleDeleteTenant(selectedTenant.id, selectedTenant.name)}
                                                                    className="py-3 px-5 rounded-2xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-2"
                                                                  >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    <span>Delete</span>
                                                                  </button>
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
                                                                    {INITIAL_AUDIT_LOGS.length} Recorded Events
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
                                                                      {INITIAL_AUDIT_LOGS.map(log => (
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
                                                                      ))}
                                                                    </tbody>
                                                                  </table>
                                                                </div>
                                                              </div>
                                                            )}

                                                            {/* Tab 3: AWS Marketplace View */}
                                                            {activeTab === 'marketplace' && (
                                                              <div className="space-y-4 pr-3">
                                                                <div className="grid grid-cols-3 gap-4">
                                                                  <div className="bg-white rounded-2xl soft-card p-5">
                                                                    <div className="text-xs font-bold text-slate-400 uppercase">Product Code</div>
                                                                    <div className="text-base font-bold text-[#0F172A] mt-1">clm-saas-enterprise</div>
                                                                  </div>
                                                                  <div className="bg-white rounded-2xl soft-card p-5">
                                                                    <div className="text-xs font-bold text-slate-400 uppercase">Batch Interval</div>
                                                                    <div className="text-base font-bold text-[#0F172A] mt-1">1 Hour Sync</div>
                                                                  </div>
                                                                  <div className="bg-white rounded-2xl soft-card p-5">
                                                                    <div className="text-xs font-bold text-slate-400 uppercase">Callback Status</div>
                                                                    <div className="text-base font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
                                                                      <CheckCircle2 className="h-4 w-4" /> Healthy
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
                                                    </div>
                                                    );
}

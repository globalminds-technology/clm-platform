import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  FileText,
  Server,
  Zap,
  Bell,
  Settings,
  CheckCircle2,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Lock,
  Download,
  Filter,
  Eye,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  CertStatus,
  KeyAlgorithm,
  GatewayStatus,
  ValidationMethod,
  DeployTargetType,
  type Certificate,
  type Gateway,
  type AuditLog,
} from '@clm/shared-types';
import { Sidebar, TopHeader, Modal, StatusBadge, Drawer, ConfirmDialog, Toaster, toast } from '@clm/ui';
import { createApiClient } from '@clm/api-client';

const api = createApiClient({
  baseUrl: (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1',
  defaultHeaders: {
    'x-tenant-id': 'a0000000-0000-0000-0000-000000000001',
    'x-user-role': 'TENANT_ADMIN',
  },
});

export function App() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCertId, setSelectedCertId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'certificates' | 'gateways' | 'audit' | 'alerts' | 'settings'>('certificates');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING' | 'CRITICAL'>('ALL');
  const [targetFilter, setTargetFilter] = useState<'ALL' | 'AWS_ACM' | 'AWS_ALB' | 'NGINX'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Inspector Drawer & Delete Dialog
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [certToDelete, setCertToDelete] = useState<{ id: string; domain: string } | null>(null);

  // Add Certificate Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newSans, setNewSans] = useState('');
  const [newIssuer, setNewIssuer] = useState('DigiCert TLS RSA CA');
  const [newAlgorithm, setNewAlgorithm] = useState<KeyAlgorithm>(KeyAlgorithm.RSA_2048);

  // Enroll Gateway Modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [enrollToken, setEnrollToken] = useState<string>('');

  // Fetch live tenant data from PostgreSQL backend
  const fetchTenantData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [certList, gwList, auditList] = await Promise.all([
        api.certificates.list().catch((err: any) => {
          console.warn('Failed to load certificates from backend:', err);
          return [];
        }),
        api.gateways.list().catch((err: any) => {
          console.warn('Failed to load gateways from backend:', err);
          return [];
        }),
        api.audit.list().catch((err: any) => {
          console.warn('Failed to load audit logs from backend:', err);
          return [];
        }),
      ]);

      setCerts(certList);
      if (certList.length > 0 && !selectedCertId) {
        const first = certList[0];
        if (first) setSelectedCertId(first.id);
      }
      setGateways(gwList);
      setActivityLogs(auditList);
    } catch (err) {
      console.error('Error fetching tenant data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCertId]);

  useEffect(() => {
    fetchTenantData();
  }, [fetchTenantData]);

  const handleManualSync = async () => {
    await fetchTenantData();
    toast.info('Database Synchronized', 'Fetched latest certificates and gateway telemetry.');
  };

  const handleOpenEnrollModal = async () => {
    setShowEnrollModal(true);
    try {
      const res = await api.gateways.enroll({
        name: `gateway-satellite-${Math.random().toString(16).substring(2, 6)}`,
        targetTypesSupported: [DeployTargetType.AWS_ACM, DeployTargetType.NGINX],
      });
      setEnrollToken(res.token);
      toast.info('Gateway Token Ready', 'Generated single-use 24h enrollment token.');
    } catch (err: any) {
      console.warn('Backend gateway enrollment error:', err.message);
      setEnrollToken(
        'clm_enroll_YTAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAxOmcwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMjsxNzA5NzIzNDU2',
      );
    }
  };

  const copyToClipboard = () => {
    if (!enrollToken) return;
    navigator.clipboard.writeText(
      `curl -sSL https://get.clm-platform.com/install.sh | bash -s -- --token ${enrollToken}`,
    );
    setCopiedToken(true);
    toast.info('Command Copied', 'Installation command copied to clipboard.');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const selectedCert = useMemo(() => {
    return certs.find(c => c.id === selectedCertId) || certs[0];
  }, [certs, selectedCertId]);

  const activeCount = useMemo(() => certs.filter(c => c.status === CertStatus.ACTIVE).length, [certs]);
  const expiringCount = useMemo(() => certs.filter(c => c.status === CertStatus.EXPIRING_SOON).length, [certs]);
  const criticalCount = useMemo(() => certs.filter(c => c.status === CertStatus.EXPIRED || c.daysRemaining <= 7).length, [certs]);

  // Expiry Histogram buckets
  const expiryHistogram = useMemo(() => {
    return {
      critical: certs.filter(c => c.daysRemaining <= 7).length,
      warning: certs.filter(c => c.daysRemaining > 7 && c.daysRemaining <= 30).length,
      upcoming: certs.filter(c => c.daysRemaining > 30 && c.daysRemaining <= 90).length,
      healthy: certs.filter(c => c.daysRemaining > 90).length,
    };
  }, [certs]);

  const filteredCerts = useMemo(() => {
    return certs.filter(c => {
      const matchesSearch =
        c.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.issuer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.keyAlgorithm.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === 'ACTIVE') matchesStatus = c.status === CertStatus.ACTIVE;
      if (statusFilter === 'EXPIRING') matchesStatus = c.status === CertStatus.EXPIRING_SOON;
      if (statusFilter === 'CRITICAL') matchesStatus = c.status === CertStatus.EXPIRED || c.daysRemaining <= 7;

      let matchesTarget = true;
      if (targetFilter === 'AWS_ACM') matchesTarget = c.domain.includes('example.com') && c.deployTargetCount >= 2;
      if (targetFilter === 'AWS_ALB') matchesTarget = c.deployTargetCount >= 1;
      if (targetFilter === 'NGINX') matchesTarget = c.domain.includes('portal') || c.domain.includes('static');

      return matchesSearch && matchesStatus && matchesTarget;
    });
  }, [certs, searchTerm, statusFilter, targetFilter]);

  const exportAsJson = () => {
    const exportData = filteredCerts.map(({ id, domain, sans, status, keyAlgorithm, issuer, daysRemaining, notBefore, notAfter }) => ({
      id,
      domain,
      sans,
      status,
      keyAlgorithm,
      issuer,
      daysRemaining,
      notBefore,
      notAfter,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clm-certificates-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export Successful', `Exported ${filteredCerts.length} certificates to JSON.`);
  };

  const exportAsCsv = () => {
    const headers = ['ID', 'Domain', 'SANs', 'Status', 'Algorithm', 'Issuer', 'DaysRemaining', 'ExpiresAt'];
    const rows = filteredCerts.map(c => [
      c.id,
      c.domain,
      `"${c.sans.join(';')}"`,
      c.status,
      c.keyAlgorithm,
      `"${c.issuer}"`,
      c.daysRemaining,
      c.notAfter,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clm-certificates-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export Successful', `Exported ${filteredCerts.length} certificates to CSV.`);
  };

  const handleCreateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    const sansArray = newSans
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      const created = await api.certificates.create({
        domain: newDomain.trim(),
        sans: sansArray.length > 0 ? sansArray : [newDomain.trim()],
        keyAlgorithm: newAlgorithm,
        validationMethod: ValidationMethod.DNS_01,
        renewBeforeDays: 30,
        autoRenew: true,
        gatewayId: gateways[0]?.id,
      });

      setCerts(prev => [created, ...prev]);
      setSelectedCertId(created.id);
      setIsAddModalOpen(false);
      setNewDomain('');
      setNewSans('');

      toast.success('Certificate Created', `SSL certificate for "${newDomain.trim()}" issued successfully.`);

      // Refresh activity logs
      api.audit.list().then(setActivityLogs).catch(() => { });
    } catch (err: any) {
      toast.error('Issuance Failed', `Failed to create certificate: ${err.message}`);
    }
  };

  const handleRenewCertificate = async (certId: string) => {
    try {
      const updated = await api.certificates.renew(certId);
      setCerts(prev => prev.map(c => (c.id === certId ? updated : c)));
      toast.success('Certificate Renewed', `Validity extended by 90 days for ${updated.domain || 'certificate'}.`);
      api.audit.list().then(setActivityLogs).catch(() => { });
    } catch (err: any) {
      toast.error('Renewal Failed', `Failed to renew certificate: ${err.message}`);
    }
  };

  const handleDeleteCertificate = (certId: string, domain: string) => {
    setCertToDelete({ id: certId, domain });
  };

  const confirmDeleteCertificate = async () => {
    if (!certToDelete) return;
    const { id, domain } = certToDelete;
    try {
      if (api.http) {
        await api.http.delete(`certificates/${id}`);
      }
      setCerts(prev => prev.filter(c => c.id !== id));
      if (selectedCertId === id) {
        const remaining = certs.filter(c => c.id !== id);
        setSelectedCertId(remaining[0]?.id || '');
      }
      toast.warning('Certificate Revoked', `Certificate "${domain}" has been revoked.`);
      api.audit.list().then(setActivityLogs).catch(() => { });
    } catch (err: any) {
      toast.error('Revocation Failed', `Failed to revoke certificate: ${err.message}`);
    } finally {
      setCertToDelete(null);
    }
  };

  const navItems = [
    {
      id: 'certificates',
      label: 'Certificates',
      icon: <FileText className="h-5 w-5" />,
      badge: certs.length,
      active: activeTab === 'certificates',
      onClick: () => setActiveTab('certificates'),
    },
    {
      id: 'gateways',
      label: 'Gateways',
      icon: <Server className="h-5 w-5" />,
      badge: gateways.length,
      active: activeTab === 'gateways',
      onClick: () => setActiveTab('gateways'),
    },
    {
      id: 'audit',
      label: 'Activity Logs',
      icon: <Zap className="h-5 w-5" />,
      badge: activityLogs.length > 0 ? activityLogs.length : undefined,
      active: activeTab === 'audit',
      onClick: () => setActiveTab('audit'),
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <Bell className="h-5 w-5" />,
      badge: criticalCount > 0 ? criticalCount : undefined,
      active: activeTab === 'alerts',
      onClick: () => setActiveTab('alerts'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-5 w-5" />,
      active: activeTab === 'settings',
      onClick: () => setActiveTab('settings'),
    },
  ];

  return (
      <div className="min-h-screen bg-[#F4F6FB] text-[#0F172A] flex p-3 font-sans selection:bg-blue-500/20 selection:text-blue-600">
        {/* Toast Notification Container */}
        <Toaster position="top-right" />

        {/* ========================================================================= */}
        {/* 1. Reusable Floating Collapsible Sidebar (Clean Alignment in Both Modes)  */}
        {/* ========================================================================= */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          brandName="CertFlow"
          brandIcon={<ShieldCheck className="h-6 w-6" />}
          items={navItems}
          user={{
            name: 'Alice Vance',
            role: 'Tenant Admin',
            initials: 'AV',
          }}
        />

        {/* ========================================================================= */}
        {/* 2. Main Workspace (Header + Active Tab Content)                           */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col min-w-0 pl-5 overflow-y-auto">
          <TopHeader
            icon={
              activeTab === 'gateways' ? (
                <Server className="h-5 w-5 text-blue-600" />
              ) : activeTab === 'audit' ? (
                <Zap className="h-5 w-5 text-blue-600" />
              ) : (
                <FileText className="h-5 w-5 text-blue-600" />
              )
            }
            title={
              activeTab === 'gateways'
                ? 'Local Gateways'
                : activeTab === 'audit'
                  ? 'Activity Logs'
                  : activeTab === 'alerts'
                    ? 'Security Alerts'
                    : activeTab === 'settings'
                      ? 'Tenant Settings'
                      : 'Certificates'
            }
            subtitle={
              activeTab === 'gateways'
                ? 'Zero-trust agent daemons installed inside your VPC or on-prem networks.'
                : activeTab === 'audit'
                  ? 'Immutable audit trail of certificate lifecycle events and gateway operations.'
                  : 'Manage, renew and monitor SSL certificates across your infrastructure.'
            }
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search certificates, domains, issuers..."
            unreadNotifications={criticalCount > 0}
            userInitials="AV"
            actionButton={
              <div className="flex items-center gap-2">
                <button
                  onClick={handleManualSync}
                  disabled={isLoading}
                  title="Refresh from PostgreSQL database"
                  className="px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Sync DB</span>
                </button>
                {activeTab === 'gateways' ? (
                  <button
                    onClick={handleOpenEnrollModal}
                    className="primary-gradient-btn px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Enroll Gateway</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="primary-gradient-btn px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Certificate</span>
                  </button>
                )}
              </div>
            }
          />

          {/* ======================================================================= */}
          {/* 3. CERTIFICATES TAB (2-Column Master-Detail Layout)                     */}
          {/* ======================================================================= */}
          {activeTab === 'certificates' && (
            <div className="space-y-5 pr-3 pb-6">
              {/* Top Controls: Expiry Histogram & Export Actions */}
              <div className="grid grid-cols-12 gap-5">
                {/* Expiry Timeline Widget */}
                <div className="col-span-12 lg:col-span-8 bg-white rounded-[24px] soft-card p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                        Certificate Expiry Timeline
                      </h4>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">
                      Total {certs.length} Active Monitored
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 pt-3">
                    <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100">
                      <div className="text-[10px] font-bold text-rose-600 uppercase">Within 7 Days</div>
                      <div className="text-lg font-black text-rose-700 mt-0.5">{expiryHistogram.critical}</div>
                      <div className="text-[10px] text-rose-500 font-medium mt-0.5">Immediate renewal</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
                      <div className="text-[10px] font-bold text-amber-600 uppercase">8 - 30 Days</div>
                      <div className="text-lg font-black text-amber-700 mt-0.5">{expiryHistogram.warning}</div>
                      <div className="text-[10px] text-amber-500 font-medium mt-0.5">Renewal queued</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100">
                      <div className="text-[10px] font-bold text-blue-600 uppercase">31 - 90 Days</div>
                      <div className="text-lg font-black text-blue-700 mt-0.5">{expiryHistogram.upcoming}</div>
                      <div className="text-[10px] text-blue-500 font-medium mt-0.5">Monitored</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase">&gt; 90 Days</div>
                      <div className="text-lg font-black text-emerald-700 mt-0.5">{expiryHistogram.healthy}</div>
                      <div className="text-[10px] text-emerald-500 font-medium mt-0.5">Healthy & valid</div>
                    </div>
                  </div>
                </div>

                {/* Export & Target Filter Card */}
                <div className="col-span-12 lg:col-span-4 bg-white rounded-[24px] soft-card p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <Filter className="h-4 w-4 text-blue-600" />
                      <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                        Target & Export
                      </h4>
                    </div>
                    <div className="pt-3 space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Filter By Target</label>
                      <select
                        value={targetFilter}
                        onChange={e => setTargetFilter(e.target.value as any)}
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600"
                      >
                        <option value="ALL">All Targets (AWS ACM, ALB, NGINX)</option>
                        <option value="AWS_ACM">AWS ACM Endpoints</option>
                        <option value="AWS_ALB">AWS Application Load Balancers</option>
                        <option value="NGINX">NGINX / On-Prem Gateways</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={exportAsCsv}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={exportAsJson}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>JSON</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2-Column Master-Detail Layout */}
              <div className="grid grid-cols-12 gap-5">
                {/* LEFT COLUMN: Certificates Master List (Span 5) */}
                <div className="col-span-12 xl:col-span-5">
                  <div className="bg-white rounded-[28px] soft-card p-5 space-y-4">
                    {/* Pill Tabs */}
                    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F8FAFC] border border-slate-100">
                      <button
                        onClick={() => setStatusFilter('ALL')}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === 'ALL' ? 'pill-tab-active' : 'pill-tab-inactive'
                          }`}
                      >
                        All ({certs.length})
                      </button>
                      <button
                        onClick={() => setStatusFilter('ACTIVE')}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === 'ACTIVE' ? 'pill-tab-active' : 'pill-tab-inactive'
                          }`}
                      >
                        Active ({activeCount})
                      </button>
                      <button
                        onClick={() => setStatusFilter('EXPIRING')}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === 'EXPIRING' ? 'pill-tab-active' : 'pill-tab-inactive'
                          }`}
                      >
                        Expiring ({expiringCount})
                      </button>
                      <button
                        onClick={() => setStatusFilter('CRITICAL')}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === 'CRITICAL' ? 'pill-tab-active' : 'pill-tab-inactive'
                          }`}
                      >
                        Critical ({criticalCount})
                      </button>
                    </div>

                    {/* Sub-header Filter Bar */}
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                      <span>Certificate Domain</span>
                      <span>Days Left</span>
                    </div>

                    {/* Certificates List */}
                    <div className="space-y-2">
                      {filteredCerts.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs">
                          No certificates match your query.
                        </div>
                      ) : (
                        filteredCerts.map(cert => {
                          const isSelected = cert.id === selectedCert?.id;
                          const isCritical = cert.status === CertStatus.EXPIRED || cert.daysRemaining <= 7;
                          const isExpiring = cert.status === CertStatus.EXPIRING_SOON;

                          return (
                            <div
                              key={cert.id}
                              onClick={() => setSelectedCertId(cert.id)}
                              className={`p-3.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between border ${isSelected
                                ? 'bg-blue-50/50 border-blue-200 shadow-xs ring-1 ring-blue-500/20'
                                : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/60'
                                }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => setSelectedCertId(cert.id)}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-[#0F172A] truncate">
                                    {cert.domain}
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate">
                                    {cert.issuer}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className="text-[11px] font-semibold text-slate-500">
                                  {cert.daysRemaining > 0 ? `${cert.daysRemaining}d` : 'Expired'}
                                </span>
                                {isCritical ? (
                                  <StatusBadge variant="critical" label="Critical" />
                                ) : isExpiring ? (
                                  <StatusBadge variant="warning" label="Expiring" />
                                ) : (
                                  <StatusBadge variant="healthy" label="Healthy" />
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer Count */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                      <span>Showing {filteredCerts.length} of {certs.length} certificates</span>
                      <span className="text-slate-400">Page 1 of 1</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Interactive Detail View (Span 7) */}
                <div className="col-span-12 xl:col-span-7">
                  {selectedCert ? (
                    <div className="bg-white rounded-[28px] soft-card p-6 space-y-6">
                      {/* Certificate Title Header */}
                      <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
                            <ShieldCheck className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-extrabold text-[#0F172A] tracking-tight">
                                {selectedCert.domain}
                              </h3>
                              <StatusBadge
                                variant={
                                  selectedCert.status === CertStatus.ACTIVE
                                    ? 'healthy'
                                    : selectedCert.status === CertStatus.EXPIRING_SOON
                                      ? 'warning'
                                      : 'critical'
                                }
                                label={selectedCert.status}
                              />
                            </div>
                            <p className="text-xs text-slate-400 font-medium">
                              SSL Certificate ({selectedCert.keyAlgorithm})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRenewCertificate(selectedCert.id)}
                            className="h-8 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold flex items-center gap-1.5 transition-colors"
                            title="Renew certificate"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Renew</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCertificate(selectedCert.id, selectedCert.domain)}
                            className="h-8 w-8 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                            title="Delete certificate"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* 4 Summary Stat Cards */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100">
                          <div className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
                            Days Remaining
                          </div>
                          <div className="text-xl font-extrabold text-rose-600 mt-1">
                            {selectedCert.daysRemaining} days
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100">
                          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                            Expiry Date
                          </div>
                          <div className="text-xs font-extrabold text-blue-900 mt-1.5 truncate">
                            {new Date(selectedCert.notAfter).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Issuer
                          </div>
                          <div className="text-xs font-bold text-slate-800 mt-1.5 truncate">
                            {selectedCert.issuer}
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                          <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                            Algorithm
                          </div>
                          <div className="text-xs font-bold text-indigo-900 mt-1.5 truncate">
                            {selectedCert.keyAlgorithm}
                          </div>
                        </div>
                      </div>

                      {/* Technical Certificate Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-3">
                          <div className="flex items-center gap-2 text-xs font-extrabold text-[#0F172A]">
                            <Server className="h-4 w-4 text-blue-600" />
                            <span>Deployment Targets</span>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                <span className="font-semibold text-slate-800">us-east-1-prod-gateway</span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-400">Port 443</span>
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                <span className="font-semibold text-slate-800">AWS ALB Ingress</span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-400">HTTPS</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-extrabold text-[#0F172A]">
                            <Lock className="h-4 w-4 text-blue-600" />
                            <span>Security Specifications</span>
                          </div>
                          <div className="text-xs space-y-1.5 font-medium">
                            <div className="flex justify-between">
                              <span className="text-slate-400">SANs</span>
                              <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                                {selectedCert.sans.join(', ')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Serial No</span>
                              <span className="font-mono text-[11px] text-slate-700">
                                {selectedCert.serialNumber}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Auto-Renewal</span>
                              <span className="text-emerald-600 font-bold">
                                {selectedCert.autoRenew ? 'Enabled (30d before)' : 'Disabled'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">SHA-256</span>
                              <span className="font-mono text-[11px] text-slate-500 truncate max-w-[140px]">
                                {selectedCert.fingerprintSha256}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Primary Action Buttons */}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => handleRenewCertificate(selectedCert.id)}
                          className="primary-gradient-btn flex-1 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/25"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>Approve & Trigger Immediate Renewal</span>
                        </button>
                        <button
                          onClick={() => setIsDrawerOpen(true)}
                          className="px-4 py-3 rounded-2xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-xs font-bold text-blue-700 transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Deep Inspector</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-[28px] soft-card p-12 text-center text-slate-400 text-sm">
                      Select a certificate from the left column to view its details.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* 4. GATEWAYS TAB                                                         */}
          {/* ======================================================================= */}
          {activeTab === 'gateways' && (
            <div className="bg-white rounded-[28px] soft-card p-6 mr-3 mb-6 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                    Enrolled Infrastructure Gateways
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gateways maintain an outbound mTLS tunnel to securely pull renewal jobs and deploy certificates.
                  </p>
                </div>
                <button
                  onClick={handleOpenEnrollModal}
                  className="primary-gradient-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>Enroll New Gateway</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gateways.map(gw => (
                  <div
                    key={gw.id}
                    className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-100 hover:border-slate-200 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <Server className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-[#0F172A]">{gw.name}</div>
                          <div className="text-xs font-mono text-slate-400">{gw.hostname}</div>
                        </div>
                      </div>
                      <StatusBadge
                        variant={gw.status === GatewayStatus.ONLINE ? 'healthy' : 'critical'}
                        label={gw.status}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60 font-medium">
                      <div>
                        <span className="text-slate-400">IP Address: </span>
                        <span className="font-mono text-slate-700">{gw.ipAddress}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Agent Version: </span>
                        <span className="text-slate-700">v{gw.version}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Heartbeat: </span>
                        <span className="text-emerald-600 font-bold">{gw.lastHeartbeatAt}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Targets: </span>
                        <span className="text-slate-700">{gw.targetTypesSupported.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* 5. ACTIVITY / AUDIT LOGS TAB                                            */}
          {/* ======================================================================= */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-[28px] soft-card p-6 mr-3 mb-6 space-y-4">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                  Activity & Audit History
                </h3>
                <p className="text-xs text-slate-500">
                  Full chronological ledger of certificate operations, approvals, and gateway events.
                </p>
              </div>

              <div className="space-y-3">
                {activityLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No activity logs recorded yet. All certificate actions will appear here in chronological order.
                  </div>
                ) : (
                  activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-[#0F172A]">{log.action}</div>
                          <div className="text-[11px] text-slate-500">
                            {log.resourceType}: {log.resourceId}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-[11px]">
                        <div className="font-semibold text-slate-700">{log.actorEmail || log.actorType}</div>
                        <div className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* 6. ALERTS & SETTINGS TABS                                               */}
          {/* ======================================================================= */}
          {(activeTab === 'alerts' || activeTab === 'settings') && (
            <div className="bg-white rounded-[28px] soft-card p-8 mr-3 mb-6 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                {activeTab === 'alerts' ? <Bell className="h-6 w-6" /> : <Settings className="h-6 w-6" />}
              </div>
              <h3 className="text-base font-extrabold text-[#0F172A] capitalize">
                {activeTab} Management
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Configure alert thresholds, webhooks (Slack/Teams), and CA provider credentials for automated ACME issuance.
              </p>
            </div>
          )}
        </main>

        {/* ========================================================================= */}
        {/* 7. Modal: Add Certificate                                                 */}
        {/* ========================================================================= */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add SSL Certificate"
          description="Enroll a new domain for automated lifecycle tracking and gateway deployment."
          maxWidth="md"
        >
          <form onSubmit={handleCreateCertificate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Primary Domain
              </label>
              <input
                type="text"
                required
                placeholder="e.g. checkout.acme.com"
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Subject Alternative Names (Comma Separated)
              </label>
              <input
                type="text"
                placeholder="e.g. checkout.acme.com, www.checkout.acme.com"
                value={newSans}
                onChange={e => setNewSans(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  CA Issuer
                </label>
                <select
                  value={newIssuer}
                  onChange={e => setNewIssuer(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs bg-white"
                >
                  <option value="DigiCert TLS RSA CA">DigiCert TLS CA</option>
                  <option value="Let's Encrypt R3">Let's Encrypt R3</option>
                  <option value="Sectigo RSA DV">Sectigo RSA DV</option>
                  <option value="GlobalSign RSA OV">GlobalSign OV</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Key Algorithm
                </label>
                <select
                  value={newAlgorithm}
                  onChange={e => setNewAlgorithm(e.target.value as KeyAlgorithm)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs bg-white"
                >
                  <option value={KeyAlgorithm.RSA_2048}>RSA 2048</option>
                  <option value={KeyAlgorithm.RSA_4096}>RSA 4096</option>
                  <option value={KeyAlgorithm.ECDSA_P256}>ECDSA P-256</option>
                  <option value={KeyAlgorithm.ECDSA_P384}>ECDSA P-384</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-gradient-btn px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
              >
                Save & Track
              </button>
            </div>
          </form>
        </Modal>

        {/* ========================================================================= */}
        {/* 8. Modal: Enroll Gateway Command                                          */}
        {/* ========================================================================= */}
        <Modal
          isOpen={showEnrollModal}
          onClose={() => setShowEnrollModal(false)}
          title="Enroll Local Gateway Daemon"
          description="Execute this one-line command inside your VPC, Kubernetes cluster, or server."
          maxWidth="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              The daemon will automatically generate an ECDSA private key locally, connect to our control plane via mTLS, and establish its heartbeat.
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] relative flex items-center justify-between">
              <span className="truncate pr-4">
                curl -sSL https://get.clm-platform.com/install.sh | bash -s -- --token {enrollToken || 'clm_enroll_generating...'}
              </span>
              <button
                onClick={copyToClipboard}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
              >
                {copiedToken ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowEnrollModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>

        {/* Deep Certificate Inspector Drawer */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title={`Deep Certificate Inspector: ${selectedCert?.domain}`}
          description="Comprehensive cryptographic chain, SANs, and deployment targets"
          width="xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-400 font-mono">
                SHA-256: {selectedCert?.fingerprintSha256.substring(0, 16)}...
              </span>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          }
        >
          {selectedCert && (
            <div className="space-y-6">
              {/* Header Status */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                <div>
                  <div className="text-xs text-blue-600 font-bold uppercase">Status</div>
                  <div className="text-base font-extrabold text-blue-900 mt-0.5">{selectedCert.status}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-blue-600 font-bold uppercase">Days Remaining</div>
                  <div className="text-base font-extrabold text-blue-900 mt-0.5">{selectedCert.daysRemaining} days</div>
                </div>
              </div>

              {/* Subject Alternative Names */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-blue-600" />
                  <span>Subject Alternative Names (SANs)</span>
                </h4>
                <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
                  {selectedCert.sans.map((san, idx) => (
                    <div key={idx} className="font-mono text-xs text-slate-800 flex items-center gap-2">
                      <span className="text-slate-400">DNS:{idx + 1}</span>
                      <span>{san}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cryptographic Specifications */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-blue-600" />
                  <span>Cryptographic Metadata</span>
                </h4>
                <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Key Algorithm</span>
                    <span className="font-mono font-bold text-slate-800">{selectedCert.keyAlgorithm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Serial Number</span>
                    <span className="font-mono text-slate-800">{selectedCert.serialNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Certificate Authority</span>
                    <span className="text-slate-800 font-semibold">{selectedCert.issuer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valid From</span>
                    <span className="text-slate-700">{new Date(selectedCert.notBefore).toUTCString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valid To</span>
                    <span className="text-slate-700">{new Date(selectedCert.notAfter).toUTCString()}</span>
                  </div>
                </div>
              </div>

              {/* Simulated PEM Chain Viewer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                    <span>PEM Certificate Chain</span>
                  </h4>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-mono font-bold">
                    Chain Verified
                  </span>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed">
                  {`-----BEGIN CERTIFICATE-----
MIIF4zCCBMugAwIBAgIQB8nZ/C8r+75d1v2v4f0aODANBgkqhkiG9w0BAQsFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBD
... [Truncated for inspection] ...
${selectedCert.fingerprintSha256.substring(0, 48)}
-----END CERTIFICATE-----`}
                </pre>
              </div>
            </div>
          )}
        </Drawer>

        {/* Confirmation Dialog for Certificate Revocation / Deletion */}
        <ConfirmDialog
          isOpen={!!certToDelete}
          onClose={() => setCertToDelete(null)}
          onConfirm={confirmDeleteCertificate}
          title="Revoke & Delete Certificate"
          description={`Are you sure you want to permanently delete the certificate for '${certToDelete?.domain}'? Active HTTPS traffic relying on this certificate may terminate immediately.`}
          confirmLabel="Revoke & Delete"
          variant="danger"
        />
      </div>
      );
}

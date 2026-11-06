import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import {
  CertStatus,
  KeyAlgorithm,
  GatewayStatus,
  type Certificate,
  type Gateway,
} from '@clm/shared-types';
import { Sidebar, TopHeader, Modal, StatusBadge } from '@clm/ui';

const INITIAL_CERTIFICATES: Certificate[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    tenantId: 'a0000000-0000-0000-0000-000000000001',
    domain: 'payments.example.com',
    sans: ['payments.example.com', 'www.payments.example.com'],
    status: CertStatus.ACTIVE,
    keyAlgorithm: KeyAlgorithm.RSA_2048,
    issuer: 'DigiCert TLS RSA CA',
    serialNumber: '4a2b9c8d1e7f0a3b5c7d',
    fingerprintSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    notBefore: '2025-11-10T00:00:00.000Z',
    notAfter: '2026-11-10T00:00:00.000Z',
    daysRemaining: 6,
    autoRenew: true,
    renewBeforeDays: 30,
    gatewayId: 'g0000000-0000-0000-0000-000000000001',
    deployTargetCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    tenantId: 'a0000000-0000-0000-0000-000000000001',
    domain: 'api.example.com',
    sans: ['api.example.com'],
    status: CertStatus.EXPIRING_SOON,
    keyAlgorithm: KeyAlgorithm.RSA_2048,
    issuer: 'Sectigo RSA DV',
    serialNumber: '7b8c9d0e1f2a3b4c5d6e',
    fingerprintSha256: '1234c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    notBefore: '2025-11-18T00:00:00.000Z',
    notAfter: '2026-11-18T00:00:00.000Z',
    daysRemaining: 14,
    autoRenew: true,
    renewBeforeDays: 30,
    gatewayId: 'g0000000-0000-0000-0000-000000000001',
    deployTargetCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    tenantId: 'a0000000-0000-0000-0000-000000000001',
    domain: 'portal.example.com',
    sans: ['portal.example.com'],
    status: CertStatus.EXPIRING_SOON,
    keyAlgorithm: KeyAlgorithm.ECDSA_P256,
    issuer: "Let's Encrypt R3",
    serialNumber: '9f8e7d6c5b4a3a2b1c',
    fingerprintSha256: '9876c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    notBefore: '2025-11-26T00:00:00.000Z',
    notAfter: '2026-11-26T00:00:00.000Z',
    daysRemaining: 20,
    autoRenew: true,
    renewBeforeDays: 30,
    deployTargetCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    tenantId: 'a0000000-0000-0000-0000-000000000001',
    domain: 'admin.example.com',
    sans: ['admin.example.com'],
    status: CertStatus.ACTIVE,
    keyAlgorithm: KeyAlgorithm.RSA_2048,
    issuer: 'DigiCert TLS RSA CA',
    serialNumber: '3c4d5e6f7a8b9c0d1e',
    fingerprintSha256: '5544c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    notBefore: '2025-12-05T00:00:00.000Z',
    notAfter: '2026-12-05T00:00:00.000Z',
    daysRemaining: 120,
    autoRenew: true,
    renewBeforeDays: 30,
    deployTargetCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'c0000000-0000-0000-0000-000000000005',
    tenantId: 'a0000000-0000-0000-0000-000000000001',
    domain: 'app.example.com',
    sans: ['app.example.com'],
    status: CertStatus.ACTIVE,
    keyAlgorithm: KeyAlgorithm.ECDSA_P384,
    issuer: 'GlobalSign RSA OV',
    serialNumber: '8a7b6c5d4e3f2a1b0c',
    fingerprintSha256: '7766c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    notBefore: '2025-12-20T00:00:00.000Z',
    notAfter: '2026-12-20T00:00:00.000Z',
    daysRemaining: 140,
    autoRenew: true,
    renewBeforeDays: 30,
    deployTargetCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'c0000000-0000-0000-0000-000000000006',
    tenantId: 'a0000000-0000-0000-0000-000000000001',
    domain: 'static.example.com',
    sans: ['static.example.com'],
    status: CertStatus.EXPIRED,
    keyAlgorithm: KeyAlgorithm.RSA_2048,
    issuer: "Let's Encrypt R3",
    serialNumber: '1f2e3d4c5b6a7b8c9d',
    fingerprintSha256: '9988c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    notBefore: '2024-11-01T00:00:00.000Z',
    notAfter: '2025-11-01T00:00:00.000Z',
    daysRemaining: 0,
    autoRenew: false,
    renewBeforeDays: 30,
    deployTargetCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_GATEWAYS: Gateway[] = [
  {
    id: 'g0000000-0000-0000-0000-000000000001',
    tenantId: 'a0000000-0000-0000-0000-000000000001',
    name: 'us-east-1-prod-gateway',
    hostname: 'gw-prod-01.acme.internal',
    ipAddress: '10.0.1.15',
    version: '1.0.0',
    status: GatewayStatus.ONLINE,
    targetTypesSupported: ['AWS_ACM' as any, 'AWS_ALB' as any, 'NGINX' as any],
    labels: { env: 'production', region: 'us-east-1' },
    lastHeartbeatAt: 'Just now',
    enrolledAt: '2025-10-10T00:00:00.000Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'g0000000-0000-0000-0000-000000000002',
    tenantId: 'a0000000-0000-0000-0000-000000000001',
    name: 'eu-west-1-backup-gateway',
    hostname: 'gw-eu-01.acme.internal',
    ipAddress: '10.2.4.88',
    version: '1.0.0',
    status: GatewayStatus.ONLINE,
    targetTypesSupported: ['NGINX' as any, 'APACHE' as any],
    labels: { env: 'backup', region: 'eu-west-1' },
    lastHeartbeatAt: '2 mins ago',
    enrolledAt: '2025-11-01T00:00:00.000Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function App() {
  const [certs, setCerts] = useState<Certificate[]>(INITIAL_CERTIFICATES);
  const [gateways] = useState<Gateway[]>(INITIAL_GATEWAYS);
  const [selectedCertId, setSelectedCertId] = useState<string>(INITIAL_CERTIFICATES[0]?.id ?? '');
  const [activeTab, setActiveTab] = useState<'certificates' | 'gateways' | 'audit' | 'alerts' | 'settings'>('certificates');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING' | 'CRITICAL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Add Certificate Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newSans, setNewSans] = useState('');
  const [newIssuer, setNewIssuer] = useState('DigiCert TLS RSA CA');
  const [newAlgorithm, setNewAlgorithm] = useState<KeyAlgorithm>(KeyAlgorithm.RSA_2048);

  // Enroll Gateway Modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const mockToken =
    'clm_enroll_YTAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAxOmcwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMjsxNzA5NzIzNDU2';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(
      `curl -sSL https://get.clm-platform.com/install.sh | bash -s -- --token ${mockToken}`,
    );
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const selectedCert = useMemo(() => {
    return certs.find(c => c.id === selectedCertId) || certs[0];
  }, [certs, selectedCertId]);

        const activeCount = useMemo(() => certs.filter(c => c.status === CertStatus.ACTIVE).length, [certs]);
        const expiringCount = useMemo(() => certs.filter(c => c.status === CertStatus.EXPIRING_SOON).length, [certs]);
        const criticalCount = useMemo(() => certs.filter(c => c.status === CertStatus.EXPIRED || c.daysRemaining <= 7).length, [certs]);

        const filteredCerts = useMemo(() => {
          return certs.filter(c => {
            const matchesSearch =
              c.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
              c.issuer.toLowerCase().includes(searchTerm.toLowerCase()) ||
              c.keyAlgorithm.toLowerCase().includes(searchTerm.toLowerCase());
            if (statusFilter === 'ACTIVE') return matchesSearch && c.status === CertStatus.ACTIVE;
            if (statusFilter === 'EXPIRING') return matchesSearch && c.status === CertStatus.EXPIRING_SOON;
            if (statusFilter === 'CRITICAL') return matchesSearch && (c.status === CertStatus.EXPIRED || c.daysRemaining <= 7);
            return matchesSearch;
          });
        }, [certs, searchTerm, statusFilter]);

        const handleCreateCertificate = (e: React.FormEvent) => {
          e.preventDefault();
          if (!newDomain.trim()) return;

          const sansArray = newSans
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

          const newCert: Certificate = {
            id: `c0000000-0000-0000-0000-${String(certs.length + 1).padStart(12, '0')}`,
            tenantId: 'a0000000-0000-0000-0000-000000000001',
            domain: newDomain.trim(),
            sans: sansArray.length > 0 ? sansArray : [newDomain.trim()],
            status: CertStatus.ACTIVE,
            keyAlgorithm: newAlgorithm,
            issuer: newIssuer,
            serialNumber: Math.random().toString(16).substring(2, 18),
            fingerprintSha256: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            notBefore: new Date().toISOString(),
            notAfter: new Date(Date.now() + 90 * 86400000).toISOString(),
            daysRemaining: 90,
            autoRenew: true,
            renewBeforeDays: 30,
            gatewayId: gateways[0]?.id,
            deployTargetCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setCerts(prev => [newCert, ...prev]);
          setSelectedCertId(newCert.id);
          setIsAddModalOpen(false);
          setNewDomain('');
          setNewSans('');
        };

        const handleRenewCertificate = (certId: string) => {
          setCerts(prev =>
            prev.map(c => {
              if (c.id === certId) {
                return {
                  ...c,
                  status: CertStatus.ACTIVE,
                  daysRemaining: 90,
                  notBefore: new Date().toISOString(),
                  notAfter: new Date(Date.now() + 90 * 86400000).toISOString(),
                  updatedAt: new Date().toISOString(),
                };
              }
              return c;
            }),
          );
        };

        const handleDeleteCertificate = (certId: string, domain: string) => {
          if (window.confirm(`Are you sure you want to delete certificate for '${domain}'?`)) {
            setCerts(prev => prev.filter(c => c.id !== certId));
            if (selectedCertId === certId) {
              setSelectedCertId(certs.find(c => c.id !== certId)?.id || '');
            }
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
                          activeTab === 'gateways' ? (
                            <button
                              onClick={() => setShowEnrollModal(true)}
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
                          )
                        }
                      />

                      {/* ======================================================================= */}
                      {/* 3. CERTIFICATES TAB (2-Column Master-Detail Layout)                     */}
                      {/* ======================================================================= */}
                      {activeTab === 'certificates' && (
                        <div className="grid grid-cols-12 gap-5 pr-3 pb-6">
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
                                                      onClick={() =>
                                                        alert(
                                                          `Certificate CSR for ${selectedCert.domain}\nAlgorithm: ${selectedCert.keyAlgorithm}\nFingerprint: ${selectedCert.fingerprintSha256}`,
                                                        )
                                                      }
                                                      className="px-4 py-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                                                    >
                      View CSR
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
                                      onClick={() => setShowEnrollModal(true)}
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
                                              {[
                                                {
                                                  action: 'CERTIFICATE_RENEWAL_REQUESTED',
                                                  desc: 'Renewal triggered for payments.example.com via DigiCert CA',
                                                  actor: 'Alice Vance (Tenant Admin)',
                                                  time: '5 mins ago',
                                                },
                                                {
                                                  action: 'GATEWAY_HEARTBEAT_ACK',
                                                  desc: 'Gateway us-east-1-prod-gateway reported 0 active deployment errors',
                                                  actor: 'Gateway Agent v1.0.0',
                                                  time: '12 mins ago',
                                                },
                                                {
                                                  action: 'CERTIFICATE_CREATED',
                                                  desc: 'Provisioned new certificate for static.example.com',
                                                  actor: 'Alice Vance (Tenant Admin)',
                                                  time: '2 hours ago',
                                                },
                                              ].map((log, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#0F172A]">{log.action}</div>
                      <div className="text-[11px] text-slate-500">{log.desc}</div>
                    </div>
                  </div>
                  <div className="text-right text-[11px]">
                    <div className="font-semibold text-slate-700">{log.actor}</div>
                    <div className="text-slate-400">{log.time}</div>
                  </div>
                </div>
              ))}
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
                                              curl -sSL https://get.clm-platform.com/install.sh | bash -s -- --token {mockToken}
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
                                    </div>
                                    );
}

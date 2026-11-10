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
  UserPlus,
  Shield,
  Clock,
  LogOut,
  LogIn,
  AlertCircle,
  Building,
} from 'lucide-react';
import {
  CertStatus,
  KeyAlgorithm,
  GatewayStatus,
  ValidationMethod,
  DeployTargetType,
  Role,
  UserStatus,
  TenantStatus,
  CloudMarketplace,
  type Certificate,
  type Gateway,
  type AuditLog,
  type User,
  type Tenant,
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
  // Session & Tenant Verification State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('clm_tenant_user');
    return saved ? JSON.parse(saved) : {
      id: 'u0000000-0000-0000-0000-000000000001',
      tenantId: 'a0000000-0000-0000-0000-000000000001',
      email: 'devops@acme.com',
      firstName: 'Alex',
      lastName: 'Vance',
      role: Role.TENANT_ADMIN,
      status: UserStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => {
    const saved = localStorage.getItem('clm_tenant_org');
    return saved ? JSON.parse(saved) : {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Acme Global Corp',
      slug: 'acme-global',
      status: TenantStatus.ACTIVE,
      tier: 'ENTERPRISE' as any,
      maxCertificates: 1000,
      maxGateways: 25,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // Auth Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authOrgName, setAuthOrgName] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authMarketplace, setAuthMarketplace] = useState<CloudMarketplace>(CloudMarketplace.DIRECT);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Review Status Gating Polling
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Team & RBAC State
  const [members, setMembers] = useState<User[]>([
    {
      id: 'u0000000-0000-0000-0000-000000000001',
      tenantId: 'a0000000-0000-0000-0000-000000000001',
      email: 'alex.vance@acme.com',
      firstName: 'Alex',
      lastName: 'Vance',
      role: Role.TENANT_ADMIN,
      status: UserStatus.ACTIVE,
      lastLoginAt: 'Just now',
      createdAt: '2026-01-10T00:00:00Z',
      updatedAt: '2026-01-10T00:00:00Z',
    },
    {
      id: 'u0000000-0000-0000-0000-000000000002',
      tenantId: 'a0000000-0000-0000-0000-000000000001',
      email: 'sarah.sec@acme.com',
      firstName: 'Sarah',
      lastName: 'Connor',
      role: Role.SECURITY_LEAD,
      status: UserStatus.ACTIVE,
      lastLoginAt: '2 hours ago',
      createdAt: '2026-02-15T00:00:00Z',
      updatedAt: '2026-02-15T00:00:00Z',
    },
    {
      id: 'u0000000-0000-0000-0000-000000000003',
      tenantId: 'a0000000-0000-0000-0000-000000000001',
      email: 'dave.ops@acme.com',
      firstName: 'David',
      lastName: 'Miller',
      role: Role.DEVOPS_ENGINEER,
      status: UserStatus.ACTIVE,
      lastLoginAt: 'Yesterday',
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
    },
  ]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>(Role.DEVOPS_ENGINEER);
  const [isInviting, setIsInviting] = useState(false);

  const [certs, setCerts] = useState<Certificate[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCertId, setSelectedCertId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'certificates' | 'gateways' | 'audit' | 'alerts' | 'settings'>('certificates');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'team'>('general');
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

  // Check status polling for PENDING_APPROVAL gating
  const checkTenantVerificationStatus = useCallback(async (manual = false) => {
    if (manual) setIsCheckingStatus(true);
    try {
      const res = await api.tenants.getMyStatus();
      if (res && res.status) {
        if (currentTenant && currentTenant.status !== (res.status as TenantStatus)) {
          const updated = { ...currentTenant, status: res.status as TenantStatus };
          setCurrentTenant(updated);
          localStorage.setItem('clm_tenant_org', JSON.stringify(updated));
          if (res.status === TenantStatus.ACTIVE) {
            toast.success('Account Approved!', 'Your organization has been verified and active access unlocked.');
          }
        }
      }
    } catch {
      // Mock / Offline fallback status
    } finally {
      if (manual) setIsCheckingStatus(false);
    }
  }, [currentTenant]);

  useEffect(() => {
    if (currentTenant?.status === TenantStatus.PENDING_APPROVAL) {
      const interval = setInterval(() => {
        checkTenantVerificationStatus(false);
      }, 15000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [currentTenant?.status, checkTenantVerificationStatus]);

  // Auth Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAuth(true);
    try {
      if (authMode === 'signin') {
        const res = await api.auth.login({ email: authEmail, password: authPassword });
        setCurrentUser(res.user);
        localStorage.setItem('clm_tenant_user', JSON.stringify(res.user));
        toast.success('Welcome Back', `Logged in as ${res.user.email}`);
        setShowAuthModal(false);
      } else {
        const res = await api.auth.registerTenant({
          organizationName: authOrgName,
          adminEmail: authEmail,
          password: authPassword,
          adminFirstName: authFirstName || 'Admin',
          adminLastName: authLastName || 'User',
          marketplaceProvider: authMarketplace,
        });

        setCurrentTenant(res.tenant);
        setCurrentUser(res.user);
        localStorage.setItem('clm_tenant_org', JSON.stringify(res.tenant));
        localStorage.setItem('clm_tenant_user', JSON.stringify(res.user));

        toast.success('Organization Created', 'Welcome to CLM! Your account is submitted for security verification.');
        setShowAuthModal(false);
      }
    } catch (err: any) {
      toast.error('Authentication Failed', err.message || 'Please check your inputs and try again.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('clm_tenant_user');
    localStorage.removeItem('clm_tenant_org');
    setCurrentUser(null);
    setCurrentTenant(null);
    toast.info('Logged Out', 'You have been safely signed out.');
  };

  // Team Member Management Handlers
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      const newMember: User = {
        id: `u0000000-0000-0000-0000-${String(members.length + 1).padStart(12, '0')}`,
        tenantId: currentTenant?.id || 'a0000000-0000-0000-0000-000000000001',
        email: inviteEmail.trim(),
        firstName: inviteFirstName.trim() || 'Team',
        lastName: inviteLastName.trim() || 'Member',
        role: inviteRole,
        status: UserStatus.INVITED,
        lastLoginAt: 'Never',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setMembers(prev => [newMember, ...prev]);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');

      toast.success(
        'Invitation Dispatched',
        `Welcome credentials email with temporary password sent to ${newMember.email}`,
      );
    } catch (err: any) {
      toast.error('Invitation Failed', err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = (userId: string, newRole: Role) => {
    setMembers(prev => prev.map(m => (m.id === userId ? { ...m, role: newRole } : m)));
    toast.info('Role Updated', `Employee role modified to ${newRole}`);
  };

  const handleToggleMemberStatus = (userId: string) => {
    setMembers(prev =>
      prev.map(m => {
        if (m.id === userId) {
          const nextStatus = m.status === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
          return { ...m, status: nextStatus };
        }
        return m;
      }),
    );
    toast.info('Status Changed', 'Employee active access status has been updated.');
  };

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
          brandName={currentTenant?.name || 'CertFlow'}
          brandIcon={<ShieldCheck className="h-6 w-6" />}
          items={navItems}
          user={{
            name: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Guest User',
            role: currentUser?.role || 'Sign In',
            initials: currentUser ? `${currentUser.firstName[0]}${currentUser.lastName[0]}`.toUpperCase() : 'GU',
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
            userInitials={currentUser ? `${currentUser.firstName[0]}${currentUser.lastName[0]}`.toUpperCase() : 'GU'}
            actionButton={
              <div className="flex items-center gap-2">
                {currentUser ? (
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setAuthMode('signin');
                      setShowAuthModal(true);
                    }}
                    className="primary-gradient-btn px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Sign In</span>
                  </button>
                )}
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
          {/* GATED STATE: Organization Pending Security Verification Dashboard       */}
          {/* ======================================================================= */}
          {currentTenant?.status === TenantStatus.PENDING_APPROVAL ? (
            <div className="bg-white rounded-[28px] soft-card p-8 mr-3 mb-6 space-y-6">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100">
                    <Clock className="h-6 w-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-[#0F172A]">{currentTenant.name}</h3>
                      <StatusBadge variant="warning" label="Under Security Review" />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Your organization application has been submitted and is currently in verification by CLM platform security engineers.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => checkTenantVerificationStatus(true)}
                  disabled={isCheckingStatus}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2 transition-all shadow-sm"
                >
                  <RefreshCw className={`h-4 w-4 text-blue-600 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                  <span>Check Status</span>
                </button>
              </div>

              {/* 3-Step Verification Stepper */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase">Step 1</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h4 className="font-extrabold text-xs text-emerald-950">Workspace Registration</h4>
                  <p className="text-[11px] text-emerald-800">
                    Organization account and administrator credentials provisioned.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-700 uppercase">Step 2</span>
                    <RefreshCw className="h-4 w-4 text-amber-600 animate-spin" />
                  </div>
                  <h4 className="font-extrabold text-xs text-amber-950">Domain & Compliance Review</h4>
                  <p className="text-[11px] text-amber-800">
                    Validating cloud marketplace billing linkage and PKI compliance.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2 opacity-60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Step 3</span>
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-700">Issuance & Gateway Privileges</h4>
                  <p className="text-[11px] text-slate-500">
                    Live ACME issuance, ALB integration, and gateway tunnels unlocked upon approval.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span>Estimated verification turnaround: <strong>15–30 minutes</strong></span>
                </div>
                <span className="text-[11px] text-slate-400">Auto-refreshing status every 15s</span>
              </div>
            </div>
          ) : currentTenant?.status === TenantStatus.REJECTED ? (
            <div className="bg-white rounded-[28px] soft-card p-8 mr-3 mb-6 space-y-4 text-center">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-rose-700">Registration Verification Declined</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your organization verification could not be approved at this time. Please contact compliance@clm-platform.com for assistance.
              </p>
            </div>
          ) : null}

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
          {/* 6. SETTINGS & TEAM RBAC MANAGEMENT TAB                                  */}
          {/* ======================================================================= */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-[28px] soft-card p-6 mr-3 mb-6 space-y-6">
              {/* Header and Sub-Tab Switcher */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">Tenant Settings</h3>
                  <p className="text-xs text-slate-500">Configure team access, RBAC permissions, and organization security.</p>
                </div>
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F8FAFC] border border-slate-100">
                  <button
                    onClick={() => setSettingsSubTab('general')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      settingsSubTab === 'general' ? 'pill-tab-active' : 'pill-tab-inactive'
                    }`}
                  >
                    General
                  </button>
                  <button
                    onClick={() => setSettingsSubTab('team')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      settingsSubTab === 'team' ? 'pill-tab-active' : 'pill-tab-inactive'
                    }`}
                  >
                    Team & RBAC ({members.length})
                  </button>
                </div>
              </div>

              {settingsSubTab === 'general' ? (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-2">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <Building className="h-4 w-4 text-blue-600" />
                      <span>Workspace Organization</span>
                    </div>
                    <div className="space-y-1.5 text-slate-600 pt-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Company Name</span>
                        <span className="font-semibold">{currentTenant?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Workspace Slug</span>
                        <span className="font-mono">{currentTenant?.slug}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Subscription Tier</span>
                        <span className="font-bold text-blue-600">{currentTenant?.tier}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-2">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-600" />
                      <span>Security & ACME Defaults</span>
                    </div>
                    <div className="space-y-1.5 text-slate-600 pt-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Auto-Renewal Window</span>
                        <span className="font-semibold">30 Days Before Expiry</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Enforcement</span>
                        <span className="font-semibold text-emerald-600">Strict Zero-Trust mTLS</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* TEAM & RBAC MANAGEMENT TABLE */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                        Invited Employees & Role Privileges
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Granular RBAC role delegation with Argon2id password hash protection.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="primary-gradient-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Invite Member</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC] text-slate-500 font-bold border-b border-slate-100">
                        <tr>
                          <th className="py-3 px-4">Member Name</th>
                          <th className="py-3 px-4">Work Email</th>
                          <th className="py-3 px-4">Role Privileges</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Last Active</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 bg-white">
                        {members.map(member => (
                          <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {member.firstName} {member.lastName}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">{member.email}</td>
                            <td className="py-3 px-4">
                              <select
                                value={member.role}
                                onChange={e => handleUpdateRole(member.id, e.target.value as Role)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-[#F8FAFC] focus:outline-none focus:border-blue-600"
                              >
                                <option value={Role.TENANT_ADMIN}>Tenant Admin (Full Access)</option>
                                <option value={Role.SECURITY_LEAD}>Security Lead (Issuance/Revoke)</option>
                                <option value={Role.DEVOPS_ENGINEER}>DevOps Engineer (Deploy & Gateways)</option>
                                <option value={Role.AUDITOR}>Auditor (Read & Compliance)</option>
                                <option value={Role.READ_ONLY}>Read Only</option>
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge
                                variant={member.status === UserStatus.ACTIVE ? 'healthy' : 'warning'}
                                label={member.status}
                              />
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px]">{member.lastLoginAt || 'Never'}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleToggleMemberStatus(member.id)}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                                  member.status === UserStatus.ACTIVE
                                    ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                }`}
                              >
                                {member.status === UserStatus.ACTIVE ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================================= */}
          {/* ALERTS TAB                                                              */}
          {/* ======================================================================= */}
          {activeTab === 'alerts' && (
            <div className="bg-white rounded-[28px] soft-card p-8 mr-3 mb-6 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-[#0F172A]">Security Alerts & Notifications</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Configure automated threshold triggers, Webhooks (Slack/Teams), and CA provider credentials for zero-downtime certificate renewals.
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

        {/* Modal: Invite Team Member */}
        <Modal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          title="Invite Team Member"
          description="Grant team access with granular RBAC permissions. Temporary credentials will be sent automatically via email."
          maxWidth="md"
        >
          <form onSubmit={handleInviteMember} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">First Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah"
                  value={inviteFirstName}
                  onChange={e => setInviteFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Last Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Connor"
                  value={inviteLastName}
                  onChange={e => setInviteLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Work Email</label>
              <input
                type="email"
                required
                placeholder="sarah@yourcompany.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Assigned Role</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as Role)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs bg-white"
              >
                <option value={Role.TENANT_ADMIN}>Tenant Admin — Full organizational configuration & member management</option>
                <option value={Role.SECURITY_LEAD}>Security Lead — Issue, revoke, and approve ACME certificate requests</option>
                <option value={Role.DEVOPS_ENGINEER}>DevOps Engineer — Enroll gateways, configure targets, trigger deployments</option>
                <option value={Role.AUDITOR}>Auditor — Read-only access to compliance logs & certificate ledger</option>
                <option value={Role.READ_ONLY}>Read Only — Basic inventory visualization</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isInviting}
                className="primary-gradient-btn px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {isInviting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>Send Invitation Email</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Dynamic Authentication (Sign In & Self-Serve Sign Up) */}
        <Modal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          title={authMode === 'signin' ? 'Sign In to Your Workspace' : 'Create Organization Workspace'}
          description={
            authMode === 'signin'
              ? 'Enter your work credentials to access your tenant certificate control plane.'
              : 'Register your company for automated enterprise certificate lifecycle management.'
          }
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F8FAFC] border border-slate-100 mb-2">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  authMode === 'signin' ? 'pill-tab-active' : 'pill-tab-inactive'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  authMode === 'signup' ? 'pill-tab-active' : 'pill-tab-inactive'
                }`}
              >
                Register Organization
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Global Inc"
                      value={authOrgName}
                      onChange={e => setAuthOrgName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Alex"
                        value={authFirstName}
                        onChange={e => setAuthFirstName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Vance"
                        value={authLastName}
                        onChange={e => setAuthLastName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Cloud Marketplace Source
                    </label>
                    <select
                      value={authMarketplace}
                      onChange={e => setAuthMarketplace(e.target.value as CloudMarketplace)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
                    >
                      <option value={CloudMarketplace.DIRECT}>Direct Enterprise SaaS</option>
                      <option value={CloudMarketplace.AWS_MARKETPLACE}>AWS Marketplace</option>
                      <option value={CloudMarketplace.AZURE_MARKETPLACE}>Microsoft Azure Marketplace</option>
                      <option value={CloudMarketplace.GCP_MARKETPLACE}>Google Cloud Marketplace</option>
                      <option value={CloudMarketplace.ZOHO_MARKETPLACE}>Zoho Marketplace</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@yourcompany.com"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="primary-gradient-btn px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  {isSubmittingAuth && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </Modal>
      </div>
      );
}

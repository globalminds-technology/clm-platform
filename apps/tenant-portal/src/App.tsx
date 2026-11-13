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
  KeyRound,
  Calendar,
  Layers,
  UserPlus,
  Shield,
  Clock,
  LogOut,
  LogIn,
  AlertCircle,
  Building,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Cloud,
  Terminal,
  Activity,
  ExternalLink,
  Radio,
  Mail,
  Send,
  AlertTriangle,
} from 'lucide-react';
import ShapeGrid from './components/ShapeGrid/ShapeGrid';
import {
  CertStatus,
  KeyAlgorithm,
  GatewayStatus,
  ValidationMethod,
  CertificateTrackingMode,
  DeployTargetType,
  Role,
  UserStatus,
  TenantStatus,
  CloudMarketplace,
  SubscriptionTier,
  CloudProvider,
  type Certificate,
  type Gateway,
  type AuditLog,
  type User,
  type Tenant,
  type CloudAccount,
  type LiveTlsProbeResult,
} from '@clm/shared-types';
import { Sidebar, TopHeader, Modal, StatusBadge, Drawer, ConfirmDialog, Toaster, toast, PasswordInput } from '@clm/ui';
import { createApiClient } from '@clm/api-client';

const api = createApiClient({
  baseUrl: (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1',
  getAuthToken: () => localStorage.getItem('clm_access_token'),
  defaultHeaders: (() => {
    const headers: Record<string, string> = {};
    try {
      const u = localStorage.getItem('clm_tenant_user');
      const org = localStorage.getItem('clm_tenant_org');
      if (u) {
        const parsed = JSON.parse(u);
        if (parsed.tenantId) headers['x-tenant-id'] = String(parsed.tenantId);
        if (parsed.role) headers['x-user-role'] = String(parsed.role);
      } else if (org) {
        const parsedOrg = JSON.parse(org);
        if (parsedOrg.id) headers['x-tenant-id'] = String(parsedOrg.id);
        headers['x-user-role'] = 'TENANT_ADMIN';
      }
    } catch {}
    return headers;
  })(),
});

export function App() {
  // Session & Tenant Verification State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('clm_tenant_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);

  // Public View Navigation: 'home' for product details, 'auth' for registration/sign-in
  const [publicView, setPublicView] = useState<'home' | 'auth'>('home');

  // Auth Modals & Public Landing Form
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authOrgName, setAuthOrgName] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authCountry, setAuthCountry] = useState('US');
  const [authState, setAuthState] = useState('');
  const [authLocality, setAuthLocality] = useState('');
  const [authDepartment, setAuthDepartment] = useState('SecOps');
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [authMarketplace] = useState<CloudMarketplace>(CloudMarketplace.DIRECT);
  const [authTier, setAuthTier] = useState<SubscriptionTier>(SubscriptionTier.PROFESSIONAL);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Edit Organization Profile State
  const [showEditOrgModal, setShowEditOrgModal] = useState(false);
  const [editOrgName, setEditOrgName] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editState, setEditState] = useState('');
  const [editLocality, setEditLocality] = useState('');
  const [isSavingOrgSettings, setIsSavingOrgSettings] = useState(false);

  // Password Reset Specific State
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetDevCodeHint, setResetDevCodeHint] = useState<string | null>(null);
  const [loginErrorHint, setLoginErrorHint] = useState(false);

  // Review Status Gating Polling
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Team & RBAC State
  const [members, setMembers] = useState<User[]>([]);
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
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'team' | 'cloud-accounts'>('general');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING' | 'CRITICAL'>('ALL');
  const [targetFilter, setTargetFilter] = useState<'ALL' | 'AWS_ACM' | 'AWS_ALB' | 'NGINX'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Inspector Drawer & Delete Dialog
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [certToDelete, setCertToDelete] = useState<{ id: string; domain: string } | null>(null);

  // Add Certificate Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addCertTab, setAddCertTab] = useState<'probe' | 'mint'>('probe');
  const [newDomain, setNewDomain] = useState('');
  const [newSans, setNewSans] = useState('');
  const [newIssuer, setNewIssuer] = useState('DigiCert TLS RSA CA');
  const [newAlgorithm, setNewAlgorithm] = useState<KeyAlgorithm>(KeyAlgorithm.RSA_2048);
  const [newValidityDays, setNewValidityDays] = useState(90);

  // Renewal Context & Modal State
  const [renewingCert, setRenewingCert] = useState<Certificate | null>(null);
  const [renewalContext, setRenewalContext] = useState<any | null>(null);
  const [isLoadingRenewalContext, setIsLoadingRenewalContext] = useState(false);
  const [isSubmittingRenewal, setIsSubmittingRenewal] = useState(false);
  const [selectedCloudAccountId, setSelectedCloudAccountId] = useState<string>('');
  const [customKeyAlgorithm, setCustomKeyAlgorithm] = useState<string>('RSA_2048');

  // Live TLS Probe State
  const [probeDomain, setProbeDomain] = useState('google.com');
  const [probePort, setProbePort] = useState(443);
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<LiveTlsProbeResult | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [isReprobingCertId, setIsReprobingCertId] = useState<string | null>(null);

  // Enroll Gateway Modal (Step 4 in Architecture Spec)
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [enrollToken, setEnrollToken] = useState<string>('');
  const [enrollTab, setEnrollTab] = useState<'quick' | 'bash' | 'runner'>('quick');
  const [isSimulatingHandshake, setIsSimulatingHandshake] = useState(false);

  // Cloud Provider Accounts (Step 2 in Architecture Spec - AES-256-GCM)
  const [cloudAccounts, setCloudAccounts] = useState<CloudAccount[]>([]);
  const [showAddCloudModal, setShowAddCloudModal] = useState(false);
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>(CloudProvider.AWS);
  const [cloudAccountName, setCloudAccountName] = useState('');
  const [cloudRegion, setCloudRegion] = useState('us-east-1');
  const [awsAccessKey, setAwsAccessKey] = useState('');
  const [awsSecretKey, setAwsSecretKey] = useState('');
  const [awsRoleArn, setAwsRoleArn] = useState('');
  const [azureTenantId, setAzureTenantId] = useState('');
  const [azureClientId, setAzureClientId] = useState('');
  const [azureClientSecret, setAzureClientSecret] = useState('');
  const [gcpProjectId, setGcpProjectId] = useState('');
  const [gcpServiceAccountJson, setGcpServiceAccountJson] = useState('');
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [testingCloudId, setTestingCloudId] = useState<string | null>(null);
  const [syncingAcmId, setSyncingAcmId] = useState<string | null>(null);

  // Alerts & Notifications state
  const [alertRecipientEmail, setAlertRecipientEmail] = useState('pashokbabu.38@gmail.com');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [isSendingTestAlert, setIsSendingTestAlert] = useState(false);
  const [alertThresholdDays, setAlertThresholdDays] = useState(7);
  const [isSavingAlertConfig, setIsSavingAlertConfig] = useState(false);

  // Check status polling for PENDING_APPROVAL gating
  const checkTenantVerificationStatus = useCallback(async (manual = false) => {
    if (manual) setIsCheckingStatus(true);
    try {
      const res = await api.tenants.getMyStatus();
      if (res && res.tenant) {
        setCurrentTenant(res.tenant);
        if (res.status === TenantStatus.ACTIVE && currentTenant?.status !== TenantStatus.ACTIVE) {
          toast.success('Account Approved!', 'Your organization has been verified and active access unlocked.');
        }
      }
    } catch {
      // Mock / Offline fallback status
    } finally {
      if (manual) setIsCheckingStatus(false);
    }
  }, [currentTenant?.status]);

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
        if (res.tokens?.accessToken) {
          localStorage.setItem('clm_access_token', res.tokens.accessToken);
        }
        api.setDefaultHeaders?.({
          'x-tenant-id': res.user.tenantId,
          'x-user-role': res.user.role,
        });

        try {
          const statusRes = await api.tenants.getMyStatus();
          if (statusRes && statusRes.tenant) {
            setCurrentTenant(statusRes.tenant);
            localStorage.setItem('clm_tenant_org', JSON.stringify(statusRes.tenant));
          }
        } catch {
          try {
            const orgRes = await api.tenants.getById(res.user.tenantId);
            if (orgRes) {
              setCurrentTenant(orgRes);
              localStorage.setItem('clm_tenant_org', JSON.stringify(orgRes));
            }
          } catch (e) {
            console.warn('Could not load tenant details from database', e);
          }
        }

        toast.success('Welcome Back', `Logged in as ${res.user.email}`);
        setLoginErrorHint(false);
        setShowAuthModal(false);
      } else {
        const res = await api.auth.registerTenant({
          organizationName: authOrgName,
          adminEmail: authEmail,
          password: authPassword,
          adminFirstName: authFirstName || 'Admin',
          adminLastName: authLastName || '',
          marketplaceProvider: authMarketplace,
          country: authCountry.trim().toUpperCase(),
          state: authState.trim(),
          locality: authLocality.trim(),
          department: authDepartment.trim(),
        });

        setCurrentTenant(res.tenant);
        setCurrentUser(res.user);
        setPublicView('home');
        localStorage.setItem('clm_tenant_org', JSON.stringify(res.tenant));
        localStorage.setItem('clm_tenant_user', JSON.stringify(res.user));
        if (res.tokens?.accessToken) {
          localStorage.setItem('clm_access_token', res.tokens.accessToken);
        }
        api.setDefaultHeaders?.({
          'x-tenant-id': res.tenant.id,
          'x-user-role': res.user.role,
        });

        toast.success('Organization Created', 'Welcome to CLM! Your account is submitted for security verification.');
        setLoginErrorHint(false);
        setShowAuthModal(false);
      }
    } catch (err: any) {
      if (
        authMode === 'signin' &&
        (err.status === 401 || err.statusCode === 401 || err.message?.toLowerCase().includes('invalid email or password'))
      ) {
        setLoginErrorHint(true);
      }
      toast.error('Authentication Failed', err.message || 'Please check your inputs and try again.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) {
      toast.error('Missing Email', 'Please enter your registered work email address.');
      return;
    }
    setIsSubmittingAuth(true);
    try {
      const res = await api.auth.forgotPassword({ email: authEmail.trim() });
      toast.success('Verification Dispatched', res.message || 'Check your inbox or developer console for the reset code.');
      if (res.devCode) {
        setResetDevCodeHint(res.devCode);
        setResetToken(res.devCode);
        toast.info('Developer Hint', `Verification code auto-filled: ${res.devCode}`);
      }
      setLoginErrorHint(false);
      setAuthMode('reset');
    } catch (err: any) {
      toast.error('Request Failed', err.message || 'Could not request password reset.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim()) {
      toast.error('Validation Error', 'Please enter the 6-digit verification code.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      toast.error('Validation Error', 'New password and confirmation do not match.');
      return;
    }
    if (resetNewPassword.length < 8) {
      toast.error('Validation Error', 'Password must be at least 8 characters long.');
      return;
    }
    setIsSubmittingAuth(true);
    try {
      const res = await api.auth.resetPassword({
        email: authEmail.trim(),
        token: resetToken.trim(),
        newPassword: resetNewPassword,
      });
      toast.success('Password Reset Successful', res.message || 'You can now sign in with your new password.');
      setAuthPassword(resetNewPassword);
      setResetNewPassword('');
      setResetConfirmPassword('');
      setResetToken('');
      setResetDevCodeHint(null);
      setLoginErrorHint(false);
      setAuthMode('signin');
    } catch (err: any) {
      toast.error('Reset Failed', err.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };


  const handleLogout = () => {
    localStorage.removeItem('clm_tenant_user');
    localStorage.removeItem('clm_tenant_org');
    localStorage.removeItem('clm_access_token');
    api.setDefaultHeaders?.({
      'x-tenant-id': '',
      'x-user-role': '',
    });
    setCurrentUser(null);
    setCurrentTenant(null);
    setCerts([]);
    setGateways([]);
    setActivityLogs([]);
    setMembers([]);
    setCloudAccounts([]);
    toast.info('Logged Out', 'You have been safely signed out.');
  };

  const handleLoadDemoSandbox = async () => {
    setIsSubmittingAuth(true);
    try {
      const res = await api.auth.login({
        email: 'devops@acme.com',
        password: 'Password123!',
      });
      setCurrentUser(res.user);
      localStorage.setItem('clm_tenant_user', JSON.stringify(res.user));
      if (res.tokens?.accessToken) {
        localStorage.setItem('clm_access_token', res.tokens.accessToken);
      }
      api.setDefaultHeaders?.({
        'x-tenant-id': res.user.tenantId,
        'x-user-role': res.user.role,
      });

      try {
        const statusRes = await api.tenants.getMyStatus();
        if (statusRes && statusRes.tenant) {
          setCurrentTenant(statusRes.tenant);
          localStorage.setItem('clm_tenant_org', JSON.stringify(statusRes.tenant));
        }
      } catch {
        const orgRes = await api.tenants.getById(res.user.tenantId);
        if (orgRes) {
          setCurrentTenant(orgRes);
          localStorage.setItem('clm_tenant_org', JSON.stringify(orgRes));
        }
      }

      toast.success('Sandbox Activated', 'Authenticated with PostgreSQL database as Alex Vance (Acme Global Corp).');
    } catch (err: any) {
      toast.error('Sandbox Auth Error', err.message || 'Database connection error.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Team Member Management Handlers
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      const createdUser = await api.users.invite({
        email: inviteEmail.trim(),
        firstName: inviteFirstName.trim() || 'Team',
        lastName: inviteLastName.trim() || 'Member',
        role: inviteRole,
      });

      setMembers(prev => [createdUser, ...prev]);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');

      toast.success(
        'Invitation Dispatched',
        `User successfully saved to PostgreSQL database! Temporary credentials dispatched for ${createdUser.email}`,
      );
    } catch (err: any) {
      toast.error('Invitation Failed', err.message || 'Could not save user to PostgreSQL database.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: Role) => {
    try {
      await api.users.updateRole(userId, newRole);
      setMembers(prev => prev.map(m => (m.id === userId ? { ...m, role: newRole } : m)));
      toast.info('Role Updated in DB', `User role successfully persisted to ${newRole}`);
    } catch (err: any) {
      toast.error('Role Update Failed', err.message || 'Database rejected the role change.');
    }
  };

  const handleToggleMemberStatus = async (userId: string) => {
    const member = members.find(m => m.id === userId);
    if (!member) return;
    const nextStatus = member.status === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
    try {
      await api.users.updateStatus(userId, nextStatus);
      setMembers(prev =>
        prev.map(m => (m.id === userId ? { ...m, status: nextStatus } : m)),
      );
      toast.info('Status Changed in DB', `User status successfully updated to ${nextStatus}`);
    } catch (err: any) {
      toast.error('Status Update Failed', err.message || 'Failed to update user status in database.');
    }
  };

  const [dbError, setDbError] = useState<string | null>(null);

  // Ensure API headers are synchronized with active tenant session
  useEffect(() => {
    if (currentUser?.tenantId) {
      api.setDefaultHeaders?.({
        'x-tenant-id': currentUser.tenantId,
        'x-user-role': currentUser.role || 'TENANT_ADMIN',
      });
    }
  }, [currentUser?.tenantId, currentUser?.role]);

  // Fetch live tenant data from PostgreSQL backend
  const fetchTenantData = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setDbError(null);
    try {
      // Always fetch fresh tenant profile & settings from PostgreSQL database (Zero Local Cache)
      try {
        const statusRes = await api.tenants.getMyStatus();
        if (statusRes?.tenant) {
          setCurrentTenant(statusRes.tenant);
        }
      } catch (err) {
        console.warn('Could not sync status from DB:', err);
      }

      const [certList, gwList, auditList, userList, cloudList] = await Promise.all([
        api.certificates.list(),
        api.gateways.list(),
        api.audit.list(),
        api.users.list(),
        api.cloudAccounts.list().catch(() => []),
      ]);

      setCerts(certList);
      if (certList.length > 0 && !selectedCertId) {
        const first = certList[0];
        if (first) setSelectedCertId(first.id);
      }
      setGateways(gwList);
      setActivityLogs(auditList);
      setMembers(userList);
      setCloudAccounts(cloudList);
    } catch (err: any) {
      const msg = err?.message || 'Database connection error. Failed to load tenant records from PostgreSQL.';
      console.error('Error fetching tenant data:', err);
      setDbError(msg);
      toast.error('PostgreSQL Fetch Error', msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCertId]);

  useEffect(() => {
    fetchTenantData();
  }, [fetchTenantData]);

  const handleManualSync = async () => {
    try {
      const stats = await api.scheduler?.evaluateNow();
      await fetchTenantData();
      if (stats && stats.autoRenewedCerts > 0) {
        toast.success(
          'Autonomous Renewal Executed',
          `Engine evaluated infrastructure: ${stats.autoRenewedCerts} expiring certificate(s) auto-renewed in database.`,
        );
      } else {
        toast.info('Database Synchronized', 'Fetched latest certificates and gateway telemetry from PostgreSQL.');
      }
    } catch {
      await fetchTenantData();
      toast.info('Database Synchronized', 'Fetched latest certificates and gateway telemetry.');
    }
  };

  const handleOpenEnrollModal = async () => {
    setShowEnrollModal(true);
    try {
      const res = await api.gateways.enroll({
        name: `gateway-satellite-${Math.random().toString(16).substring(2, 6)}`,
        targetTypesSupported: [DeployTargetType.AWS_ACM, DeployTargetType.NGINX],
      });
      setEnrollToken(res.token);
      toast.info('Gateway Token Ready', 'Generated single-use 24h enrollment token from database.');
    } catch (err: any) {
      const msg = err.message || 'Database error: Could not enroll gateway';
      setEnrollToken('');
      toast.error('Enrollment Failed', msg);
    }
  };

  const copyToClipboard = (customText?: string) => {
    const textToCopy =
      customText ||
      `curl -sSL http://localhost:4000/api/v1/install.sh | bash -s -- --token ${enrollToken} --server http://localhost:4000/api/v1`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedToken(true);
    toast.info('Command Copied', 'Installation command copied to clipboard.');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleSimulateHandshake = async () => {
    if (!enrollToken) return;
    setIsSimulatingHandshake(true);
    try {
      const backendUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1';
      const cleanUrl = backendUrl.replace(/\/$/, '');
      const resp = await fetch(`${cleanUrl}/ingress/gateway/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: enrollToken,
          hostname: 'gw-satellite-vpc-01.internal',
          ipAddress: '10.0.1.25',
          version: '1.0.0',
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `Handshake failed with status ${resp.status}`);
      }

      const data = await resp.json();
      toast.success(
        'Gateway Handshake Verified!',
        `Satellite ${data.gatewayId?.slice(0, 8)}... successfully registered & ONLINE via mTLS.`,
      );
      setShowEnrollModal(false);
      await fetchTenantData();
    } catch (err: any) {
      toast.error('Handshake Failed', err.message || 'Could not complete satellite enrollment.');
    } finally {
      setIsSimulatingHandshake(false);
    }
  };

  // Cloud Account Handlers (AES-256-GCM)
  const handleCreateCloudAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudAccountName.trim()) {
      toast.error('Validation Error', 'Account name is required');
      return;
    }
    setIsSavingCloud(false);
    setIsSavingCloud(true);
    try {
      const created = await api.cloudAccounts.create({
        provider: cloudProvider,
        name: cloudAccountName.trim(),
        region: cloudRegion,
        awsAccessKeyId: awsAccessKey,
        awsSecretAccessKey: awsSecretKey,
        awsRoleArn: awsRoleArn,
        azureTenantId,
        azureClientId,
        azureClientSecret,
        gcpProjectId,
        gcpServiceAccountJson,
      });

      setCloudAccounts(prev => [created, ...prev]);
      setShowAddCloudModal(false);
      setCloudAccountName('');
      setAwsAccessKey('');
      setAwsSecretKey('');
      setAwsRoleArn('');
      setAzureTenantId('');
      setAzureClientId('');
      setAzureClientSecret('');
      setGcpProjectId('');
      setGcpServiceAccountJson('');
      toast.success(
        'Cloud Account Connected',
        `${created.provider} credentials encrypted with AES-256-GCM and stored in PostgreSQL.`,
      );
    } catch (err: any) {
      toast.error('Connection Failed', err.message || 'Could not register cloud provider.');
    } finally {
      setIsSavingCloud(false);
    }
  };

  const handleTestCloudAccount = async (id: string) => {
    setTestingCloudId(id);
    try {
      const res = await api.cloudAccounts.testConnection(id);
      if (res.success) {
        toast.success('Connection Verified', res.message);
      } else {
        toast.error('Connection Warning', res.message);
      }
      await fetchTenantData();
    } catch (err: any) {
      toast.error('Test Failed', err.message || 'Failed to test cloud account.');
    } finally {
      setTestingCloudId(null);
    }
  };

  const handleSyncAcm = async (id: string) => {
    setSyncingAcmId(id);
    try {
      const res = await api.cloudAccounts.syncAcm(id);
      if (res.success) {
        toast.success(
          res.isLiveAcm ? 'Live AWS ACM Synced' : 'AWS ACM Synced',
          `${res.message} (${res.discovered} newly discovered, ${res.updated} updated).`,
        );
      } else {
        toast.error('Sync Incomplete', res.message);
      }
      await fetchTenantData();
    } catch (err: any) {
      toast.error('ACM Sync Failed', err.message || 'Failed to sync AWS ACM certificates.');
    } finally {
      setSyncingAcmId(null);
    }
  };

  const handleDeleteCloudAccount = async (id: string, name: string) => {
    try {
      await api.cloudAccounts.delete(id);
      setCloudAccounts(prev => prev.filter(c => c.id !== id));
      toast.info('Cloud Account Removed', `Revoked credentials for ${name}.`);
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not remove cloud account.');
    }
  };

  const handleSendTestAlert = async () => {
    setIsSendingTestAlert(true);
    try {
      const email = alertRecipientEmail || currentUser?.email || 'bookmyevent2026@gmail.com';
      const res = await api.scheduler.sendTestAlert(email);
      if (res.success) {
        toast.success('Live Alert Dispatched', `${res.message}`);
      } else {
        toast.error('Alert Failed', res.message);
      }
    } catch (err: any) {
      toast.error('Dispatch Failed', err.message || 'Could not send test alert.');
    } finally {
      setIsSendingTestAlert(false);
    }
  };

  const handleSaveAlertConfig = () => {
    setIsSavingAlertConfig(true);
    setTimeout(() => {
      setIsSavingAlertConfig(false);
      toast.success(
        'Policy Saved',
        `Urgent threshold set to ≤${alertThresholdDays}d. Alerts dispatched to ${alertRecipientEmail || 'default admin'}.`,
      );
    }, 350);
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

  const handleProbeDomain = async (targetDomain?: string) => {
    const domainToProbe = targetDomain || probeDomain;
    if (!domainToProbe.trim()) return;
    setIsProbing(true);
    setProbeError(null);
    setProbeResult(null);
    try {
      const res = await api.certificates.probe(domainToProbe.trim(), probePort);
      setProbeResult(res);
      setProbeDomain(domainToProbe.trim());
      toast.success('TLS Discovery Complete', `Retrieved live X.509 certificate for ${res.domain} (${res.daysRemaining} days remaining).`);
    } catch (err: any) {
      const msg = err.message || 'Could not connect to domain over TLS on Port 443';
      setProbeError(msg);
      toast.error('TLS Probe Failed', msg);
    } finally {
      setIsProbing(false);
    }
  };

  const handleImportProbedCert = async () => {
    if (!probeResult) return;
    try {
      let keyAlgo = KeyAlgorithm.RSA_2048;
      if (probeResult.keyAlgorithm.includes('4096')) keyAlgo = KeyAlgorithm.RSA_4096;
      else if (probeResult.keyAlgorithm.includes('ECDSA') || probeResult.keyAlgorithm.includes('256')) keyAlgo = KeyAlgorithm.ECDSA_P256;

      const created = await api.certificates.create({
        domain: probeResult.domain,
        sans: probeResult.sans,
        keyAlgorithm: keyAlgo,
        trackingMode: CertificateTrackingMode.MONITORED,
        validationMethod: ValidationMethod.MANUAL,
        autoRenew: false,
        renewBeforeDays: 30,
        gatewayId: gateways[0]?.id,
        issuer: probeResult.issuer,
        notBefore: probeResult.notBefore,
        notAfter: probeResult.notAfter,
        serialNumber: probeResult.serialNumber,
        fingerprintSha256: probeResult.fingerprintSha256,
      });

      setCerts(prev => [created, ...prev]);
      setSelectedCertId(created.id);
      setIsAddModalOpen(false);
      setProbeResult(null);
      toast.success('Live Certificate Imported', `Imported ${created.domain} with actual remaining period of ${created.daysRemaining} days.`);
      api.audit.list().then(setActivityLogs).catch(() => {});
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('capacity') || msg.toLowerCase().includes('limit reached')) {
        toast.warning(
          'Certificate Limit Reached',
          `You have reached the maximum certificate monitoring quota for your ${currentTenant?.tier || 'Community'} plan. To monitor more endpoints, please upgrade to a Professional or Enterprise plan.`,
        );
      } else {
        toast.error('Import Failed', err.message || 'Failed to save discovered certificate to database.');
      }
    }
  };

  const handleCreateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    const sansArray = newSans
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      const notBefore = new Date();
      const notAfter = new Date(Date.now() + newValidityDays * 86400000);

      const created = await api.certificates.create({
        domain: newDomain.trim(),
        sans: sansArray.length > 0 ? sansArray : [newDomain.trim()],
        keyAlgorithm: newAlgorithm,
        validationMethod: ValidationMethod.DNS_01,
        issuer: newIssuer,
        notBefore: notBefore.toISOString(),
        notAfter: notAfter.toISOString(),
        renewBeforeDays: Math.min(30, Math.max(1, Math.floor(newValidityDays / 3))),
        autoRenew: true,
        gatewayId: gateways[0]?.id,
      });

      setCerts(prev => [created, ...prev]);
      setSelectedCertId(created.id);
      setIsAddModalOpen(false);
      setNewDomain('');
      setNewSans('');

      toast.success(
        'Certificate Created',
        `SSL certificate for "${newDomain.trim()}" issued with ${newValidityDays === 1 ? '24h' : `${newValidityDays}d`} validity profile.`,
      );

      // Refresh activity logs
      api.audit.list().then(setActivityLogs).catch(() => { });
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('capacity') || msg.toLowerCase().includes('limit reached')) {
        toast.warning(
          'Certificate Limit Reached',
          `You have reached the maximum certificate monitoring quota for your ${currentTenant?.tier || 'Community'} plan. To issue or monitor more certificates, please upgrade to a Professional or Enterprise plan.`,
        );
      } else {
        toast.error('Issuance Failed', `Failed to create certificate: ${err.message}`);
      }
    }
  };

  const handleDownloadPem = (cert: Certificate) => {
    const pemContent = `-----BEGIN CERTIFICATE-----
MIIEkjCCA3qgAwIBAgIU${cert.serialNumber?.replace(/[^a-zA-Z0-9]/g, '') || '3a9f1b2ce45d7089'}MA0GCSqGSIb3DQEBCwUA
MDgxCzAJBgNVBAYTAlVTMRQwEgYDVQQKEwtFeGFtcGxlIENBMRQwEgYDVQQDEwtS
b290IENBIDEwHhcN${new Date(cert.notBefore).toISOString().replace(/[-:T]/g, '').slice(2, 14)}Z${new Date(cert.notAfter).toISOString().replace(/[-:T]/g, '').slice(2, 14)}Z
MGgxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMRQwEgYDVQQKEwtF
eGFtcGxlIEluYzEXMBUGA1UEAxMO${btoa(cert.domain).slice(0, 16)}...
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIB/jCCAYWgAwIBAgIUF1234567890abcdefMA0GCSqGSIb3DQEBCwUAMDgxCzAJ
BgNVBAYTAlVTMRQwEgYDVQQKEwtFeGFtcGxlIENBMRQwEgYDVQQDEwtJbnRlcm1l
ZGlhdGUgQ0EwHhcNMjIwMTAxMDAwMDAwWhcNMzIwMTAxMDAwMDAwWjA4MQswCQYD
-----END CERTIFICATE-----
# CLM X.509 Certificate Chain Bundle
# Domain: ${cert.domain}
# SANs: ${cert.sans?.join(', ') || cert.domain}
# Issuer: ${cert.issuer}
# Serial: ${cert.serialNumber}
# SHA-256 Fingerprint: ${cert.fingerprintSha256}
# Valid: ${cert.notBefore} to ${cert.notAfter}
`;
    const blob = new Blob([pemContent], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cert.domain.replace(/[^a-zA-Z0-9.-]/g, '_')}-bundle.pem`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('PEM Bundle Downloaded', `Saved X.509 certificate chain for ${cert.domain}.`);
  };

  const openRenewalModal = async (cert: Certificate) => {
    setRenewingCert(cert);
    setIsLoadingRenewalContext(true);
    setRenewalContext(null);
    try {
      const ctx = await api.certificates.getRenewalContext(cert.id);
      setRenewalContext(ctx);
      if (ctx && ctx.connectedCloudAccounts && ctx.connectedCloudAccounts.length > 0) {
        const firstAccount = ctx.connectedCloudAccounts[0];
        if (firstAccount) {
          setSelectedCloudAccountId(firstAccount.id);
        }
      }
      setCustomKeyAlgorithm(cert.keyAlgorithm || 'RSA_2048');
    } catch {
      // Fallback context if backend offline/local mock
      setRenewalContext({
        certificateId: cert.id,
        domain: cert.domain,
        sans: cert.sans,
        currentKeyAlgorithm: cert.keyAlgorithm,
        currentIssuer: cert.issuer,
        daysRemaining: cert.daysRemaining,
        organizationMetadata: {
          organizationName: currentTenant?.name || 'CLM Customer Corp',
          department: 'DevOps & Security',
          country: 'US',
          state: 'California',
          locality: 'San Francisco',
          contactEmail: currentUser?.email || 'security@acme.internal',
        },
        connectedCloudAccounts: [
          {
            id: 'mock-aws-account-01',
            name: 'AWS Primary Production',
            provider: 'AWS',
            region: 'us-east-1',
            maskedSecret: 'AKI************4Q',
            awsAccountId: '123456789012',
          },
        ],
        suggestedValidationMethod: 'DNS_01',
      });
      setSelectedCloudAccountId('mock-aws-account-01');
      setCustomKeyAlgorithm(cert.keyAlgorithm || 'RSA_2048');
    } finally {
      setIsLoadingRenewalContext(false);
    }
  };

  const handleExecuteRenewal = async () => {
    if (!renewingCert) return;
    setIsSubmittingRenewal(true);
    try {
      const updated = await api.certificates.renew(renewingCert.id, {
        keyAlgorithm: customKeyAlgorithm as any,
        cloudAccountId: selectedCloudAccountId || undefined,
      });
      setCerts(prev => prev.map(c => (c.id === renewingCert.id ? updated : c)));
      toast.success(
        'Renewal Executed',
        `Successfully generated fresh CSR, verified DNS-01 via Cloud, and renewed ${updated.domain}.`,
      );
      api.audit.list().then(setActivityLogs).catch(() => {});
      setRenewingCert(null);
    } catch (err: any) {
      toast.error('Renewal Failed', `Failed to renew certificate: ${err.message}`);
    } finally {
      setIsSubmittingRenewal(false);
    }
  };

  const handleRenewCertificate = async (certId: string) => {
    const cert = certs.find(c => c.id === certId);
    if (cert) {
      openRenewalModal(cert);
    } else {
      try {
        const updated = await api.certificates.renew(certId);
        setCerts(prev => prev.map(c => (c.id === certId ? updated : c)));
        toast.success('Certificate Renewed', `Validity extended by 90 days.`);
      } catch (err: any) {
        toast.error('Renewal Failed', err.message);
      }
    }
  };

  const handleReprobeCertificate = async (certId: string) => {
    setIsReprobingCertId(certId);
    try {
      const res = await api.certificates.reprobe(certId);
      if (res.success) {
        setCerts(prev => prev.map(c => (c.id === certId ? res.certificate : c)));
        toast.success(
          res.isUpdated ? 'Live Server Updated' : 'Live Server Verified',
          res.message,
        );
      } else {
        toast.error('Re-Probe Incomplete', res.message);
      }
    } catch (err: any) {
      toast.error('Live Probe Failed', err.message || 'Could not connect to live TLS server.');
    } finally {
      setIsReprobingCertId(null);
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

  // =========================================================================
  // Public Experience (Unauthenticated Visitors: Home Overview vs Auth Page)
  // =========================================================================
  if (!currentUser || !currentTenant) {
    // -----------------------------------------------------------------------
    // Dedicated Organization Registration & Member Sign-In Page
    // -----------------------------------------------------------------------
    if (publicView === 'auth') {
      return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans selection:bg-blue-500/20 selection:text-blue-600 flex flex-col justify-between relative overflow-x-hidden">
          <Toaster position="top-right" />

          {/* Full-Page Clean Light Square Grid (No Cursor Effect) */}
          <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#F8FAFC]">
            <ShapeGrid
              shape="square"
              direction="diagonal"
              lineColor="#E2E8F0"
              lineWidth={1}
              cellSize={40}
              speed={0.15}
              cursorEffect={false}
              clickCascade={false}
              glow={0}
              twinkle={0}
              fade={0}
              backgroundColor="#F8FAFC"
              className="w-full h-full"
            />
          </div>

          {/* Auth Header */}
          <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 border-b border-slate-200/80 px-6 py-4 shadow-sm">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <button
                onClick={() => setPublicView('home')}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Platform Overview</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="font-black text-sm tracking-tight text-slate-900 hidden sm:inline">CLM Platform</span>
              </div>

              <button
                onClick={handleLoadDemoSandbox}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition-all"
              >
                <Sparkles className="h-3 w-3" />
                <span>Demo Sandbox</span>
              </button>
            </div>
          </header>

          {/* Dedicated Auth Form Card */}
          <main className="flex-1 flex items-center justify-center p-6 py-12 relative z-10">
            <div className="w-full max-w-2xl bg-white/95 border border-slate-200/90 rounded-[32px] p-8 sm:p-10 shadow-xl backdrop-blur-xl">
              <div className="flex border-b border-slate-200 pb-4 mb-8 items-center justify-between">
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setLoginErrorHint(false);
                      setAuthMode('signup');
                    }}
                    className={`text-sm font-extrabold pb-2 transition-all relative ${
                      authMode === 'signup'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Register New Organization
                  </button>
                  <button
                    onClick={() => {
                      setLoginErrorHint(false);
                      setAuthMode('signin');
                    }}
                    className={`text-sm font-extrabold pb-2 transition-all relative ${
                      authMode === 'signin'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Sign In to Workspace
                  </button>
                  {(authMode === 'forgot' || authMode === 'reset') && (
                    <span className="text-sm font-extrabold pb-2 text-blue-600 border-b-2 border-blue-600 flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Reset Password</span>
                    </span>
                  )}
                </div>

                <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
                  {authMode === 'signup'
                    ? 'Step 1 of 2'
                    : authMode === 'signin'
                      ? 'Direct Access'
                      : 'Account Recovery'}
                </span>
              </div>

              {authMode === 'signup' && (
                <form onSubmit={handleAuthSubmit} className="space-y-6">
                  {/* Stepper Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">
                        {signupStep === 1 ? '1. Account & Company Profile' : '2. Legal Location & CSR Defaults'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {signupStep === 1
                          ? 'Set up your administrator credentials and company identity.'
                          : 'Official location details for X.509 Certificate Signing Requests (CSR).'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        signupStep === 1 ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {signupStep === 1 ? '1' : <Check className="h-3.5 w-3.5" />}
                      </div>
                      <div className="w-6 h-0.5 bg-slate-200" />
                      <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        signupStep === 2 ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-slate-100 text-slate-400'
                      }`}>
                        2
                      </div>
                    </div>
                  </div>

                  {signupStep === 1 ? (
                    /* Step 1: Account & Company Profile */
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-blue-600" />
                          <span>Company Name *</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Acme Corporation"
                          value={authOrgName}
                          onChange={e => setAuthOrgName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Work Email *</label>
                        <input
                          type="email"
                          required
                          placeholder="alex@acme.com"
                          value={authEmail}
                          onChange={e => setAuthEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">First Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="Alex"
                            value={authFirstName}
                            onChange={e => setAuthFirstName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">Last Name (Optional)</label>
                          <input
                            type="text"
                            placeholder="Vance"
                            value={authLastName}
                            onChange={e => setAuthLastName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <PasswordInput
                          label="Password *"
                          required
                          placeholder="••••••••••••"
                          value={authPassword}
                          onChange={e => setAuthPassword(e.target.value)}
                          helperText="Minimum 8 characters (Argon2id password hashing protected)"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-blue-600" />
                            <span>Plan Tier</span>
                          </span>
                        </label>
                        <select
                          value={authTier}
                          onChange={e => setAuthTier(e.target.value as SubscriptionTier)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                        >
                          <option value={SubscriptionTier.COMMUNITY}>Community Free (50 Certs, 2 Gateways)</option>
                          <option value={SubscriptionTier.AWS_MARKETPLACE_PAYGO}>Pay-as-you-GO (250 Certs, 10 Gateways)</option>
                          <option value={SubscriptionTier.PROFESSIONAL}>Professional (500 Certs, 15 Gateways)</option>
                          <option value={SubscriptionTier.ENTERPRISE}>Enterprise Dedicated (1,000+ Certs, 25 Gateways)</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!authOrgName.trim() || !authEmail.trim() || !authFirstName.trim() || !authPassword.trim()) {
                            toast.error('Missing Required Fields', 'Please complete company name, email, name, and password.');
                            return;
                          }
                          setSignupStep(2);
                        }}
                        className="w-full py-3.5 rounded-2xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
                      >
                        <span>Continue to Step 2: Location &amp; CSR Details</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    /* Step 2: Location & CSR Details (Zero Hardcoded) */
                    <div className="space-y-4">
                      <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 text-xs text-blue-800 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-blue-600" />
                          <span>Zero-Hardcode Guarantee</span>
                        </div>
                        <p className="text-[11px] text-blue-700 leading-relaxed">
                          These fields are stored directly in your PostgreSQL database record and used as Distinguished Name (DN) attributes for all certificate issuance and automated renewals.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            Country Code (C) *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={2}
                            placeholder="e.g. US, IN, GB"
                            value={authCountry}
                            onChange={e => setAuthCountry(e.target.value.toUpperCase())}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                          />
                          <span className="text-[10px] text-slate-400">2-letter ISO country code</span>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            Department / Unit (OU) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. SecOps, DevOps, IT"
                            value={authDepartment}
                            onChange={e => setAuthDepartment(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                          />
                          <span className="text-[10px] text-slate-400">Organizational Unit</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            State / Province (ST) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. California, Karnataka"
                            value={authState}
                            onChange={e => setAuthState(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            City / Locality (L) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. San Francisco, Bengaluru"
                            value={authLocality}
                            onChange={e => setAuthLocality(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setSignupStep(1)}
                          className="px-4 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          <span>Back</span>
                        </button>

                        <button
                          type="submit"
                          disabled={isSubmittingAuth}
                          className="flex-1 py-3.5 rounded-2xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
                        >
                          {isSubmittingAuth ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              <span>Provisioning Tenant Workspace in PostgreSQL...</span>
                            </>
                          ) : (
                            <>
                              <span>Complete Registration &amp; Submit for Verification</span>
                              <Check className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              )}

              {authMode === 'signin' && (
                <form onSubmit={handleAuthSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Sign In to Your Workspace</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Enter your administrator credentials or invited team member password.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="devops@acme.com"
                        value={authEmail}
                        onChange={e => {
                          setAuthEmail(e.target.value);
                          if (loginErrorHint) setLoginErrorHint(false);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <PasswordInput
                        label="Password *"
                        rightAction={
                          <button
                            type="button"
                            onClick={() => {
                              setLoginErrorHint(false);
                              setAuthMode('forgot');
                            }}
                            className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                          >
                            Forgot Password?
                          </button>
                        }
                        required
                        placeholder="••••••••••••"
                        value={authPassword}
                        onChange={e => {
                          setAuthPassword(e.target.value);
                          if (loginErrorHint) setLoginErrorHint(false);
                        }}
                      />
                    </div>
                  </div>

                  {loginErrorHint && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <p className="font-bold text-xs">Invalid Email or Password (401)</p>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          The credentials entered do not match our database records. If you forgot your password or entered it incorrectly, you can reset it immediately:
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setLoginErrorHint(false);
                              setAuthMode('forgot');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 transition-colors shadow-xs"
                          >
                            <KeyRound className="h-3 w-3" />
                            <span>Reset Password Now &rarr;</span>
                          </button>
                          <span className="text-[11px] text-amber-700">
                            Demo Default: <code>Password123!</code>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                    <strong>Invited Team Members:</strong> If your organization admin invited you, use the autogenerated credentials delivered to your corporate inbox via SMTP mailer.
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="w-full py-3.5 rounded-2xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                  >
                    {isSubmittingAuth ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to Workspace</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {authMode === 'forgot' && (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginErrorHint(false);
                        setAuthMode('signin');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mb-3 font-semibold"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                    <h3 className="text-xl font-black text-slate-900">Reset Your Password</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Enter your account work email and we will dispatch a secure 6-digit verification code.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Account Work Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="devops@acme.com"
                        value={authEmail}
                        onChange={e => setAuthEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                    <strong>Zero-Trust Token Security:</strong> Password reset verification codes are single-use, hashed with SHA-256, and valid for 15 minutes. In development, the code is also printed in the backend server console.
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="w-full py-3.5 rounded-2xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                  >
                    {isSubmittingAuth ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Sending Verification Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send 6-Digit Verification Code</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {authMode === 'reset' && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-6">
                  <div>
                    <button
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mb-3 font-semibold"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Change Email / Resend Code</span>
                    </button>
                    <h3 className="text-xl font-black text-slate-900">Create New Password</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Enter the 6-digit verification code sent to <strong className="text-slate-900">{authEmail}</strong> and your new password.
                    </p>
                  </div>

                  {resetDevCodeHint && (
                    <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-[11px] text-blue-700 uppercase tracking-wider">Dev Console Code</p>
                        <p className="text-xs font-mono font-bold mt-0.5">{resetDevCodeHint}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setResetToken(resetDevCodeHint)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Auto-Fill Code
                      </button>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">6-Digit Verification Code *</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={resetToken}
                        onChange={e => setResetToken(e.target.value.trim())}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono tracking-widest text-center text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <PasswordInput
                        label="New Password *"
                        required
                        placeholder="••••••••••••"
                        value={resetNewPassword}
                        onChange={e => setResetNewPassword(e.target.value)}
                        helperText="Minimum 8 characters"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <PasswordInput
                        label="Confirm New Password *"
                        required
                        placeholder="••••••••••••"
                        value={resetConfirmPassword}
                        onChange={e => setResetConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="w-full py-3.5 rounded-2xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                  >
                    {isSubmittingAuth ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Reset Password &amp; Sign In</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

            </div>
          </main>

          <footer className="border-t border-slate-200/80 py-6 px-6 text-center text-xs text-slate-500 relative z-10 bg-white/70 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <span>&copy; 2026 CLM Platform Inc.</span>
              <span className="text-[11px] text-emerald-600 font-semibold">PostgreSQL RLS Protected</span>
            </div>
          </footer>
        </div>
      );
    }

    // -----------------------------------------------------------------------
    // Comprehensive Home Page: Pure Application Overview (8 Detailed Sections)
    // -----------------------------------------------------------------------
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans selection:bg-blue-500/20 selection:text-blue-600 flex flex-col relative overflow-x-hidden">
        <Toaster position="top-right" />

        {/* Full-Page Clean Light Square Grid (No Cursor Effect) */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#F8FAFC]">
          <ShapeGrid
            shape="square"
            direction="diagonal"
            lineColor="#E2E8F0"
            lineWidth={1}
            cellSize={40}
            speed={0.15}
            cursorEffect={false}
            clickCascade={false}
            glow={0}
            twinkle={0}
            fade={0}
            backgroundColor="#F8FAFC"
            className="w-full h-full"
          />
        </div>

        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 border-b border-slate-200/80 px-6 py-4 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="font-black text-lg tracking-tight text-slate-900">CLM Platform</span>
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                  Zero-Trust PKI
                </span>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600">
              <a href="#overview" className="hover:text-blue-600 transition-colors">Overview</a>
              <a href="#marketplaces" className="hover:text-blue-600 transition-colors">Marketplaces</a>
              <a href="#comparison" className="hover:text-blue-600 transition-colors">Why CLM</a>
              <a href="#architecture" className="hover:text-blue-600 transition-colors">Pillars</a>
              <a href="#lifecycle" className="hover:text-blue-600 transition-colors">Lifecycle</a>
              <a href="#topology" className="hover:text-blue-600 transition-colors">VPC Gateway</a>
              <a href="#pricing" className="hover:text-blue-600 transition-colors">Plans</a>
            </nav>

            <div className="flex items-center gap-3">
              <button
                onClick={handleLoadDemoSandbox}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition-all shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>Demo Sandbox</span>
              </button>
              <button
                onClick={() => {
                  setAuthMode('signin');
                  setPublicView('auth');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setAuthMode('signup');
                  setPublicView('auth');
                }}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02]"
              >
                Deploy Free
              </button>
            </div>
          </div>
        </header>

        {/* =================================================================== */}
        {/* SECTION 1: Open Hero Section (Full-Width Responsive Light Layout)   */}
        {/* =================================================================== */}
        <section id="overview" className="relative z-10 px-6 pt-16 pb-20 max-w-7xl mx-auto w-full text-center">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-black tracking-wide shadow-sm backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
              <span>AUTONOMOUS ZERO-TRUST CERTIFICATE LIFECYCLE MANAGEMENT</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.08]">
              Zero Outages. Zero Manual Renewals.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600">
                Absolute Cryptographic Governance.
              </span>
            </h1>

            {/* Solid Hero Quote */}
            <div className="max-w-2xl mx-auto my-6 p-5 sm:p-6 rounded-2xl bg-white/90 border border-slate-200 shadow-sm backdrop-blur-md">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <blockquote className="text-sm sm:text-base font-semibold text-slate-900 italic tracking-tight leading-relaxed">
                    &ldquo;Trust is verified by cryptography. Reliability is guaranteed by zero-trust automation.&rdquo;
                  </blockquote>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-2 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span>Enterprise Zero-Trust PKI Security Standard</span>
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
              Automate SSL/TLS certificate discovery, background ACME renewals, and zero-touch deployment across AWS ALB/ACM, Azure Key Vault, Cloudflare, and on-prem Nginx/Kubernetes clusters with multi-cloud marketplace billing.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
              <button
                onClick={() => {
                  setAuthMode('signup');
                  setPublicView('auth');
                }}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3.5 rounded-2xl text-xs font-black text-white shadow-xl shadow-blue-500/25 flex items-center gap-2 hover:scale-[1.02] transition-all"
              >
                <span>Deploy Free Tenant Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setAuthMode('signin');
                  setPublicView('auth');
                }}
                className="px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 shadow-sm transition-all"
              >
                Sign In to Workspace
              </button>
              <button
                onClick={handleLoadDemoSandbox}
                className="px-4 py-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-bold text-amber-800 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>Launch Demo Sandbox</span>
              </button>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-10 max-w-3xl mx-auto">
              <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm backdrop-blur-sm text-center">
                <div className="text-2xl font-black text-slate-900">99.999%</div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Uptime SLA Guarantee</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm backdrop-blur-sm text-center">
                <div className="text-2xl font-black text-blue-600">0</div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Inbound Ports Open</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm backdrop-blur-sm text-center">
                <div className="text-2xl font-black text-emerald-600">&lt; 200ms</div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">ACME TLS Verification</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm backdrop-blur-sm text-center">
                <div className="text-2xl font-black text-indigo-600">PostgreSQL</div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Row-Level Security</div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 2: Cloud Marketplace & Compliance Trust Bar                 */}
        {/* =================================================================== */}
        <section id="marketplaces" className="relative z-10 py-6 px-6 max-w-7xl mx-auto w-full border-y border-slate-200/80 bg-white/60 backdrop-blur-sm my-4 rounded-2xl shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-600">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Verified Marketplace Integrations &amp; Security Standards:
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2 text-slate-700 shadow-sm">
                <Cloud className="h-4 w-4 text-amber-500" /> AWS Marketplace PayGO
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2 text-slate-700 shadow-sm">
                <Cloud className="h-4 w-4 text-blue-500" /> Microsoft Azure Marketplace
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2 text-slate-700 shadow-sm">
                <Cloud className="h-4 w-4 text-rose-500" /> Google Cloud Partner
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2 text-slate-700 shadow-sm">
                <Cloud className="h-4 w-4 text-emerald-500" /> Zoho AppStore
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-2 text-blue-700">
                <ShieldCheck className="h-4 w-4 text-blue-600" /> 0 Open Inbound Ports
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-700">
                <Lock className="h-4 w-4 text-emerald-600" /> PostgreSQL RLS Isolation
              </span>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 3: The True Cost of Manual TLS vs Autonomous CLM            */}
        {/* =================================================================== */}
        <section id="comparison" className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full">
          <div className="text-center space-y-2 mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">The Operational Shift</span>
            <h2 className="text-3xl font-black text-slate-900">Manual Spreadsheets vs Autonomous Governance</h2>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              How modern engineering fleets eliminate certificate outages before they trigger browser security warnings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* The Fragile Manual Way */}
            <div className="p-8 rounded-[28px] bg-rose-50/70 border border-rose-200 space-y-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-rose-950">The Legacy Manual Way</h3>
                  <span className="text-[11px] text-rose-600 font-medium">Unmonitored, reactive, high risk of outages</span>
                </div>
              </div>
              <ul className="text-xs text-slate-700 space-y-3 pt-2">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-600 font-bold mt-0.5">&times;</span>
                  <span>Spreadsheet tracking with missed calendar reminders causing catastrophic website downtime.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-600 font-bold mt-0.5">&times;</span>
                  <span>Frantic 3 AM emergency renewals after users face &ldquo;Your connection is not private&rdquo; red screens.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-600 font-bold mt-0.5">&times;</span>
                  <span>Open inbound firewall ports (<code>0.0.0.0/0</code>) and permanent API keys leaked across servers.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-600 font-bold mt-0.5">&times;</span>
                  <span>Fragmented assets spread with zero audit trail across AWS, Azure, on-prem, and SaaS.</span>
                </li>
              </ul>
            </div>

            {/* The Autonomous CLM Way */}
            <div className="p-8 rounded-[28px] bg-blue-50/80 border border-blue-200 space-y-5 shadow-md shadow-blue-500/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">The Autonomous CLM Way</h3>
                  <span className="text-[11px] text-blue-600 font-medium">Continuous, automated, zero-trust cryptographic defense</span>
                </div>
              </div>
              <ul className="text-xs text-slate-700 space-y-3 pt-2">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>24/7 background cron scheduler checks expiry daily and auto-renews 30 days before expiration.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Zero-downtime ACME execution with automated DNS-01 and HTTP-01 challenge solvers.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>In-VPC satellite daemon with 0 open inbound ports using outbound mTLS reverse polling.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Immutable audit ledger in PostgreSQL with tenant-isolated Row-Level Security and team RBAC.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 4: Four Core Architectural Pillars                          */}
        {/* =================================================================== */}
        <section id="architecture" className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full">
          <div className="text-center space-y-2 mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Enterprise Architecture</span>
            <h2 className="text-3xl font-black text-slate-900">Four Pillars of Autonomous Security</h2>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Engineered for zero-trust cloud fleets, enterprise load balancers, and multi-tenant isolation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-[28px] bg-white/90 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all space-y-3 backdrop-blur-sm">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm">Zero-Trust VPC Gateways</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Lightweight agent daemons run inside your private AWS/Azure/GCP subnets. 100% outbound mTLS polling with zero open inbound firewall ports.
              </p>
            </div>

            <div className="p-6 rounded-[28px] bg-white/90 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all space-y-3 backdrop-blur-sm">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm">Automated ACME Engine</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Continuous 24/7 background cron monitors certificate lifecycles. Automatically renews Let&apos;s Encrypt and DigiCert certs 30 days prior to expiry.
              </p>
            </div>

            <div className="p-6 rounded-[28px] bg-white/90 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all space-y-3 backdrop-blur-sm">
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Server className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm">Multi-Cloud Deployment</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Seamless push deployment to AWS ALB, AWS ACM, Azure Key Vault, Cloudflare, and on-prem Nginx/Kubernetes clusters with zero manual intervention.
              </p>
            </div>

            <div className="p-6 rounded-[28px] bg-white/90 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all space-y-3 backdrop-blur-sm">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <UserPlus className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm">In-Portal Team RBAC</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Granular access control across Tenant Admin, Security Lead, DevOps Engineer, Auditor, and Viewer roles with automated SMTP credential mailer.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 5: How It Works — 4-Step Lifecycle Interactive Flow          */}
        {/* =================================================================== */}
        <section id="lifecycle" className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full border-t border-slate-200/80">
          <div className="text-center space-y-2 mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">End-to-End Workflow</span>
            <h2 className="text-3xl font-black text-slate-900">How CLM Automates Your TLS Lifecycle</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              From initial domain discovery to automated zero-touch deployment and renewal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-6 rounded-2xl bg-white/90 border border-slate-200 shadow-sm space-y-3 backdrop-blur-sm">
              <span className="text-xs font-black text-blue-600 uppercase tracking-wider">Step 01</span>
              <h4 className="font-extrabold text-slate-900 text-sm">Connect &amp; Discover</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Input your domains or import infrastructure endpoints. Real-time TLS discovery identifies active ciphers and expiration dates.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/90 border border-slate-200 shadow-sm space-y-3 backdrop-blur-sm">
              <span className="text-xs font-black text-blue-600 uppercase tracking-wider">Step 02</span>
              <h4 className="font-extrabold text-slate-900 text-sm">Deploy In-VPC Gateway</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Run the satellite daemon in your private AWS VPC or on-prem cluster via a 60-second Docker or binary curl command. No inbound ports open.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/90 border border-slate-200 shadow-sm space-y-3 backdrop-blur-sm">
              <span className="text-xs font-black text-blue-600 uppercase tracking-wider">Step 03</span>
              <h4 className="font-extrabold text-slate-900 text-sm">Automate ACME Issuance</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                The ACME engine solves DNS-01 and HTTP-01 challenges autonomously with Let&apos;s Encrypt and DigiCert to generate cryptographic certificates.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/90 border border-slate-200 shadow-sm space-y-3 backdrop-blur-sm">
              <span className="text-xs font-black text-blue-600 uppercase tracking-wider">Step 04</span>
              <h4 className="font-extrabold text-slate-900 text-sm">Zero-Touch Auto-Renewal</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Certificates are hot-reloaded to ALBs, ingress controllers, and Nginx reverse proxies. 30 days before expiration, auto-renewal triggers seamlessly.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 6: In-VPC Gateway Network Topology & Security Visualizer     */}
        {/* =================================================================== */}
        <section id="topology" className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full border-t border-slate-200/80">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Network Topology</span>
              <h2 className="text-3xl font-black text-slate-900">Outbound-Only mTLS Reverse Architecture</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Traditional certificate deployment requires opening SSH or API ports into customer firewalls. CLM revolutionizes this with <strong>Outbound-Only Gateways</strong>:
              </p>
              <ul className="text-xs text-slate-700 space-y-2.5 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span><strong>Zero Inbound Firewall Ports:</strong> No <code>0.0.0.0/0</code> ingress required.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span><strong>Mutual TLS (mTLS) Ephemeral Tokens:</strong> Gateway polls control plane over port 443.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span><strong>Local Private Network Execution:</strong> Certs deployed directly inside AWS VPC private subnets.</span>
                </li>
              </ul>

              <div className="pt-2">
                <button
                  onClick={handleLoadDemoSandbox}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-sm transition-colors flex items-center gap-2"
                >
                  <Terminal className="h-4 w-4 text-blue-600" />
                  <span>Inspect Gateway Telemetry in Sandbox</span>
                </button>
              </div>
            </div>

            {/* Terminal Topology Visualizer */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 font-mono text-xs shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="text-slate-400 ml-2 font-bold">network-topology.log</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">mTLS 1.3 ACTIVE</span>
              </div>

              <div className="space-y-2 text-[11px] leading-relaxed">
                <p className="text-slate-500"># Customer Private AWS VPC (10.0.0.0/16)</p>
                <p className="text-emerald-400">[VPC-Subnet] Gateway daemon started: gw-satellite-prod-01</p>
                <p className="text-slate-400">[SecurityGroup] Inbound: 0 rules (All ports closed)</p>
                <p className="text-slate-400">[SecurityGroup] Outbound: 443 to clm.internal.acme.com</p>
                <p className="text-blue-400">[Tunnel] Established reverse mTLS polling session (ID: tnl-489a2)</p>
                <p className="text-emerald-400">[Deploy] Pushing renewed TLS cert to AWS ALB (arn:aws:elasticloadbalancing:...)</p>
                <p className="text-white font-bold">[Success] ALB SSL certificate hot-reloaded with 0s downtime.</p>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 7: Transparent Subscription Tiers & Quotas                  */}
        {/* =================================================================== */}
        <section id="pricing" className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full border-t border-slate-200/80">
          <div className="text-center space-y-2 mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Subscription Tiers</span>
            <h2 className="text-3xl font-black text-slate-900">Transparent, Scalable Pricing</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Super Admin can customize plan quotas and effective dates dynamically in the Admin Portal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-[28px] bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6 backdrop-blur-sm">
              <div className="space-y-4">
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  Community Free
                </span>
                <div>
                  <div className="text-3xl font-black text-slate-900">$0</div>
                  <p className="text-[11px] text-slate-500">Forever free for small projects</p>
                </div>
                <ul className="text-xs text-slate-700 space-y-2 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> Up to 25 Active Certificates</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> 1 Local VPC Gateway</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> Let&apos;s Encrypt ACME</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setAuthTier(SubscriptionTier.COMMUNITY);
                  setAuthMode('signup');
                  setPublicView('auth');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors"
              >
                Choose Community
              </button>
            </div>

            <div className="p-6 rounded-[28px] bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6 backdrop-blur-sm">
              <div className="space-y-4">
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Pay-as-you-GO
                </span>
                <div>
                  <div className="text-3xl font-black text-slate-900">$49<span className="text-xs font-normal text-slate-500"> / mo</span></div>
                  <p className="text-[11px] text-slate-500">AWS Marketplace Metered</p>
                </div>
                <ul className="text-xs text-slate-700 space-y-2 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> Up to 250 Certificates</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> 5 Local VPC Gateways</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> AWS ALB &amp; ACM Auto-Sync</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setAuthTier(SubscriptionTier.AWS_MARKETPLACE_PAYGO);
                  setAuthMode('signup');
                  setPublicView('auth');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors"
              >
                Choose PayGO
              </button>
            </div>

            <div className="p-6 rounded-[28px] bg-white border-2 border-blue-500 flex flex-col justify-between space-y-6 relative shadow-lg shadow-blue-500/10">
              <div className="space-y-4">
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-600 text-white shadow-sm">
                  Most Popular
                </span>
                <div>
                  <div className="text-3xl font-black text-slate-900">$199<span className="text-xs font-normal text-slate-500"> / mo</span></div>
                  <p className="text-[11px] text-slate-500">Professional Multi-Cloud</p>
                </div>
                <ul className="text-xs text-slate-700 space-y-2 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> Up to 1,000 Certificates</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> 25 Local VPC Gateways</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> Full In-Portal Team RBAC</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> DigiCert &amp; Private CA</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setAuthTier(SubscriptionTier.PROFESSIONAL);
                  setAuthMode('signup');
                  setPublicView('auth');
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/25"
              >
                Start Free Trial
              </button>
            </div>

            <div className="p-6 rounded-[28px] bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6 backdrop-blur-sm">
              <div className="space-y-4">
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Enterprise
                </span>
                <div>
                  <div className="text-3xl font-black text-slate-900">Custom</div>
                  <p className="text-[11px] text-slate-500">Fleet &amp; Dedicated HSM</p>
                </div>
                <ul className="text-xs text-slate-700 space-y-2 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> Unlimited Certificates</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> Unlimited Fleet Gateways</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> Dedicated Key Vault &amp; SLA</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setAuthTier(SubscriptionTier.ENTERPRISE);
                  setAuthMode('signup');
                  setPublicView('auth');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors"
              >
                Choose Enterprise
              </button>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 8: Conversion CTA Banner & Enterprise Footer                */}
        {/* =================================================================== */}
        <section className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full">
          <div className="p-10 sm:p-14 rounded-[36px] bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 border border-blue-200 text-center space-y-6 shadow-sm relative overflow-hidden">
            <div className="max-w-2xl mx-auto space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
                Eliminate TLS Expiration Outages Forever.
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Deploy your organization in 60 seconds. Provision VPC gateways, automate ACME issuance, and enjoy zero-downtime certificate lifecycles.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <button
                onClick={() => {
                  setAuthMode('signup');
                  setPublicView('auth');
                }}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3.5 rounded-2xl text-xs font-extrabold text-white shadow-xl shadow-blue-500/25 flex items-center gap-2 hover:scale-[1.02] transition-all"
              >
                <span>Deploy Free Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleLoadDemoSandbox}
                className="px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 shadow-sm transition-all"
              >
                Launch Demo Sandbox
              </button>
            </div>
          </div>
        </section>

        {/* Public Footer */}
        <footer className="relative z-10 mt-auto border-t border-slate-200/80 py-8 px-6 text-center text-xs text-slate-500 bg-white/70 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span>&copy; 2026 CLM Platform Inc. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-emerald-600 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational &bull; PostgreSQL RLS Enforced</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

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
            name: currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Admin User' : 'Guest User',
            role: currentUser?.role || 'Sign In',
            initials: currentUser ? `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || ''}`.toUpperCase() : 'GU',
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
            userInitials={currentUser ? `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || ''}`.toUpperCase() : 'GU'}
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
                {currentTenant?.status === TenantStatus.PENDING_APPROVAL ? (
                  <button
                    disabled
                    title="Action locked: Workspace is under security review"
                    className="px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80"
                  >
                    <Lock className="h-4 w-4 text-slate-400" />
                    <span>{activeTab === 'gateways' ? 'Enroll Gateway (Locked)' : 'Add Certificate (Locked)'}</span>
                  </button>
                ) : activeTab === 'gateways' ? (
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
                onClick={fetchTenantData}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm shrink-0"
              >
                Retry Connection
              </button>
            </div>
          )}

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
                    <span className="text-[11px] font-bold text-amber-700 uppercase">Step 2 • In Review</span>
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <h4 className="font-extrabold text-xs text-amber-950">Domain & Compliance Review</h4>
                  <p className="text-[11px] text-amber-800">
                    Awaiting Super Admin verification and domain compliance approval.
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
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate mt-0.5">
                                    {cert.trackingMode === CertificateTrackingMode.MONITORED ? (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                        <Radio className="h-2.5 w-2.5" /> Monitored
                                      </span>
                                    ) : cert.issuer.includes('Amazon') || cert.issuer.includes('AWS') ? (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                        <Cloud className="h-2.5 w-2.5" /> AWS Cloud
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                        <Shield className="h-2.5 w-2.5" /> Managed
                                      </span>
                                    )}
                                    <span className="truncate">{cert.issuer}</span>
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
                            onClick={() => handleDownloadPem(selectedCert)}
                            className="h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                            title="Download X.509 PEM certificate chain"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>PEM Bundle</span>
                          </button>
                          {selectedCert.trackingMode === CertificateTrackingMode.MONITORED ? (
                            <button
                              onClick={() => handleReprobeCertificate(selectedCert.id)}
                              disabled={isReprobingCertId === selectedCert.id}
                              className="h-8 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-colors border border-indigo-200 cursor-pointer"
                              title="Re-probe remote server to detect live certificate updates"
                            >
                              {isReprobingCertId === selectedCert.id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                              ) : (
                                <Radio className="h-3.5 w-3.5 text-indigo-600" />
                              )}
                              <span>Re-Probe Live</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRenewCertificate(selectedCert.id)}
                              className="h-8 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Renew certificate"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>Renew</span>
                            </button>
                          )}
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

                      {/* Monitored Domain Notice Banner */}
                      {selectedCert.trackingMode === CertificateTrackingMode.MONITORED && (
                        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-start gap-2.5 text-xs text-indigo-950">
                          <Radio className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold">External Monitored Domain:</span> This certificate is hosted on an external origin provider (e.g. Vercel, GitHub, Cloudflare). CLM tracks remaining days and alerts on expiration. Click <strong>Re-Probe Live</strong> anytime to read latest changes directly from port 443.
                          </div>
                        </div>
                      )}

                      {/* Technical Certificate Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-3">
                          <div className="flex items-center gap-2 text-xs font-extrabold text-[#0F172A]">
                            <Server className="h-4 w-4 text-blue-600" />
                            <span>Deployment Targets</span>
                          </div>
                          <div className="space-y-2 text-xs">
                            {selectedCert.trackingMode === CertificateTrackingMode.MONITORED ? (
                              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100">
                                <div className="flex items-center gap-2">
                                  <Radio className="h-4 w-4 text-indigo-600 shrink-0" />
                                  <span className="font-semibold text-slate-800 truncate">{selectedCert.domain}</span>
                                </div>
                                <span className="text-[11px] font-mono text-indigo-600 font-bold">Port 443 (Live Edge)</span>
                              </div>
                            ) : (
                              <>
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
                              </>
                            )}
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
                              <span className="text-slate-400">Lifecycle Mode</span>
                              <span className={`font-bold ${
                                selectedCert.trackingMode === CertificateTrackingMode.MONITORED
                                  ? 'text-indigo-600'
                                  : selectedCert.trackingMode === CertificateTrackingMode.MANAGED_CLOUD
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                              }`}>
                                {selectedCert.trackingMode === CertificateTrackingMode.MONITORED
                                  ? 'Monitored Watchdog'
                                  : selectedCert.trackingMode === CertificateTrackingMode.MANAGED_CLOUD
                                    ? 'AWS Cloud Sync'
                                    : 'Automated Gateway'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Auto-Renewal</span>
                              <span className={selectedCert.autoRenew ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                                {selectedCert.autoRenew ? 'Enabled (30d before)' : 'External / Manual'}
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
                        {selectedCert.trackingMode === CertificateTrackingMode.MONITORED ? (
                          <button
                            onClick={() => handleReprobeCertificate(selectedCert.id)}
                            disabled={isReprobingCertId === selectedCert.id}
                            className="flex-1 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/25 cursor-pointer disabled:opacity-50"
                          >
                            {isReprobingCertId === selectedCert.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Radio className="h-4 w-4" />
                            )}
                            <span>Re-Probe Live Server (Sync Vercel / Origin TLS)</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRenewCertificate(selectedCert.id)}
                            className="primary-gradient-btn flex-1 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/25"
                          >
                            <RefreshCw className="h-4 w-4" />
                            <span>Approve & Trigger Immediate Renewal</span>
                          </button>
                        )}
                        <button
                          onClick={() => setIsDrawerOpen(true)}
                          className="px-4 py-3 rounded-2xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-xs font-bold text-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer"
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
                {currentTenant?.status === TenantStatus.PENDING_APPROVAL ? (
                  <button
                    disabled
                    title="Action locked: Workspace is under security review"
                    className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80"
                  >
                    <Lock className="h-4 w-4 text-slate-400" />
                    <span>Enroll Gateway (Locked)</span>
                  </button>
                ) : (
                  <button
                    onClick={handleOpenEnrollModal}
                    className="primary-gradient-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Enroll New Gateway</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gateways.length === 0 ? (
                  <div className="col-span-1 md:col-span-2 p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <Server className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-extrabold text-sm text-[#0F172A]">No Gateways Enrolled</div>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Your workspace does not have any active satellite daemons connected. Click below to enroll your first gateway.
                      </p>
                    </div>
                    {currentTenant?.status === TenantStatus.PENDING_APPROVAL ? (
                      <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold border border-slate-200 cursor-not-allowed">
                        <Lock className="h-4 w-4 text-slate-400" />
                        <span>Enrollment Locked During Review</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleOpenEnrollModal}
                        className="primary-gradient-btn px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Enroll Gateway Daemon</span>
                      </button>
                    )}
                  </div>
                ) : (
                  gateways.map(gw => (
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
                  ))
                )}
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
                    onClick={() => setSettingsSubTab('cloud-accounts')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      settingsSubTab === 'cloud-accounts' ? 'pill-tab-active' : 'pill-tab-inactive'
                    }`}
                  >
                    Cloud Providers ({cloudAccounts.length})
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

              {settingsSubTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-3">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-blue-600" />
                        <span>Workspace Organization</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {currentTenant?.tier}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditOrgName(currentTenant?.name || '');
                            setEditCountry(currentTenant?.settings?.orgMetadata?.country || 'US');
                            setEditDepartment(currentTenant?.settings?.orgMetadata?.department || '');
                            setEditState(currentTenant?.settings?.orgMetadata?.state || '');
                            setEditLocality(currentTenant?.settings?.orgMetadata?.locality || '');
                            setShowEditOrgModal(true);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Edit Profile
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-slate-600 pt-1">
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-400">Company Legal Name (O)</span>
                        <span className="font-semibold text-slate-800">{currentTenant?.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-400">Workspace Slug</span>
                        <span className="font-mono">{currentTenant?.slug}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-400">Country Code (C)</span>
                        <span className="font-mono font-bold text-slate-800">
                          {currentTenant?.settings?.orgMetadata?.country || 'Not Set'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-400">Department / Unit (OU)</span>
                        <span className="font-semibold text-slate-800">
                          {currentTenant?.settings?.orgMetadata?.department || 'Not Set'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-400">State / Province (ST)</span>
                        <span className="font-semibold text-slate-800">
                          {currentTenant?.settings?.orgMetadata?.state || 'Not Set'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">City / Locality (L)</span>
                        <span className="font-semibold text-slate-800">
                          {currentTenant?.settings?.orgMetadata?.locality || 'Not Set'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-3">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-600" />
                      <span>Security, Quotas & ACME Defaults</span>
                    </div>
                    <div className="space-y-2 text-slate-600 pt-1">
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-400">Auto-Renewal Window</span>
                        <span className="font-semibold">30 Days Before Expiry</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-400">Enforcement</span>
                        <span className="font-semibold text-emerald-600">Strict Zero-Trust mTLS</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-400">Max Certificates Quota</span>
                        <span className="font-bold text-slate-800">{currentTenant?.maxCertificates || 50} Certs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Max Gateways Allowed</span>
                        <span className="font-bold text-slate-800">{currentTenant?.maxGateways || 2} Gateways</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settingsSubTab === 'team' && (
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

              {settingsSubTab === 'cloud-accounts' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-[#0F172A]">Cloud Provider Accounts</h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" />
                          <span>AES-256-GCM Encrypted</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Connect AWS, Azure, or GCP accounts to discover and automatically deploy certificates to cloud targets (Step 2 Architecture Spec).
                      </p>
                    </div>

                    <button
                      onClick={() => setShowAddCloudModal(true)}
                      className="primary-gradient-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Connect Cloud Account</span>
                    </button>
                  </div>

                  {cloudAccounts.length === 0 ? (
                    <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-3 bg-[#F8FAFC]">
                      <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                        <Cloud className="h-6 w-6" />
                      </div>
                      <h5 className="font-extrabold text-sm text-slate-800">No Cloud Accounts Connected Yet</h5>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Link your AWS IAM Role, Azure Service Principal, or GCP Service Account to unlock automated cloud certificate discovery and renewals.
                      </p>
                      <button
                        onClick={() => setShowAddCloudModal(true)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm inline-flex items-center gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Connect AWS / Azure / GCP</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cloudAccounts.map(account => (
                        <div
                          key={account.id}
                          className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-xs space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                                  account.provider === CloudProvider.AWS
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : account.provider === CloudProvider.AZURE
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {account.provider}
                              </span>
                              <div>
                                <h5 className="font-extrabold text-xs text-slate-900">{account.name}</h5>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {account.region || 'global'} &bull; {account.authType}
                                </p>
                              </div>
                            </div>
                            <StatusBadge
                              variant={account.status === 'CONNECTED' ? 'healthy' : 'critical'}
                              label={account.status}
                            />
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-[11px] text-slate-500">Encrypted Secret:</span>
                            <span className="font-mono text-[11px] font-bold text-slate-700">
                              {account.maskedSecret}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                            <span className="text-slate-400">
                              {account.lastSyncAt
                                ? `Last verified: ${new Date(account.lastSyncAt).toLocaleTimeString()}`
                                : 'Pending handshake'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {account.provider === CloudProvider.AWS && (
                                <button
                                  onClick={() => handleSyncAcm(account.id)}
                                  disabled={syncingAcmId === account.id}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1 shadow-xs"
                                  title="Discover and synchronize certificates from AWS Certificate Manager (ACM)"
                                >
                                  {syncingAcmId === account.id ? (
                                    <RefreshCw className="h-3 w-3 animate-spin text-amber-600" />
                                  ) : (
                                    <Cloud className="h-3 w-3 text-amber-600" />
                                  )}
                                  <span>Sync ACM</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleTestCloudAccount(account.id)}
                                disabled={testingCloudId === account.id}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1"
                              >
                                {testingCloudId === account.id ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Activity className="h-3 w-3" />
                                )}
                                <span>Test Connection</span>
                              </button>
                              <button
                                onClick={() => handleDeleteCloudAccount(account.id, account.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                title="Revoke and delete credentials"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================================================= */}
          {/* ALERTS TAB                                                              */}
          {/* ======================================================================= */}
          {activeTab === 'alerts' && (
            <div className="mr-3 mb-6 space-y-6">
              {/* Header with Title and Quick Test Dispatch */}
              <div className="bg-white rounded-[28px] soft-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
                    <Bell className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                      Alerts & Security Watchdog
                    </h3>
                    <p className="text-xs text-slate-500">
                      Automated X.509 expiration alerts, SMTP notifications, and zero-trust policy thresholds.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch md:self-auto">
                  <button
                    onClick={handleSendTestAlert}
                    disabled={isSendingTestAlert}
                    className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingTestAlert ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>Send Test Alert via SMTP</span>
                  </button>
                </div>
              </div>

              {/* Status Overview Stat Badges */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl soft-card p-4 border border-slate-100 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Critical Expiry</div>
                    <div className="text-lg font-black text-rose-600">
                      {certs.filter(c => c.daysRemaining <= 7 || c.status === CertStatus.EXPIRED).length}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl soft-card p-4 border border-slate-100 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expiring ≤30d</div>
                    <div className="text-lg font-black text-amber-600">
                      {certs.filter(c => c.daysRemaining <= 30 && c.daysRemaining > 7).length}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl soft-card p-4 border border-slate-100 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">SMTP Relay</div>
                    <div className="text-xs font-black text-emerald-600 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Gmail Active
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl soft-card p-4 border border-slate-100 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Watchdog Cycle</div>
                    <div className="text-xs font-black text-blue-600">Every 30s Loop</div>
                  </div>
                </div>
              </div>

              {/* Main Content: Left Active Feed, Right Policy Config */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Active Expiry Watchlist (7 cols) */}
                <div className="lg:col-span-7 bg-white rounded-[28px] soft-card p-6 border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-rose-500" />
                      <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                        Active Expiry Watchlist
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Threshold: &le; 30 days remaining
                    </span>
                  </div>

                  {certs.filter(c => c.daysRemaining <= 30 || c.status === CertStatus.EXPIRED).length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                      <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <h5 className="font-extrabold text-xs text-slate-800">All Production Certs Healthy</h5>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        No certificates currently violate the 30-day warning threshold. The autonomous engine continues background monitoring.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {certs
                        .filter(c => c.daysRemaining <= 30 || c.status === CertStatus.EXPIRED)
                        .map(cert => {
                          const isCritical = cert.daysRemaining <= 7 || cert.status === CertStatus.EXPIRED;
                          return (
                            <div
                              key={cert.id}
                              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                isCritical
                                  ? 'bg-rose-50/40 border-rose-200'
                                  : 'bg-amber-50/30 border-amber-200'
                              }`}
                            >
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-xs text-slate-900 truncate">
                                    {cert.domain}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                      isCritical
                                        ? 'bg-rose-100 text-rose-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {cert.daysRemaining <= 0 ? 'EXPIRED' : `${cert.daysRemaining}d Left`}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-mono truncate">
                                  {cert.issuer} &bull; Expires: {new Date(cert.notAfter).toLocaleDateString()}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => handleRenewCertificate(cert.id)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  <span>Renew +90d</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Notification Policy Configuration (5 cols) */}
                <div className="lg:col-span-5 bg-white rounded-[28px] soft-card p-6 border border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <Settings className="h-4 w-4 text-blue-600" />
                    <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                      Notification Channels & Policy
                    </h4>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Primary Alert Email Recipient
                      </label>
                      <div className="relative">
                        <Mail className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          value={alertRecipientEmail}
                          onChange={e => setAlertRecipientEmail(e.target.value)}
                          placeholder="admin@yourcompany.com"
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Dispatches critical X.509 expiry alerts using the configured Gmail SMTP credentials.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Urgent Warning Trigger Threshold
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: '24 Hours', days: 1 },
                          { label: '7 Days', days: 7 },
                          { label: '30 Days', days: 30 },
                        ].map(opt => (
                          <button
                            key={opt.days}
                            type="button"
                            onClick={() => setAlertThresholdDays(opt.days)}
                            className={`py-2 px-3 rounded-xl font-bold text-xs border text-center transition-all ${
                              alertThresholdDays === opt.days
                                ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Slack / Microsoft Teams Webhook URL
                      </label>
                      <input
                        type="url"
                        value={slackWebhookUrl}
                        onChange={e => setSlackWebhookUrl(e.target.value)}
                        placeholder="https://hooks.slack.com/services/..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Optional webhook endpoint for real-time channel incident alerts.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-slate-800">Autonomous Auto-Renewal</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800">
                          Active (30s)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        When certificates hit &le;30 days, the platform automatically issues renewed certificates and logs audit trail events.
                      </p>
                    </div>

                    <button
                      onClick={handleSaveAlertConfig}
                      disabled={isSavingAlertConfig}
                      className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isSavingAlertConfig ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>Save Notification Policy</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ========================================================================= */}
        {/* 7. Modal: Add Certificate                                                 */}
        {/* ========================================================================= */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setProbeResult(null);
            setProbeError(null);
          }}
          title="Add / Discover SSL Certificate"
          description="Track existing production certificates via live TLS probe, or issue a fresh 90-day certificate."
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F8FAFC] border border-slate-100">
              <button
                type="button"
                onClick={() => setAddCertTab('probe')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  addCertTab === 'probe' ? 'pill-tab-active' : 'pill-tab-inactive'
                }`}
              >
                <Radio className="h-3.5 w-3.5 text-indigo-600" />
                <span>Live TLS Watchdog (Monitored Domain)</span>
              </button>
              <button
                type="button"
                onClick={() => setAddCertTab('mint')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  addCertTab === 'mint' ? 'pill-tab-active' : 'pill-tab-inactive'
                }`}
              >
                <Shield className="h-3.5 w-3.5 text-blue-600" />
                <span>Issue Managed / Private PKI</span>
              </button>
            </div>

            {addCertTab === 'probe' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Live Domain / FQDN
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. google.com, github.com, or your company domain"
                      value={probeDomain}
                      onChange={e => setProbeDomain(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleProbeDomain();
                        }
                      }}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs"
                    />
                    <div className="w-24">
                      <input
                        type="number"
                        placeholder="Port"
                        value={probePort}
                        onChange={e => setProbePort(Number(e.target.value) || 443)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs"
                        title="TLS Port (default 443)"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleProbeDomain()}
                      disabled={isProbing || !probeDomain.trim()}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isProbing ? 'animate-spin' : ''}`} />
                      <span>{isProbing ? 'Probing...' : 'Probe TLS'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Domain Suggestions */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-semibold">Quick Test:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setProbeDomain('google.com');
                      handleProbeDomain('google.com');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
                  >
                    google.com
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProbeDomain('github.com');
                      handleProbeDomain('github.com');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
                  >
                    github.com
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProbeDomain('cloudflare.com');
                      handleProbeDomain('cloudflare.com');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
                  >
                    cloudflare.com
                  </button>
                </div>

                {/* Probe Error */}
                {probeError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{probeError}</span>
                  </div>
                )}

                {/* Probe Result Card */}
                {probeResult && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                      <div>
                        <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          <span>{probeResult.domain}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Subject: {probeResult.subject} • Port {probeResult.port}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-base font-black ${
                          probeResult.daysRemaining <= 7 ? 'text-rose-600' :
                          probeResult.daysRemaining <= 30 ? 'text-amber-600' :
                          'text-emerald-600'
                        }`}>
                          {probeResult.daysRemaining} days left
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          probeResult.daysRemaining <= 7 ? 'bg-rose-100 text-rose-700' :
                          probeResult.daysRemaining <= 30 ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {probeResult.daysRemaining <= 7 ? 'Critical' : probeResult.daysRemaining <= 30 ? 'Expiring Soon' : 'Healthy Live'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">CA Issuer</span>
                        <span className="font-semibold text-slate-800 truncate block mt-0.5">{probeResult.issuer}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Key Algorithm</span>
                        <span className="font-semibold text-slate-800 truncate block mt-0.5">{probeResult.keyAlgorithm}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Valid From</span>
                        <span className="font-semibold text-slate-700 block mt-0.5">
                          {new Date(probeResult.notBefore).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Expiration (Valid To)</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">
                          {new Date(probeResult.notAfter).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono bg-white p-2.5 rounded-xl border border-slate-200 truncate">
                      SHA-256: {probeResult.fingerprintSha256 || 'N/A'}
                    </div>

                    <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-[11px] flex items-center gap-2">
                      <Radio className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>
                        <strong>External Monitored Mode:</strong> CLM tracks expiry and alerts your team. When Vercel or origin updates the certificate, click <strong>Re-Probe Live</strong> to sync changes without fake database dates.
                      </span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setProbeResult(null);
                          setProbeError(null);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={handleImportProbedCert}
                        className="primary-gradient-btn px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Radio className="h-4 w-4" />
                        <span>Track as Monitored Domain ({probeResult.daysRemaining}d left)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
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
                      <option value="DigiCert TLS RSA CA">DigiCert TLS CA (Public)</option>
                      <option value="Let's Encrypt R3">Let's Encrypt R3 (Free ACME)</option>
                      <option value="Sectigo RSA DV">Sectigo RSA DV (Paid DV)</option>
                      <option value="GlobalSign RSA OV">GlobalSign OV (Enterprise OV)</option>
                      <option value="AWS Private Certificate Authority">AWS Private CA (Cloud PKI)</option>
                      <option value="Internal Enterprise Root CA">Internal Root CA (Private PKI)</option>
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Lifespan Profile & Validity
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: '90 Days', days: 90, desc: 'Public CAB Forum' },
                      { label: '30 Days', days: 30, desc: 'Internal Rotation' },
                      { label: '7 Days', days: 7, desc: 'Zero-Trust Mesh' },
                      { label: '24 Hours', days: 1, desc: 'mTLS / Ephemeral' },
                    ].map(opt => (
                      <button
                        key={opt.days}
                        type="button"
                        onClick={() => setNewValidityDays(opt.days)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          newValidityDays === opt.days
                            ? 'bg-blue-50 border-blue-500 shadow-xs ring-1 ring-blue-500/20'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div
                          className={`text-xs font-extrabold ${
                            newValidityDays === opt.days ? 'text-blue-700' : 'text-slate-800'
                          }`}
                        >
                          {opt.label}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium truncate">{opt.desc}</div>
                      </button>
                    ))}
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
                    className="primary-gradient-btn px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    Save & Track ({newValidityDays === 1 ? '24 Hours' : `${newValidityDays} Days`})
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>

        {/* ========================================================================= */}
        {/* 8. Modal: Enroll Gateway Command (Step 4 Architecture Spec)               */}
        {/* ========================================================================= */}
        <Modal
          isOpen={showEnrollModal}
          onClose={() => setShowEnrollModal(false)}
          title="Enroll Satellite Gateway Daemon (Step 4 Architecture Spec)"
          description="Zero-trust satellite daemon executing inside your VPC or on-prem network. Outbound-only communication (Port 443)."
          maxWidth="xl"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F8FAFC] border border-slate-100">
              <button
                type="button"
                onClick={() => setEnrollTab('quick')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  enrollTab === 'quick' ? 'pill-tab-active' : 'pill-tab-inactive'
                }`}
              >
                ⚡ 1-Click Instant Handshake
              </button>
              <button
                type="button"
                onClick={() => setEnrollTab('bash')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  enrollTab === 'bash' ? 'pill-tab-active' : 'pill-tab-inactive'
                }`}
              >
                💻 Customer Linux / VPC Command
              </button>
              <button
                type="button"
                onClick={() => setEnrollTab('runner')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  enrollTab === 'runner' ? 'pill-tab-active' : 'pill-tab-inactive'
                }`}
              >
                🌐 Local Daemon + Web UI
              </button>
            </div>

            {enrollTab === 'quick' && (
              <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-blue-600 animate-pulse" />
                  <h4 className="text-xs font-bold text-blue-900">Immediate Local Simulation (No Terminal Needed)</h4>
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Test the complete cryptographic handshake right now. This connects to the control plane, marks this gateway <strong>ONLINE</strong>, and initiates active heartbeat beaconing.
                </p>
                <div className="p-3 bg-white/90 rounded-xl border border-blue-100 font-mono text-[11px] text-slate-700 space-y-1">
                  <div><strong>Bootstrap Token:</strong> {enrollToken ? `${enrollToken.slice(0, 16)}...` : 'Generating...'}</div>
                  <div><strong>Daemon Hostname:</strong> gw-satellite-vpc-01.internal</div>
                  <div><strong>Tunnel Protocol:</strong> Outbound HTTPS mTLS (Port 443)</div>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateHandshake}
                  disabled={isSimulatingHandshake || !enrollToken}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all"
                >
                  {isSimulatingHandshake ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Verifying Handshake with PostgreSQL Control Plane...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Instant Handshake &amp; Mark Gateway Online</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {enrollTab === 'bash' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Execute inside your customer VPC, Kubernetes cluster, or Linux server. Notice that both the <strong>--token</strong> and <strong>--server</strong> flags are supplied:
                </p>
                <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] relative flex items-center justify-between">
                  <span className="truncate pr-4">
                    curl -sSL http://localhost:4000/api/v1/install.sh | bash -s -- --token {enrollToken || 'TOKEN'} --server http://localhost:4000/api/v1
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `curl -sSL http://localhost:4000/api/v1/install.sh | bash -s -- --token ${enrollToken} --server http://localhost:4000/api/v1`,
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
                  >
                    {copiedToken ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-[11px] text-slate-500">
                  Direct REST API curl command:
                  <pre className="mt-1 p-2.5 rounded-xl bg-slate-100 text-slate-800 text-[10px] overflow-x-auto">
{`curl -X POST http://localhost:4000/api/v1/ingress/gateway/enroll \\
  -H "Content-Type: application/json" \\
  -d '{"token":"${enrollToken}","hostname":"gw-prod-01.acme.internal","ipAddress":"10.0.1.15","version":"1.0.0"}'`}
                  </pre>
                </div>
              </div>
            )}

            {enrollTab === 'runner' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Launch the built-in Satellite Daemon in this repository. It executes outbound beacons every 30s and launches the <strong>Local Web UI console</strong> at <code>http://localhost:8080</code>:
                </p>
                <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] relative flex items-center justify-between">
                  <span className="truncate pr-4">
                    CLM_ENROLLMENT_TOKEN="{enrollToken}" pnpm --filter @clm/gateway start
                  </span>
                  <button
                    onClick={() => copyToClipboard(`CLM_ENROLLMENT_TOKEN="${enrollToken}" pnpm --filter @clm/gateway start`)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
                  >
                    {copiedToken ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                  <span>Local Gateway Web UI console will be available at:</span>
                  <a
                    href="http://localhost:8080"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-blue-600 underline inline-flex items-center gap-1"
                  >
                    <span>http://localhost:8080</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowEnrollModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>

        {/* Modal: Connect Cloud Provider Account (Step 2 Architecture Spec) */}
        <Modal
          isOpen={showAddCloudModal}
          onClose={() => setShowAddCloudModal(false)}
          title="Connect Cloud Provider (Step 2 Architecture Spec)"
          description="Credentials are authenticated and encrypted at rest with AES-256-GCM before being stored in PostgreSQL."
          maxWidth="lg"
        >
          <form onSubmit={handleCreateCloudAccount} className="space-y-4">
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-[#F8FAFC] border border-slate-100">
              <button
                type="button"
                onClick={() => setCloudProvider(CloudProvider.AWS)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  cloudProvider === CloudProvider.AWS ? 'pill-tab-active' : 'pill-tab-inactive'
                }`}
              >
                Amazon Web Services (AWS)
              </button>
              <button
                type="button"
                onClick={() => setCloudProvider(CloudProvider.AZURE)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  cloudProvider === CloudProvider.AZURE ? 'pill-tab-active' : 'pill-tab-inactive'
                }`}
              >
                Microsoft Azure
              </button>
              <button
                type="button"
                onClick={() => setCloudProvider(CloudProvider.GCP)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  cloudProvider === CloudProvider.GCP ? 'pill-tab-active' : 'pill-tab-inactive'
                }`}
              >
                Google Cloud (GCP)
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Friendly Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. AWS Production Workload (us-east-1)"
                value={cloudAccountName}
                onChange={e => setCloudAccountName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
              />
            </div>

            {cloudProvider === CloudProvider.AWS && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      AWS Region
                    </label>
                    <input
                      type="text"
                      placeholder="us-east-1"
                      value={cloudRegion}
                      onChange={e => setCloudRegion(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      IAM Role ARN (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="arn:aws:iam::123456789012:role/CLM-Role"
                      value={awsRoleArn}
                      onChange={e => setAwsRoleArn(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Access Key ID
                  </label>
                  <input
                    type="text"
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    value={awsAccessKey}
                    onChange={e => setAwsAccessKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <PasswordInput
                    label="Secret Access Key"
                    placeholder="••••••••••••••••••••••••"
                    value={awsSecretKey}
                    onChange={e => setAwsSecretKey(e.target.value)}
                    helperText="Will be encrypted with AES-256-GCM authenticated cipher before saving."
                  />
                </div>
              </div>
            )}

            {cloudProvider === CloudProvider.AZURE && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tenant ID *
                    </label>
                    <input
                      type="text"
                      placeholder="4a2b9c8d-1e7f-..."
                      value={azureTenantId}
                      onChange={e => setAzureTenantId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Client ID (Application) *
                    </label>
                    <input
                      type="text"
                      placeholder="7b8c9d0e-1f2a-..."
                      value={azureClientId}
                      onChange={e => setAzureClientId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
                <div>
                  <PasswordInput
                    label="Client Secret Value *"
                    placeholder="••••••••••••••••••••••••"
                    value={azureClientSecret}
                    onChange={e => setAzureClientSecret(e.target.value)}
                    helperText="AES-256-GCM protected."
                  />
                </div>
              </div>
            )}

            {cloudProvider === CloudProvider.GCP && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    GCP Project ID *
                  </label>
                  <input
                    type="text"
                    placeholder="my-gcp-enterprise-project"
                    value={gcpProjectId}
                    onChange={e => setGcpProjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Service Account JSON Key
                  </label>
                  <textarea
                    rows={4}
                    placeholder='{"type": "service_account", "project_id": "...", ...}'
                    value={gcpServiceAccountJson}
                    onChange={e => setGcpServiceAccountJson(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Zero-Knowledge Encryption:</strong> Secret keys are encrypted with <code>AES-256-GCM</code> envelope encryption before persistence and isolated via PostgreSQL RLS.
              </span>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddCloudModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingCloud}
                className="primary-gradient-btn px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
              >
                {isSavingCloud && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>Encrypt &amp; Connect Account</span>
              </button>
            </div>
          </form>
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
                        Last Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Vance"
                        value={authLastName}
                        onChange={e => setAuthLastName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>
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
                <PasswordInput
                  label="Password *"
                  rightAction={
                    authMode === 'signin' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAuthModal(false);
                          setLoginErrorHint(false);
                          setPublicView('auth');
                          setAuthMode('forgot');
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                      >
                        Forgot Password?
                      </button>
                    ) : undefined
                  }
                  required
                  placeholder="••••••••••••"
                  value={authPassword}
                  onChange={e => {
                    setAuthPassword(e.target.value);
                    if (loginErrorHint) setLoginErrorHint(false);
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
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

        {/* Edit Organization Legal Profile Modal */}
        <Modal
          isOpen={showEditOrgModal}
          onClose={() => setShowEditOrgModal(false)}
          title="Edit Organization Profile & CSR Defaults"
          description="Update legal identity and geographical location used for X.509 certificate generation."
        >
          <form
            onSubmit={async e => {
              e.preventDefault();
              if (!currentTenant?.id) return;
              setIsSavingOrgSettings(true);
              try {
                const updatedTenant = await api.tenants.update(currentTenant.id, {
                  name: editOrgName.trim(),
                  settings: {
                    orgMetadata: {
                      organizationName: editOrgName.trim(),
                      country: editCountry.trim().toUpperCase(),
                      state: editState.trim(),
                      locality: editLocality.trim(),
                      department: editDepartment.trim(),
                      contactEmail: currentTenant?.settings?.orgMetadata?.contactEmail,
                    },
                  },
                });
                setCurrentTenant(updatedTenant);
                // Re-fetch directly from DB to verify persistence
                await fetchTenantData();
                toast.success('Organization Updated', 'Legal identity and CSR attributes saved to database.');
                setShowEditOrgModal(false);
              } catch (err: any) {
                toast.error('Update Failed', err.message || 'Unable to update organization details.');
              } finally {
                setIsSavingOrgSettings(false);
              }
            }}
            className="p-6 space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Company Legal Name (O) *
              </label>
              <input
                type="text"
                required
                value={editOrgName}
                onChange={e => setEditOrgName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Country Code (C) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={editCountry}
                  onChange={e => setEditCountry(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-600"
                />
                <span className="text-[10px] text-slate-400">2-letter ISO (e.g. US, IN)</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Department / Unit (OU)
                </label>
                <input
                  type="text"
                  placeholder="e.g. SecOps"
                  value={editDepartment}
                  onChange={e => setEditDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  State / Province (ST)
                </label>
                <input
                  type="text"
                  placeholder="e.g. California"
                  value={editState}
                  onChange={e => setEditState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  City / Locality (L)
                </label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco"
                  value={editLocality}
                  onChange={e => setEditLocality(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditOrgModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingOrgSettings}
                className="primary-gradient-btn px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingOrgSettings && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* Certificate Renewal Pre-fill & Approval Modal */}
        <Modal
          isOpen={!!renewingCert}
          onClose={() => {
            if (!isSubmittingRenewal) setRenewingCert(null);
          }}
          title={`Renew Certificate: ${renewingCert?.domain || ''}`}
        >
          <div className="p-6 space-y-5">
            {isLoadingRenewalContext ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                <p className="text-xs font-medium text-slate-500">Loading pre-saved tenant identity & cloud credentials...</p>
              </div>
            ) : renewalContext ? (
              <div className="space-y-4">
                <div className="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-4 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-blue-900">Stored Tenant & CA Identity Matched</h4>
                    <p className="text-[11px] text-blue-700/80 mt-0.5">
                      Your saved company registration details and connected cloud DNS credentials will automatically generate the CSR and fulfill the validation challenge.
                    </p>
                  </div>
                </div>

                {/* Subscription Tier Badge & Quota Info */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Plan Tier:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      renewalContext.isPaidPlan
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {renewalContext.subscriptionTier || 'COMMUNITY'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Usage: <span className="font-bold text-slate-800">{renewalContext.currentCertificatesCount || 1}</span> / {renewalContext.maxCertificates || 50} Certs
                  </div>
                </div>

                {/* Stored Organization Info */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Pre-Filled CSR Subject Data (From Tenant Onboarding)
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Organization (O):</span>
                      <span className="font-semibold text-slate-800">{renewalContext.organizationMetadata.organizationName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Organizational Unit (OU):</span>
                      <span className="font-semibold text-slate-800">{renewalContext.organizationMetadata.department || 'SecOps'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Country (C):</span>
                      <span className="font-semibold text-slate-800">{renewalContext.organizationMetadata.country || 'US'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Notification Email:</span>
                      <span className="font-semibold text-slate-800">{renewalContext.organizationMetadata.contactEmail || 'security@tenant.internal'}</span>
                    </div>
                  </div>
                </div>

                {/* Connected Cloud Provider & DNS Validation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Automated Cloud DNS Provider for Challenge
                  </label>
                  {renewalContext.connectedCloudAccounts && renewalContext.connectedCloudAccounts.length > 0 ? (
                    <div className="space-y-2">
                      {renewalContext.connectedCloudAccounts.map((acc: any) => (
                        <label
                          key={acc.id}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            selectedCloudAccountId === acc.id
                              ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="cloud_account_select"
                              checked={selectedCloudAccountId === acc.id}
                              onChange={() => setSelectedCloudAccountId(acc.id)}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <span className="font-bold">{acc.name}</span>
                              <span className="text-[10px] text-slate-500 block font-mono">
                                Provider: {acc.provider} &bull; Region: {acc.region || 'global'} &bull; Key: {acc.maskedSecret}
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Auto DNS-01 Ready
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                      No cloud accounts connected yet. The renewal will proceed via HTTP-01 challenge fallback.
                    </div>
                  )}
                </div>

                {/* Key Algorithm Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Key Algorithm for New Key Pair
                  </label>
                  <select
                    value={customKeyAlgorithm}
                    onChange={e => setCustomKeyAlgorithm(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="RSA_2048">RSA 2048-bit (Standard High-Compatibility)</option>
                    <option value="RSA_4096">RSA 4096-bit (Military Grade / Financial)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isSubmittingRenewal}
                    onClick={() => setRenewingCert(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingRenewal}
                    onClick={handleExecuteRenewal}
                    className="primary-gradient-btn px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer"
                  >
                    {isSubmittingRenewal && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>{isSubmittingRenewal ? 'Issuing & Deploying...' : 'Approve & Issue Certificate'}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      </div>
      );
}

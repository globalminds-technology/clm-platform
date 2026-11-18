import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  Radio,
  Server,
  Zap,
  Bell,
  Settings,
  Plus,
  RefreshCw,
  Lock,
  LogOut,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  Shield,
  LayoutDashboard,
  Boxes,
} from 'lucide-react';
import { TenantStatus } from '@clm/shared-types';
import { Sidebar, TopHeader, StatusBadge } from '@clm/ui';
import { useAuth } from '../../context/AuthContext';

export type AppTab =
  | 'dashboard'
  | 'certificates'
  | 'discovery'
  | 'gateways'
  | 'compliance'
  | 'integrations'
  | 'audit'
  | 'alerts'
  | 'settings';

interface AppLayoutProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  criticalCount: number;
  dbError: string | null;
  onRetryConnection: () => void;
  onSyncDb: () => void;
  isSyncing: boolean;
  onOpenAddCert: () => void;
  onOpenEnrollGateway: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  criticalCount,
  dbError,
  onRetryConnection,
  onSyncDb,
  isSyncing,
  onOpenAddCert,
  onOpenEnrollGateway,
  children,
}) => {
  const { currentUser, currentTenant, logout, checkTenantVerificationStatus, isCheckingStatus } =
    useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isPendingApproval = currentTenant?.status === TenantStatus.PENDING_APPROVAL;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      active: activeTab === 'dashboard',
      onClick: () => setActiveTab('dashboard'),
    },
    {
      id: 'certificates',
      label: 'Certificates',
      icon: <FileText className="h-5 w-5" />,
      active: activeTab === 'certificates',
      onClick: () => setActiveTab('certificates'),
    },
    {
      id: 'discovery',
      label: 'Discovery & CT',
      icon: <Radio className="h-5 w-5" />,
      active: activeTab === 'discovery',
      onClick: () => setActiveTab('discovery'),
    },
    {
      id: 'gateways',
      label: 'Gateways',
      icon: <Server className="h-5 w-5" />,
      active: activeTab === 'gateways',
      onClick: () => setActiveTab('gateways'),
    },
    {
      id: 'compliance',
      label: 'Compliance & Policy',
      icon: <ShieldCheck className="h-5 w-5" />,
      active: activeTab === 'compliance',
      onClick: () => setActiveTab('compliance'),
    },
    {
      id: 'integrations',
      label: 'Integrations',
      icon: <Boxes className="h-5 w-5" />,
      active: activeTab === 'integrations',
      onClick: () => setActiveTab('integrations'),
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: <Zap className="h-5 w-5" />,
      active: activeTab === 'audit',
      onClick: () => setActiveTab('audit'),
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <Bell className="h-5 w-5" />,
      active: activeTab === 'alerts',
      badge: criticalCount > 0 ? `${criticalCount}` : undefined,
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
      {/* 1. Collapsible Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        brandName={currentTenant?.name || 'CertFlow'}
        brandIcon={<ShieldCheck className="h-6 w-6" />}
        items={navItems}
        user={{
          name: currentUser
            ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Admin User'
            : 'Guest User',
          role: currentUser?.role || 'Sign In',
          initials: currentUser
            ? `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || ''}`.toUpperCase()
            : 'GU',
        }}
      />

      {/* 2. Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 pl-5 overflow-y-auto">
        <TopHeader
          icon={
              activeTab === 'dashboard' ? (
                <LayoutDashboard className="h-5 w-5 text-blue-600" />
              ) : activeTab === 'compliance' ? (
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              ) : activeTab === 'integrations' ? (
                <Boxes className="h-5 w-5 text-blue-600" />
              ) : activeTab === 'gateways' ? (
                <Server className="h-5 w-5 text-blue-600" />
              ) : activeTab === 'discovery' ? (
                <Radio className="h-5 w-5 text-blue-600" />
              ) : activeTab === 'audit' ? (
                <Zap className="h-5 w-5 text-blue-600" />
              ) : activeTab === 'alerts' ? (
                <Bell className="h-5 w-5 text-blue-600" />
              ) : activeTab === 'settings' ? (
                <Settings className="h-5 w-5 text-blue-600" />
              ) : (
                <FileText className="h-5 w-5 text-blue-600" />
              )
          }
          title={
            activeTab === 'dashboard'
        ? 'Cryptographic Posture & Security'
        : activeTab === 'compliance'
        ? 'Policy Governance & Compliance Audits'
        : activeTab === 'integrations'
        ? 'Integrations & Certificate Authorities'
        : activeTab === 'gateways'
        ? 'Local Gateways'
        : activeTab === 'discovery'
        ? 'Certificate Discovery & CT Surveillance'
        : activeTab === 'audit'
        ? 'Activity Logs'
        : activeTab === 'alerts'
        ? 'Security Alerts'
        : activeTab === 'settings'
        ? 'Tenant Settings'
        : 'Certificates'
          }
        subtitle={
            activeTab === 'dashboard'
        ? 'Executive overview of cryptographic health, PQC readiness, and automated zero-outage SLA.'
        : activeTab === 'compliance'
        ? 'Cryptographic guardrails, 4-Eyes dual-approval queue, and continuous PCI-DSS / NIST audit reports.'
        : activeTab === 'gateways'
        ? 'Zero-trust agent daemons installed inside your VPC or on-prem networks.'
        : activeTab === 'discovery'
        ? 'Actively scan subnets, domains, and TLS endpoints to discover unmanaged certificates.'
        : activeTab === 'audit'
        ? 'Immutable audit trail of certificate lifecycle events and gateway operations.'
        : activeTab === 'alerts'
        ? 'Automated X.509 expiration alerts, SMTP notifications, and zero-trust policies.'
        : activeTab === 'settings'
        ? 'Configure team access, RBAC permissions, and organization security.'
        : 'Manage, renew and monitor SSL certificates across your infrastructure.'
          }
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search certificates, domains, issuers..."
        unreadNotifications={criticalCount > 0}
        userInitials={
          currentUser
            ? `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || ''}`.toUpperCase()
            : 'GU'
        }
        actionButton={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            <button
              type="button"
              onClick={onSyncDb}
              disabled={isSyncing}
              title="Refresh from PostgreSQL database"
              className="px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">Sync DB</span>
            </button>

            {isPendingApproval ? (
              <button
                type="button"
                disabled
                title="Action locked: Workspace is under security review"
                className="px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80"
              >
                <Lock className="h-4 w-4 text-slate-400" />
                <span>
                  {activeTab === 'gateways' ? 'Enroll Gateway (Locked)' : 'Add Certificate (Locked)'}
                </span>
              </button>
            ) : activeTab === 'gateways' ? (
              <button
                type="button"
                onClick={onOpenEnrollGateway}
                className="primary-gradient-btn px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Enroll Gateway</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAddCert}
                className="primary-gradient-btn px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
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
                <p className="text-[11px] text-slate-500 mt-1">
                  Make sure PostgreSQL is running on port 5432 and the backend is active at port 4000.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRetryConnection}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm shrink-0 cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* GATED STATE: Organization Pending Security Verification Dashboard */}
        {isPendingApproval ? (
          <div className="bg-white rounded-[28px] soft-card p-8 mr-3 mb-6 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100">
                  <Clock className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-[#0F172A]">{currentTenant?.name}</h3>
                    <StatusBadge variant="warning" label="Under Security Review" />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your organization application has been submitted and is currently in verification by CLM platform security engineers.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => checkTenantVerificationStatus(true)}
                disabled={isCheckingStatus}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 text-blue-600 ${isCheckingStatus ? 'animate-spin' : ''}`}
                />
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
                <h4 className="font-extrabold text-xs text-amber-950">Domain &amp; Compliance Review</h4>
                <p className="text-[11px] text-amber-800">
                  Awaiting Super Admin verification and domain compliance approval.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2 opacity-60">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Step 3</span>
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <h4 className="font-extrabold text-xs text-slate-700">Issuance &amp; Gateway Privileges</h4>
                <p className="text-[11px] text-slate-500">
                  Live ACME issuance, ALB integration, and gateway tunnels unlocked upon approval.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span>
                  Estimated verification turnaround: <strong>15–30 minutes</strong>
                </span>
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

        {/* Tab View Content */}
        {children}
      </main>
    </div>
  );
};

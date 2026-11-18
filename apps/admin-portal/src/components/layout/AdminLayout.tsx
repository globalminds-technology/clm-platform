import React, { useState } from 'react';
import {
  Building2,
  Layers,
  FileText,
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Plus,
  LogOut,
} from 'lucide-react';
import { Sidebar, TopHeader } from '@clm/ui';
import { useAdminAuth } from '../../context/AdminAuthContext';

export type AdminTab =
  | 'tenants'
  | 'verifications'
  | 'plans'
  | 'health'
  | 'audit'
  | 'billing';

interface AdminLayoutProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  tenantCount: number;
  pendingVerificationCount: number;
  onOpenCreateTenant: () => void;
  onOpenCreatePlan: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  tenantCount,
  pendingVerificationCount,
  onOpenCreateTenant,
  onOpenCreatePlan,
  children,
}) => {
  const { adminUser, logout } = useAdminAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItems = [
    {
      id: 'tenants',
      label: 'Organizations',
      icon: <Building2 className="h-5 w-5" />,
      badge: tenantCount > 0 ? `${tenantCount}` : undefined,
      active: activeTab === 'tenants',
      onClick: () => setActiveTab('tenants'),
    },
    {
      id: 'verifications',
      label: 'Verifications',
      icon: <ShieldCheck className="h-5 w-5" />,
      badge: pendingVerificationCount > 0 ? `${pendingVerificationCount}` : undefined,
      active: activeTab === 'verifications',
      onClick: () => setActiveTab('verifications'),
    },
    {
      id: 'plans',
      label: 'Subscription Plans',
      icon: <Layers className="h-5 w-5" />,
      active: activeTab === 'plans',
      onClick: () => setActiveTab('plans'),
    },
    {
      id: 'health',
      label: 'Platform Health',
      icon: <Cpu className="h-5 w-5" />,
      active: activeTab === 'health',
      onClick: () => setActiveTab('health'),
    },
    {
      id: 'audit',
      label: 'Global Audit',
      icon: <FileText className="h-5 w-5" />,
      active: activeTab === 'audit',
      onClick: () => setActiveTab('audit'),
    },
    {
      id: 'billing',
      label: 'Usage & Billing',
      icon: <BarChart3 className="h-5 w-5" />,
      active: activeTab === 'billing',
      onClick: () => setActiveTab('billing'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-[#0F172A] flex p-3 font-sans selection:bg-blue-500/20 selection:text-blue-600">
      {/* 1. Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        brandName="CLM SaaS"
        brandIcon={<ShieldAlert className="h-6 w-6" />}
        items={navItems}
        user={{
          name: adminUser ? `${adminUser.firstName || 'Platform'} ${adminUser.lastName || 'Admin'}` : 'Platform Admin',
          role: adminUser?.role || 'SUPER_ADMIN',
          initials: 'SA',
        }}
      />

      {/* 2. Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 pl-5 overflow-y-auto">
        <TopHeader
          icon={
            activeTab === 'tenants' ? (
              <Building2 className="h-5 w-5 text-blue-600" />
            ) : activeTab === 'verifications' ? (
              <ShieldCheck className="h-5 w-5 text-blue-600" />
            ) : activeTab === 'plans' ? (
              <Layers className="h-5 w-5 text-blue-600" />
            ) : activeTab === 'health' ? (
              <Cpu className="h-5 w-5 text-blue-600" />
            ) : activeTab === 'audit' ? (
              <FileText className="h-5 w-5 text-blue-600" />
            ) : (
              <BarChart3 className="h-5 w-5 text-blue-600" />
            )
          }
          title={
            activeTab === 'tenants'
              ? 'Tenant Organizations'
              : activeTab === 'verifications'
                ? 'Domain & Security Verification'
                : activeTab === 'plans'
                  ? 'Subscription Plans & Tiers'
                  : activeTab === 'health'
                    ? 'Autonomous Daemons & System Health'
                    : activeTab === 'audit'
                      ? 'Global Audit Ledger'
                      : 'Workspace Usage & Cloud Billing'
          }
          subtitle={
            activeTab === 'tenants'
              ? 'Provision, manage, and monitor subscriber SaaS workspaces under Row-Level Security.'
              : activeTab === 'verifications'
                ? 'Review pending tenant domain claims and verify DNS ownership before workspace activation.'
                : activeTab === 'plans'
                  ? 'Configure subscription plan tiers, certificate & gateway quotas, and scheduled effective dates.'
                  : activeTab === 'health'
                    ? 'Real-time telemetry of the autonomous renewal engine, cron queue, and satellite gateway broker.'
                    : activeTab === 'audit'
                      ? 'Immutable cross-tenant audit trail of administrative operations and security events.'
                      : 'Live certificate utilization, gateway fleet capacity, and cloud billing breakdown.'
          }
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search organizations, slugs, plans..."
          userInitials="SA"
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

              {activeTab === 'plans' ? (
                <button
                  type="button"
                  onClick={onOpenCreatePlan}
                  className="primary-gradient-btn px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Plan</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenCreateTenant}
                  className="primary-gradient-btn px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Organization</span>
                </button>
              )}
            </div>
          }
        />

        {/* Dynamic Tab Body */}
        <div className="pt-2">{children}</div>
      </main>
    </div>
  );
};

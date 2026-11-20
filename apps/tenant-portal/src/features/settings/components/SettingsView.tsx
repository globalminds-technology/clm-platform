import React from 'react';
import { type Tenant, type CloudAccount, type CaIntegration, type User } from '@clm/shared-types';
import { useAuth } from '../../../context/AuthContext';
import { GeneralSettings } from './GeneralSettings';
import { CloudAccounts } from './CloudAccounts';
import { TeamRbac } from './TeamRbac';
import { CaIntegrations } from './CaIntegrations';

interface SettingsViewProps {
  currentTenant: Tenant | null;
  onTenantUpdated: (tenant: Tenant) => void;
  settingsSubTab: 'general' | 'cloud-accounts' | 'team' | 'ca-integrations';
  setSettingsSubTab: (subTab: 'general' | 'cloud-accounts' | 'team' | 'ca-integrations') => void;
  cloudAccounts: CloudAccount[];
  onCloudAccountsUpdated: () => void;
  caIntegrations: CaIntegration[];
  onCaIntegrationsUpdated: () => void;
  members: User[];
  onMembersUpdated: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentTenant,
  onTenantUpdated,
  settingsSubTab,
  setSettingsSubTab,
  cloudAccounts,
  onCloudAccountsUpdated,
  caIntegrations,
  onCaIntegrationsUpdated,
  members,
  onMembersUpdated,
}) => {
  const { can } = useAuth();
  return (
    <div className="bg-white rounded-[28px] soft-card p-6 mr-3 mb-6 space-y-6">
      {/* Header and Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">Tenant Settings</h3>
          <p className="text-xs text-slate-500">Configure team access, RBAC permissions, and organization security.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-[#F8FAFC] border border-slate-100">
          <button
            type="button"
            onClick={() => setSettingsSubTab('general')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${settingsSubTab === 'general' ? 'pill-tab-active' : 'pill-tab-inactive'
              }`}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setSettingsSubTab('cloud-accounts')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${settingsSubTab === 'cloud-accounts' ? 'pill-tab-active' : 'pill-tab-inactive'
              }`}
          >
            Cloud Providers ({cloudAccounts.length})
          </button>
          {can('manageTeam') && (
            <button
              type="button"
              onClick={() => setSettingsSubTab('team')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${settingsSubTab === 'team' ? 'pill-tab-active' : 'pill-tab-inactive'
                }`}
            >
              Team &amp; RBAC ({members.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setSettingsSubTab('ca-integrations')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${settingsSubTab === 'ca-integrations' ? 'pill-tab-active' : 'pill-tab-inactive'
              }`}
          >
            Certificate Authorities ({caIntegrations.length})
          </button>
        </div>
      </div>

      {settingsSubTab === 'general' && (
        <GeneralSettings
          currentTenant={currentTenant}
          onTenantUpdated={onTenantUpdated}
        />
      )}

      {settingsSubTab === 'cloud-accounts' && (
        <CloudAccounts
          cloudAccounts={cloudAccounts}
          onAccountsUpdated={onCloudAccountsUpdated}
        />
      )}

      {settingsSubTab === 'team' && (
        <TeamRbac
          members={members}
          onMembersUpdated={onMembersUpdated}
        />
      )}

      {settingsSubTab === 'ca-integrations' && (
        <CaIntegrations
          caIntegrations={caIntegrations}
          onCAsUpdated={onCaIntegrationsUpdated}
        />
      )}
    </div>
  );
};

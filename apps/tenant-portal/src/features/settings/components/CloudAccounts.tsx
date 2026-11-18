import React, { useState } from 'react';
import { Cloud, Plus, Lock, RefreshCw, Activity, Trash2 } from 'lucide-react';
import { CloudProvider, type CloudAccount } from '@clm/shared-types';
import { StatusBadge, Modal, PasswordInput, toast } from '@clm/ui';
import { api } from '../../../config/api';

interface CloudAccountsProps {
  cloudAccounts: CloudAccount[];
  onAccountsUpdated: () => void;
}

export const CloudAccounts: React.FC<CloudAccountsProps> = ({
  cloudAccounts,
  onAccountsUpdated,
}) => {
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
  const [isSaving, setIsSaving] = useState(false);
  const [testingCloudId, setTestingCloudId] = useState<string | null>(null);
  const [syncingAcmId, setSyncingAcmId] = useState<string | null>(null);

  const handleTestCloudAccount = async (id: string) => {
    setTestingCloudId(id);
    try {
      const res = await api.cloudAccounts.testConnection(id);
      if (res.success) {
        toast.success('Connection Successful', res.message);
      } else {
        toast.error('Handshake Failed', res.message);
      }
      onAccountsUpdated();
    } catch (err: any) {
      toast.error('Test Failed', err.message || 'Could not verify cloud credentials.');
    } finally {
      setTestingCloudId(null);
    }
  };

  const handleSyncAcm = async (id: string) => {
    setSyncingAcmId(id);
    try {
      const res = await api.cloudAccounts.syncAcm(id);
      toast.success(
        'AWS ACM Synchronized',
        `Discovered ${res.discovered} certificates (${res.updated} updated).`
      );
      onAccountsUpdated();
    } catch (err: any) {
      toast.error('ACM Sync Failed', err.message || 'Could not pull certificates from AWS ACM.');
    } finally {
      setSyncingAcmId(null);
    }
  };

  const handleDeleteCloudAccount = async (id: string, name: string) => {
    try {
      await api.cloudAccounts.delete(id);
      toast.success('Cloud Account Deleted', `Removed ${name} credentials.`);
      onAccountsUpdated();
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not delete cloud account.');
    }
  };

  const handleCreateCloudAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudAccountName.trim()) return;
    setIsSaving(true);
    try {
      await api.cloudAccounts.create({
        name: cloudAccountName.trim(),
        provider: cloudProvider,
        region: cloudRegion.trim() || 'us-east-1',
        awsAccessKeyId: awsAccessKey.trim() || undefined,
        awsSecretAccessKey: awsSecretKey.trim() || undefined,
        awsRoleArn: awsRoleArn.trim() || undefined,
        azureTenantId: azureTenantId.trim() || undefined,
        azureClientId: azureClientId.trim() || undefined,
        azureClientSecret: azureClientSecret.trim() || undefined,
        gcpProjectId: gcpProjectId.trim() || undefined,
        gcpServiceAccountJson: gcpServiceAccountJson.trim() || undefined,
      });

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
        'Credentials securely encrypted with AES-256-GCM in PostgreSQL.'
      );
      onAccountsUpdated();
    } catch (err: any) {
      toast.error('Connection Failed', err.message || 'Failed to authenticate cloud account.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
          type="button"
          onClick={() => setShowAddCloudModal(true)}
          className="primary-gradient-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
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
            type="button"
            onClick={() => setShowAddCloudModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Connect AWS / Azure / GCP</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cloudAccounts.map((account) => (
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
                      type="button"
                      onClick={() => handleSyncAcm(account.id)}
                      disabled={syncingAcmId === account.id}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
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
                    type="button"
                    onClick={() => handleTestCloudAccount(account.id)}
                    disabled={testingCloudId === account.id}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {testingCloudId === account.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Activity className="h-3 w-3" />
                    )}
                    <span>Test Connection</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCloudAccount(account.id, account.name)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
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

      {/* Connect Cloud Account Modal */}
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
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                cloudProvider === CloudProvider.AWS ? 'pill-tab-active' : 'pill-tab-inactive'
              }`}
            >
              Amazon Web Services (AWS)
            </button>
            <button
              type="button"
              onClick={() => setCloudProvider(CloudProvider.AZURE)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                cloudProvider === CloudProvider.AZURE ? 'pill-tab-active' : 'pill-tab-inactive'
              }`}
            >
              Microsoft Azure
            </button>
            <button
              type="button"
              onClick={() => setCloudProvider(CloudProvider.GCP)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                cloudProvider === CloudProvider.GCP ? 'pill-tab-active' : 'pill-tab-inactive'
              }`}
            >
              Google Cloud (GCP)
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Account Label / Identifier
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AWS Production East"
              value={cloudAccountName}
              onChange={(e) => setCloudAccountName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Cloud Region
            </label>
            <input
              type="text"
              placeholder="us-east-1"
              value={cloudRegion}
              onChange={(e) => setCloudRegion(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-mono"
            />
          </div>

          {cloudProvider === CloudProvider.AWS && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  AWS Access Key ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  value={awsAccessKey}
                  onChange={(e) => setAwsAccessKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  AWS Secret Access Key
                </label>
                <PasswordInput
                  value={awsSecretKey}
                  onChange={(e) => setAwsSecretKey(e.target.value)}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  className="bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cross-Account Role ARN (Optional)
                </label>
                <input
                  type="text"
                  placeholder="arn:aws:iam::123456789012:role/CLMCloudIntegrationRole"
                  value={awsRoleArn}
                  onChange={(e) => setAwsRoleArn(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-mono text-[11px]"
                />
              </div>
            </div>
          )}

          {cloudProvider === CloudProvider.AZURE && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Azure Tenant ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="00000000-0000-0000-0000-000000000000"
                  value={azureTenantId}
                  onChange={(e) => setAzureTenantId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Client ID (Application ID)
                </label>
                <input
                  type="text"
                  required
                  placeholder="00000000-0000-0000-0000-000000000000"
                  value={azureClientId}
                  onChange={(e) => setAzureClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Client Secret
                </label>
                <PasswordInput
                  value={azureClientSecret}
                  onChange={(e) => setAzureClientSecret(e.target.value)}
                  placeholder="Secret value from App Registrations"
                  className="bg-white"
                />
              </div>
            </div>
          )}

          {cloudProvider === CloudProvider.GCP && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  GCP Project ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="my-gcp-project-12345"
                  value={gcpProjectId}
                  onChange={(e) => setGcpProjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Service Account Key (JSON)
                </label>
                <textarea
                  rows={4}
                  required
                  value={gcpServiceAccountJson}
                  onChange={(e) => setGcpServiceAccountJson(e.target.value)}
                  placeholder='{"type": "service_account", "project_id": ...}'
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-mono text-[11px]"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddCloudModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="primary-gradient-btn px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Connecting...' : 'Save & Authenticate'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

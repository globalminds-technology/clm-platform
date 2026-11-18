import React, { useState, useEffect } from 'react';
import { CaProvider, type CreateCaIntegrationRequest, type CloudAccount } from '@clm/shared-types';
import { Modal, PasswordInput, toast } from '@clm/ui';
import { type ProviderCatalogItem } from '../types';
import { BrandLogo } from './BrandLogos';
import { api } from '../../../config/api';

interface ConnectCaModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProvider: ProviderCatalogItem | null;
  cloudAccounts?: CloudAccount[];
  onSuccess: () => void;
}

export const ConnectCaModal: React.FC<ConnectCaModalProps> = ({
  isOpen,
  onClose,
  selectedProvider,
  cloudAccounts = [],
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // ACME fields
  const [eabKid, setEabKid] = useState('');
  const [eabHmac, setEabHmac] = useState('');
  const [acmeUrl, setAcmeUrl] = useState('');

  // DigiCert / Sectigo / Commercial API
  const [digicertApiKey, setDigicertApiKey] = useState('');
  const [digicertContainerId, setDigicertContainerId] = useState('');
  const [sectigoUsername, setSectigoUsername] = useState('');
  const [sectigoPassword, setSectigoPassword] = useState('');
  const [sectigoUri, setSectigoUri] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  // Enterprise / Cloud PKI
  const [vaultAddress, setVaultAddress] = useState('');
  const [vaultToken, setVaultToken] = useState('');
  const [awsPcaArn, setAwsPcaArn] = useState('');
  const [awsCloudAccountId, setAwsCloudAccountId] = useState('');
  const [azureVaultUri, setAzureVaultUri] = useState('');
  const [azureClientId, setAzureClientId] = useState('');
  const [azureClientSecret, setAzureClientSecret] = useState('');
  const [azureTenantId, setAzureTenantId] = useState('');
  const [mscaServerUrl, setMscaServerUrl] = useState('');
  const [mscaTemplateName, setMscaTemplateName] = useState('WebServerEnterprise');
  const [k8sClusterUrl, setK8sClusterUrl] = useState('');
  const [k8sNamespace, setK8sNamespace] = useState('cert-manager');

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedProvider) {
      setName(`Corporate ${selectedProvider.name} Master`);
      if (selectedProvider.provider === CaProvider.CUSTOM_ACME) {
        setAcmeUrl('https://acme.internal.corp/directory');
      } else if (selectedProvider.provider === CaProvider.ZEROSSL) {
        setAcmeUrl('https://acme.zerossl.com/v2/DV90');
      } else if (selectedProvider.provider === CaProvider.BUYPASS) {
        setAcmeUrl('https://api.buypass.com/acme/directory');
      }
    }
  }, [selectedProvider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider || !name.trim()) return;

    setIsSaving(true);
    try {
      const payload: CreateCaIntegrationRequest = {
        name: name.trim(),
        provider: selectedProvider.provider,
        accountEmail: accountEmail.trim() || undefined,
        externalAccountBindingId: eabKid.trim() || undefined,
        eabHmacKey: eabHmac.trim() || undefined,
        acmeDirectoryUrl: acmeUrl.trim() || undefined,
        digicertApiKey: digicertApiKey.trim() || undefined,
        digicertContainerId: digicertContainerId.trim() || undefined,
        sectigoUsername: sectigoUsername.trim() || undefined,
        sectigoPassword: sectigoPassword.trim() || undefined,
        sectigoCustomerUri: sectigoUri.trim() || undefined,
        apiKey: apiKey.trim() || undefined,
        apiSecret: apiSecret.trim() || undefined,
        vaultAddress: vaultAddress.trim() || undefined,
        vaultToken: vaultToken.trim() || undefined,
        awsPcaArn: awsPcaArn.trim() || undefined,
        awsCloudAccountId: awsCloudAccountId || undefined,
        azureVaultUri: azureVaultUri.trim() || undefined,
        azureClientId: azureClientId.trim() || undefined,
        azureClientSecret: azureClientSecret.trim() || undefined,
        azureTenantId: azureTenantId.trim() || undefined,
        mscaServerUrl: mscaServerUrl.trim() || undefined,
        mscaTemplateName: mscaTemplateName.trim() || undefined,
        k8sClusterUrl: k8sClusterUrl.trim() || undefined,
        k8sNamespace: k8sNamespace.trim() || undefined,
        isDefault,
      };

      await api.caIntegrations.create(payload);
      toast.success(
        'Integration Connected',
        `Enrolled ${selectedProvider.name} (${name}) with AES-256-GCM encrypted credentials.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Connection Failed', err.message || 'Failed to authenticate with CA API.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedProvider) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Connect ${selectedProvider.name}`}
      description={selectedProvider.tagline}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Provider Banner */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
          <BrandLogo type={selectedProvider.logoType} className="w-11 h-11" />
          <div className="flex-1">
            <h4 className="font-extrabold text-[#0F172A] text-sm">{selectedProvider.name}</h4>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {selectedProvider.categoryLabel}
            </span>
          </div>
          <div className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            Zero-Trust Vault
          </div>
        </div>

        {/* General Name & Default Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Integration Label
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Primary Production Master"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Contact / Admin Email
            </label>
            <input
              type="email"
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.target.value)}
              placeholder="security@company.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs"
            />
          </div>
        </div>

        {/* 1. DigiCert Specific */}
        {selectedProvider.provider === CaProvider.DIGICERT && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                CertCentral API Key
              </label>
              <PasswordInput
                value={digicertApiKey}
                onChange={(e) => setDigicertApiKey(e.target.value)}
                placeholder="X-DC-DEVKEY-••••••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Division / Container ID (Optional)
              </label>
              <input
                type="text"
                value={digicertContainerId}
                onChange={(e) => setDigicertContainerId(e.target.value)}
                placeholder="e.g. 12345"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              />
            </div>
          </div>
        )}

        {/* 2. Sectigo Specific */}
        {selectedProvider.provider === CaProvider.SECTIGO && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                SCM Login Username
              </label>
              <input
                type="text"
                required
                value={sectigoUsername}
                onChange={(e) => setSectigoUsername(e.target.value)}
                placeholder="admin@sectigo-account.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Password / API Secret
              </label>
              <PasswordInput
                value={sectigoPassword}
                onChange={(e) => setSectigoPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Customer URI
              </label>
              <input
                type="text"
                value={sectigoUri}
                onChange={(e) => setSectigoUri(e.target.value)}
                placeholder="e.g. AcmeCorp"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              />
            </div>
          </div>
        )}

        {/* 3. GlobalSign, GoDaddy, The SSL Store, emSign */}
        {(selectedProvider.provider === CaProvider.GLOBALSIGN ||
          selectedProvider.provider === CaProvider.GODADDY ||
          selectedProvider.provider === CaProvider.THE_SSL_STORE ||
          selectedProvider.provider === CaProvider.EMSIGN) && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                API Key / Client ID
              </label>
              <input
                type="text"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API Key ID"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                API Secret Key
              </label>
              <PasswordInput
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>
          </div>
        )}

        {/* 4. ACME Providers */}
        {selectedProvider.category === 'ACME' && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            {selectedProvider.provider === CaProvider.CUSTOM_ACME && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ACME Directory URL
                </label>
                <input
                  type="url"
                  required
                  value={acmeUrl}
                  onChange={(e) => setAcmeUrl(e.target.value)}
                  placeholder="https://acme.internal.corp/directory"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-mono"
                />
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                External Account Binding (EAB) Key ID (Optional)
              </label>
              <input
                type="text"
                value={eabKid}
                onChange={(e) => setEabKid(e.target.value)}
                placeholder="Leave blank for free zero-config ACME"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                EAB HMAC Key (Optional)
              </label>
              <PasswordInput
                value={eabHmac}
                onChange={(e) => setEabHmac(e.target.value)}
                placeholder="Base64 HMAC Key"
              />
            </div>
          </div>
        )}

        {/* 5. AWS Private CA */}
        {selectedProvider.provider === CaProvider.AWS_PCA && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                AWS Private CA ARN
              </label>
              <input
                type="text"
                required
                value={awsPcaArn}
                onChange={(e) => setAwsPcaArn(e.target.value)}
                placeholder="arn:aws:acm-pca:us-east-1:123456789012:certificate-authority/..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Connected AWS IAM Account
              </label>
              <select
                value={awsCloudAccountId}
                onChange={(e) => setAwsCloudAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="">Default IAM Role (Pod Identity / Instance Profile)</option>
                {cloudAccounts
                  .filter((a) => a.provider === 'AWS')
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.awsAccountId || 'IAM Role'})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* 6. Azure Key Vault */}
        {selectedProvider.provider === CaProvider.AZURE_KEYVAULT && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Vault URI
              </label>
              <input
                type="url"
                required
                value={azureVaultUri}
                onChange={(e) => setAzureVaultUri(e.target.value)}
                placeholder="https://mycorp-vault.vault.azure.net"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Tenant ID</label>
                <input
                  type="text"
                  required
                  value={azureTenantId}
                  onChange={(e) => setAzureTenantId(e.target.value)}
                  placeholder="Azure Tenant UUID"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Client ID</label>
                <input
                  type="text"
                  required
                  value={azureClientId}
                  onChange={(e) => setAzureClientId(e.target.value)}
                  placeholder="Service Principal ID"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Client Secret</label>
              <PasswordInput
                value={azureClientSecret}
                onChange={(e) => setAzureClientSecret(e.target.value)}
                placeholder="Client Secret Value"
                required
              />
            </div>
          </div>
        )}

        {/* 7. HashiCorp Vault */}
        {selectedProvider.provider === CaProvider.VAULT && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Vault Server URL
              </label>
              <input
                type="url"
                required
                value={vaultAddress}
                onChange={(e) => setVaultAddress(e.target.value)}
                placeholder="https://vault.corp.internal:8200"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Token / AppRole Secret
              </label>
              <PasswordInput
                value={vaultToken}
                onChange={(e) => setVaultToken(e.target.value)}
                placeholder="s.••••••••••••"
                required
              />
            </div>
          </div>
        )}

        {/* 8. MSCA */}
        {selectedProvider.provider === CaProvider.MSCA && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                AD CS Web Enrollment / SCEP URL
              </label>
              <input
                type="url"
                required
                value={mscaServerUrl}
                onChange={(e) => setMscaServerUrl(e.target.value)}
                placeholder="https://ca01.corp.internal/certsrv"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Certificate Template Name
              </label>
              <input
                type="text"
                required
                value={mscaTemplateName}
                onChange={(e) => setMscaTemplateName(e.target.value)}
                placeholder="e.g. WebServerEnterprise"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              />
            </div>
          </div>
        )}

        {/* 9. Kubernetes cert-manager */}
        {selectedProvider.provider === CaProvider.KUBERNETES && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Kubernetes API Server Endpoint
              </label>
              <input
                type="url"
                required
                value={k8sClusterUrl}
                onChange={(e) => setK8sClusterUrl(e.target.value)}
                placeholder="https://k8s-api.internal:6443"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                cert-manager Namespace
              </label>
              <input
                type="text"
                value={k8sNamespace}
                onChange={(e) => setK8sNamespace(e.target.value)}
                placeholder="cert-manager"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              />
            </div>
          </div>
        )}

        {/* Default CA toggle */}
        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
          />
          <span className="font-semibold text-slate-700 text-xs">
            Make this the default Certificate Authority for all automated renewals
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="primary-gradient-btn px-5 py-2 rounded-xl font-bold shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Connecting...' : 'Save & Encrypt Credentials'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState } from 'react';
import { ShieldCheck, Shield, Plus, Trash2 } from 'lucide-react';
import { CaProvider, type CaIntegration, type CreateCaIntegrationRequest } from '@clm/shared-types';
import { Badge, Modal, PasswordInput, toast } from '@clm/ui';
import { api } from '../../../config/api';

interface CaIntegrationsProps {
  caIntegrations: CaIntegration[];
  onCAsUpdated: () => void;
}

export const CaIntegrations: React.FC<CaIntegrationsProps> = ({
  caIntegrations,
  onCAsUpdated,
}) => {
  const [showAddCaModal, setShowAddCaModal] = useState(false);
  const [newCaProvider, setNewCaProvider] = useState<CaProvider>(CaProvider.LETS_ENCRYPT);
  const [newCaName, setNewCaName] = useState('');
  const [newCaEmail, setNewCaEmail] = useState('');
  const [newCaEabKid, setNewCaEabKid] = useState('');
  const [newCaEabHmac, setNewCaEabHmac] = useState('');
  const [newCaDigicertApiKey, setNewCaDigicertApiKey] = useState('');
  const [newCaDigicertContainerId, setNewCaDigicertContainerId] = useState('');
  const [newCaSectigoUsername, setNewCaSectigoUsername] = useState('');
  const [newCaSectigoPassword, setNewCaSectigoPassword] = useState('');
  const [newCaSectigoUri, setNewCaSectigoUri] = useState('');
  const [newCaVaultAddress, setNewCaVaultAddress] = useState('');
  const [newCaVaultToken, setNewCaVaultToken] = useState('');
  const [newCaAwsPcaArn, setNewCaAwsPcaArn] = useState('');
  const [isSavingCa, setIsSavingCa] = useState(false);

  const handleSetDefaultCa = async (id: string) => {
    try {
      await api.caIntegrations.setDefault(id);
      toast.success('Default CA Updated', 'Automated renewals will now prioritize this Certificate Authority.');
      onCAsUpdated();
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not update default CA.');
    }
  };

  const handleDeleteCa = async (id: string, name: string) => {
    try {
      await api.caIntegrations.delete(id);
      toast.success('CA Disconnected', `Removed ${name} from tenant configuration.`);
      onCAsUpdated();
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not remove CA integration.');
    }
  };

  const handleCreateCa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaName.trim()) return;
    setIsSavingCa(true);
    try {
      const payload: CreateCaIntegrationRequest = {
        name: newCaName.trim(),
        provider: newCaProvider,
        accountEmail: newCaEmail.trim() || undefined,
        externalAccountBindingId: newCaEabKid.trim() || undefined,
        eabHmacKey: newCaEabHmac.trim() || undefined,
        digicertApiKey: newCaDigicertApiKey.trim() || undefined,
        digicertContainerId: newCaDigicertContainerId.trim() || undefined,
        sectigoUsername: newCaSectigoUsername.trim() || undefined,
        sectigoPassword: newCaSectigoPassword.trim() || undefined,
        sectigoCustomerUri: newCaSectigoUri.trim() || undefined,
        vaultAddress: newCaVaultAddress.trim() || undefined,
        vaultToken: newCaVaultToken.trim() || undefined,
        awsPcaArn: newCaAwsPcaArn.trim() || undefined,
      };

      await api.caIntegrations.create(payload);
      toast.success('Certificate Authority Connected', `Successfully enrolled ${newCaName}.`);
      setShowAddCaModal(false);
      setNewCaName('');
      setNewCaEmail('');
      setNewCaEabKid('');
      setNewCaEabHmac('');
      setNewCaDigicertApiKey('');
      setNewCaDigicertContainerId('');
      setNewCaSectigoUsername('');
      setNewCaSectigoPassword('');
      setNewCaSectigoUri('');
      setNewCaVaultAddress('');
      setNewCaVaultToken('');
      setNewCaAwsPcaArn('');
      onCAsUpdated();
    } catch (err: any) {
      toast.error('Enrollment Failed', err.message || 'Failed to authenticate with CA.');
    } finally {
      setIsSavingCa(false);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <h4 className="font-extrabold text-slate-800">Connected Certificate Authorities (CAs)</h4>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Configure public and private CAs for automated issuance and renewals. All credentials are encrypted with AES-256-GCM.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddCaModal(true)}
          className="primary-gradient-btn px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 self-start sm:self-auto shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Connect External CA</span>
        </button>
      </div>

      {caIntegrations.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#F8FAFC] border border-slate-100 text-center space-y-3">
          <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-slate-800">No Custom External CAs Connected</div>
            <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
              By default, automated renewals execute through <strong>Let's Encrypt / ACME</strong> with DNS-01 verification.
              Connect <strong>DigiCert CertCentral</strong>, <strong>Sectigo SCM</strong>, <strong>AWS Private CA</strong>, or <strong>HashiCorp Vault</strong> to issue commercial or internal private certificates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddCaModal(true)}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-blue-600 font-bold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            + Connect External CA
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {caIntegrations.map((ca) => (
            <div
              key={ca.id}
              className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 hover:border-blue-200 transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>{ca.name}</span>
                      {ca.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                          Default Issuer
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {ca.provider} {ca.accountEmail ? `• ${ca.accountEmail}` : ''}
                    </div>
                  </div>
                </div>
                <Badge variant={ca.status === 'ACTIVE' ? 'success' : 'destructive'}>
                  {ca.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                <span className="text-[11px] font-mono text-slate-400">
                  Secret: {ca.maskedSecret || '••••••••••••'}
                </span>
                <div className="flex items-center gap-2">
                  {!ca.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultCa(ca.id)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteCa(ca.id, ca.name)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    title="Disconnect CA"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect External CA Modal */}
      <Modal
        isOpen={showAddCaModal}
        onClose={() => setShowAddCaModal(false)}
        title="Connect External Certificate Authority (CA)"
        description="Authenticate and link commercial or private CAs to issue signed TLS certificates."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCa} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select CA Provider
            </label>
            <select
              value={newCaProvider}
              onChange={(e) => setNewCaProvider(e.target.value as CaProvider)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-medium"
            >
              <option value={CaProvider.LETS_ENCRYPT}>Let's Encrypt (Automated ACME)</option>
              <option value={CaProvider.DIGICERT}>DigiCert CertCentral (Enterprise TLS)</option>
              <option value={CaProvider.SECTIGO}>Sectigo SCM (Enterprise SSL)</option>
              <option value={CaProvider.VAULT}>HashiCorp Vault (Internal PKI Secrets Engine)</option>
              <option value={CaProvider.AWS_PCA}>AWS Private CA (Cloud Private PKI)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Integration Label
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Corporate DigiCert Account"
              value={newCaName}
              onChange={(e) => setNewCaName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
            />
          </div>

          {newCaProvider === CaProvider.LETS_ENCRYPT && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  ACME Registration Email
                </label>
                <input
                  type="email"
                  placeholder="admin@company.com"
                  value={newCaEmail}
                  onChange={(e) => setNewCaEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    EAB Key ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCaEabKid}
                    onChange={(e) => setNewCaEabKid(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    EAB HMAC Key (Optional)
                  </label>
                  <PasswordInput
                    value={newCaEabHmac}
                    onChange={(e) => setNewCaEabHmac(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {newCaProvider === CaProvider.DIGICERT && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  DigiCert CertCentral API Key
                </label>
                <PasswordInput
                  value={newCaDigicertApiKey}
                  onChange={(e) => setNewCaDigicertApiKey(e.target.value)}
                  placeholder="CertCentral REST API Token"
                  className="bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Container ID / Division ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12345"
                  value={newCaDigicertContainerId}
                  onChange={(e) => setNewCaDigicertContainerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-mono"
                />
              </div>
            </div>
          )}

          {newCaProvider === CaProvider.SECTIGO && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sectigo SCM Login / Username
                </label>
                <input
                  type="text"
                  placeholder="admin_api"
                  value={newCaSectigoUsername}
                  onChange={(e) => setNewCaSectigoUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sectigo Password / API Secret
                </label>
                <PasswordInput
                  value={newCaSectigoPassword}
                  onChange={(e) => setNewCaSectigoPassword(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Customer URI / Org Identifier
                </label>
                <input
                  type="text"
                  placeholder="MyCompanySCM"
                  value={newCaSectigoUri}
                  onChange={(e) => setNewCaSectigoUri(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-mono"
                />
              </div>
            </div>
          )}

          {newCaProvider === CaProvider.VAULT && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vault Address URL
                </label>
                <input
                  type="url"
                  placeholder="https://vault.internal:8200"
                  value={newCaVaultAddress}
                  onChange={(e) => setNewCaVaultAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vault PKI Token
                </label>
                <PasswordInput
                  value={newCaVaultToken}
                  onChange={(e) => setNewCaVaultToken(e.target.value)}
                  placeholder="hvs.CAESIB..."
                  className="bg-white"
                />
              </div>
            </div>
          )}

          {newCaProvider === CaProvider.AWS_PCA && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                AWS Private CA ARN
              </label>
              <input
                type="text"
                placeholder="arn:aws:acm-pca:us-east-1:123456789012:certificate-authority/12345678-..."
                value={newCaAwsPcaArn}
                onChange={(e) => setNewCaAwsPcaArn(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-mono text-[11px]"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddCaModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingCa}
              className="primary-gradient-btn px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              {isSavingCa ? 'Saving...' : 'Connect CA'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

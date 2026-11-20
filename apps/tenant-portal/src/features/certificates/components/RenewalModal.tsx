import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { Modal, InfoBubble } from '@clm/ui';
import { type Certificate, type CaIntegration } from '@clm/shared-types';
import { api } from '../../../config/api';

interface RenewalModalProps {
  cert: Certificate | null;
  caIntegrations: CaIntegration[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedCert: Certificate) => void;
}

export const RenewalModal: React.FC<RenewalModalProps> = ({
  cert,
  caIntegrations,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [renewalContext, setRenewalContext] = useState<any | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCloudAccountId, setSelectedCloudAccountId] = useState('');
  const [selectedCaIntegrationId, setSelectedCaIntegrationId] = useState('');
  const [customKeyAlgorithm, setCustomKeyAlgorithm] = useState('RSA_2048');

  const loadRenewalContext = async (c: Certificate) => {
    setIsLoadingContext(true);
    setRenewalContext(null);
    try {
      const ctx = await api.certificates.getRenewalContext(c.id);
      setRenewalContext(ctx);
      if (ctx?.connectedCloudAccounts && ctx.connectedCloudAccounts.length > 0 && ctx.connectedCloudAccounts[0]) {
        setSelectedCloudAccountId(ctx.connectedCloudAccounts[0].id);
      }
      setCustomKeyAlgorithm(c.keyAlgorithm || 'RSA_2048');
    } catch {
      setRenewalContext(null);
    } finally {
      setIsLoadingContext(false);
    }
  };

  useEffect(() => {
    if (isOpen && cert) {
      loadRenewalContext(cert);
      setSelectedCaIntegrationId(cert.caIntegrationId || '');
    }
  }, [isOpen, cert]);

  if (!cert) return null;

  const handleExecute = async () => {
    setIsSubmitting(true);
    try {
      const updated = await api.certificates.renew(cert.id, {
        keyAlgorithm: customKeyAlgorithm as any,
        cloudAccountId: selectedCloudAccountId || undefined,
        caIntegrationId: selectedCaIntegrationId || undefined,
      });
      onSuccess(updated);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={`Renew Certificate: ${cert.domain}`}
    >
      <div className="p-6 space-y-5">
        {isLoadingContext ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
            <p className="text-xs font-medium text-slate-500">
              Loading pre-saved tenant identity &amp; cloud credentials...
            </p>
          </div>
        ) : renewalContext ? (
          <div className="space-y-4">
            <div className="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-blue-900">Stored Tenant &amp; CA Identity Matched</h4>
                <p className="text-[11px] text-blue-700/80 mt-0.5">
                  Your saved company registration details and connected cloud DNS credentials will automatically generate the CSR and fulfill the validation challenge.
                </p>
              </div>
            </div>

            {/* Subscription Tier Badge & Quota Info */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Plan Tier:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    renewalContext.isPaidPlan
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
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
                  <span className="font-semibold text-slate-800">
                    {renewalContext.organizationMetadata.organizationName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Organizational Unit (OU):</span>
                  <span className="font-semibold text-slate-800">
                    {renewalContext.organizationMetadata.department || 'SecOps'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Country (C):</span>
                  <span className="font-semibold text-slate-800">
                    {renewalContext.organizationMetadata.country || 'US'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Notification Email:</span>
                  <span className="font-semibold text-slate-800">
                    {renewalContext.organizationMetadata.contactEmail || 'security@tenant.internal'}
                  </span>
                </div>
              </div>
            </div>

            {/* Connected Cloud Provider & DNS Validation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center">
                <span>Select Automated Cloud DNS Provider for Challenge</span>
                <InfoBubble content="The DNS provider hosting this domain where the DNS-01 TXT record will be automatically published." />
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

            {/* Certificate Authority Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center">
                <span>Target Certificate Authority</span>
                <InfoBubble content="Select which configured CA will issue this renewal. Free Community tier defaults to Let's Encrypt / ACME." />
              </label>
              <select
                value={selectedCaIntegrationId}
                onChange={e => setSelectedCaIntegrationId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
              >
                <option value="">Let&apos;s Encrypt / ACME (Default Automated Issuance)</option>
                {caIntegrations.map(ca => (
                  <option key={ca.id} value={ca.id}>
                    {ca.name} ({ca.provider}) {ca.isDefault ? '— Default Issuer' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Key Algorithm Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center">
                <span>Key Algorithm for New Key Pair</span>
                <InfoBubble content="Cryptographic standard for the generated private key. RSA 2048 is recommended for broad web compatibility." />
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
                disabled={isSubmitting}
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecute}
                className="primary-gradient-btn px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>{isSubmitting ? 'Issuing & Deploying...' : 'Approve & Issue Certificate'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
            <p className="text-xs font-semibold text-slate-800">Unable to load renewal context</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Could not retrieve organization profile or connected CA details from the server. Please verify backend connectivity.
            </p>
            <button
              type="button"
              onClick={() => loadRenewalContext(cert)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Retry Loading Context
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

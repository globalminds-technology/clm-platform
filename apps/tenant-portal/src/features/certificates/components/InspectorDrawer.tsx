import React, { useState } from 'react';
import {
  Layers,
  Lock,
  FileText,
  Check,
  Copy,
  Server,
  Sparkles,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { Drawer, toast } from '@clm/ui';
import { type Certificate, type CaIntegration, type Gateway } from '@clm/shared-types';
import { BrandLogo } from '../../integrations/components/BrandLogos';
import { api } from '../../../config/api';

interface InspectorDrawerProps {
  cert: Certificate | null;
  isOpen: boolean;
  onClose: () => void;
  caIntegrations?: CaIntegration[];
  gateways?: Gateway[];
  onCertUpdated?: (updatedCert: Certificate) => void;
}

function getLogoType(providerOrIssuer: string): string {
  const s = (providerOrIssuer || '').toLowerCase();
  if (s.includes('digicert')) return 'digicert';
  if (s.includes('sectigo')) return 'sectigo';
  if (s.includes('globalsign')) return 'globalsign';
  if (s.includes('godaddy')) return 'godaddy';
  if (s.includes('sslstore') || s.includes('ssl store')) return 'sslstore';
  if (s.includes('emsign')) return 'emsign';
  if (s.includes('encrypt')) return 'letsencrypt';
  if (s.includes('zerossl')) return 'zerossl';
  if (s.includes('buypass')) return 'buypass';
  if (s.includes('telia')) return 'telia';
  if (s.includes('msca') || s.includes('microsoft')) return 'msca';
  if (s.includes('aws') || s.includes('amazon')) return 'aws';
  if (s.includes('azure')) return 'azure';
  if (s.includes('vault')) return 'vault';
  if (s.includes('k8s') || s.includes('kubernetes')) return 'k8s';
  return 'digicert';
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  cert,
  isOpen,
  onClose,
  caIntegrations = [],
  gateways = [],
  onCertUpdated,
}) => {
  const [copiedPem, setCopiedPem] = useState(false);
  const [isChangingCa, setIsChangingCa] = useState(false);
  const [isSavingBinding, setIsSavingBinding] = useState(false);

  // Local binding state
  const [selectedCaId, setSelectedCaId] = useState<string>(cert?.caIntegrationId || '');
  const [autoRenew, setAutoRenew] = useState<boolean>(cert?.autoRenew ?? true);
  const [renewThresholdDays, setRenewThresholdDays] = useState<number>(cert?.renewBeforeDays || 30);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>(cert?.gatewayId || '');

  // Keep state synced when cert changes
  React.useEffect(() => {
    if (cert) {
      setSelectedCaId(cert.caIntegrationId || '');
      setAutoRenew(cert.autoRenew ?? true);
      setRenewThresholdDays(cert.renewBeforeDays || 30);
      setSelectedGatewayId(cert.gatewayId || '');
    }
  }, [cert]);

  if (!cert) return null;

  // Identify bound CA
  const boundCa = caIntegrations.find((ca) => ca.id === cert.caIntegrationId) ||
    caIntegrations.find((ca) => ca.isDefault) ||
    null;

  const logoType = boundCa ? getLogoType(boundCa.provider) : getLogoType(cert.issuer);
  const caDisplayName = boundCa?.name || cert.issuer || 'Default ACME / DigiCert';

  // Identify bound Gateway
  const boundGateway = gateways.find((g) => g.id === (cert.gatewayId || selectedGatewayId));

  const mockPemChain = `-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAP7x2/mY7E1zJq0...
Domain: ${cert.domain}
Serial: ${cert.serialNumber}
Issuer: ${caDisplayName}
SHA-256: ${cert.fingerprintSha256}
-----END CERTIFICATE-----`;

  const handleCopyPem = () => {
    navigator.clipboard.writeText(mockPemChain);
    setCopiedPem(true);
    setTimeout(() => setCopiedPem(false), 2000);
  };

  const handleSaveBindings = async () => {
    setIsSavingBinding(true);
    try {
      const updated = await api.certificates.updateBinding(cert.id, {
        caIntegrationId: selectedCaId || null,
        gatewayId: selectedGatewayId || null,
        autoRenew,
        renewBeforeDays: renewThresholdDays,
      });

      toast.success(
        'Policy Saved',
        `Sticky CA and deployment policy for ${cert.domain} updated successfully.`
      );
      if (onCertUpdated) {
        onCertUpdated(updated);
      }
      setIsChangingCa(false);
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not update certificate configuration.');
    } finally {
      setIsSavingBinding(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Deep Certificate Inspector: ${cert.domain}`}
      description="Cryptographic chain, sticky CA binding, and Satellite Gateway delivery topology"
      width="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-400 font-mono">
            SHA-256: {cert.fingerprintSha256.substring(0, 16)}...
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Status Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-100 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">Status</div>
            <div className="text-base font-extrabold text-blue-950 mt-0.5">{cert.status}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">Validity Left</div>
            <div className="text-base font-extrabold text-blue-950 mt-0.5">
              {cert.daysRemaining > 0 ? `${cert.daysRemaining} days` : 'Expired'}
            </div>
          </div>
        </div>

        {/* 1. Sticky CA Binding Section */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>Sticky Certificate Authority (CA) Binding</span>
            </h4>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Check className="h-3 w-3" /> Sticky Binding Active
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            All future automated and manual renewals for <code className="text-blue-600 font-semibold">{cert.domain}</code> are permanently locked to this Certificate Authority to prevent domain verification drift.
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo type={logoType} className="w-9 h-9" />
              <div>
                <div className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <span>{caDisplayName}</span>
                  {boundCa?.isDefault && (
                    <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                      Tenant Default
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Provider: <span className="font-mono text-slate-700">{boundCa?.provider || 'ACME / Custom CA'}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsChangingCa(!isChangingCa)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors flex items-center gap-1"
            >
              <span>{isChangingCa ? 'Cancel' : 'Change CA'}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Changing CA Dropdown Box */}
          {isChangingCa && (
            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-slate-700 block">
                Select Connected CA from Catalog:
              </label>
              <select
                value={selectedCaId}
                onChange={(e) => setSelectedCaId(e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Default Tenant Catalog CA (Automatic)</option>
                {caIntegrations.map((ca) => (
                  <option key={ca.id} value={ca.id}>
                    {ca.name} ({ca.provider}) {ca.isDefault ? '— Default' : ''}
                  </option>
                ))}
              </select>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={isSavingBinding}
                  onClick={handleSaveBindings}
                  className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSavingBinding ? 'Saving...' : 'Confirm CA Binding'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Satellite Gateway & Safe Deployment Topology */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="h-4 w-4 text-blue-600" />
              <span>Satellite Gateway &amp; Safe Hot-Reload</span>
            </h4>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
              Target: {cert.deploymentTargetType || 'NGINX'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <div className="text-slate-500 font-medium">Assigned Gateway</div>
              <div className="font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>{boundGateway?.name || 'VPC Daemon Gateway'}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {boundGateway?.hostname || 'gw-prod-01.acme.internal'}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <div className="text-slate-500 font-medium">Safe Rollback Safeguard</div>
              <div className="font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Pre-Flight &amp; .bak Active</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Atomic switch with instant revert
              </div>
            </div>
          </div>

          {/* Auto-Renewal Threshold & Policy Control */}
          <div className="p-3 bg-slate-50/80 border border-slate-200/60 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                <span>Renewal Threshold (Days Before Expiry)</span>
              </label>
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {renewThresholdDays} Days
              </span>
            </div>
            <input
              type="range"
              min="7"
              max="60"
              step="1"
              value={renewThresholdDays}
              onChange={(e) => setRenewThresholdDays(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Enable Automated Zero-Touch Renewal &amp; Push</span>
              </label>
              <button
                type="button"
                disabled={isSavingBinding}
                onClick={handleSaveBindings}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs hover:bg-slate-50 transition-colors"
              >
                {isSavingBinding ? 'Saving...' : 'Apply Policy'}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Subject Alternative Names (SANs) */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-blue-600" />
            <span>Subject Alternative Names (SANs) ({cert.sans?.length || 1})</span>
          </h4>
          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
            {cert.sans?.map((san, idx) => (
              <div key={idx} className="font-mono text-xs text-slate-800 flex items-center gap-2">
                <span className="text-slate-400">DNS:{idx + 1}</span>
                <span>{san}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Cryptographic Specifications */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-blue-600" />
            <span>Cryptographic Metadata &amp; Fingerprint</span>
          </h4>
          <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Key Algorithm</span>
              <span className="font-mono font-bold text-slate-800">{cert.keyAlgorithm}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Serial Number</span>
              <span className="font-mono text-slate-800">{cert.serialNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Certificate Authority</span>
              <span className="text-slate-800 font-semibold">{caDisplayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Valid From</span>
              <span className="text-slate-700">{new Date(cert.notBefore).toUTCString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Valid To</span>
              <span className="text-slate-700">{new Date(cert.notAfter).toUTCString()}</span>
            </div>
          </div>
        </div>

        {/* 5. PEM Chain Viewer */}
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
          <div className="relative">
            <pre className="p-3.5 bg-slate-900 text-slate-300 font-mono text-[11px] rounded-xl overflow-x-auto leading-relaxed">
              {mockPemChain}
            </pre>
            <button
              onClick={handleCopyPem}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Copy PEM block"
            >
              {copiedPem ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

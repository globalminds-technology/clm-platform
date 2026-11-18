import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Shield,
  Radio,
  RefreshCw,
  AlertCircle,
  Server,
  Zap,
  Lock,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import {
  KeyAlgorithm,
  CertificateTrackingMode,
  ValidationMethod,
  type Certificate,
  type Gateway,
  type Tenant,
  type LiveTlsProbeResult,
  type CaIntegration,
  type CloudAccount,
} from '@clm/shared-types';
import { Modal, toast, InfoBubble } from '@clm/ui';
import { api } from '../../../config/api';

interface AddCertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (cert: Certificate) => void;
  gateways: Gateway[];
  currentTenant: Tenant | null;
  caIntegrations?: CaIntegration[];
  cloudAccounts?: CloudAccount[];
}

export const AddCertModal: React.FC<AddCertModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  gateways,
  currentTenant,
  caIntegrations = [],
  cloudAccounts: _cloudAccounts = [],
}) => {
  const [addCertTab, setAddCertTab] = useState<'probe' | 'mint'>('probe');

  // Certificate Issuance State
  const [certPurpose, setCertPurpose] = useState<'WEB_SERVER' | 'MTLS' | 'WILDCARD'>('WEB_SERVER');
  const [newDomain, setNewDomain] = useState('');
  const [newSans, setNewSans] = useState('');
  const [selectedCaId, setSelectedCaId] = useState<string>('');
  const [newIssuer, setNewIssuer] = useState('DigiCert TLS RSA CA');
  const [newAlgorithm, setNewAlgorithm] = useState<KeyAlgorithm>(KeyAlgorithm.RSA_2048);
  const [newValidityDays, setNewValidityDays] = useState(90);
  const [autoRenew, setAutoRenew] = useState(true);
  const [renewBeforeDays, setRenewBeforeDays] = useState(30);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('');
  const [targetCertPath, setTargetCertPath] = useState('/etc/ssl/certs/');
  const [reloadCommand, setReloadCommand] = useState('systemctl reload nginx');

  // Live TLS Probe State
  const [probeDomain, setProbeDomain] = useState('google.com');
  const [probePort, setProbePort] = useState(443);
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<LiveTlsProbeResult | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [probeGatewayId, setProbeGatewayId] = useState<string>('');
  const [probeAutoRenew, setProbeAutoRenew] = useState(false);

  const [isCreating, setIsCreating] = useState(false);

  // Set default CA if available
    useEffect(() => {
      if (caIntegrations.length > 0 && !selectedCaId) {
        const defaultCa = caIntegrations.find((ca) => ca.isDefault) || caIntegrations[0];
        if (defaultCa) {
          setSelectedCaId(defaultCa.id);
          setNewIssuer(defaultCa.name || defaultCa.provider);
        }
      }
    }, [caIntegrations, selectedCaId]);

    const handleClose = () => {
      setProbeResult(null);
      setProbeError(null);
      onClose();
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
        toast.success(
          'TLS Discovery Complete',
          `Retrieved live X.509 certificate for ${res.domain} (${res.daysRemaining} days remaining).`
        );
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
      setIsCreating(true);
      try {
        let keyAlgo = KeyAlgorithm.RSA_2048;
        if (probeResult.keyAlgorithm.includes('4096')) keyAlgo = KeyAlgorithm.RSA_4096;
        else if (probeResult.keyAlgorithm.includes('ECDSA') || probeResult.keyAlgorithm.includes('256')) {
          keyAlgo = KeyAlgorithm.ECDSA_P256;
        }

        const created = await api.certificates.create({
          domain: probeResult.domain,
          sans: probeResult.sans,
          keyAlgorithm: keyAlgo,
          trackingMode: probeAutoRenew
            ? CertificateTrackingMode.MANAGED_GATEWAY
            : CertificateTrackingMode.MONITORED,
          validationMethod: ValidationMethod.MANUAL,
          autoRenew: probeAutoRenew,
          renewBeforeDays: 30,
          gatewayId: probeGatewayId || undefined,
          issuer: probeResult.issuer,
          notBefore: probeResult.notBefore,
          notAfter: probeResult.notAfter,
          serialNumber: probeResult.serialNumber,
          fingerprintSha256: probeResult.fingerprintSha256,
        });

        onCreated(created);
        handleClose();
        toast.success(
          'Live Certificate Imported',
          `Imported ${created.domain} with actual remaining period of ${created.daysRemaining} days.`
        );
      } catch (err: any) {
        const msg = err.message || '';
        if (
          msg.toLowerCase().includes('quota') ||
          msg.toLowerCase().includes('capacity') ||
          msg.toLowerCase().includes('limit reached')
        ) {
          toast.warning(
            'Certificate Limit Reached',
              `You have reached the maximum certificate monitoring quota for your ${currentTenant?.tier || 'Community'
              } plan. To monitor more endpoints, please upgrade to a Professional or Enterprise plan.`
        );
        } else {
          toast.error('Import Failed', err.message || 'Failed to save discovered certificate to database.');
        }
      } finally {
        setIsCreating(false);
      }
    };

    const handleCreateCertificate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newDomain.trim()) return;

      let finalDomain = newDomain.trim();
      if (certPurpose === 'WILDCARD' && !finalDomain.startsWith('*.')) {
        finalDomain = `*.${finalDomain}`;
      }

      const sansArray = newSans
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      setIsCreating(true);
      try {
        const notBefore = new Date();
        const notAfter = new Date(Date.now() + newValidityDays * 86400000);

        const created = await api.certificates.create({
          domain: finalDomain,
          sans: sansArray.length > 0 ? sansArray : [finalDomain],
          keyAlgorithm: newAlgorithm,
          validationMethod: ValidationMethod.DNS_01,
          issuer: newIssuer,
          caIntegrationId: selectedCaId || undefined,
          notBefore: notBefore.toISOString(),
          notAfter: notAfter.toISOString(),
          renewBeforeDays: renewBeforeDays,
          autoRenew: autoRenew,
          gatewayId: selectedGatewayId || undefined,
          deploymentTargetType: selectedGatewayId ? 'GATEWAY' : 'CLOUD_ALB',
        });

        onCreated(created);
        handleClose();
        setNewDomain('');
        setNewSans('');
        toast.success(
          'Certificate Created',
            `Initiated automated lifecycle tracking for ${created.domain} with ${autoRenew ? 'autonomous renewal' : 'manual tracking'}.`
        );
      } catch (err: any) {
        toast.error('Creation Failed', err.message || 'Failed to issue certificate.');
      } finally {
        setIsCreating(false);
      }
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Add / Discover SSL Certificate"
        description="Track existing production certificates via live TLS probe, or issue a fresh managed certificate with automated CA & gateway binding."
        maxWidth="lg"
      >
            <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
              {/* Mode Switcher Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F8FAFC] border border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddCertTab('probe')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${addCertTab === 'probe' ? 'pill-tab-active' : 'pill-tab-inactive'
                    }`}
                >
                  <Radio className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Live TLS Watchdog (Monitored Domain)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddCertTab('mint')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${addCertTab === 'mint' ? 'pill-tab-active' : 'pill-tab-inactive'
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
                        onChange={(e) => setProbeDomain(e.target.value)}
                        onKeyDown={(e) => {
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
                          onChange={(e) => setProbePort(Number(e.target.value) || 443)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs"
                          title="TLS Port (default 443)"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleProbeDomain()}
                        disabled={isProbing || !probeDomain.trim()}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isProbing ? 'animate-spin' : ''}`} />
                        <span>{isProbing ? 'Probing...' : 'Probe TLS'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Domain Suggestions */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-400">Quick Test:</span>
                    {['google.com', 'github.com', 'cloudflare.com', 'microsoft.com'].map((domain) => (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => {
                          setProbeDomain(domain);
                          handleProbeDomain(domain);
                        }}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] transition-colors cursor-pointer"
                      >
                        {domain}
                      </button>
                    ))}
                  </div>

                  {probeError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{probeError}</span>
              </div>
                  )}

            {probeResult && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{probeResult.domain}</h4>
                      <p className="text-[11px] text-slate-500">
                        Issuer: {probeResult.issuer} &bull; {probeResult.keyAlgorithm}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      probeResult.daysRemaining <= 15
                        ? 'bg-rose-100 text-rose-700'
                        : probeResult.daysRemaining <= 30
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {probeResult.daysRemaining} Days Left
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Valid From</span>
                    <span className="font-semibold text-slate-700 block mt-0.5">
                      {new Date(probeResult.notBefore).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Expiration (Valid To)
                    </span>
                    <span className="font-semibold text-slate-900 block mt-0.5">
                      {new Date(probeResult.notAfter).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono bg-white p-2.5 rounded-xl border border-slate-200 truncate">
                  SHA-256: {probeResult.fingerprintSha256 || 'N/A'}
                </div>

                {/* Satellite Gateway Binding for Monitored Cert */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Bind to Satellite Gateway
                    </label>
                    <select
                      value={probeGatewayId}
                      onChange={(e) => setProbeGatewayId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-600"
                    >
                      <option value="">None (Cloud Watchdog Only)</option>
                      {gateways.map((gw) => (
                        <option key={gw.id} value={gw.id}>
                          {gw.name} ({gw.hostname} - {gw.status})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={probeAutoRenew}
                        onChange={(e) => setProbeAutoRenew(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>Enable Auto-Renew Lifecycle</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setProbeResult(null);
                      setProbeError(null);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={handleImportProbedCert}
                    className="primary-gradient-btn px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Radio className="h-4 w-4" />
                    <span>
                      {isCreating
                        ? 'Importing...'
                        : `Track as Monitored Domain (${probeResult.daysRemaining}d left)`}
                    </span>
                  </button>
                </div>
              </div>
              )}
          </div>
          ) : (
          <form onSubmit={handleCreateCertificate} className="space-y-4">
            {/* 1. Purpose Profile */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span>Certificate Purpose & Profile</span>
                </label>
                <InfoBubble content="Select the cryptographic purpose. Server certificates secure public web APIs, mTLS establishes mutual client authentication, and Wildcards protect multiple subdomains." position="bottom" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'WEB_SERVER', label: 'TLS Web Server', desc: 'Public Web, API & Ingress' },
                  { id: 'MTLS', label: 'Client mTLS', desc: 'Zero-Trust Node / Agent' },
                  { id: 'WILDCARD', label: 'Wildcard (*.domain)', desc: 'Multi-subdomain SAN' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCertPurpose(item.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${certPurpose === item.id
                        ? 'bg-blue-50 border-blue-500 shadow-xs ring-1 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    <div className={`text-xs font-bold ${certPurpose === item.id ? 'text-blue-700' : 'text-slate-800'}`}>
                      {item.label}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium truncate">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

              {/* 2. Domain & SANs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Primary Domain (FQDN)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={certPurpose === 'WILDCARD' ? 'acme.com (becomes *.acme.com)' : 'e.g. checkout.acme.com'}
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs font-mono"
                  />
                </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Subject Alternative Names (SANs)
                </label>
                <input
                  type="text"
                  placeholder="e.g. checkout.acme.com, api.acme.com"
                  value={newSans}
                  onChange={(e) => setNewSans(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs font-mono"
                />
              </div>
            </div>

            {/* 3. Certificate Authority Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-blue-600" />
                  <span>Issuing Certificate Authority (CA)</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {caIntegrations.length > 0 ? `${caIntegrations.length} Connected CAs` : 'Default Engine'}
                </span>
              </div>
              <select
                value={selectedCaId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCaId(val);
                  const matched = caIntegrations.find((ca) => ca.id === val);
                  if (matched) {
                    setNewIssuer(matched.name || matched.provider);
                  } else if (val === '') {
                    setNewIssuer("Let's Encrypt R3");
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs bg-white font-medium text-slate-800"
              >
                {caIntegrations.length > 0 ? (
                  <>
                    <optgroup label="Tenant Configured CA Integrations">
                      {caIntegrations.map((ca) => (
                        <option key={ca.id} value={ca.id}>
                          {ca.name} ({ca.provider}) {ca.isDefault ? '— ★ Default CA' : ''}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Public / Standard Authorities">
                      <option value="">Let's Encrypt R3 (Standard ACME)</option>
                      <option value="digicert-public">DigiCert Global Root (Public DV/OV)</option>
                      <option value="vault-internal">HashiCorp Vault / Private Root PKI</option>
                    </optgroup>
                  </>
                ) : (
                  <>
                    <option value="">Let's Encrypt R3 (Automated Free ACME)</option>
                    <option value="digicert-public">DigiCert TLS RSA CA (Public Trust)</option>
                    <option value="sectigo-public">Sectigo RSA DV (Commercial)</option>
                    <option value="aws-pca">AWS Private CA (Cloud PKI)</option>
                    <option value="vault-internal">Internal Enterprise Root CA (Private PKI)</option>
                  </>
                )}
              </select>
            </div>

              {/* 4. Algorithm & Lifespan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Key Algorithm & Strength
                  </label>
                  <select
                    value={newAlgorithm}
                    onChange={(e) => setNewAlgorithm(e.target.value as KeyAlgorithm)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs bg-white font-medium text-slate-800"
                  >
                    <option value={KeyAlgorithm.RSA_2048}>RSA 2048 (Universal Legacy)</option>
                    <option value={KeyAlgorithm.RSA_4096}>RSA 4096 (High Assurance)</option>
                    <option value={KeyAlgorithm.ECDSA_P256}>ECDSA P-256 (NIST Prime / Fast)</option>
                    <option value={KeyAlgorithm.ECDSA_P384}>ECDSA P-384 (CNSA 2.0 High Agility)</option>
                  </select>
                </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Validity Window
                </label>
                <select
                  value={newValidityDays}
                  onChange={(e) => setNewValidityDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-xs bg-white font-medium text-slate-800"
                >
                  <option value={90}>90 Days (Public CA Standard)</option>
                  <option value={45}>45 Days (Modern CAB/F Rotation)</option>
                  <option value={30}>30 Days (Monthly Automated)</option>
                  <option value={7}>7 Days (Ephemeral Zero-Trust)</option>
                </select>
              </div>
            </div>

            {/* 5. Autonomous Lifecycle & Gateway Deployment */}
            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-extrabold text-blue-950 uppercase tracking-wider">
                    Autonomous Renewal & Hot Deployment
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRenew}
                    onChange={(e) => setAutoRenew(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {autoRenew && (
                <div className="space-y-3 pt-2 border-t border-blue-200/60">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-blue-900 mb-1">
                        Renewal Threshold
                      </label>
                      <select
                        value={renewBeforeDays}
                        onChange={(e) => setRenewBeforeDays(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-xl border border-blue-200 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                      >
                        <option value={30}>30 Days Before Expiry (Recommended)</option>
                        <option value={15}>15 Days Before Expiry</option>
                        <option value={45}>45 Days Before Expiry</option>
                        <option value={60}>60 Days Before Expiry</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-blue-900 mb-1">
                        Deploy to Satellite Gateway
                      </label>
                      <select
                        value={selectedGatewayId}
                        onChange={(e) => setSelectedGatewayId(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-blue-200 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                      >
                        <option value="">None (Cloud ALB / Manual Only)</option>
                        {gateways.map((gw) => (
                          <option key={gw.id} value={gw.id}>
                            {gw.name} ({gw.hostname} - {gw.status})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedGatewayId && (
                    <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-white/80 border border-blue-200">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Server className="h-3 w-3 text-blue-600" />
                          <span>Target Certificate Path</span>
                        </label>
                        <input
                          type="text"
                          value={targetCertPath}
                          onChange={(e) => setTargetCertPath(e.target.value)}
                          placeholder="/etc/ssl/certs/"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Terminal className="h-3 w-3 text-blue-600" />
                          <span>Reload Command Hook</span>
                        </label>
                        <input
                          type="text"
                          value={reloadCommand}
                          onChange={(e) => setReloadCommand(e.target.value)}
                          placeholder="systemctl reload nginx"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-blue-800">
                    <CheckCircle2 className="h-3.5 w-3.5 inline text-blue-600 mr-1" />
                    <strong>Zero-Downtime Guarantee:</strong> The hourly watchdog automatically issues
                    the renewed certificate {renewBeforeDays} days prior to expiration and pushes it
                    directly to your satellite agent without manual intervention.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="primary-gradient-btn px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
              >
                {isCreating
                  ? 'Creating...'
                  : `Save & Track (${newValidityDays} Days Validity)`}
              </button>
            </div>
          </form>
        )}
      </div >
    </Modal >
  );
};

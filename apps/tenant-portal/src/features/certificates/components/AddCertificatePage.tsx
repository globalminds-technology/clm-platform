import React, { useState, useEffect } from 'react';
import {
  Shield,
  Radio,
  Lock,
  Globe,
  Zap,
  RefreshCw,
  Server,
  Cloud,
  Terminal,
  Mail,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import {
  KeyAlgorithm,
  ValidationMethod,
  type Certificate,
  type Gateway,
  type Tenant,
  type LiveTlsProbeResult,
  type CaIntegration,
  type CloudAccount,
  CertificateTrackingMode,
} from '@clm/shared-types';
import { toast } from '@clm/ui';
import { api } from '../../../config/api';

interface AddCertificatePageProps {
  onBack: () => void;
  onCreated: (newCert: Certificate) => void;
  gateways: Gateway[];
  cloudAccounts?: CloudAccount[];
  caIntegrations?: CaIntegration[];
  currentTenant?: Tenant | null;
}

export const AddCertificatePage: React.FC<AddCertificatePageProps> = ({
  onBack,
  onCreated,
  gateways,
  cloudAccounts = [],
  caIntegrations = [],
  currentTenant: _currentTenant,
}) => {
  const [activeMode, setActiveMode] = useState<'issue' | 'probe'>('issue');

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

  // Domain Control Validation (DCV) State
  const [validationMethod, setValidationMethod] = useState<ValidationMethod>(ValidationMethod.DNS_01);
  const [selectedCloudAccountId, setSelectedCloudAccountId] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [copiedDnsRecord, setCopiedDnsRecord] = useState(false);

  // Live TLS Probe State
  const [probeDomain, setProbeDomain] = useState('');
  const [probePort, setProbePort] = useState(443);
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<LiveTlsProbeResult | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [probeGatewayId, setProbeGatewayId] = useState<string>('');
  const [probeAutoRenew, setProbeAutoRenew] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Pre-select default cloud account for DNS-01 if available
  useEffect(() => {
    if (cloudAccounts.length > 0 && !selectedCloudAccountId) {
      const firstAccount = cloudAccounts[0];
      if (firstAccount) {
        setSelectedCloudAccountId(firstAccount.id);
      }
    }
  }, [cloudAccounts, selectedCloudAccountId]);

  // Pre-populate admin email when domain changes
  useEffect(() => {
    if (newDomain.trim()) {
      const clean = newDomain.trim().replace(/^\*\./, '');
      setAdminEmail(`admin@${clean}`);
    }
  }, [newDomain]);

  // Wildcards mandate DNS-01 validation per CA/B forum
  useEffect(() => {
    if (certPurpose === 'WILDCARD') {
      setValidationMethod(ValidationMethod.DNS_01);
    }
  }, [certPurpose]);

  const isPrivatePki =
    selectedCaId.includes('vault') ||
    selectedCaId.includes('msca') ||
    selectedCaId.includes('aws-pca') ||
    newIssuer.toLowerCase().includes('vault') ||
    newIssuer.toLowerCase().includes('private');

  // Live TLS Probe Handler
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
      setProbeError(err.message || 'Failed to probe live TLS endpoint. Verify hostname and port 443 reachability.');
      toast.error('Probe Failed', err.message || 'Host unreachable.');
    } finally {
      setIsProbing(false);
    }
  };

  // Import Probed Certificate
  const handleImportProbedCert = async () => {
    if (!probeResult) return;
    setIsSubmitting(true);
    try {
      const created = await api.certificates.create({
        domain: probeResult.domain,
        sans: probeResult.sans,
        keyAlgorithm: probeResult.keyAlgorithm as any,
        validationMethod: ValidationMethod.MANUAL,
        trackingMode: CertificateTrackingMode.MONITORED,
        issuer: probeResult.issuer,
        serialNumber: probeResult.serialNumber,
        fingerprintSha256: probeResult.fingerprintSha256,
        notBefore: probeResult.notBefore,
        notAfter: probeResult.notAfter,
        gatewayId: probeGatewayId || undefined,
        autoRenew: probeAutoRenew,
        renewBeforeDays: 30,
        deploymentTargetType: probeGatewayId ? 'GATEWAY' : 'CLOUD_ALB',
      });

      onCreated(created);
      toast.success(
        'Certificate Imported',
        `Added ${created.domain} to inventory. Continuous watchdog monitoring active.`
      );
      onBack();
    } catch (err: any) {
      toast.error('Import Failed', err.message || 'Failed to save discovered certificate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Issue Fresh Certificate
  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) {
      toast.warning('Domain Required', 'Please enter a valid Primary Domain (FQDN).');
      return;
    }

    let finalDomain = newDomain.trim();
    if (certPurpose === 'WILDCARD' && !finalDomain.startsWith('*.')) {
      finalDomain = `*.${finalDomain}`;
    }

    const sansArray = newSans
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      const notBefore = new Date();
      const notAfter = new Date(Date.now() + newValidityDays * 86400000);

      const created = await api.certificates.create({
        domain: finalDomain,
        sans: sansArray.length > 0 ? sansArray : [finalDomain],
        keyAlgorithm: newAlgorithm,
        validationMethod: isPrivatePki ? ValidationMethod.MANUAL : validationMethod,
        issuer: newIssuer,
        caIntegrationId: selectedCaId || undefined,
        cloudAccountId: validationMethod === ValidationMethod.DNS_01 ? (selectedCloudAccountId || undefined) : undefined,
        notBefore: notBefore.toISOString(),
        notAfter: notAfter.toISOString(),
        renewBeforeDays: renewBeforeDays,
        autoRenew: autoRenew,
        gatewayId: selectedGatewayId || undefined,
        deploymentTargetType: selectedGatewayId ? 'GATEWAY' : 'CLOUD_ALB',
      });

      onCreated(created);
      toast.success(
        'Certificate Issued & Registered',
        `Tracking initiated for ${created.domain} with ${autoRenew ? 'autonomous zero-touch renewal' : 'manual tracking'}.`
      );
      onBack();
    } catch (err: any) {
      toast.error('Issuance Failed', err.message || 'Failed to issue certificate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanDomainForDns = (newDomain.trim() || 'yourdomain.com').replace(/^\*\./, '');
  const dnsRecordName = `_acme-challenge.${cleanDomainForDns}`;
  const dnsRecordValue = `clm-dcv-${cleanDomainForDns.split('.')[0] || 'auth'}-9f82a1c6e47b`;

  const parsedSansList = newSans
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Mode Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200/80 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveMode('issue')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeMode === 'issue'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Shield className="h-4 w-4 text-blue-600" />
            <span>Issue Managed Certificate</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('probe')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeMode === 'probe'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Radio className="h-4 w-4 text-indigo-600" />
            <span>Live TLS Watchdog (Monitor)</span>
          </button>
        </div>

        <span className="hidden sm:inline text-xs font-medium text-slate-400">
          {activeMode === 'issue'
            ? 'Issuing via Public or Private CAs with automated DCV'
            : 'Probing live external TLS endpoint in real-time'}
        </span>
      </div>

      {activeMode === 'issue' ? (
        /* ================= MODE 1: ISSUE MANAGED CERTIFICATE ================= */
        <form onSubmit={handleIssueCertificate} className="space-y-6">
          {/* Card 1: Certificate Identity & Profile */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#0F172A] flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span>1. Certificate Identity &amp; Profile</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define what this certificate secures and specify the Fully Qualified Domain Names (FQDN).
                </p>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                X.509 Standard
              </span>
            </div>

            {/* Purpose Pills */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Certificate Purpose
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'WEB_SERVER',
                    label: 'TLS Web Server',
                    desc: 'Public Web, API & Ingress TLS',
                  },
                  {
                    id: 'MTLS',
                    label: 'Client mTLS',
                    desc: 'Zero-Trust Node / Agent Identity',
                  },
                  {
                    id: 'WILDCARD',
                    label: 'Wildcard (*.domain)',
                    desc: 'Multi-subdomain SAN (*.acme.com)',
                  },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setCertPurpose(p.id as any);
                      if (p.id === 'WILDCARD' && !newDomain.startsWith('*.')) {
                        setNewDomain((prev) => (prev ? `*.${prev.replace(/^\*\./, '')}` : '*.yourdomain.com'));
                        setValidationMethod(ValidationMethod.DNS_01);
                      }
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${certPurpose === p.id
                        ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    <div className={`text-xs font-bold ${certPurpose === p.id ? 'text-blue-700' : 'text-slate-800'}`}>
                      {p.label}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Domain and SAN Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Primary Domain (FQDN) <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Common Name (CN)</span>
                </label>
                <input
                  type="text"
                  placeholder={certPurpose === 'WILDCARD' ? '*.acme.com' : 'e.g. checkout.acme.com'}
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-2xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Subject Alternative Names (SANs)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Comma-separated</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. api.acme.com, auth.acme.com"
                  value={newSans}
                  onChange={(e) => setNewSans(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-2xs font-mono"
                />
              </div>
            </div>

            {/* Visual SAN chips preview */}
            {parsedSansList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parsedSansList.map((san, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    DNS: {san}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: CA Engine & Cryptographic Standard */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#0F172A] flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-600" />
                  <span>2. Issuing CA Engine &amp; Cryptographic Standard</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select your Certificate Authority trust provider and key generation parameters.
                </p>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                PKI Engine
              </span>
            </div>

            {/* Issuing CA Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Issuing Certificate Authority (CA)</span>
                <span className="text-[10px] text-blue-600 font-semibold cursor-pointer hover:underline">
                  Manage CAs in Integrations &rarr;
                </span>
              </label>
              <select
                value={selectedCaId}
                onChange={(e) => {
                  setSelectedCaId(e.target.value);
                  const found = caIntegrations.find((ca) => ca.id === e.target.value);
                  if (found) {
                    setNewIssuer(found.name || found.provider);
                  } else {
                    setNewIssuer("Let's Encrypt R3");
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-2xs bg-white font-medium text-slate-800"
              >
                {caIntegrations.length > 0 ? (
                  <>
                    <optgroup label="Your Configured Enterprise CAs">
                      {caIntegrations.map((ca) => (
                        <option key={ca.id} value={ca.id}>
                          {ca.name} ({ca.provider}) {ca.isDefault ? '— ★ Default Issuer' : ''}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Standard Public Engines">
                      <option value="">Let's Encrypt R3 (Automated Free ACME)</option>
                      <option value="digicert-public">DigiCert Global Root (Public DV/OV)</option>
                      <option value="vault-internal">HashiCorp Vault / Private Root PKI</option>
                    </optgroup>
                  </>
                ) : (
                  <>
                    <option value="">Let's Encrypt R3 (Automated Free ACME)</option>
                    <option value="digicert-public">DigiCert TLS RSA CA (Commercial)</option>
                    <option value="sectigo-public">Sectigo RSA DV (Commercial)</option>
                    <option value="aws-pca">AWS Private CA (Cloud PKI)</option>
                    <option value="vault-internal">Internal Enterprise Root CA (Private PKI)</option>
                  </>
                )}
              </select>
            </div>

            {/* Algorithm & Validity Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Key Algorithm &amp; Strength</span>
                  <span className="text-[10px] text-slate-400 font-normal">Asymmetric Pair</span>
                </label>
                <select
                  value={newAlgorithm}
                  onChange={(e) => setNewAlgorithm(e.target.value as KeyAlgorithm)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-2xs bg-white font-medium text-slate-800"
                >
                  <option value={KeyAlgorithm.RSA_2048}>RSA 2048 (Universal Web Standard)</option>
                  <option value={KeyAlgorithm.RSA_4096}>RSA 4096 (High Assurance Enterprise)</option>
                  <option value={KeyAlgorithm.ECDSA_P256}>ECDSA P-256 (NIST Prime / Fast Handshake)</option>
                  <option value={KeyAlgorithm.ECDSA_P384}>ECDSA P-384 (CNSA 2.0 High Agility)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Validity Window</span>
                  <span className="text-[10px] text-slate-400 font-normal">Rotation Frequency</span>
                </label>
                <select
                  value={newValidityDays}
                  onChange={(e) => setNewValidityDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-2xs bg-white font-medium text-slate-800"
                >
                  <option value={90}>90 Days (Public CA Standard &bull; Recommended)</option>
                  <option value={45}>45 Days (Modern CAB/F Rotation Policy)</option>
                  <option value={30}>30 Days (Monthly Automated Lifecycle)</option>
                  <option value={7}>7 Days (Ephemeral Zero-Trust Mesh)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 3: Domain Control Validation (DCV) — Proof of Domain Ownership */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#0F172A] flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span>3. Domain Control Validation (DCV) — Proof of Ownership</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prove to the Certificate Authority that you own or control the target domain.
                </p>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                CA/B Forum Rule
              </span>
            </div>

            {isPrivatePki ? (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-900">Internal Enterprise PKI (Zero DCV Required)</div>
                  <div className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                    Domain Control Validation is automatically satisfied because your organization owns and controls this internal CA hierarchy.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 4 DCV Method Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[
                    {
                      id: ValidationMethod.DNS_01,
                      label: 'Auto Cloud DNS',
                      desc: 'Cloudflare, Route53, Azure API (Zero-touch)',
                      icon: Cloud,
                      recommended: true,
                    },
                    {
                      id: ValidationMethod.MANUAL,
                      label: 'Manual DNS Record',
                      desc: 'Paste TXT record in your domain panel',
                      icon: Terminal,
                    },
                    {
                      id: ValidationMethod.HTTP_01,
                      label: 'HTTP-01 Web Token',
                      desc: 'Gateway drops token on port 80',
                      icon: Server,
                      disabled: certPurpose === 'WILDCARD',
                    },
                    {
                      id: ValidationMethod.EMAIL,
                      label: 'Admin Email',
                      desc: 'Approval link to admin@domain.com',
                      icon: Mail,
                      disabled: certPurpose === 'WILDCARD',
                    },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = validationMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={m.disabled}
                        onClick={() => setValidationMethod(m.id as ValidationMethod)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${m.disabled
                          ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200'
                          : isSelected
                            ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                      >
                        {m.recommended && (
                          <span className="absolute -top-2 -right-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-600 text-white shadow-xs">
                            RECOMMENDED
                          </span>
                        )}
                        <Icon className={`h-4 w-4 mb-2 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                        <div className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                          {m.label}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">{m.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {certPurpose === 'WILDCARD' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Wildcard certificates (*.domain) strictly mandate DNS-01 validation per CA/Browser Forum rules.</span>
                  </div>
                )}

                {/* Sub-panels for active validation method */}
                {validationMethod === ValidationMethod.DNS_01 && (
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Select Connected Cloud DNS Account:</span>
                      <span className="text-[11px] text-blue-600 font-semibold">Cloudflare &bull; AWS Route53 &bull; Azure DNS</span>
                    </div>
                    {cloudAccounts.length > 0 ? (
                      <select
                        value={selectedCloudAccountId}
                        onChange={(e) => setSelectedCloudAccountId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                      >
                        {cloudAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.provider}) — {acc.maskedSecret}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                        <span>No Cloud DNS account connected yet.</span>
                        <span
                          className="font-bold text-blue-700 underline cursor-pointer hover:text-blue-900"
                          onClick={() => setValidationMethod(ValidationMethod.MANUAL)}
                        >
                          Switch to Manual DNS Verification
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {validationMethod === ValidationMethod.MANUAL && (
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Add this record in your domain registrar (GoDaddy, Namecheap, etc.):</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${dnsRecordName}  IN  TXT  "${dnsRecordValue}"`);
                          setCopiedDnsRecord(true);
                          setTimeout(() => setCopiedDnsRecord(false), 2000);
                          toast.success('Record Copied', 'Paste this TXT record into your DNS registrar panel.');
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs cursor-pointer"
                      >
                        {copiedDnsRecord ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedDnsRecord ? 'Record Copied' : 'Copy DNS Record'}</span>
                      </button>
                    </div>

                    <div className="p-3 bg-slate-900 text-slate-200 font-mono text-xs rounded-xl space-y-1.5">
                      <div><span className="text-slate-400">Record Type:</span> <span className="text-emerald-400 font-bold">TXT</span></div>
                      <div><span className="text-slate-400">Record Host:</span> <span className="text-white font-bold">{dnsRecordName}</span></div>
                      <div className="truncate"><span className="text-slate-400">Record Value:</span> <span className="text-amber-300 font-bold">{dnsRecordValue}</span></div>
                    </div>
                  </div>
                )}

                {validationMethod === ValidationMethod.HTTP_01 && (
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs text-slate-700">
                    <div className="font-bold text-slate-800">HTTP-01 Challenge Workflow:</div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      The CA will ping <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">http://{cleanDomainForDns}/.well-known/acme-challenge/&lt;token&gt;</code> over public Port 80. Your Satellite Gateway daemon will automatically expose this challenge token.
                    </p>
                  </div>
                )}

                {validationMethod === ValidationMethod.EMAIL && (
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
                    <label className="font-bold text-slate-700 block">Authorized Verification Mailbox:</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder={`admin@${cleanDomainForDns}`}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:border-blue-600 font-mono shadow-2xs"
                    />
                    <p className="text-[11px] text-slate-400">
                      The CA sends a cryptographic approval link to standard authorized mailboxes (admin@, administrator@, webmaster@).
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 4: Autonomous Renewal & Deployment Target */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#0F172A] flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span>4. Autonomous Renewal &amp; Deployment Delivery</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure zero-touch automated renewals and target Satellite Gateway push delivery.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-2.5 text-xs font-bold text-slate-700">
                  {autoRenew ? 'Autonomous Active' : 'Manual Renew'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Renewal Threshold Horizon</span>
                  <span className="text-xs font-mono font-bold text-blue-600">{renewBeforeDays} Days Before Expiry</span>
                </label>
                <select
                  value={renewBeforeDays}
                  onChange={(e) => setRenewBeforeDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-2xs bg-white font-medium text-slate-800"
                >
                  <option value={30}>30 Days Before Expiration (Recommended Standard)</option>
                  <option value={21}>21 Days Before Expiration</option>
                  <option value={14}>14 Days Before Expiration (Tight Schedule)</option>
                  <option value={7}>7 Days Before Expiration (Critical Threshold)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Deploy to Satellite Gateway</span>
                  <span className="text-[10px] text-slate-400 font-normal">Private VPC Push</span>
                </label>
                <select
                  value={selectedGatewayId}
                  onChange={(e) => setSelectedGatewayId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-2xs bg-white font-medium text-slate-800"
                >
                  <option value="">None (Cloud ALB / Inventory Tracking Only)</option>
                  {gateways.map((gw) => (
                    <option key={gw.id} value={gw.id}>
                      {gw.name} ({gw.status === 'ONLINE' ? '🟢 Online' : '⚪ Offline'}) — {gw.ipAddress || 'Daemon'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedGatewayId && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-200">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Server className="h-4 w-4 text-blue-600" />
                  <span>Satellite Gateway Safe Hot-Reload Hooks</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Target Certificate Directory</label>
                    <input
                      type="text"
                      value={targetCertPath}
                      onChange={(e) => setTargetCertPath(e.target.value)}
                      placeholder="/etc/ssl/certs/"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Web Server Reload Hook</label>
                    <input
                      type="text"
                      value={reloadCommand}
                      onChange={(e) => setReloadCommand(e.target.value)}
                      placeholder="systemctl reload nginx"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions Bar */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newDomain.trim()}
              className="primary-gradient-btn px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Issuing Certificate...' : `Issue & Track Certificate (${newValidityDays} Days)`}</span>
            </button>
          </div>
        </form>
      ) : (
        /* ================= MODE 2: LIVE TLS WATCHDOG ================= */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-[#0F172A] flex items-center gap-2">
              <Radio className="h-4 w-4 text-indigo-600" />
              <span>Live TLS Endpoint Watchdog (Probe &amp; Discover)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Probe any live domain or server over port 443 to inspect real-time X.509 certificate expiry and import it into tracking.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Live Hostname / Domain (FQDN)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. google.com, github.com, or your production app domain"
                  value={probeDomain}
                  onChange={(e) => setProbeDomain(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleProbeDomain();
                    }
                  }}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-2xs font-mono"
                />
                <div className="w-24">
                  <input
                    type="number"
                    placeholder="Port"
                    value={probePort}
                    onChange={(e) => setProbePort(Number(e.target.value) || 443)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-2xs font-mono"
                    title="TLS Port (default 443)"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleProbeDomain()}
                  disabled={isProbing || !probeDomain.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0 shadow-sm cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isProbing ? 'animate-spin' : ''}`} />
                  <span>{isProbing ? 'Probing...' : 'Probe Live TLS'}</span>
                </button>
              </div>
            </div>

            {/* Quick Test Chips */}
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
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] transition cursor-pointer"
                >
                  {domain}
                </button>
              ))}
            </div>

            {probeError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{probeError}</span>
              </div>
            )}

            {/* Probe Result Box */}
            {probeResult && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-emerald-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{probeResult.domain}</h4>
                      <p className="text-xs text-slate-500">
                        Issuer: {probeResult.issuer} &bull; Algorithm: {probeResult.keyAlgorithm}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${probeResult.daysRemaining <= 15
                      ? 'bg-rose-100 text-rose-700'
                      : probeResult.daysRemaining <= 30
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                      }`}
                  >
                    {probeResult.daysRemaining} Days Remaining
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Valid From</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {new Date(probeResult.notBefore).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Valid To</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {new Date(probeResult.notAfter).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Serial Number</span>
                    <span className="font-mono font-semibold text-slate-800 block mt-0.5 truncate">
                      {probeResult.serialNumber}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">SHA-256 Fingerprint</span>
                    <span className="font-mono font-semibold text-slate-800 block mt-0.5 truncate">
                      {probeResult.fingerprintSha256.substring(0, 14)}...
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-blue-600" />
                    <span>Subject Alternative Names (SANs):</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {probeResult.sans.map((san, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-white text-slate-700 border border-slate-200"
                      >
                        {san}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Import Action Controls */}
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold">
                      <input
                        type="checkbox"
                        checked={probeAutoRenew}
                        onChange={(e) => setProbeAutoRenew(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Enable Autonomous Renewal Watchdog</span>
                    </label>

                    {gateways.length > 0 && (
                      <select
                        value={probeGatewayId}
                        onChange={(e) => setProbeGatewayId(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
                      >
                        <option value="">No Gateway Binding</option>
                        {gateways.map((gw) => (
                          <option key={gw.id} value={gw.id}>
                            Satellite: {gw.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleImportProbedCert}
                    className="primary-gradient-btn px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/25 cursor-pointer"
                  >
                    {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>Import to Active Monitoring Inventory</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
    )}
  </div >
);
};

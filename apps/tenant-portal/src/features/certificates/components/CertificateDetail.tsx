import React from 'react';
import {
  ShieldCheck,
  Server,
  Lock,
  Download,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  Cloud,
  Eye,
} from 'lucide-react';
import {
  CertStatus,
  CertificateTrackingMode,
  type Certificate,
  type Gateway,
  type CloudAccount,
} from '@clm/shared-types';
import { StatusBadge, InfoBubble } from '@clm/ui';

interface CertificateDetailProps {
  selectedCert: Certificate | null;
  gateways: Gateway[];
  cloudAccounts: CloudAccount[];
  isReprobingCertId: string | null;
  onDownloadPem: (cert: Certificate) => void;
  onReprobe: (certId: string) => void;
  onRenew: (cert: Certificate) => void;
  onOpenDeploy: (cert: Certificate) => void;
  onOpenRevoke: (cert: Certificate) => void;
  onDelete: (id: string, domain: string) => void;
  onOpenInspector: () => void;
}

export const CertificateDetail: React.FC<CertificateDetailProps> = ({
  selectedCert,
  gateways,
  cloudAccounts,
  isReprobingCertId,
  onDownloadPem,
  onReprobe,
  onRenew,
  onOpenDeploy,
  onOpenRevoke,
  onDelete,
  onOpenInspector,
}) => {
  if (!selectedCert) {
    return (
      <div className="bg-white rounded-[28px] soft-card p-12 text-center text-slate-400 text-sm">
        Select a certificate from the left column to view its details.
      </div>
    );
  }

  const isCritical =
    selectedCert.status === CertStatus.EXPIRED || selectedCert.daysRemaining <= 7;
  const isExpiring =
    selectedCert.status === CertStatus.EXPIRING_SOON ||
    (selectedCert.daysRemaining <= 30 && selectedCert.daysRemaining > 7);

  const linkedGateway = gateways.find((g) => g.id === selectedCert.gatewayId);
  const linkedCloudAccount = cloudAccounts.find((c) => c.id === selectedCert.cloudAccountId);

  return (
    <div className="bg-white rounded-[28px] soft-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-[#0F172A] tracking-tight">
                {selectedCert.domain}
              </h3>
              <StatusBadge
                variant={isCritical ? 'critical' : isExpiring ? 'warning' : 'healthy'}
                label={selectedCert.status}
              />
            </div>
            <p className="text-xs text-slate-400 font-medium">
              SSL Certificate ({selectedCert.keyAlgorithm})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDownloadPem(selectedCert)}
            className="h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Download X.509 PEM certificate chain"
          >
            <Download className="h-3.5 w-3.5" />
            <span>PEM Bundle</span>
          </button>

          {selectedCert.trackingMode === CertificateTrackingMode.MONITORED ? (
            <button
              type="button"
              onClick={() => onReprobe(selectedCert.id)}
              disabled={isReprobingCertId === selectedCert.id}
              className="h-8 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-colors border border-indigo-200 cursor-pointer disabled:opacity-50"
              title="Re-probe remote server to detect live certificate updates"
            >
              {isReprobingCertId === selectedCert.id ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
              ) : (
                <Radio className="h-3.5 w-3.5 text-indigo-600" />
              )}
              <span>Re-Probe Live</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onOpenDeploy(selectedCert)}
                className="h-8 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-colors border border-emerald-200 cursor-pointer"
                title="Push certificate to in-VPC Satellite Gateway or Web Server"
              >
                <Send className="h-3.5 w-3.5 text-emerald-600" />
                <span>Deploy</span>
              </button>
              <button
                type="button"
                onClick={() => onRenew(selectedCert)}
                className="h-8 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Renew certificate via CA"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Renew</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onOpenRevoke(selectedCert)}
            className="h-8 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold flex items-center gap-1.5 transition-colors border border-amber-200 cursor-pointer"
            title="Revoke certificate with RFC 5280 compliance reason"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
            <span>Revoke</span>
          </button>

          <button
            type="button"
            onClick={() => onDelete(selectedCert.id, selectedCert.domain)}
            className="h-8 w-8 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Delete certificate from inventory"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100">
          <div className="text-[11px] font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1">
            <span>Days Remaining</span>
            <InfoBubble content="Countdown until this X.509 certificate expires. Automated renewal triggers when <= 30 days." />
          </div>
          <div className="text-xl font-extrabold text-rose-600 mt-1">
            {selectedCert.daysRemaining > 0 ? `${selectedCert.daysRemaining} days` : 'Expired'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
            <span>Expiry Date</span>
            <InfoBubble content="Exact notAfter timestamp extracted from the X.509 certificate body." />
          </div>
          <div className="text-xs font-extrabold text-blue-900 mt-1.5 truncate">
            {new Date(selectedCert.notAfter).toLocaleDateString()}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <span>Issuer</span>
            <InfoBubble content="The Certificate Authority (CA) that cryptographically signed and sealed this public key." />
          </div>
          <div className="text-xs font-bold text-slate-800 mt-1.5 truncate">
            {selectedCert.issuer}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
          <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
            <span>Algorithm</span>
            <InfoBubble content="Public key cryptography standard used (RSA 2048/4096 or ECDSA P-256)." />
          </div>
          <div className="text-xs font-bold text-indigo-900 mt-1.5 truncate">
            {selectedCert.keyAlgorithm}
          </div>
        </div>
      </div>

      {/* Monitored Domain Notice Banner */}
      {selectedCert.trackingMode === CertificateTrackingMode.MONITORED && (
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-start gap-2.5 text-xs text-indigo-950">
          <Radio className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold">External Monitored Domain:</span> This certificate is
            hosted on an external origin provider (e.g. Vercel, GitHub, Cloudflare). CLM tracks
            remaining days and alerts on expiration. Click <strong>Re-Probe Live</strong> anytime to
            read latest changes directly from port 443.
          </div>
        </div>
      )}

      {/* Technical Certificate Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deployment Targets Box */}
        <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-3">
          <div className="flex items-center justify-between text-xs font-extrabold text-[#0F172A]">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-blue-600" />
              <span>Live Deployment Target</span>
            </div>
            <InfoBubble content="The verified in-VPC daemon or cloud zone where this certificate is actively deployed and serving traffic." />
          </div>

          <div className="space-y-2 text-xs">
            {selectedCert.trackingMode === CertificateTrackingMode.MONITORED ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span className="font-semibold text-slate-800 truncate">
                    {selectedCert.domain}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-indigo-600 font-bold">
                  Port 443 (Live Edge)
                </span>
              </div>
            ) : (
              <>
                {linkedGateway && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="font-semibold text-slate-800">
                        {linkedGateway.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-600 font-bold">
                      Enrolled (Active)
                    </span>
                  </div>
                )}
                {linkedCloudAccount && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="font-semibold text-slate-800">
                        {linkedCloudAccount.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-blue-600 font-bold">
                      DNS-01 Active
                    </span>
                  </div>
                )}
                {!linkedGateway && !linkedCloudAccount && (
                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                    <span>No gateway or cloud account linked yet.</span>
                    <button
                      type="button"
                      onClick={() => onOpenDeploy(selectedCert)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 underline ml-2 cursor-pointer"
                    >
                      Deploy to Gateway
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Cryptographic Specifications Box */}
        <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-extrabold text-[#0F172A]">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-600" />
              <span>Cryptographic Specifications</span>
            </div>
            <InfoBubble content="Authentic X.509 RFC 5280 attributes extracted directly from the certificate and PostgreSQL ledger." />
          </div>

          <div className="text-xs space-y-2 font-medium">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1">
                <span>SANs</span>
                <InfoBubble content="Subject Alternative Names: all hostnames and wildcards secured under this single certificate." />
              </span>
              <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                {selectedCert.sans?.join(', ') || selectedCert.domain}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Lifecycle Mode</span>
              <span
                className={`font-bold ${
                  selectedCert.trackingMode === CertificateTrackingMode.MONITORED
                    ? 'text-indigo-600'
                    : selectedCert.trackingMode === CertificateTrackingMode.MANAGED_CLOUD
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {selectedCert.trackingMode === CertificateTrackingMode.MONITORED
                  ? 'Monitored Watchdog'
                  : selectedCert.trackingMode === CertificateTrackingMode.MANAGED_CLOUD
                  ? 'AWS Cloud Sync'
                  : 'Automated Gateway'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1">
                <span>Auto-Renewal</span>
                <InfoBubble content="When enabled, the CLM watchdog triggers DNS-01 verification and pushes new keys at 30 days remaining." />
              </span>
              <span className={selectedCert.autoRenew ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                {selectedCert.autoRenew ? 'Enabled (30d before)' : 'External / Manual'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1">
                <span>SHA-256</span>
                <InfoBubble content="Cryptographic thumbprint of the DER-encoded certificate used for pinning and validation." />
              </span>
              <span
                className="font-mono text-[11px] text-slate-600 truncate max-w-[140px]"
                title={selectedCert.fingerprintSha256 || ''}
              >
                {selectedCert.fingerprintSha256 || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        {selectedCert.trackingMode === CertificateTrackingMode.MONITORED ? (
          <button
            type="button"
            onClick={() => onReprobe(selectedCert.id)}
            disabled={isReprobingCertId === selectedCert.id}
            className="flex-1 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/25 cursor-pointer disabled:opacity-50"
          >
            {isReprobingCertId === selectedCert.id ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Radio className="h-4 w-4" />
            )}
            <span>Re-Probe Live Server (Sync Vercel / Origin TLS)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRenew(selectedCert)}
            className="primary-gradient-btn flex-1 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Approve & Trigger Immediate Renewal</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenInspector}
          className="px-4 py-3 rounded-2xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-xs font-bold text-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Eye className="h-4 w-4" />
          <span>Deep Inspector</span>
        </button>
      </div>
    </div>
  );
};

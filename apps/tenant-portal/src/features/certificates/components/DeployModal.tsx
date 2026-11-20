import React, { useState, useEffect } from 'react';
import {
  Server,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  PlayCircle,
  AlertTriangle,
} from 'lucide-react';
import { Modal, InfoBubble, toast } from '@clm/ui';
import { type Certificate, type Gateway, GatewayStatus } from '@clm/shared-types';
import { api } from '../../../config/api';

interface DeployModalProps {
  cert: Certificate | null;
  gateways: Gateway[];
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (certId: string, gatewayId: string, targetType: string) => Promise<void>;
}

interface PreflightCheckItem {
  name: string;
  passed: boolean;
  details: string;
}

interface PreflightResult {
  success: boolean;
  gatewayOnline: boolean;
  lastHeartbeatAt: string | null;
  heartbeatAgeSeconds: number;
  checks: PreflightCheckItem[];
}

export const DeployModal: React.FC<DeployModalProps> = ({
  cert,
  gateways,
  isOpen,
  onClose,
  onDeploy,
}) => {
  const [gatewayId, setGatewayId] = useState('');
  const [targetType, setTargetType] = useState('NGINX');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunningPreflight, setIsRunningPreflight] = useState(false);
  const [preflightResult, setPreflightResult] = useState<PreflightResult | null>(null);

  useEffect(() => {
    if (cert) {
      setGatewayId(cert.gatewayId || gateways[0]?.id || '');
      setPreflightResult(null);
    }
  }, [cert, gateways]);

  if (!cert) return null;

  const handleRunPreflight = async () => {
    if (!gatewayId) {
      toast.warning('Select Gateway', 'Please select a target Satellite Gateway before testing.');
      return;
    }
    setIsRunningPreflight(true);
    try {
      const res = await api.gateways.preflight(gatewayId, {
        targetType,
        domain: cert.domain,
      });
      setPreflightResult(res);
      if (res.success) {
        toast.success('Pre-Flight Verified', 'All safety and syntax checks passed successfully.');
      } else {
        toast.warning('Pre-Flight Warning', 'One or more pre-flight checks flagged an issue.');
      }
    } catch (err: any) {
      toast.error('Pre-Flight Failed', err.message || 'Could not contact gateway daemon.');
    } finally {
      setIsRunningPreflight(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatewayId && gateways.length > 0) return;
    setIsSubmitting(true);
    try {
      await onDeploy(cert.id, gatewayId, targetType);
      toast.success(
        'Deployment Dispatched',
        `Signed push instruction queued for gateway. Automatic syntax verification and reload engaged.`
      );
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
      title={`Deploy Certificate: ${cert.domain}`}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3">
          <Server className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-emerald-900">Zero-Trust Push to In-VPC Gateway</h4>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              The CLM control plane dispatches a cryptographic signed deploy command. Your Satellite Gateway pulls the renewed certificate, executes a pre-flight test (<code className="font-semibold">nginx -t</code>), swaps files atomically with <code className="font-semibold">.bak</code> rollback safeguard, and reloads the server.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center">
            <span>Target Satellite Gateway</span>
            <InfoBubble content="Select the active in-VPC daemon that has local access to the target web servers." />
          </label>
          {gateways.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              No gateways enrolled yet. Please enroll a gateway from the Gateways tab first.
            </div>
          ) : (
            <select
              value={gatewayId}
              onChange={(e) => {
                setGatewayId(e.target.value);
                setPreflightResult(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-medium"
            >
              {gateways.map((gw) => (
                <option key={gw.id} value={gw.id}>
                  {gw.name} ({gw.status === GatewayStatus.ONLINE ? '🟢 Online' : '⚪ Offline'}) — {gw.ipAddress || 'VPC Daemon'}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center">
            <span>Target Web Server / Proxy</span>
            <InfoBubble content="The local process or service that will be tested and reloaded after pushing certificate files." />
          </label>
          <select
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value);
              setPreflightResult(null);
            }}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-medium"
          >
            <option value="NGINX">NGINX (/etc/ssl/certs, nginx -t &amp; nginx -s reload)</option>
            <option value="APACHE">Apache HTTP Server (apache2ctl graceful)</option>
            <option value="AWS_ACM">AWS Certificate Manager (ACM Import)</option>
            <option value="DOCKER">Docker Container Bind Mount</option>
          </select>
        </div>

        {/* Pre-Flight Dry Run Button & Report */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <span>Pre-Flight Syntax &amp; Safeguard Dry Run</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Verify daemon tunnel, .bak rollback armed, and syntax test before executing
              </div>
            </div>

            <button
              type="button"
              disabled={isRunningPreflight || gateways.length === 0}
              onClick={handleRunPreflight}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 text-blue-600 hover:text-blue-700 hover:border-blue-300 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isRunningPreflight ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlayCircle className="h-3.5 w-3.5" />
              )}
              <span>{isRunningPreflight ? 'Running Check...' : 'Test Pre-Flight'}</span>
            </button>
          </div>

          {/* Preflight Results Checklist */}
          {preflightResult && (
            <div className="space-y-2 pt-2 border-t border-slate-200/80 animate-in fade-in duration-200">
              <div
                className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  preflightResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {preflightResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                )}
                <span>
                  {preflightResult.success
                    ? 'Pre-Flight Passed: Target daemon and rollback safeguards verified.'
                    : 'Pre-Flight Warning: Inspect the itemized check report below.'}
                </span>
              </div>

              <div className="space-y-1.5">
                {preflightResult.checks.map((check, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-white border border-slate-200/70 rounded-xl text-xs flex items-start gap-2"
                  >
                    {check.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800">{check.name}</div>
                      <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{check.details}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            type="submit"
            disabled={isSubmitting || gateways.length === 0}
            className="primary-gradient-btn px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            <span>Dispatch Deployment</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

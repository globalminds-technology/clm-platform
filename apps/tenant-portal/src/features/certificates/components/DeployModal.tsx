import React, { useState, useEffect } from 'react';
import { Server, RefreshCw } from 'lucide-react';
import { Modal, InfoBubble } from '@clm/ui';
import { type Certificate, type Gateway, GatewayStatus } from '@clm/shared-types';

interface DeployModalProps {
  cert: Certificate | null;
  gateways: Gateway[];
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (certId: string, gatewayId: string, targetType: string) => Promise<void>;
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

  useEffect(() => {
    if (cert) {
      setGatewayId(cert.gatewayId || gateways[0]?.id || '');
    }
  }, [cert, gateways]);

  if (!cert) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatewayId && gateways.length > 0) return;
    setIsSubmitting(true);
    try {
      await onDeploy(cert.id, gatewayId, targetType);
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
              The CLM control plane dispatches a signed deploy command. Your Satellite Gateway daemon will securely pull the cert and reload the web server.
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
              onChange={e => setGatewayId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-medium"
            >
              {gateways.map(gw => (
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
            <InfoBubble content="The local process or service that will be reloaded after pushing certificate files." />
          </label>
          <select
            value={targetType}
            onChange={e => setTargetType(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-medium"
          >
            <option value="NGINX">NGINX (/etc/ssl/certs, nginx -s reload)</option>
            <option value="APACHE">Apache HTTP Server (apache2ctl graceful)</option>
            <option value="AWS_ACM">AWS Certificate Manager (ACM Import)</option>
            <option value="DOCKER">Docker Container Bind Mount</option>
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

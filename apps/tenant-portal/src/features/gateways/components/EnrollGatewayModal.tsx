import React, { useState } from 'react';
import { Cloud, Copy, Check, ExternalLink, Radio, RefreshCw, ArrowRight } from 'lucide-react';
import { Modal, toast } from '@clm/ui';

interface EnrollGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollToken: string;
  onSimulateHandshake: () => Promise<void>;
  isSimulatingHandshake: boolean;
}

export const EnrollGatewayModal: React.FC<EnrollGatewayModalProps> = ({
  isOpen,
  onClose,
  enrollToken,
  onSimulateHandshake,
  isSimulatingHandshake,
}) => {
  const [enrollTab, setEnrollTab] = useState<'cloudformation' | 'userdata' | 'docker' | 'quick'>('cloudformation');
  const [copiedToken, setCopiedToken] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    toast.info('Command Copied', 'Installation command copied to clipboard.');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enroll Satellite Gateway Daemon (Step 4 Architecture Spec)"
      description="Zero-trust satellite daemon executing inside your VPC or on-prem network. Outbound-only communication (Port 443)."
      maxWidth="xl"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F8FAFC] border border-slate-100">
          <button
            type="button"
            onClick={() => setEnrollTab('cloudformation')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              enrollTab === 'cloudformation' ? 'pill-tab-active' : 'pill-tab-inactive'
            }`}
          >
            ☁️ 1-Click AWS Stack
          </button>
          <button
            type="button"
            onClick={() => setEnrollTab('userdata')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              enrollTab === 'userdata' ? 'pill-tab-active' : 'pill-tab-inactive'
            }`}
          >
            ⚡ 1-Line EC2 User Data
          </button>
          <button
            type="button"
            onClick={() => setEnrollTab('docker')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              enrollTab === 'docker' ? 'pill-tab-active' : 'pill-tab-inactive'
            }`}
          >
            🐳 Docker / ECS
          </button>
          <button
            type="button"
            onClick={() => setEnrollTab('quick')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              enrollTab === 'quick' ? 'pill-tab-active' : 'pill-tab-inactive'
            }`}
          >
            🔬 Instant Simulation
          </button>
        </div>

        {enrollTab === 'cloudformation' && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-amber-600" />
                <h4 className="text-xs font-bold text-slate-800">1-Click AWS CloudFormation Deployment</h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700">
                Recommended for DevOps
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Launch the Satellite Gateway directly into your private AWS VPC. Creates the zero-trust EC2 instance, attached IAM instance profile (for AWS ACM &amp; ALB bindings), and outbound-only security group.
            </p>
            <div className="p-3 bg-white/90 rounded-xl border border-slate-200/80 font-mono text-[11px] text-slate-700 space-y-1">
              <div><strong>Target AWS Region:</strong> us-east-1</div>
              <div><strong>Outbound Firewall:</strong> Zero Open Inbound Ports (Outbound HTTPS only)</div>
              <div><strong>Bootstrap Token:</strong> {enrollToken ? `${enrollToken.slice(0, 16)}...` : 'Generating...'}</div>
            </div>
            <a
              href={`https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/review?param_EnrollmentToken=${encodeURIComponent(
                enrollToken || ''
              )}&param_ControlPlaneUrl=http://localhost:4000/api/v1`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Launch CloudFormation Stack in AWS Console</span>
            </a>
          </div>
        )}

        {enrollTab === 'userdata' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Paste this 1-line script into your EC2 <strong>User Data</strong> (under Advanced Details) when launching any Linux instance:
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                Zero Terminal Interaction
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] relative flex items-center justify-between">
              <span className="truncate pr-4">
                curl -sSL http://localhost:4000/api/v1/ingress/gateway/install.sh | sudo bash -s -- --token {enrollToken || 'TOKEN'} --control-plane http://localhost:4000/api/v1
              </span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `curl -sSL http://localhost:4000/api/v1/ingress/gateway/install.sh | sudo bash -s -- --token ${enrollToken} --control-plane http://localhost:4000/api/v1`
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
              >
                {copiedToken ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedToken ? 'Copied' : 'Copy Command'}</span>
              </button>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1.5 text-[11px] text-slate-600">
              <div className="font-bold text-slate-800">What this script does automatically:</div>
              <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                <li>Installs Node/Go runtime if missing.</li>
                <li>Configures systemd daemon (<code>/etc/systemd/system/clm-gateway.service</code>).</li>
                <li>Enables automatic restart on server reboot.</li>
                <li>Initiates outbound beacons and registers with the portal.</li>
              </ul>
            </div>
          </div>
        )}

        {enrollTab === 'docker' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Run inside any Docker host, AWS ECS Task, or Kubernetes pod within your private network:
            </p>
            <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] relative flex items-center justify-between">
              <span className="truncate pr-4">
                docker run -d --restart=always --name clm-satellite-gateway -e CLM_CONTROL_PLANE_URL="http://localhost:4000/api/v1" -e CLM_ENROLLMENT_TOKEN="{enrollToken}" clmplatform/satellite-gateway:latest
              </span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `docker run -d --restart=always --name clm-satellite-gateway -e CLM_CONTROL_PLANE_URL="http://localhost:4000/api/v1" -e CLM_ENROLLMENT_TOKEN="${enrollToken}" clmplatform/satellite-gateway:latest`
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
              >
                {copiedToken ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedToken ? 'Copied' : 'Copy Command'}</span>
              </button>
            </div>
          </div>
        )}

        {enrollTab === 'quick' && (
          <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-blue-600 animate-pulse" />
              <h4 className="text-xs font-bold text-blue-900">Immediate Local Simulation (No Terminal Needed)</h4>
            </div>
            <p className="text-xs text-blue-800 leading-relaxed">
              Test the complete cryptographic handshake right now. This connects to the control plane, marks this gateway <strong>ONLINE</strong>, and initiates active heartbeat beaconing.
            </p>
            <div className="p-3 bg-white/90 rounded-xl border border-blue-100 font-mono text-[11px] text-slate-700 space-y-1">
              <div><strong>Bootstrap Token:</strong> {enrollToken ? `${enrollToken.slice(0, 16)}...` : 'Generating...'}</div>
              <div><strong>Daemon Hostname:</strong> gw-satellite-vpc-01.internal</div>
              <div><strong>Tunnel Protocol:</strong> Outbound HTTPS mTLS (Port 443)</div>
            </div>
            <button
              type="button"
              onClick={onSimulateHandshake}
              disabled={isSimulatingHandshake || !enrollToken}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSimulatingHandshake ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Verifying Handshake with PostgreSQL Control Plane...</span>
                </>
              ) : (
                <>
                  <span>Complete Instant Handshake &amp; Mark Gateway Online</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

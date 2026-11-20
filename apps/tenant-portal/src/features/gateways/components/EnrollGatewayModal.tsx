import React, { useState } from 'react';
import { Cloud, Copy, Check, ExternalLink, Download } from 'lucide-react';
import { Modal, toast } from '@clm/ui';
import { API_BASE_URL } from '../../../config/api';

interface EnrollGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollToken: string;
  onSimulateHandshake?: () => Promise<void>;
  isSimulatingHandshake?: boolean;
}

export const EnrollGatewayModal: React.FC<EnrollGatewayModalProps> = ({
  isOpen,
  onClose,
  enrollToken,
}) => {
  const [enrollTab, setEnrollTab] = useState<'cloudformation' | 'userdata' | 'docker'>('cloudformation');
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
        </div>

        {enrollTab === 'cloudformation' && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-amber-600" />
                <h4 className="text-xs font-bold text-slate-800">AWS CloudFormation Deployment Stack</h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700">
                Recommended for DevOps
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Launch the Satellite Gateway directly into your private AWS VPC. Provisions the zero-trust EC2 instance, attached IAM role (for AWS ACM &amp; ALB bindings), and outbound-only security group.
            </p>

            {/* Dedicated Parameters Copy Box for CloudFormation */}
            <div className="p-3 bg-white/95 rounded-xl border border-slate-200/90 space-y-2.5">
              <div className="text-[11px] font-bold text-slate-800">Stack Parameters to Paste in AWS:</div>
              
              {/* Enrollment Token */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span>EnrollmentToken</span>
                  <span>Single-use 24h bootstrap token</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-[11px]">
                  <span className="truncate pr-2 text-slate-800 select-all">{enrollToken || 'Generating token...'}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(enrollToken)}
                    disabled={!enrollToken}
                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {copiedToken ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedToken ? 'Copied' : 'Copy Token'}</span>
                  </button>
                </div>
              </div>

              {/* Control Plane URL */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span>ControlPlaneUrl</span>
                  <span>Outbound HTTPS API Target</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-[11px]">
                  <span className="truncate pr-2 text-slate-800 select-all">{API_BASE_URL}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(API_BASE_URL)}
                    className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy URL</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={`${API_BASE_URL}/ingress/gateway/cloudformation.yaml`}
                download="clm-satellite-gateway.yaml"
                className="py-2.5 px-3 rounded-xl text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="h-4 w-4 text-amber-600" />
                <span>1. Download Stack (.yaml)</span>
              </a>
              <a
                href="https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/template"
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ExternalLink className="h-4 w-4" />
                <span>2. Open AWS CloudFormation</span>
              </a>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-xl space-y-1 text-[11px] text-amber-900">
              <div className="font-bold">How to deploy in AWS:</div>
              <ol className="list-decimal pl-4 space-y-0.5 text-[10px] text-amber-800">
                <li>Click <strong>1. Download Stack (.yaml)</strong> above to save the template file.</li>
                <li>Click <strong>2. Open AWS CloudFormation</strong> &rarr; Choose <strong>Upload a template file</strong> and select the downloaded YAML.</li>
                <li>Select your VPC &amp; Subnet, verify the Bootstrap Token, and click <strong>Create Stack</strong>!</li>
              </ol>
            </div>
          </div>
        )}

        {enrollTab === 'userdata' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Paste into your EC2 <strong>User Data</strong> (under Advanced Details) when launching any Linux instance:
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                Auto-Starts on Boot
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] relative flex flex-col gap-2">
              <div className="text-slate-400 select-none text-[10px]"># AWS EC2 User Data Script</div>
              <pre className="text-emerald-400 whitespace-pre-wrap break-all text-[11px] leading-relaxed">
{`#!/bin/bash
curl -sSL ${API_BASE_URL}/ingress/gateway/install.sh | bash -s -- --token ${enrollToken || 'TOKEN'} --control-plane ${API_BASE_URL}`}
              </pre>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400">Works on Amazon Linux 2023, Ubuntu &amp; RHEL</span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `#!/bin/bash\ncurl -sSL ${API_BASE_URL}/ingress/gateway/install.sh | bash -s -- --token ${enrollToken} --control-plane ${API_BASE_URL}`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  {copiedToken ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedToken ? 'Copied' : 'Copy User Data'}</span>
                </button>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1.5 text-[11px] text-slate-600">
              <div className="font-bold text-slate-800">Running directly via SSH / Terminal instead?</div>
              <p className="text-[10px] text-slate-600">
                Run this command as root or with sudo:
              </p>
              <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-800 flex items-center justify-between">
                <span className="truncate pr-2">{`curl -sSL ${API_BASE_URL}/ingress/gateway/install.sh | sudo bash -s -- --token ${enrollToken || 'TOKEN'} --control-plane ${API_BASE_URL}`}</span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `curl -sSL ${API_BASE_URL}/ingress/gateway/install.sh | sudo bash -s -- --token ${enrollToken} --control-plane ${API_BASE_URL}`
                    )
                  }
                  className="text-blue-600 hover:text-blue-800 text-[10px] font-bold cursor-pointer shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {enrollTab === 'docker' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Run inside any Docker host, AWS ECS Task, or Kubernetes pod within your network:
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                Zero Image Build Needed
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] relative flex flex-col gap-2">
              <div className="text-slate-400 select-none text-[10px]"># Public Alpine Container (Runs anywhere)</div>
              <pre className="text-emerald-400 whitespace-pre-wrap break-all text-[11px] leading-relaxed">
{`docker run -d --restart=always --name clm-satellite-gateway \\
  -e CLM_CONTROL_PLANE_URL="${API_BASE_URL}" \\
  -e CLM_ENROLLMENT_TOKEN="${enrollToken || 'TOKEN'}" \\
  node:20-alpine sh -c "wget -qO- ${API_BASE_URL}/ingress/gateway/runner.js > /runner.js && node /runner.js"`}
              </pre>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400">Pulls official public node:20-alpine (No login needed)</span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `docker run -d --restart=always --name clm-satellite-gateway -e CLM_CONTROL_PLANE_URL="${API_BASE_URL}" -e CLM_ENROLLMENT_TOKEN="${enrollToken}" node:20-alpine sh -c "wget -qO- ${API_BASE_URL}/ingress/gateway/runner.js > /runner.js && node /runner.js"`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  {copiedToken ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedToken ? 'Copied' : 'Copy Command'}</span>
                </button>
              </div>
            </div>
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

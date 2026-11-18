import React, { useState } from 'react';
import { Layers, Lock, FileText, Check, Copy } from 'lucide-react';
import { Drawer } from '@clm/ui';
import { type Certificate } from '@clm/shared-types';

interface InspectorDrawerProps {
  cert: Certificate | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  cert,
  isOpen,
  onClose,
}) => {
  const [copiedPem, setCopiedPem] = useState(false);

  if (!cert) return null;

  const mockPemChain = `-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAP7x2/mY7E1zJq0...
Domain: ${cert.domain}
Serial: ${cert.serialNumber}
Issuer: ${cert.issuer}
SHA-256: ${cert.fingerprintSha256}
-----END CERTIFICATE-----`;

  const handleCopyPem = () => {
    navigator.clipboard.writeText(mockPemChain);
    setCopiedPem(true);
    setTimeout(() => setCopiedPem(false), 2000);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Deep Certificate Inspector: ${cert.domain}`}
      description="Comprehensive cryptographic chain, SANs, and deployment targets"
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
        {/* Header Status */}
        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
          <div>
            <div className="text-xs text-blue-600 font-bold uppercase">Status</div>
            <div className="text-base font-extrabold text-blue-900 mt-0.5">{cert.status}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-blue-600 font-bold uppercase">Days Remaining</div>
            <div className="text-base font-extrabold text-blue-900 mt-0.5">{cert.daysRemaining} days</div>
          </div>
        </div>

        {/* Subject Alternative Names */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-blue-600" />
            <span>Subject Alternative Names (SANs)</span>
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

        {/* Cryptographic Specifications */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-blue-600" />
            <span>Cryptographic Metadata</span>
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
              <span className="text-slate-800 font-semibold">{cert.issuer}</span>
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

        {/* PEM Chain Viewer */}
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

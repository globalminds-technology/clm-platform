import React, { useState } from 'react';
import { type Gateway } from '@clm/shared-types';
import { Modal, InfoBubble } from '@clm/ui';
import { type DiscoveryJob } from '../types';

interface CreateDiscoveryJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (job: Omit<DiscoveryJob, 'id' | 'status' | 'installationsFound'>) => void;
  gateways: Gateway[];
}

export const CreateDiscoveryJobModal: React.FC<CreateDiscoveryJobModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  gateways,
}) => {
  const [name, setName] = useState('VPC Internal Subnet Scan');
  const [targets, setTargets] = useState('10.0.1.0/24');
  const [ports, setPorts] = useState('443, 8443');
  const [gateway, setGateway] = useState('INTERNET');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targets.trim()) return;
    onSubmit({
      name: name.trim(),
      targets: targets.trim(),
      ports: ports.trim() || '443',
      gateway,
    });
    setName('VPC Internal Subnet Scan');
    setTargets('10.0.1.0/24');
    setPorts('443, 8443');
    setGateway('INTERNET');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Discovery Job">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <span>Job Name</span>
            <InfoBubble content="A descriptive label for this automated TLS scanning job." />
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Internal Subnet TLS Discovery"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <span>Target Domains or CIDR Subnets</span>
            <InfoBubble content="Comma-separated IP addresses (10.0.1.5), CIDR ranges (10.0.1.0/24), or external domains (api.example.com)." />
          </label>
          <textarea
            rows={2}
            required
            value={targets}
            onChange={(e) => setTargets(e.target.value)}
            placeholder="e.g. api.fintechglobal.com, 10.0.1.0/24"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span>Ports to Scan</span>
              <InfoBubble content="Standard TLS ports to test (443: HTTPS, 8443: API, 636: LDAPS, 993: IMAPS)." />
            </label>
            <input
              type="text"
              value={ports}
              onChange={(e) => setPorts(e.target.value)}
              placeholder="443, 8443"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span>Gateway Runner</span>
              <InfoBubble content="Run scan via Internet Edge or route through in-VPC Satellite Gateway." />
            </label>
            <select
              value={gateway}
              onChange={(e) => setGateway(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-medium"
            >
              <option value="INTERNET">Internet Gateway (Public DNS/Edge)</option>
              {gateways.map((gw) => (
                <option key={gw.id} value={gw.name}>
                  {gw.name} (In-VPC)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="primary-gradient-btn px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer"
          >
            <span>Create Job</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

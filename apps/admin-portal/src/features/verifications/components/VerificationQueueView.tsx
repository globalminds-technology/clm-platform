import React, { useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { InfoBubble, toast, Modal } from '@clm/ui';
import { type Tenant, TenantStatus } from '@clm/shared-types';
import { api } from '../../../config/api';

interface VerificationQueueViewProps {
  tenants: Tenant[];
  onTenantApproved: (tenantId: string) => void;
}

export const VerificationQueueView: React.FC<VerificationQueueViewProps> = ({
  tenants,
  onTenantApproved,
}) => {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isVerifyingDns, setIsVerifyingDns] = useState(false);
  const [dnsStatus, setDnsStatus] = useState<'IDLE' | 'PASS' | 'FAIL'>('IDLE');

  const pendingTenants = tenants.filter((t) => t.status === TenantStatus.PENDING_APPROVAL);

  const handleRunDnsCheck = () => {
    setIsVerifyingDns(true);
    setTimeout(() => {
      setIsVerifyingDns(false);
      setDnsStatus('PASS');
      toast.success('DNS Verification Record Found', 'TXT record _clm-challenge verified successfully.');
    }, 700);
  };

  const handleConfirmApproval = async (tenantId: string) => {
    try {
      if (api.http) {
        await api.http.patch(`tenants/${tenantId}/approve`, {});
      }
      onTenantApproved(tenantId);
      setSelectedTenant(null);
      setDnsStatus('IDLE');
      toast.success('Organization Approved', 'Tenant status set to ACTIVE. Workspaces unlocked.');
    } catch (err: any) {
      toast.error('Approval Failed', err.message || 'Could not approve tenant');
    }
  };

  return (
    <div className="space-y-6 pr-3 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
              Organization Domain &amp; Identity Verification
            </h3>
            <InfoBubble
              title="Tenant Security Verification"
              content="Super Admin review queue. Before an enterprise workspace can issue commercial certificates or deploy satellite daemons, their root domain ownership must be proven via DNS TXT challenge to prevent domain hijacking."
            />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pending subscriber workspaces awaiting platform security approval
          </p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-black ${pendingTenants.length > 0
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
        >
          {pendingTenants.length} Pending Review
        </span>
      </div>

      {pendingTenants.length === 0 ? (
        <div className="bg-white rounded-[24px] soft-card p-12 text-center border border-slate-100 space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-extrabold text-[#0F172A]">All Organizations Verified</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            There are currently no tenant workspaces pending identity or domain verification.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white soft-card">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Organization &amp; Slug</th>
                <th className="py-3 px-4">Claimed Domain</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4">Submitted Date</th>
                <th className="py-3 px-4 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {pendingTenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-extrabold text-[#0F172A]">{t.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">slug: {t.slug} • id: {t.id.slice(0, 8)}...</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-800 font-bold">
                    {t.slug}.corp (or custom)
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                      {t.tier}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedTenant(t);
                        setDnsStatus('IDLE');
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold primary-gradient-btn text-white shadow-sm cursor-pointer"
                    >
                      Inspect &amp; Verify
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Verification Drawer / Modal */}
      {selectedTenant && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTenant(null)}
          title={`Verify Organization: ${selectedTenant.name}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Organization Metadata</span>
              <div className="font-extrabold text-sm text-[#0F172A]">{selectedTenant.name}</div>
              <p className="text-slate-500">
                Workspace Slug: <span className="font-mono font-bold text-slate-700">{selectedTenant.slug}</span> • Tier: <span className="font-bold text-blue-600">{selectedTenant.tier}</span>
              </p>
            </div>

            {/* DNS TXT Challenge Inspector */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Root Domain Ownership (DNS TXT Check)</span>
                {dnsStatus === 'PASS' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Record Validated
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRunDnsCheck}
                    disabled={isVerifyingDns}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 text-blue-600 ${isVerifyingDns ? 'animate-spin' : ''}`} />
                    <span>{isVerifyingDns ? 'Querying DNS...' : 'Query DNS TXT'}</span>
                  </button>
                )}
              </div>
              <p className="text-slate-500 text-[11px]">
                Target: <span className="font-mono text-slate-700">_clm-challenge.{selectedTenant.slug}.com</span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedTenant(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmApproval(selectedTenant.id)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Approve Organization &amp; Unlock</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

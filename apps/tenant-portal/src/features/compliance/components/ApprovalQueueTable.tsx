import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Modal, toast, InfoBubble } from '@clm/ui';
import type { ApprovalRequest } from '../types';

export const INITIAL_APPROVAL_REQUESTS: ApprovalRequest[] = [
  {
    id: 'REQ-101',
    domain: '*.api.production.internal',
    environment: 'PRODUCTION',
    requesterEmail: 'devops-lead@company.com',
    requesterRole: 'OPERATOR',
    requestedAt: '2026-11-18 14:20 UTC',
    reason: 'Wildcard ingress router renewal for AWS EKS microservices cluster.',
    keyAlgorithm: 'ECDSA_P256',
    targetCa: 'DigiCert CertCentral',
    status: 'PENDING',
  },
  {
    id: 'REQ-102',
    domain: 'checkout-vault.payments.corp',
    environment: 'PRODUCTION',
    requesterEmail: 'pci-admin@company.com',
    requesterRole: 'OPERATOR',
    requestedAt: '2026-11-18 10:45 UTC',
    reason: 'High-security payment gateway HSM certificate for PCI-DSS v4.0 scope.',
    keyAlgorithm: 'RSA_4096',
    targetCa: 'HashiCorp Vault PKI',
    status: 'PENDING',
  },
];

export const ApprovalQueueTable: React.FC = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>(INITIAL_APPROVAL_REQUESTS);
  const [selectedReq, setSelectedReq] = useState<ApprovalRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [notes, setNotes] = useState('');

  const handleActionConfirm = () => {
    if (!selectedReq || !actionType) return;

    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === selectedReq.id) {
          return {
            ...r,
            status: actionType === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            approverEmail: 'security-admin@tenant.com',
            reviewedAt: new Date().toISOString(),
            reviewNotes: notes || (actionType === 'APPROVE' ? 'Approved by Certificate Officer.' : 'Rejected per policy.'),
          };
        }
        return r;
      })
    );

    if (actionType === 'APPROVE') {
      toast.success(
        'Request Approved (4-Eyes Signed)',
        `Certificate issuance for '${selectedReq.domain}' has been authorized and dispatched to ${selectedReq.targetCa}.`
      );
    } else {
      toast.warning(
        'Request Rejected',
        `Issuance order for '${selectedReq.domain}' was rejected.`
      );
    }

    setSelectedReq(null);
    setActionType(null);
    setNotes('');
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-extrabold text-[#0F172A] tracking-tight">
              4-Eyes Dual Approval Queue
            </h3>
            <InfoBubble
              title="4-Eyes Dual Authorization"
              content="Compliance standard requiring two authorized individuals to approve high-risk cryptographic actions (e.g., wildcard certificates or production payment domains) before keys are generated and certificates are signed."
            />
          </div>
          <p className="text-xs text-slate-500">
            Pending issuance requests requiring Tenant Admin or Security Officer digital sign-off
          </p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-black ${
            pendingCount > 0
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {pendingCount} Pending Review
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white soft-card">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Request ID & Domain</th>
              <th className="py-3 px-4">Scope & Env</th>
              <th className="py-3 px-4">Target CA & Algorithm</th>
              <th className="py-3 px-4">Requester</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-slate-50/50 transition">
                <td className="py-3.5 px-4">
                  <div className="font-extrabold text-[#0F172A]">{req.domain}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{req.id} • {req.requestedAt}</div>
                  <div className="text-[11px] text-slate-500 italic mt-0.5 max-w-xs truncate" title={req.reason}>
                    "{req.reason}"
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      req.environment === 'PRODUCTION'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {req.environment}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-bold text-[#0F172A]">{req.targetCa}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{req.keyAlgorithm}</div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-slate-800">{req.requesterEmail}</div>
                  <div className="text-[10px] text-slate-400">{req.requesterRole}</div>
                </td>
                <td className="py-3.5 px-4">
                  {req.status === 'PENDING' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="h-3 w-3" /> Pending Review
                    </span>
                  ) : req.status === 'APPROVED' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" /> Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                      <XCircle className="h-3 w-3" /> Rejected
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right">
                  {req.status === 'PENDING' ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedReq(req);
                          setActionType('APPROVE');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReq(req);
                          setActionType('REJECT');
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {req.approverEmail?.split('@')[0]}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {selectedReq && actionType && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedReq(null);
            setActionType(null);
          }}
          title={actionType === 'APPROVE' ? 'Approve Certificate Issuance' : 'Reject Certificate Request'}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-extrabold text-[#0F172A] text-sm">{selectedReq.domain}</div>
              <p className="text-slate-500">
                Target CA: <span className="font-bold text-slate-700">{selectedReq.targetCa}</span> • Algorithm:{' '}
                <span className="font-bold text-slate-700">{selectedReq.keyAlgorithm}</span>
              </p>
              <p className="text-slate-500">
                Requested by: <span className="font-bold text-slate-700">{selectedReq.requesterEmail}</span> ({selectedReq.requesterRole})
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Digital Sign-off Justification</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter review notes or compliance verification rationale..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 min-h-[80px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedReq(null);
                  setActionType(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActionConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer ${
                  actionType === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionType === 'APPROVE' ? 'Authorize & Dispatch to CA' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

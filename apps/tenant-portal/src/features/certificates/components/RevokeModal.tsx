import React, { useState } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { Modal, InfoBubble } from '@clm/ui';
import { type Certificate } from '@clm/shared-types';

interface RevokeModalProps {
  cert: Certificate | null;
  isOpen: boolean;
  onClose: () => void;
  onRevoke: (certId: string, reason: string, comments?: string) => Promise<void>;
}

export const RevokeModal: React.FC<RevokeModalProps> = ({
  cert,
  isOpen,
  onClose,
  onRevoke,
}) => {
  const [reason, setReason] = useState('KEY_COMPROMISE');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!cert) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onRevoke(cert.id, reason, comments || undefined);
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
      title={`Revoke Certificate: ${cert.domain}`}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900">RFC 5280 Compliance Revocation</h4>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Revoking a certificate invalidates its digital signature immediately. This action will be permanently recorded in the immutable compliance audit ledger.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center">
            <span>Revocation Reason</span>
            <InfoBubble content="Standard RFC 5280 reason code reported to OCSP responders and CRL endpoints." />
          </label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-medium"
          >
            <option value="KEY_COMPROMISE">Key Compromise (Private key suspected stolen or leaked)</option>
            <option value="AFFILIATION_CHANGED">Affiliation Changed (Subject organization ownership changed)</option>
            <option value="SUPERSEDED">Superseded (A replacement certificate was already issued)</option>
            <option value="CESSATION_OF_OPERATION">Cessation of Operation (Server/service decommissioned)</option>
            <option value="UNSPECIFIED">Unspecified</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center">
            <span>Auditor Notes / Comments (Optional)</span>
            <InfoBubble content="Provide internal justification for security and compliance audits." />
          </label>
          <textarea
            rows={3}
            value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="e.g. Server decommissioned following migration to AWS ECS cluster."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
          />
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
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-md shadow-rose-500/25 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            <span>Confirm Revocation</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

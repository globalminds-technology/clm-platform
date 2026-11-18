import React from 'react';
import { Plus, Lock } from 'lucide-react';
import { TenantStatus, type Gateway, type Tenant } from '@clm/shared-types';
import { GatewayGrid } from './GatewayGrid';
import { EnrollGatewayModal } from './EnrollGatewayModal';

interface GatewaysViewProps {
  gateways: Gateway[];
  showEnrollModal: boolean;
  setShowEnrollModal: (open: boolean) => void;
  enrollToken: string;
  onOpenEnroll: () => void;
  onSimulateHandshake: () => Promise<void>;
  isSimulatingHandshake: boolean;
  currentTenant: Tenant | null;
}

export const GatewaysView: React.FC<GatewaysViewProps> = ({
  gateways,
  showEnrollModal,
  setShowEnrollModal,
  enrollToken,
  onOpenEnroll,
  onSimulateHandshake,
  isSimulatingHandshake,
  currentTenant,
}) => {
  const isPendingApproval = currentTenant?.status === TenantStatus.PENDING_APPROVAL;

  return (
    <div className="bg-white rounded-[28px] soft-card p-6 mr-3 mb-6 space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
            Enrolled Infrastructure Gateways
          </h3>
          <p className="text-xs text-slate-500">
            Gateways maintain an outbound mTLS tunnel to securely pull renewal jobs and deploy certificates.
          </p>
        </div>
        {isPendingApproval ? (
          <button
            disabled
            title="Action locked: Workspace is under security review"
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80"
          >
            <Lock className="h-4 w-4 text-slate-400" />
            <span>Enroll Gateway (Locked)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenEnroll}
            className="primary-gradient-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Enroll New Gateway</span>
          </button>
        )}
      </div>

      <GatewayGrid
        gateways={gateways}
        currentTenant={currentTenant}
        onOpenEnroll={onOpenEnroll}
      />

      <EnrollGatewayModal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        enrollToken={enrollToken}
        onSimulateHandshake={onSimulateHandshake}
        isSimulatingHandshake={isSimulatingHandshake}
      />
    </div>
  );
};

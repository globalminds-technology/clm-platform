import React from 'react';
import { Server, Plus, Lock } from 'lucide-react';
import { GatewayStatus, TenantStatus, type Gateway, type Tenant } from '@clm/shared-types';
import { StatusBadge } from '@clm/ui';

interface GatewayGridProps {
  gateways: Gateway[];
  currentTenant: Tenant | null;
  onOpenEnroll: () => void;
}

export const GatewayGrid: React.FC<GatewayGridProps> = ({
  gateways,
  currentTenant,
  onOpenEnroll,
}) => {
  const isPendingApproval = currentTenant?.status === TenantStatus.PENDING_APPROVAL;

  if (gateways.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <Server className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <div className="font-extrabold text-sm text-[#0F172A]">No Gateways Enrolled</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your workspace does not have any active satellite daemons connected. Click below to enroll your first gateway.
          </p>
        </div>
        {isPendingApproval ? (
          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold border border-slate-200 cursor-not-allowed">
            <Lock className="h-4 w-4 text-slate-400" />
            <span>Enrollment Locked During Review</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenEnroll}
            className="primary-gradient-btn px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Enroll Gateway Daemon</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {gateways.map((gw) => (
        <div
          key={gw.id}
          className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-100 hover:border-slate-200 transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <div className="font-extrabold text-sm text-[#0F172A]">{gw.name}</div>
                <div className="text-xs font-mono text-slate-400">{gw.hostname}</div>
              </div>
            </div>
            <StatusBadge
              variant={gw.status === GatewayStatus.ONLINE ? 'healthy' : 'critical'}
              label={gw.status}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60 font-medium">
            <div>
              <span className="text-slate-400">IP Address: </span>
              <span className="font-mono text-slate-700">{gw.ipAddress}</span>
            </div>
            <div>
              <span className="text-slate-400">Agent Version: </span>
              <span className="text-slate-700">v{gw.version}</span>
            </div>
            <div>
              <span className="text-slate-400">Heartbeat: </span>
              <span className="text-emerald-600 font-bold">{gw.lastHeartbeatAt}</span>
            </div>
            <div>
              <span className="text-slate-400">Targets: </span>
              <span className="text-slate-700">{gw.targetTypesSupported?.join(', ') || 'N/A'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

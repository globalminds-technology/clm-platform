import React from 'react';
import { Zap } from 'lucide-react';
import { type AuditLog } from '@clm/shared-types';

interface AuditLogTableProps {
  logs: AuditLog[];
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({ logs }) => {
  return (
    <div className="bg-white rounded-[28px] soft-card p-6 mr-3 mb-6 space-y-4">
      <div className="pb-4 border-b border-slate-100">
        <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
          Activity &amp; Audit History
        </h3>
        <p className="text-xs text-slate-500">
          Full chronological ledger of certificate operations, approvals, and gateway events.
        </p>
      </div>

      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No activity logs recorded yet. All certificate actions will appear here in chronological order.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-[#0F172A]">{log.action}</div>
                  <div className="text-[11px] text-slate-500">
                    {log.resourceType}: {log.resourceId}
                  </div>
                </div>
              </div>
              <div className="text-right text-[11px]">
                <div className="font-semibold text-slate-700">{log.actorEmail || log.actorType}</div>
                <div className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

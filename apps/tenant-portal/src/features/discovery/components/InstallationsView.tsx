import React from 'react';
import { Check } from 'lucide-react';
import { Badge } from '@clm/ui';
import { type DiscoveredInstallation } from '../types';

interface InstallationsViewProps {
  installations: DiscoveredInstallation[];
  onImport: (inst: DiscoveredInstallation) => void;
}

export const InstallationsView: React.FC<InstallationsViewProps> = ({
  installations,
  onImport,
}) => {
  if (installations.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs bg-[#F8FAFC] rounded-2xl border border-slate-100">
        No active endpoint installations discovered yet. Run a Discovery Scan or trigger a Job to discover certificates across your networks.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">Endpoint (Host:Port)</th>
              <th className="py-3 px-4">Certificate Subject (CN)</th>
              <th className="py-3 px-4">Issuer Authority</th>
              <th className="py-3 px-4">Remaining Validity</th>
              <th className="py-3 px-4">Management Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {installations.map((inst) => (
              <tr key={inst.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-slate-900">
                  {inst.endpoint}
                </td>
                <td className="py-3 px-4">
                  <span className="font-bold text-blue-900">{inst.domain}</span>
                </td>
                <td className="py-3 px-4 text-slate-500">
                  {inst.issuer}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`font-bold ${
                      inst.daysRemaining <= 15 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {inst.daysRemaining} days left
                  </span>
                </td>
                <td className="py-3 px-4">
                  <Badge
                    variant={
                      inst.status === 'MANAGED'
                        ? 'success'
                        : inst.status === 'EXPIRING'
                        ? 'destructive'
                        : 'warning'
                    }
                  >
                    {inst.status === 'MANAGED'
                      ? 'Managed in CLM'
                      : inst.status === 'EXPIRING'
                      ? 'Expiring Soon'
                      : 'Shadow / Unmanaged'}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right">
                  {inst.status !== 'MANAGED' ? (
                    <button
                      type="button"
                      onClick={() => onImport(inst)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-sm transition-colors cursor-pointer"
                      title="Import this discovered certificate into active tracking"
                    >
                      + Import to Inventory
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-600 font-bold inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Actively Tracked
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React from 'react';
import { ShieldCheck, Plus, Radio, ArrowRight, CheckCircle2 } from 'lucide-react';
import { InfoBubble } from '@clm/ui';
import type { CryptoPostureMetrics } from '../types';

interface OutageSlaCardProps {
  metrics: CryptoPostureMetrics;
  onOpenAddCert: () => void;
  onNavigateToDiscovery: () => void;
  onNavigateToCerts: () => void;
}

export const OutageSlaCard: React.FC<OutageSlaCardProps> = ({
  metrics,
  onOpenAddCert,
  onNavigateToDiscovery,
  onNavigateToCerts,
}) => {
  return (
    <div className="bg-white rounded-[24px] soft-card p-6 border border-slate-100 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                Zero-Outage SLA Guarantee
              </h3>
              <InfoBubble
                title="Zero-Outage Automated SLA"
                content="Tracks enterprise uptime SLA. Measures automated background renewals executed without downtime or manual human intervention before TLS certificates expire."
              />
            </div>
            <p className="text-xs text-slate-500">Autonomous renewal reliability index</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> 99.99% Outage SLA
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 py-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400 block pb-1">
            Next Critical Expiry
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-[#0F172A]">
              {metrics.nextExpiryDays !== null ? metrics.nextExpiryDays : '—'}
            </span>
            <span className="text-xs text-slate-500 font-bold">days left</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1">Automated watchdog active</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400 block pb-1">
            Auto-Renewal Coverage
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-600">
              {metrics.autoRenewSlaRate}%
            </span>
            <span className="text-xs text-slate-500 font-bold">coverage</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1">Zero-touch CA renewals</p>
        </div>
      </div>

      {/* Quick Action Center */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
          Cryptographic Operations
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddCert}
            className="flex-1 primary-gradient-btn py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Request Certificate</span>
          </button>
          <button
            onClick={onNavigateToDiscovery}
            className="py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <Radio className="h-3.5 w-3.5 text-blue-600" />
            <span>Scan Subnets</span>
          </button>
          <button
            onClick={onNavigateToCerts}
            className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
            title="View Full Inventory"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

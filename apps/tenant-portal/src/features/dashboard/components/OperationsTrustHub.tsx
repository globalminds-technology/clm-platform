import React from 'react';
import { Layers, Plus, Radio, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { InfoBubble } from '@clm/ui';
import type { CryptoPostureMetrics } from '../types';

interface OperationsTrustHubProps {
  metrics: CryptoPostureMetrics;
  onOpenAddCert: () => void;
  onNavigateToDiscovery: () => void;
  onNavigateToCerts: (filter?: 'ALL' | 'ACTIVE' | 'EXPIRING' | 'CRITICAL') => void;
}

export const OperationsTrustHub: React.FC<OperationsTrustHubProps> = ({
  metrics,
  onOpenAddCert,
  onNavigateToDiscovery,
  onNavigateToCerts,
}) => {
  const {
    activeCertificates,
    expiringCertificates,
    criticalCertificates,
    revokedCertificates,
    issuerBreakdown,
    nextExpiryDays,
  } = metrics;

  const issuersList = Object.entries(issuerBreakdown).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white rounded-[24px] soft-card p-5 sm:p-6 border border-slate-100 flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                Authority &amp; Operations Hub
              </h3>
              <InfoBubble
                title="Authority Trust & Operations"
                content="Aggregated view of active Certificate Authority trust roots, imminent expiration SLA countdowns, and quick operational shortcuts."
              />
            </div>
            <p className="text-xs text-slate-500">Cross-CA distribution &amp; SLA execution</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> 99.99% Outage SLA
        </span>
      </div>

      {/* Status Badges Row */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <button
          onClick={() => onNavigateToCerts('ACTIVE')}
          className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 transition cursor-pointer"
        >
          <span className="text-[10px] font-bold uppercase block">Active</span>
          <span className="text-base font-black">{activeCertificates}</span>
        </button>
        <button
          onClick={() => onNavigateToCerts('EXPIRING')}
          className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-100 transition cursor-pointer"
        >
          <span className="text-[10px] font-bold uppercase block">Expiring</span>
          <span className="text-base font-black">{expiringCertificates}</span>
        </button>
        <button
          onClick={() => onNavigateToCerts('CRITICAL')}
          className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 transition cursor-pointer"
        >
          <span className="text-[10px] font-bold uppercase block">Critical</span>
          <span className="text-base font-black">{criticalCertificates}</span>
        </button>
        <button
          onClick={() => onNavigateToCerts('ALL')}
          className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
        >
          <span className="text-[10px] font-bold uppercase block">Revoked</span>
          <span className="text-base font-black">{revokedCertificates}</span>
        </button>
      </div>

      {/* Active Certificate Authorities Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Active Certificate Authorities</span>
          <span className="text-blue-600 font-semibold">{issuersList.length} Connected CAs</span>
        </div>
        {issuersList.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-1">No certificates recorded in database.</p>
        ) : (
          <div className="space-y-2">
            {issuersList.slice(0, 2).map(([issuer, count]) => {
              const pct = Math.round((count / (metrics.totalCertificates || 1)) * 100);
              return (
                <div key={issuer} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[#0F172A] truncate max-w-[210px]" title={issuer}>
                      {issuer}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expiry SLA Banner & Quick Operations Buttons */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" /> Next Imminent Expiry
          </span>
          <span className="font-extrabold text-[#0F172A]">
            {nextExpiryDays !== null ? `${nextExpiryDays} days remaining` : 'No upcoming expiries'}
          </span>
        </div>

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
            onClick={() => onNavigateToCerts('ALL')}
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

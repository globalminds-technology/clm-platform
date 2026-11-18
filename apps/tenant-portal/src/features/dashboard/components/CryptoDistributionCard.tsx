import React from 'react';
import { Layers } from 'lucide-react';
import { InfoBubble } from '@clm/ui';
import type { CryptoPostureMetrics } from '../types';

interface CryptoDistributionCardProps {
  metrics: CryptoPostureMetrics;
}

export const CryptoDistributionCard: React.FC<CryptoDistributionCardProps> = ({ metrics }) => {
  const { issuerBreakdown, activeCertificates, expiringCertificates, criticalCertificates, revokedCertificates } =
    metrics;

  const issuersList = Object.entries(issuerBreakdown).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white rounded-[24px] soft-card p-6 border border-slate-100 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                CA & Authority Distribution
              </h3>
              <InfoBubble
                title="Certificate Authority Trust Anchors"
                content="Breakdown of public commercial (DigiCert, Sectigo), ACME (Let's Encrypt), and private enterprise PKI (HashiCorp Vault, AWS Private CA) roots actively issuing certificates across your infrastructure."
              />
            </div>
            <p className="text-xs text-slate-500">Cross-authority trust architecture</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 py-3">
        {/* Status Pills */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <span className="text-[10px] font-bold uppercase block">Active</span>
            <span className="text-base font-black">{activeCertificates}</span>
          </div>
          <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
            <span className="text-[10px] font-bold uppercase block">Expiring</span>
            <span className="text-base font-black">{expiringCertificates}</span>
          </div>
          <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">
            <span className="text-[10px] font-bold uppercase block">Critical</span>
            <span className="text-base font-black">{criticalCertificates}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 text-slate-600 border border-slate-200">
            <span className="text-[10px] font-bold uppercase block">Revoked</span>
            <span className="text-base font-black">{revokedCertificates}</span>
          </div>
        </div>

        {/* Issuers List */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Active Certificate Authorities
          </span>
          {issuersList.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No certificates recorded in database.</p>
          ) : (
            issuersList.slice(0, 3).map(([issuer, count]) => {
              const pct = Math.round((count / (metrics.totalCertificates || 1)) * 100);
              return (
                <div key={issuer} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[#0F172A] truncate max-w-[200px]" title={issuer}>
                      {issuer}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Zero-Trust Authority Anchors</span>
        <span className="text-blue-600 font-semibold">{issuersList.length} Connected CAs</span>
      </div>
    </div>
  );
};

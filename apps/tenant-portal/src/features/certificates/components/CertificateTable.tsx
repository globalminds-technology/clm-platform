import React from 'react';
import {
  Shield,
  Cloud,
  Radio,
  Search,
  Server,
} from 'lucide-react';
import {
  CertStatus,
  CertificateTrackingMode,
  type Certificate,
} from '@clm/shared-types';
import { StatusBadge } from '@clm/ui';

interface CertificateTableProps {
  certs: Certificate[];
  selectedCertId: string;
  onSelectCert: (cert: Certificate) => void;
  statusFilter: 'ALL' | 'ACTIVE' | 'EXPIRING' | 'CRITICAL';
  setStatusFilter: (filter: 'ALL' | 'ACTIVE' | 'EXPIRING' | 'CRITICAL') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const CertificateTable: React.FC<CertificateTableProps> = ({
  certs,
  selectedCertId,
  onSelectCert,
  statusFilter,
  setStatusFilter,
  searchTerm,
  setSearchTerm,
}) => {
  const activeCount = certs.filter(
    (c) => c.status === CertStatus.ACTIVE && c.daysRemaining > 30
  ).length;
  const expiringCount = certs.filter(
    (c) => c.status === CertStatus.EXPIRING_SOON || (c.daysRemaining <= 30 && c.daysRemaining > 7)
  ).length;
  const criticalCount = certs.filter(
    (c) => c.status === CertStatus.EXPIRED || c.daysRemaining <= 7
  ).length;

  const filteredCerts = certs.filter((cert) => {
    const matchesSearch =
      cert.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.issuer.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? cert.status === CertStatus.ACTIVE && cert.daysRemaining > 30
        : statusFilter === 'EXPIRING'
        ? cert.status === CertStatus.EXPIRING_SOON || (cert.daysRemaining <= 30 && cert.daysRemaining > 7)
        : cert.status === CertStatus.EXPIRED || cert.daysRemaining <= 7;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white rounded-[28px] soft-card p-5 space-y-4">
      {/* Pill Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F8FAFC] border border-slate-100">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'ALL' ? 'pill-tab-active' : 'pill-tab-inactive'
          }`}
        >
          All ({certs.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('ACTIVE')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'ACTIVE' ? 'pill-tab-active' : 'pill-tab-inactive'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('EXPIRING')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'EXPIRING' ? 'pill-tab-active' : 'pill-tab-inactive'
          }`}
        >
          Expiring ({expiringCount})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('CRITICAL')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'CRITICAL' ? 'pill-tab-active' : 'pill-tab-inactive'
          }`}
        >
          Critical ({criticalCount})
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by domain, issuer, or SAN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3.5 py-2 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
        />
      </div>

      {/* Sub-header Filter Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
        <span>Certificate Domain</span>
        <span>Days Left</span>
      </div>

      {/* Certificates List */}
      <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
        {filteredCerts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No certificates match your query.
          </div>
        ) : (
          filteredCerts.map((cert) => {
            const isSelected = cert.id === selectedCertId;
            const isCritical = cert.status === CertStatus.EXPIRED || cert.daysRemaining <= 7;
            const isExpiring = cert.status === CertStatus.EXPIRING_SOON;

            return (
              <div
                key={cert.id}
                onClick={() => onSelectCert(cert)}
                className={`p-3.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between border ${
                  isSelected
                    ? 'bg-blue-50/50 border-blue-200 shadow-xs ring-1 ring-blue-500/20'
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelectCert(cert)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-[#0F172A] truncate">
                      {cert.domain}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate mt-0.5">
                      {cert.trackingMode === CertificateTrackingMode.MONITORED ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                          <Radio className="h-2.5 w-2.5" /> Monitored
                        </span>
                      ) : cert.issuer.includes('Amazon') || cert.issuer.includes('AWS') ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          <Cloud className="h-2.5 w-2.5" /> AWS Cloud
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <Shield className="h-2.5 w-2.5" /> Managed
                        </span>
                      )}
                      {(cert.gatewayId || cert.trackingMode === CertificateTrackingMode.MANAGED_GATEWAY) && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 shrink-0">
                          <Server className="h-2.5 w-2.5" /> Gateway
                        </span>
                      )}
                      <span className="truncate">{cert.issuer}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {cert.daysRemaining > 0 ? `${cert.daysRemaining}d` : 'Expired'}
                  </span>
                  {isCritical ? (
                    <StatusBadge variant="critical" label="Critical" />
                  ) : isExpiring ? (
                    <StatusBadge variant="warning" label="Expiring" />
                  ) : (
                    <StatusBadge variant="healthy" label="Healthy" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Count */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-500">
        <span>
          Showing {filteredCerts.length} of {certs.length} certificates
        </span>
        <span className="text-slate-400">Inventory</span>
      </div>
    </div>
  );
};

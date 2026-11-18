import React, { useMemo } from 'react';
import { type Certificate, type Gateway, type Tenant } from '@clm/shared-types';
import {
  ShieldAlert,
  ArrowRight,
  AlertTriangle,
  Server,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { calculateCryptoPosture } from '../utils';
import { ExecutivePostureHero } from './ExecutivePostureHero';
import { OperationsTrustHub } from './OperationsTrustHub';
import { InfoBubble } from '@clm/ui';

interface DashboardViewProps {
  certs: Certificate[];
  gateways: Gateway[];
  currentTenant?: Tenant | null;
  onOpenAddCert: () => void;
  onNavigateToCerts: (filter?: 'ALL' | 'ACTIVE' | 'EXPIRING' | 'CRITICAL') => void;
  onNavigateToDiscovery: () => void;
  onNavigateToGateways: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  certs,
  gateways,
  onOpenAddCert,
  onNavigateToCerts,
  onNavigateToDiscovery,
  onNavigateToGateways,
}) => {
  // Compute real-time metrics strictly from database state
  const metrics = useMemo(() => calculateCryptoPosture(certs), [certs]);

  // Expiring soon or critical certs (up to 5 items)
  const highRiskCerts = useMemo(() => {
    return certs
      .filter((c) => c.status !== 'REVOKED')
      .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0))
      .slice(0, 5);
  }, [certs]);

  const activeGatewaysCount = gateways.filter((g) => g.status === 'ONLINE').length;

  return (
        <div className="space-y-6 pr-2 sm:pr-3 pb-8">
          {/* 1. Executive Hero Row: 2 Spacious, Balanced Cards (7 cols + 5 cols on XL, stacked on mobile) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <div className="xl:col-span-7">
              <ExecutivePostureHero
                metrics={metrics}
                onViewCritical={() => onNavigateToCerts('CRITICAL')}
              />
            </div>
            <div className="xl:col-span-5">
              <OperationsTrustHub
                metrics={metrics}
                onOpenAddCert={onOpenAddCert}
                onNavigateToDiscovery={onNavigateToDiscovery}
                onNavigateToCerts={onNavigateToCerts}
              />
            </div>
          </div>

          {/* 2. Middle Row: High-Risk Certificates & Gateway Telemetry */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              {/* Left Column (8 cols): Certificate Expiration Watchlist */}
                <div className="xl:col-span-8 bg-white rounded-[24px] soft-card p-5 sm:p-6 border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                            Immediate Expiration Watchlist
                          </h3>
                          <InfoBubble
                            title="Lifecycle Watchlist"
                            content="Priority queue of certificates approaching expiration. The autonomous engine triggers background CA renewals when certificates enter the renewal window."
                          />
                        </div>
                        <p className="text-xs text-slate-500">Prioritized by days remaining until outage</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigateToCerts('EXPIRING')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {highRiskCerts.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 space-y-2">
                      <ShieldAlert className="h-8 w-8 mx-auto text-slate-300" />
                      <p className="text-sm font-semibold">No high-risk certificates detected.</p>
                      <p className="text-xs text-slate-400">All registered domains have healthy validity windows.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {highRiskCerts.map((cert) => {
                        const days = cert.daysRemaining ?? 0;
                        const isCritical = days <= 7;
                        const isWarning = days <= 30 && days > 7;

                        return (
                  <div
                    key={cert.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 hover:bg-slate-50/60 rounded-xl px-2 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          isCritical
                            ? 'bg-rose-50 text-rose-600'
                            : isWarning
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        <Lock className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-[#0F172A] truncate">
                            {cert.domain}
                          </span>
                          {cert.sans && cert.sans.length > 0 && (
                            <span className="text-[10px] text-slate-400 shrink-0">
                              +{cert.sans.length} SANs
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate">
                          CA: {cert.issuer ? (cert.issuer.split(',')[0]?.replace('CN=', '') || 'Unknown CA') : "Let's Encrypt"} • Algorithm: {cert.keyAlgorithm}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-9 sm:pl-0">
                      <div className="text-left sm:text-right">
                        <span
                          className={`text-xs font-black block ${
                            isCritical
                              ? 'text-rose-600'
                              : isWarning
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {days === 0 ? 'Expires Today' : `${days} days left`}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {cert.autoRenew ? 'Auto-Renew: ON' : 'Manual'}
                        </span>
                      </div>
                      <button
                        onClick={() => onNavigateToCerts('ALL')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                        title="Inspect in Certificates view"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
          )}
            </div>

            {/* Right Column (4 cols): Satellite Gateway Fleet & Network Telemetry */}
              <div className="xl:col-span-4 bg-white rounded-[24px] soft-card p-5 sm:p-6 border border-slate-100 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <Server className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                          Satellite Gateways
                        </h3>
                        <InfoBubble
                          title="Zero-Trust Satellite Daemons"
                          content="On-premise or cloud agents maintaining an outbound mTLS tunnel. Gateways deploy certificates directly to NGINX, Apache, IIS, or AWS targets without inbound firewall openings."
                        />
                      </div>
                      <p className="text-xs text-slate-500">Autonomous deployment fleet</p>
                    </div>
                  </div>
                  <button
                    onClick={onNavigateToGateways}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Fleet ({gateways.length})</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500 block">Active mTLS Daemons</span>
                      <span className="text-2xl font-black text-[#0F172A]">{activeGatewaysCount}</span>
                      <span className="text-[10px] text-slate-400 block">of {gateways.length} provisioned</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                      <Server className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Target Infrastructure
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">NGINX / Web</span>
                        <span className="text-xs font-extrabold text-slate-700">Automated Reload</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">AWS ACM / ALB</span>
                        <span className="text-xs font-extrabold text-slate-700">Cloud Binding</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Outbound mTLS Tunnel</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry
                  </span>
                </div>
              </div>
            </div>
          </div>
          );
};

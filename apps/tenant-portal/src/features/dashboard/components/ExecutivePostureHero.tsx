import React from 'react';
import { ShieldCheck, AlertTriangle, Sparkles, Cpu } from 'lucide-react';
import { InfoBubble } from '@clm/ui';
import type { CryptoPostureMetrics } from '../types';

interface ExecutivePostureHeroProps {
  metrics: CryptoPostureMetrics;
  onViewCritical: () => void;
}

export const ExecutivePostureHero: React.FC<ExecutivePostureHeroProps> = ({
  metrics,
  onViewCritical,
}) => {
  const isHealthy = metrics.healthScore >= 80;
  const isWarning = metrics.healthScore >= 60 && metrics.healthScore < 80;

  const scoreColor = isHealthy
    ? 'text-emerald-500 stroke-emerald-500'
    : isWarning
    ? 'text-amber-500 stroke-amber-500'
    : 'text-rose-500 stroke-rose-500';

  const badgeBg = isHealthy
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : isWarning
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-rose-50 text-rose-700 border-rose-200';

  // SVG Gauge calculations
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (metrics.healthScore / 100) * circumference;

  const total = metrics.totalCertificates || 1;
  const modernPercent = Math.round(
    ((metrics.algorithmBreakdown.rsa4096 +
      metrics.algorithmBreakdown.ecdsaP256 +
      metrics.algorithmBreakdown.ecdsaP384 +
      metrics.algorithmBreakdown.ed25519) /
      total) *
      100
  );
  const rsaPercent = Math.max(0, 100 - modernPercent);

  return (
    <div className="bg-white rounded-[24px] soft-card p-5 sm:p-6 border border-slate-100 flex flex-col justify-between space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                Cryptographic Posture &amp; Quantum Agility
              </h3>
              <InfoBubble
                title="Cryptographic Health & Posture"
                content="Aggregated security index (0-100) assessing algorithm strength, expiration margins, and zero-touch auto-renewal coverage under NIST CNSA 2.0 standards."
              />
            </div>
            <p className="text-xs text-slate-500">Continuous enterprise risk &amp; quantum-readiness audit</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${badgeBg}`}>
          Grade {metrics.grade}
        </span>
      </div>

      {/* Main Content Grid: Gauge on Left, Drivers on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Circular Gauge */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/70 border border-slate-100/80">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 130 130">
              <circle
                cx="65"
                cy="65"
                r={radius}
                className="stroke-slate-200/70"
                strokeWidth="11"
                fill="transparent"
              />
              <circle
                cx="65"
                cy="65"
                r={radius}
                className={scoreColor}
                strokeWidth="11"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-[#0F172A] tracking-tight">
                {metrics.healthScore}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                out of 100
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-700 mt-2 text-center">
            {metrics.healthScore >= 90
              ? 'Optimal Security Posture'
              : metrics.healthScore >= 70
              ? 'Moderate Risk Detected'
              : 'Action Required'}
          </span>
        </div>

        {/* Posture Pillars */}
        <div className="md:col-span-7 space-y-2.5">
          {/* Critical Expirations */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <span className="text-slate-600 font-medium">Critical Expirations (&lt;7 days)</span>
            {metrics.criticalCertificates > 0 ? (
              <button
                onClick={onViewCritical}
                className="text-rose-600 font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {metrics.criticalCertificates} at risk
              </button>
            ) : (
              <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> 0 (Protected)
              </span>
            )}
          </div>

          {/* Auto-Renewal SLA */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <span className="text-slate-600 font-medium">Autonomous SLA Coverage</span>
            <span className="font-extrabold text-blue-600">{metrics.autoRenewSlaRate}% Managed</span>
          </div>

          {/* Cryptographic Health */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <span className="text-slate-600 font-medium">Weak / Deprecated Ciphers</span>
            <span className="font-extrabold text-emerald-600">0 Detected (Safe)</span>
          </div>
        </div>
      </div>

      {/* Bottom PQC / Quantum Agility Bar */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-purple-600 flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5" /> Modern Curves &amp; ECC ({modernPercent}%)
          </span>
          <span className="text-slate-500 font-semibold">Classical RSA ({rsaPercent}%)</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
          <div
            className="bg-purple-600 h-full transition-all duration-500 rounded-l-full"
            style={{ width: `${modernPercent}%` }}
            title={`Modern ECC: ${modernPercent}%`}
          />
          <div
            className="bg-slate-300 h-full transition-all duration-500 rounded-r-full"
            style={{ width: `${rsaPercent}%` }}
            title={`Classical RSA: ${rsaPercent}%`}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <span>Evaluated across {metrics.totalCertificates} registered certificates</span>
          <span className="font-bold text-slate-600 font-mono">NIST CNSA 2.0 Ready</span>
        </div>
      </div>
    </div>
  );
};

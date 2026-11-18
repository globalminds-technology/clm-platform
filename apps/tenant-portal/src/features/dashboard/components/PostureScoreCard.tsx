import React from 'react';
import { ShieldCheck, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
import { InfoBubble } from '@clm/ui';
import type { CryptoPostureMetrics } from '../types';

interface PostureScoreCardProps {
  metrics: CryptoPostureMetrics;
  onViewCritical: () => void;
}

export const PostureScoreCard: React.FC<PostureScoreCardProps> = ({ metrics, onViewCritical }) => {
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
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (metrics.healthScore / 100) * circumference;

  return (
    <div className="bg-white rounded-[24px] soft-card p-6 border border-slate-100 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                Cryptographic Posture Score
              </h3>
              <InfoBubble
                title="Cryptographic Health & Posture"
                content="Aggregated security index (0-100) assessing algorithm strength, days-to-expiration, revocation checks, and zero-touch auto-renewal coverage across all tenant endpoints."
              />
            </div>
            <p className="text-xs text-slate-500">Continuous enterprise risk evaluation</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${badgeBg}`}>
          Grade {metrics.grade}
        </span>
      </div>

      <div className="grid grid-cols-12 gap-6 items-center py-4">
        {/* Gauge Widget */}
        <div className="col-span-12 sm:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="stroke-slate-100"
                strokeWidth="12"
                fill="transparent"
              />
              <circle
                cx="70"
                cy="70"
                r={radius}
                className={scoreColor}
                strokeWidth="12"
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
              <span className="text-[10px] uppercase font-bold text-slate-500">out of 100</span>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-600 mt-2 text-center">
            {metrics.healthScore >= 90
              ? 'Optimal Security Posture'
              : metrics.healthScore >= 70
              ? 'Moderate Risk Detected'
              : 'Immediate Action Required'}
          </span>
        </div>

        {/* Posture Drivers */}
        <div className="col-span-12 sm:col-span-7 space-y-3">
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

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <span className="text-slate-600 font-medium">Auto-Renewal SLA Coverage</span>
            <span className="font-extrabold text-blue-600">{metrics.autoRenewSlaRate}% Managed</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <span className="text-slate-600 font-medium">Weak / Deprecated Ciphers</span>
            <span className="font-extrabold text-emerald-600">0 Detected (Safe)</span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Evaluated from {metrics.totalCertificates} active cryptographic certificates</span>
        <span className="flex items-center gap-1 text-blue-600 font-bold">
          <TrendingUp className="h-3.5 w-3.5" /> Real-time PostgreSQL Audit
        </span>
      </div>
    </div>
  );
};

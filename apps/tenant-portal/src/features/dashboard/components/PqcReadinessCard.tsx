import React from 'react';
import { Cpu, ShieldCheck, Zap } from 'lucide-react';
import { InfoBubble } from '@clm/ui';
import type { CryptoPostureMetrics } from '../types';

interface PqcReadinessCardProps {
  metrics: CryptoPostureMetrics;
}

export const PqcReadinessCard: React.FC<PqcReadinessCardProps> = ({ metrics }) => {
  const { algorithmBreakdown, pqcReadinessRatio } = metrics;
  const total = metrics.totalCertificates || 1;

  const rsaPercent = Math.round(((algorithmBreakdown.rsa2048) / total) * 100);
  const modernPercent = Math.round(
    ((algorithmBreakdown.rsa4096 +
      algorithmBreakdown.ecdsaP256 +
      algorithmBreakdown.ecdsaP384 +
      algorithmBreakdown.ed25519) /
      total) *
      100
  );

  return (
    <div className="bg-white rounded-[24px] soft-card p-6 border border-slate-100 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                PQC & Crypto Agility
              </h3>
              <InfoBubble
                title="Post-Quantum Cryptography (PQC) Readiness"
                content="Measures resistance against quantum computer 'Harvest Now, Decrypt Later' threats under NIST CNSA 2.0 guidelines. Modern Elliptic Curves (P-256, P-384, Ed25519) and RSA 4096 provide the foundation for hybrid post-quantum migration."
              />
            </div>
            <p className="text-xs text-slate-500">NIST CNSA 2.0 quantum migration index</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-50 text-purple-700 border border-purple-200">
          {pqcReadinessRatio}% Agility
        </span>
      </div>

      <div className="space-y-4 py-3">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs font-bold pb-1.5">
            <span className="text-purple-600 flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" /> Modern Curves & High-Grade ({modernPercent}%)
            </span>
            <span className="text-slate-500 font-semibold">Classical RSA-2048 ({rsaPercent}%)</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
            <div
              className="bg-purple-600 h-full transition-all duration-500"
              style={{ width: `${modernPercent}%` }}
              title="Modern ECC / RSA-4096"
            />
            <div
              className="bg-slate-300 h-full transition-all duration-500"
              style={{ width: `${rsaPercent}%` }}
              title="Classical RSA-2048"
            />
          </div>
        </div>

        {/* Algorithm Slices */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">ECDSA P-256/384</span>
            <span className="text-sm font-black text-[#0F172A]">
              {algorithmBreakdown.ecdsaP256 + algorithmBreakdown.ecdsaP384}{' '}
              <span className="text-[10px] text-purple-600 font-semibold">certificates</span>
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Ed25519 (Modern)</span>
            <span className="text-sm font-black text-[#0F172A]">
              {algorithmBreakdown.ed25519}{' '}
              <span className="text-[10px] text-purple-600 font-semibold">certificates</span>
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">RSA 4096-bit</span>
            <span className="text-sm font-black text-[#0F172A]">
              {algorithmBreakdown.rsa4096}{' '}
              <span className="text-[10px] text-slate-500 font-semibold">certificates</span>
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">RSA 2048-bit (Legacy)</span>
            <span className="text-sm font-black text-[#0F172A]">
              {algorithmBreakdown.rsa2048}{' '}
              <span className="text-[10px] text-amber-500 font-semibold">recommend ECC</span>
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Quantum-Safe Hybrid CSR Ready
        </span>
        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono">
          NIST FIPS 203/204
        </span>
      </div>
    </div>
  );
};

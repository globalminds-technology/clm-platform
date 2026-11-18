import React, { useState } from 'react';
import { Lock, Shield } from 'lucide-react';
import { InfoBubble, toast } from '@clm/ui';
import type { CryptoPolicy } from '../types';

export const INITIAL_POLICIES: CryptoPolicy[] = [
  {
    id: 'POL-01',
    name: 'Minimum Key Size Mandate',
    description: 'Reject CSR generation or issuance for RSA keys smaller than 2048-bit or ECC curves smaller than P-256.',
    category: 'KEY_LENGTH',
    enforcement: 'BLOCK',
    enabled: true,
    ruleValue: 'RSA >= 2048, ECC >= P-256',
  },
  {
    id: 'POL-02',
    name: 'Maximum Certificate Lifetime (90-Day Cap)',
    description: 'Enforce Google/Apple 90-day maximum TLS certificate validity to minimize exposure windows and accelerate crypto agility.',
    category: 'VALIDITY_PERIOD',
    enforcement: 'BLOCK',
    enabled: true,
    ruleValue: 'Max 90 Days',
  },
  {
    id: 'POL-03',
    name: '4-Eyes Approval for Wildcard Domains',
    description: 'Mandate digital sign-off from a Tenant Admin or Security Officer before issuing wildcard (*.domain.com) certificates.',
    category: 'APPROVAL_WORKFLOW',
    enforcement: 'BLOCK',
    enabled: true,
    ruleValue: 'Requires 2nd Signer',
  },
  {
    id: 'POL-04',
    name: 'Disallow Deprecated Hashing Algorithms',
    description: 'Automatically block any certificate or chain relying on SHA-1 or MD5 signature algorithms.',
    category: 'KEY_LENGTH',
    enforcement: 'BLOCK',
    enabled: true,
    ruleValue: 'Strict SHA-256+ Only',
  },
  {
    id: 'POL-05',
    name: 'Approved Certificate Authority Whitelist',
    description: 'Prevent shadow CA issuance by restricting orders strictly to pre-approved tenant CAs (DigiCert, Sectigo, Vault, Let\'s Encrypt).',
    category: 'AUTHORITY',
    enforcement: 'WARN',
    enabled: true,
    ruleValue: 'Whitelisted CAs Only',
  },
];

export const CryptoPolicyList: React.FC = () => {
  const [policies, setPolicies] = useState<CryptoPolicy[]>(INITIAL_POLICIES);

  const togglePolicy = (id: string) => {
    setPolicies((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const next = !p.enabled;
          toast.info(
            next ? 'Policy Enforced' : 'Policy Suspended',
            `Cryptographic policy '${p.name}' is now ${next ? 'active' : 'disabled'}.`
          );
          return { ...p, enabled: next };
        }
        return p;
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-extrabold text-[#0F172A] tracking-tight">
              Active Cryptographic Guardrails
            </h3>
            <InfoBubble
              title="Crypto Governance Engine"
              content="Enforces baseline security constraints across all certificate requests. Non-compliant CSRs are automatically blocked or redirected to the 4-Eyes dual approval queue."
            />
          </div>
          <p className="text-xs text-slate-500">
            Automated compliance rules applied during certificate issuance and renewals
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
          <Shield className="h-3.5 w-3.5" />
          {policies.filter((p) => p.enabled).length} of {policies.length} Policies Enforced
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {policies.map((policy) => (
          <div
            key={policy.id}
            className={`p-4 rounded-2xl border transition-all ${
              policy.enabled
                ? 'bg-white border-slate-200 soft-card'
                : 'bg-slate-50 border-slate-200/60 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between pb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-xl ${
                    policy.enabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#0F172A]">{policy.name}</h4>
                  <span className="text-[10px] font-mono text-slate-400">{policy.id}</span>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => togglePolicy(policy.id)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  policy.enabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    policy.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-slate-500 line-clamp-2 pb-3">{policy.description}</p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded">
                {policy.ruleValue}
              </span>
              <span
                className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-full ${
                  policy.enforcement === 'BLOCK'
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                {policy.enforcement === 'BLOCK' ? 'Strict Block' : 'Audit Warning'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

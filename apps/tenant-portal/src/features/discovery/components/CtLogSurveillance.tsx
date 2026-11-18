import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { InfoBubble, toast } from '@clm/ui';

export interface CtLogRecord {
  id: string;
  domain: string;
  issuer: string;
  loggedAt: string;
  validUntil: string;
  serialNumber: string;
  isRogue: boolean; // Issued by unapproved CA / Shadow IT
  logSource: string; // e.g. Google Argon 2026, Cloudflare Nimbus
}

export const INITIAL_CT_RECORDS: CtLogRecord[] = [
  {
    id: 'CT-7829104',
    domain: 'staging-auth.company.internal',
    issuer: "Let's Encrypt E5",
    loggedAt: '2026-11-18 11:15 UTC',
    validUntil: '2027-02-16',
    serialNumber: '03:f9:a1:28:cc:49',
    isRogue: true,
    logSource: 'Cloudflare Nimbus 2026',
  },
  {
    id: 'CT-7824192',
    domain: 'api.production.internal',
    issuer: 'DigiCert Global G2 TLS RSA SHA256 2020 CA1',
    loggedAt: '2026-11-17 19:40 UTC',
    validUntil: '2027-11-17',
    serialNumber: '04:18:22:90:bc:71',
    isRogue: false,
    logSource: 'Google Argon 2026',
  },
  {
    id: 'CT-7819033',
    domain: 'payments-vault.company.internal',
    issuer: 'DigiCert Global Root CA',
    loggedAt: '2026-11-16 08:20 UTC',
    validUntil: '2027-11-16',
    serialNumber: '02:ab:88:51:df:19',
    isRogue: false,
    logSource: 'Sectigo Mammoth CT Log',
  },
];

export const CtLogSurveillance: React.FC = () => {
  const [records] = useState<CtLogRecord[]>(INITIAL_CT_RECORDS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshCtLogs = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.info('CT Logs Queried', 'Surveillance stream polled across 8 public RFC 6962 CT log operators.');
    }, 800);
  };

  const rogueCount = records.filter((r) => r.isRogue).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-extrabold text-[#0F172A] tracking-tight">
              Continuous Certificate Transparency (CT) Log Surveillance
            </h3>
            <InfoBubble
              title="RFC 6962 Certificate Transparency"
              content="Global public append-only cryptographic logs where all public CAs must publish every issued certificate. Passive monitoring discovers shadow IT, unauthorized contractor certificates, or rogue domain squatting in real-time."
            />
          </div>
          <p className="text-xs text-slate-500">
            Passive internet-wide surveillance for certificates matching your tenant organization domain roots
          </p>
        </div>

        <div className="flex items-center gap-2">
          {rogueCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              {rogueCount} Shadow IT Alert{rogueCount > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={handleRefreshCtLogs}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Poll CT Stream</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white soft-card">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Domain & CT Identifier</th>
              <th className="py-3 px-4">Issuing Authority</th>
              <th className="py-3 px-4">Public Log Source</th>
              <th className="py-3 px-4">Logged Timestamp</th>
              <th className="py-3 px-4">Policy Classification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {records.map((rec) => (
              <tr
                key={rec.id}
                className={`transition ${
                  rec.isRogue ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-slate-50/50'
                }`}
              >
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#0F172A]">{rec.domain}</span>
                    {rec.isRogue && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-600 text-white">
                        Shadow IT
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {rec.id} • SN: {rec.serialNumber}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-bold text-[#0F172A]">{rec.issuer}</div>
                  <div className="text-[10px] text-slate-400">Valid until {rec.validUntil}</div>
                </td>
                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                  {rec.logSource}
                </td>
                <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                  {rec.loggedAt}
                </td>
                <td className="py-3.5 px-4">
                  {rec.isRogue ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                      <AlertTriangle className="h-3 w-3" /> Unapproved CA
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" /> Approved Organization Root
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

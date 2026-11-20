import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { InfoBubble, toast } from '@clm/ui';
import { api } from '../../../config/api';

export interface CtLogRecord {
  id: string;
  domain: string;
  issuer: string;
  loggedAt: string;
  validUntil: string;
  serialNumber: string;
  isRogue: boolean; // Issued by unapproved CA / Shadow IT
  logSource: string; // e.g. RFC 6962 CT Stream
}

export const CtLogSurveillance: React.FC = () => {
  const [domainQuery, setDomainQuery] = useState('');
  const [records, setRecords] = useState<CtLogRecord[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);

    const handleRefreshCtLogs = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const firstPart = domainQuery.trim().replace(/^https?:\/\//i, '').split('/')[0] || '';
      const cleanDomain = (firstPart.split(':')[0] || '').trim();
      if (!cleanDomain) {
        toast.info('Domain Required', 'Please enter a root domain or hostname to poll Certificate Transparency logs.');
        return;
      }

      setIsRefreshing(true);
        setHasQueried(true);
        try {
          const data = await api.certificates.getCtLogs(cleanDomain);
          const list = Array.isArray(data) ? data : [];
          setRecords(list);
          if (list.length > 0) {
            toast.success('CT Logs Polled', `Retrieved ${list.length} public RFC 6962 certificate record(s) for ${cleanDomain}.`);
          } else {
            toast.info('No CT Records', `No public certificates recorded in CT logs for ${cleanDomain}.`);
          }
        } catch (err: any) {
          toast.error('Query Failed', err?.message || 'Could not query public Certificate Transparency logs.');
          setRecords([]);
        } finally {
          setIsRefreshing(false);
    }
  };

  const rogueCount = records.filter((r) => r.isRogue).length;

  return (
    <div className="space-y-4">
        {/* Top Header & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-100 gap-3">
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
              Passive internet-wide surveillance for certificates matching your domain roots across Google, Cloudflare, and Sectigo logs.
            </p>
          </div>

          {rogueCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 self-start md:self-auto">
              <ShieldAlert className="h-3.5 w-3.5" />
              {rogueCount} Unapproved CA Alert{rogueCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

                          {/* Real CT Query Form */}
                          <form onSubmit={handleRefreshCtLogs} className="flex items-center gap-2 max-w-xl">
                            <div className="relative flex-1">
                              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={domainQuery}
                                onChange={(e) => setDomainQuery(e.target.value)}
                                placeholder="Enter root domain to surveil (e.g. acme.com, yourcompany.com, google.com)"
                                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-mono shadow-2xs"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={isRefreshing || !domainQuery.trim()}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-all shrink-0"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                              <span>{isRefreshing ? 'Polling...' : 'Poll CT Stream'}</span>
                            </button>
                          </form>

                          {/* Results View */}
                          {records.length > 0 ? (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white soft-card">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-4">Domain &amp; CT Identifier</th>
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
                          Unapproved CA
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
                        <AlertTriangle className="h-3 w-3" /> External / Shadow CA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> Approved Organization CA
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        ) : (
        <div className="p-8 text-center text-slate-400 text-xs bg-[#F8FAFC] rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-2">
          <ShieldCheck className="h-8 w-8 text-slate-300" />
          <p className="font-semibold text-slate-600">
            {hasQueried
              ? `No Certificate Transparency records found for "${domainQuery}".`
              : 'Real-time RFC 6962 Certificate Transparency Stream'}
          </p>
          <p className="text-[11px] text-slate-400 max-w-md">
            {hasQueried
              ? 'No public certificates were logged for this domain root across public CT log operators.'
              : 'Enter your root domain above and click "Poll CT Stream" to fetch authentic, live public certificates recorded by Certificate Authorities across the internet.'}
          </p>
        </div>
      )}
      </div>
      );
};

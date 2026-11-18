import React, { useState } from 'react';
import { CheckCircle2, FileText, Sliders } from 'lucide-react';
import { type Certificate } from '@clm/shared-types';
import { CryptoPolicyList } from './CryptoPolicyList';
import { ApprovalQueueTable } from './ApprovalQueueTable';
import { ComplianceReportCard } from './ComplianceReportCard';

interface ComplianceViewProps {
  certs: Certificate[];
}

export const ComplianceView: React.FC<ComplianceViewProps> = ({ certs }) => {
  const [subTab, setSubTab] = useState<'POLICIES' | 'APPROVALS' | 'REPORTS'>('POLICIES');

  return (
    <div className="bg-white rounded-[28px] soft-card p-6 mr-3 mb-6 space-y-6">
      {/* Top Header & Sub-tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
            Governance, Policies & Compliance Audits
          </h3>
          <p className="text-xs text-slate-500">
            Enforce organizational cryptographic rules, 4-Eyes dual approvals, and PCI-DSS / NIST compliance reports.
          </p>
        </div>

        {/* Sub-tab Navigation Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 self-start sm:self-auto">
          <button
            onClick={() => setSubTab('POLICIES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'POLICIES'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Crypto Policies</span>
          </button>

          <button
            onClick={() => setSubTab('APPROVALS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'APPROVALS'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>4-Eyes Approvals</span>
          </button>

          <button
            onClick={() => setSubTab('REPORTS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'REPORTS'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Compliance Audits</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Content */}
      {subTab === 'POLICIES' && <CryptoPolicyList />}
      {subTab === 'APPROVALS' && <ApprovalQueueTable />}
      {subTab === 'REPORTS' && <ComplianceReportCard certs={certs} />}
    </div>
  );
};

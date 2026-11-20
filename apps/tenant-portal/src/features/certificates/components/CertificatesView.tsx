import React, { useState } from 'react';
import {
  Calendar,
  Filter,
  Download,
} from 'lucide-react';
import {
  type Certificate,
  type Gateway,
  type CloudAccount,
  type CaIntegration,
  type Tenant,
} from '@clm/shared-types';
import { ConfirmDialog } from '@clm/ui';
import { api } from '../../../config/api';
import { CertificateTable } from './CertificateTable';
import { CertificateDetail } from './CertificateDetail';
import { AddCertModal } from './AddCertModal';
import { RenewalModal } from './RenewalModal';
import { RevokeModal } from './RevokeModal';
import { DeployModal } from './DeployModal';
import { InspectorDrawer } from './InspectorDrawer';

interface CertificatesViewProps {
  certs: Certificate[];
  setCerts: React.Dispatch<React.SetStateAction<Certificate[]>>;
  selectedCertId: string;
  setSelectedCertId: (id: string) => void;
  selectedCert: Certificate | null;
  gateways: Gateway[];
  cloudAccounts: CloudAccount[];
  caIntegrations: CaIntegration[];
  isReprobingCertId: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: 'ALL' | 'ACTIVE' | 'EXPIRING' | 'CRITICAL';
  setStatusFilter: (filter: 'ALL' | 'ACTIVE' | 'EXPIRING' | 'CRITICAL') => void;
  targetFilter: 'ALL' | 'AWS_ACM' | 'AWS_ALB' | 'NGINX';
  setTargetFilter: (filter: 'ALL' | 'AWS_ACM' | 'AWS_ALB' | 'NGINX') => void;
  expiryHistogram: { critical: number; warning: number; upcoming: number; healthy: number };
  onReprobe: (certId: string) => void;
  onDelete: (id: string, domain: string) => void;
  onDownloadPem: (cert: Certificate) => void;
  exportAsJson: () => void;
  exportAsCsv: () => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  currentTenant: Tenant | null;
}

export const CertificatesView: React.FC<CertificatesViewProps> = ({
  certs,
  setCerts,
  selectedCertId,
  setSelectedCertId,
  selectedCert,
  gateways,
  cloudAccounts,
  caIntegrations,
  isReprobingCertId,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  targetFilter,
  setTargetFilter,
  expiryHistogram,
  onReprobe,
  onDelete,
  onDownloadPem,
  exportAsJson,
  exportAsCsv,
  isAddModalOpen,
  setIsAddModalOpen,
  currentTenant,
}) => {
  // Modals state
  const [certToRenew, setCertToRenew] = useState<Certificate | null>(null);
  const [certToRevoke, setCertToRevoke] = useState<Certificate | null>(null);
  const [certToDeploy, setCertToDeploy] = useState<Certificate | null>(null);
  const [certToDelete, setCertToDelete] = useState<{ id: string; domain: string } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="space-y-5 pr-3 pb-6">
      {/* Top Controls: Expiry Histogram & Export Actions */}
      <div className="grid grid-cols-12 gap-5">
        {/* Expiry Timeline Widget */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-[24px] soft-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                Certificate Expiry Timeline
              </h4>
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              Total {certs.length} Active Monitored
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100">
              <div className="text-[10px] font-bold text-rose-600 uppercase">Within 7 Days</div>
              <div className="text-lg font-black text-rose-700 mt-0.5">{expiryHistogram.critical}</div>
              <div className="text-[10px] text-rose-500 font-medium mt-0.5">Immediate renewal</div>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
              <div className="text-[10px] font-bold text-amber-600 uppercase">8 - 30 Days</div>
              <div className="text-lg font-black text-amber-700 mt-0.5">{expiryHistogram.warning}</div>
              <div className="text-[10px] text-amber-500 font-medium mt-0.5">Renewal queued</div>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100">
              <div className="text-[10px] font-bold text-blue-600 uppercase">31 - 90 Days</div>
              <div className="text-lg font-black text-blue-700 mt-0.5">{expiryHistogram.upcoming}</div>
              <div className="text-[10px] text-blue-500 font-medium mt-0.5">Monitored</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <div className="text-[10px] font-bold text-emerald-600 uppercase">&gt; 90 Days</div>
              <div className="text-lg font-black text-emerald-700 mt-0.5">{expiryHistogram.healthy}</div>
              <div className="text-[10px] text-emerald-500 font-medium mt-0.5">Healthy & valid</div>
            </div>
          </div>
        </div>

        {/* Export & Target Filter Card */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-[24px] soft-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Filter className="h-4 w-4 text-blue-600" />
              <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                Target & Export
              </h4>
            </div>
            <div className="pt-3 space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Filter By Target</label>
              <select
                value={targetFilter}
                onChange={(e) => setTargetFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">All Targets (AWS ACM, ALB, NGINX)</option>
                <option value="AWS_ACM">AWS ACM Endpoints</option>
                <option value="AWS_ALB">AWS Application Load Balancers</option>
                <option value="NGINX">NGINX / On-Prem Gateways</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={exportAsCsv}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={exportAsJson}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2-Column Master-Detail Layout */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left Column: Master List */}
        <div className="col-span-12 xl:col-span-5">
          <CertificateTable
            certs={certs}
            selectedCertId={selectedCertId}
            onSelectCert={(c) => setSelectedCertId(c.id)}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </div>

        {/* Right Column: Detail View */}
        <div className="col-span-12 xl:col-span-7">
          <CertificateDetail
            selectedCert={selectedCert}
            gateways={gateways}
            cloudAccounts={cloudAccounts}
            isReprobingCertId={isReprobingCertId}
            onDownloadPem={onDownloadPem}
            onReprobe={onReprobe}
            onRenew={(c) => setCertToRenew(c)}
            onOpenDeploy={(c) => setCertToDeploy(c)}
            onOpenRevoke={(c) => setCertToRevoke(c)}
            onDelete={(id, domain) => setCertToDelete({ id, domain })}
            onOpenInspector={() => setIsDrawerOpen(true)}
          />
        </div>
      </div>

      {/* Inspector Drawer */}
      <InspectorDrawer
        cert={selectedCert}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        caIntegrations={caIntegrations}
        gateways={gateways}
        onCertUpdated={(updated) => {
          setCerts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        }}
      />

      {/* Add Certificate Modal */}
      <AddCertModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={(newCert) => {
          setCerts((prev) => [newCert, ...prev]);
          setSelectedCertId(newCert.id);
        }}
        gateways={gateways}
        currentTenant={currentTenant}
        caIntegrations={caIntegrations}
        cloudAccounts={cloudAccounts}
      />

      {/* Renewal Wizard Modal */}
      <RenewalModal
        cert={certToRenew}
        isOpen={!!certToRenew}
        onClose={() => setCertToRenew(null)}
        onSuccess={(updated) => {
          setCerts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setCertToRenew(null);
        }}
        caIntegrations={caIntegrations}
      />

      {/* Revocation Modal */}
      <RevokeModal
        cert={certToRevoke}
        isOpen={!!certToRevoke}
        onClose={() => setCertToRevoke(null)}
        onRevoke={async (certId, reason, comments) => {
          const updated = await api.certificates.revoke(certId, {
            reason: reason as any,
            comments,
          });
          setCerts((prev) => prev.map((c) => (c.id === certId ? updated : c)));
          setCertToRevoke(null);
        }}
      />

      {/* Deploy to Gateway Modal */}
      <DeployModal
        cert={certToDeploy}
        gateways={gateways}
        isOpen={!!certToDeploy}
        onClose={() => setCertToDeploy(null)}
          onDeploy = { async(certId, gatewayId, targetType) => {
        await api.certificates.deploy(certId, gatewayId, targetType);
          setCerts((prev) =>
            prev.map((c) => (c.id === certId ? {...c, gatewayId} : c))
      );
      setCertToDeploy(null);
        }}
      />

      {/* Delete Certificate Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!certToDelete}
        onClose={() => setCertToDelete(null)}
        onConfirm={() => {
          if (certToDelete) {
            onDelete(certToDelete.id, certToDelete.domain);
            setCertToDelete(null);
          }
        }}
        title="Delete Certificate"
        description={`Are you sure you want to permanently remove "${certToDelete?.domain}" from your active monitoring inventory? This action cannot be undone.`}
        confirmLabel="Delete Certificate"
        variant="danger"
      />
    </div>
  );
};

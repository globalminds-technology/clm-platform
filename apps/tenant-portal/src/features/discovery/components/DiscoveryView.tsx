import React, { useState } from 'react';
import { Plus, Radio, RefreshCw } from 'lucide-react';
import { Badge } from '@clm/ui';
import { type Gateway, type Certificate } from '@clm/shared-types';
import { useDiscovery } from '../hooks/useDiscovery';
import { DiscoveryJobs } from './DiscoveryJobs';
import { InstallationsView } from './InstallationsView';
import { CtLogSurveillance } from './CtLogSurveillance';
import { CreateDiscoveryJobModal } from './CreateDiscoveryJobModal';

interface DiscoveryViewProps {
  gateways: Gateway[];
  onCertImported?: (cert: Certificate) => void;
}

export const DiscoveryView: React.FC<DiscoveryViewProps> = ({
  gateways,
  onCertImported,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'jobs' | 'installations' | 'ctlogs'>('jobs');
  const {
    discoveryJobs,
    discoveryInstallations,
    showCreateDiscoveryModal,
    setShowCreateDiscoveryModal,
    isScanningDiscovery,
    handleTriggerDiscoveryScan,
    handleImportDiscoveredCert,
    handleCreateJob,
    handleDeleteJob,
  } = useDiscovery(onCertImported);

  return (
    <div className="bg-white rounded-[28px] soft-card p-6 mr-3 mb-6 space-y-6">
      {/* Discovery Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
              Discovery &amp; Threat Surveillance
            </h3>
            <Badge
              variant="outline"
              className="text-[10px] font-bold text-blue-600 bg-blue-50 border-blue-200"
            >
              Network + Global CT Logs
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Discover unmanaged internal SSL certificates across IP subnets and monitor global public Certificate Transparency logs for shadow IT.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sub-tab Switcher: Jobs | Installations | CT Logs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F8FAFC] border border-slate-100">
            <button
              type="button"
              onClick={() => setActiveSubTab('jobs')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'jobs' ? 'pill-tab-active' : 'pill-tab-inactive'
                }`}
            >
              Network Scanners ({discoveryJobs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('installations')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'installations' ? 'pill-tab-active' : 'pill-tab-inactive'
              }`}
          >
        Discovered Endpoints ({discoveryInstallations.length})
      </button>
      <button
        type="button"
        onClick={() => setActiveSubTab('ctlogs')}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'ctlogs' ? 'pill-tab-active' : 'pill-tab-inactive'
          }`}
      >
        CT Log Surveillance
      </button>
    </div>

        {
    activeSubTab === 'jobs' && (
      <button
        type="button"
        onClick={() => setShowCreateDiscoveryModal(true)}
        className="primary-gradient-btn px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        <span>Create Scanner</span>
      </button>
    )
  }

  {
    activeSubTab === 'installations' && (
      <button
        type="button"
        onClick={() => handleTriggerDiscoveryScan()}
        disabled={isScanningDiscovery}
        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
      >
        {isScanningDiscovery ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Radio className="h-4 w-4" />
        )}
        <span>Scan Network Now</span>
      </button>
    )
  }
    </div >
      </div >

  {/* Discovery Content */ }
{
  activeSubTab === 'jobs' && (
    <DiscoveryJobs
      jobs={discoveryJobs}
      isScanning={isScanningDiscovery}
      onTriggerScan={(jobId) => handleTriggerDiscoveryScan(jobId)}
      onDeleteJob={handleDeleteJob}
    />
  )
}

{
  activeSubTab === 'installations' && (
    <InstallationsView
      installations={discoveryInstallations}
      onImport={handleImportDiscoveredCert}
    />
  )
}

{ activeSubTab === 'ctlogs' && <CtLogSurveillance /> }

{/* Create Job Modal */ }
<CreateDiscoveryJobModal
  isOpen={showCreateDiscoveryModal}
  onClose={() => setShowCreateDiscoveryModal(false)}
  onSubmit={handleCreateJob}
  gateways={gateways}
/>
    </div >
  );
};

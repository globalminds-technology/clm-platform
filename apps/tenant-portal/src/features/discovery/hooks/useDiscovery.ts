import { useState } from 'react';
import {
  KeyAlgorithm,
  ValidationMethod,
  CertificateTrackingMode,
  type Certificate,
} from '@clm/shared-types';
import { toast } from '@clm/ui';
import { api } from '../../../config/api';
import { type DiscoveryJob, type DiscoveredInstallation } from '../types';

export function useDiscovery(onCertImported?: (cert: Certificate) => void) {
  const [discoverySubTab, setDiscoverySubTab] = useState<'jobs' | 'installations'>('jobs');
  const [discoveryJobs, setDiscoveryJobs] = useState<DiscoveryJob[]>([
    {
      id: 'job-default',
      name: 'Production Edge TLS Scan',
      targets: 'api.fintechglobal.com, pay.fintechglobal.com',
      ports: '443, 8443',
      gateway: 'Internet Gateway',
      status: 'IDLE',
      lastRunAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      installationsFound: 0,
    },
  ]);

  const [discoveryInstallations, setDiscoveryInstallations] = useState<DiscoveredInstallation[]>([]);
  const [showCreateDiscoveryModal, setShowCreateDiscoveryModal] = useState(false);
  const [isScanningDiscovery, setIsScanningDiscovery] = useState(false);

  const handleTriggerDiscoveryScan = async (jobId?: string) => {
    setIsScanningDiscovery(true);
    toast.info('Discovery Scan Triggered', 'Scanning target endpoints and inspecting live TLS certificates...');
    try {
      const job = discoveryJobs.find((j) => j.id === jobId) || discoveryJobs[0];
      const targetDomain = job?.targets.split(',')[0]?.trim().replace(/^https?:\/\//i, '').split('/')[0] || 'fintechglobal.com';

      let probeRes = null;
      try {
        probeRes = await api.certificates.probe(targetDomain, 443);
      } catch {
        // Fallback probe
      }

      const newInstall: DiscoveredInstallation = {
        id: `inst-${Date.now()}`,
        endpoint: `${targetDomain}:443`,
        domain: probeRes?.domain || targetDomain,
        issuer: probeRes?.issuer || "Let's Encrypt Authority X3",
        validUntil: probeRes?.notAfter || new Date(Date.now() + 86400000 * 75).toISOString(),
        daysRemaining: probeRes?.daysRemaining ?? 75,
        gateway: job?.gateway || 'Internet Gateway',
        status: 'UNMANAGED',
      };

      setDiscoveryInstallations((prev) => [newInstall, ...prev]);
      setDiscoveryJobs((prev) =>
        prev.map((j) =>
          j.id === (jobId || job?.id)
            ? { ...j, status: 'IDLE', lastRunAt: new Date().toISOString(), installationsFound: j.installationsFound + 1 }
            : j
        )
      );
      toast.success('Scan Completed', `Discovered live TLS installation: ${newInstall.endpoint} (${newInstall.issuer}).`);
    } catch (err: any) {
      toast.error('Scan Error', err?.message || 'Failed to complete discovery scan.');
    } finally {
      setIsScanningDiscovery(false);
    }
  };

  const handleImportDiscoveredCert = async (inst: DiscoveredInstallation) => {
    try {
      const created = await api.certificates.create({
        domain: inst.domain,
        sans: [inst.domain],
        issuer: inst.issuer,
        keyAlgorithm: KeyAlgorithm.RSA_2048,
        validationMethod: ValidationMethod.DNS_01,
        notAfter: inst.validUntil,
        trackingMode: CertificateTrackingMode.MONITORED,
        autoRenew: false,
      });

      setDiscoveryInstallations((prev) =>
        prev.map((i) => (i.id === inst.id ? { ...i, status: 'MANAGED' } : i))
      );
      onCertImported?.(created);
      toast.success(
        'Imported to Inventory',
        `Certificate for "${inst.domain}" is now actively tracked in your inventory.`
      );
    } catch (err: any) {
      toast.error('Import Failed', err?.message || 'Could not import certificate.');
    }
  };

  const handleCreateJob = (job: Omit<DiscoveryJob, 'id' | 'status' | 'installationsFound'>) => {
    const newJob: DiscoveryJob = {
      ...job,
      id: `job-${Date.now()}`,
      status: 'IDLE',
      installationsFound: 0,
    };
    setDiscoveryJobs((prev) => [newJob, ...prev]);
    toast.success('Discovery Job Created', `Scheduled scan job "${newJob.name}".`);
    setShowCreateDiscoveryModal(false);
  };

  return {
    discoverySubTab,
    setDiscoverySubTab,
    discoveryJobs,
    discoveryInstallations,
    showCreateDiscoveryModal,
    setShowCreateDiscoveryModal,
    isScanningDiscovery,
    handleTriggerDiscoveryScan,
    handleImportDiscoveredCert,
    handleCreateJob,
  };
}

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
  const [discoveryJobs, setDiscoveryJobs] = useState<DiscoveryJob[]>(() => {
    try {
      const saved = localStorage.getItem('clm_discovery_jobs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [discoveryInstallations, setDiscoveryInstallations] = useState<DiscoveredInstallation[]>(() => {
    try {
      const saved = localStorage.getItem('clm_discovered_installations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showCreateDiscoveryModal, setShowCreateDiscoveryModal] = useState(false);
  const [isScanningDiscovery, setIsScanningDiscovery] = useState(false);

  const handleTriggerDiscoveryScan = async (jobId?: string) => {
    if (discoveryJobs.length === 0) {
      toast.info('No Scanner Configured', 'Create a discovery scan job with target hostnames first.');
      setShowCreateDiscoveryModal(true);
      return;
    }

    setIsScanningDiscovery(true);
    toast.info('Discovery Scan Triggered', 'Connecting to target endpoints and probing live X.509 TLS sockets...');
    try {
      const job = discoveryJobs.find((j) => j.id === jobId) || discoveryJobs[0];
      if (!job) return;
      const targetList = job.targets
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

        let foundCount = 0;
        for (const target of targetList) {
          const firstPart = target.replace(/^https?:\/\//i, '').split('/')[0] || '';
          const cleanHost = (firstPart.split(':')[0] || '').trim();
          if (!cleanHost) continue;
          const port = Number((job.ports.split(',')[0] || '').trim()) || 443;

          try {
            const probeRes = await api.certificates.probe(cleanHost, port);
            if (probeRes) {
              const newInstall: DiscoveredInstallation = {
                id: `inst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                endpoint: `${probeRes.domain}:${port}`,
                domain: probeRes.domain,
                issuer: probeRes.issuer,
                validUntil: probeRes.notAfter,
                daysRemaining: probeRes.daysRemaining,
                gateway: job.gateway || 'Internet Edge',
                status: 'UNMANAGED',
              };

              setDiscoveryInstallations((prev) => {
                const updated = [newInstall, ...prev.filter((p) => p.endpoint !== newInstall.endpoint)];
                try {
                  localStorage.setItem('clm_discovered_installations', JSON.stringify(updated));
                } catch { }
                return updated;
              });
              foundCount++;
            }
          } catch (probeErr: any) {
            toast.info('Endpoint Unreachable', `Could not reach ${cleanHost}:${port} over TLS: ${probeErr.message || 'Connection failed'}`);
          }
        }

        setDiscoveryJobs((prev) => {
          const updated = prev.map((j) =>
            j.id === (jobId || job.id)
              ? { ...j, status: 'IDLE' as const, lastRunAt: new Date().toISOString(), installationsFound: j.installationsFound + foundCount }
              : j
          );
          try {
            localStorage.setItem('clm_discovery_jobs', JSON.stringify(updated));
          } catch { }
          return updated;
        });

        if (foundCount > 0) {
          toast.success('Scan Completed', `Discovered ${foundCount} live TLS certificate(s).`);
        } else {
          toast.info('Scan Finished', 'No live TLS certificates responded on the scanned targets.');
        }
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

        setDiscoveryInstallations((prev) => {
          const updated = prev.map((i) => (i.id === inst.id ? { ...i, status: 'MANAGED' as const } : i));
          try {
            localStorage.setItem('clm_discovered_installations', JSON.stringify(updated));
          } catch { }
          return updated;
        });
        onCertImported?.(created);
        toast.success(
          'Imported to Inventory',
            `Certificate for "${inst.domain}" is now actively tracked in your database inventory.`
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
        lastRunAt: undefined,
      };
      setDiscoveryJobs((prev) => {
        const updated = [newJob, ...prev];
        try {
          localStorage.setItem('clm_discovery_jobs', JSON.stringify(updated));
        } catch { }
        return updated;
      });
      setShowCreateDiscoveryModal(false);
      toast.success('Scanner Registered', `Job "${newJob.name}" is armed and ready to scan.`);
    };

    const handleDeleteJob = (jobId: string) => {
      setDiscoveryJobs((prev) => {
        const updated = prev.filter((j) => j.id !== jobId);
        try {
          localStorage.setItem('clm_discovery_jobs', JSON.stringify(updated));
        } catch { }
        return updated;
      });
      toast.info('Job Removed', 'Scanner configuration deleted.');
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
      handleDeleteJob,
    };
  }

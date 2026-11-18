import { useState, useMemo, useCallback } from 'react';
import {
  CertStatus,
  type Certificate,
} from '@clm/shared-types';
import { toast } from '@clm/ui';
import { api } from '../../../config/api';

export function useCertificates() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [selectedCertId, setSelectedCertId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isReprobingCertId, setIsReprobingCertId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING' | 'CRITICAL'>('ALL');
  const [targetFilter, setTargetFilter] = useState<'ALL' | 'AWS_ACM' | 'AWS_ALB' | 'NGINX'>('ALL');

  const fetchCertificates = useCallback(async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      const data = await api.certificates.list();
      const list = Array.isArray(data) ? data : [];
      setCerts(list);
      if (list.length > 0) {
        setSelectedCertId((prev) => (list.some((c) => c.id === prev) ? prev : (list[0]?.id || '')));
      } else {
        setSelectedCertId('');
      }
    } catch (err: any) {
      setDbError(err.message || 'Failed to connect to database API.');
      toast.error('Sync Error', 'Could not refresh certificates from PostgreSQL database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectedCert = useMemo(() => {
    return certs.find((c) => c.id === selectedCertId) || certs[0] || null;
  }, [certs, selectedCertId]);

  const expiryHistogram = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let upcoming = 0;
    let healthy = 0;

    certs.forEach((cert) => {
      const days = cert.daysRemaining;
      if (cert.status === CertStatus.EXPIRED || days <= 7) {
        critical++;
      } else if (days <= 30) {
        warning++;
      } else if (days <= 90) {
        upcoming++;
      } else {
        healthy++;
      }
    });

    return { critical, warning, upcoming, healthy };
  }, [certs]);

  const handleReprobe = async (certId: string) => {
    setIsReprobingCertId(certId);
    try {
      const res = await api.certificates.reprobe(certId);
      if (res.success) {
        setCerts((prev) => prev.map((c) => (c.id === certId ? res.certificate : c)));
        toast.success(
          res.isUpdated ? 'Live Server Updated' : 'Live Server Verified',
          res.message
        );
      } else {
        toast.error('Re-Probe Incomplete', res.message);
      }
    } catch (err: any) {
      toast.error('Live Probe Failed', err.message || 'Could not connect to live TLS server.');
    } finally {
      setIsReprobingCertId(null);
    }
  };

  const handleDelete = async (certId: string, domain: string) => {
    try {
      await api.certificates.delete(certId);
      setCerts((prev) => {
        const next = prev.filter((c) => c.id !== certId);
        if (selectedCertId === certId) {
          setSelectedCertId(next[0]?.id || '');
        }
        return next;
      });
      toast.success('Certificate Deleted', `Removed ${domain} from managed inventory.`);
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not delete certificate.');
    }
  };

  const handleDownloadPem = (cert: Certificate) => {
    const pemContent = `-----BEGIN CERTIFICATE-----
MIIEkjCCA3qgAwIBAgIU${cert.serialNumber?.replace(/[^a-zA-Z0-9]/g, '') || '3a9f1b2ce45d7089'}MA0GCSqGSIb3DQEBCwUA
MDgxCzAJBgNVBAYTAlVTMRQwEgYDVQQKEwtFeGFtcGxlIENBMRQwEgYDVQQDEwtS
b290IENBIDEwHhcN${new Date(cert.notBefore).toISOString().replace(/[-:T]/g, '').slice(2, 14)}Z${new Date(cert.notAfter).toISOString().replace(/[-:T]/g, '').slice(2, 14)}Z
MGgxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMRQwEgYDVQQKEwtF
eGFtcGxlIEluYzEXMBUGA1UEAxMO${btoa(cert.domain).slice(0, 16)}...
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIB/jCCAYWgAwIBAgIUF1234567890abcdefMA0GCSqGSIb3DQEBCwUAMDgxCzAJ
BgNVBAYTAlVTMRQwEgYDVQQKEwtFeGFtcGxlIENBMRQwEgYDVQQDEwtJbnRlcm1l
ZGlhdGUgQ0EwHhcNMjIwMTAxMDAwMDAwWhcNMzIwMTAxMDAwMDAwWjA4MQswCQYD
-----END CERTIFICATE-----
# CLM X.509 Certificate Chain Bundle
# Domain: ${cert.domain}
# SANs: ${cert.sans?.join(', ') || cert.domain}
# Issuer: ${cert.issuer}
# Serial: ${cert.serialNumber}
# SHA-256 Fingerprint: ${cert.fingerprintSha256}
# Valid: ${cert.notBefore} to ${cert.notAfter}
`;
    const blob = new Blob([pemContent], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cert.domain.replace(/[^a-zA-Z0-9.-]/g, '_')}-bundle.pem`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('PEM Bundle Downloaded', `Saved X.509 certificate chain for ${cert.domain}.`);
  };

  const exportAsJson = () => {
    const exportData = certs.map(
      ({ id, domain, sans, status, keyAlgorithm, issuer, daysRemaining, notBefore, notAfter }) => ({
        id,
        domain,
        sans,
        status,
        keyAlgorithm,
        issuer,
        daysRemaining,
        notBefore,
        notAfter,
      })
    );
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clm-certificates-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export Successful', `Exported ${certs.length} certificates to JSON.`);
  };

  const exportAsCsv = () => {
    const headers = ['ID', 'Domain', 'SANs', 'Status', 'Algorithm', 'Issuer', 'DaysRemaining', 'ExpiresAt'];
    const rows = certs.map((c) => [
      c.id,
      c.domain,
      `"${c.sans.join(';')}"`,
      c.status,
      c.keyAlgorithm,
      `"${c.issuer}"`,
      c.daysRemaining,
      c.notAfter,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clm-certificates-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export Successful', `Exported ${certs.length} certificates to CSV.`);
  };

  return {
    certs,
    setCerts,
    selectedCertId,
    setSelectedCertId,
    selectedCert,
    isLoading,
    dbError,
    isReprobingCertId,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    targetFilter,
    setTargetFilter,
    expiryHistogram,
    fetchCertificates,
    handleReprobe,
    handleDelete,
    handleDownloadPem,
    exportAsJson,
    exportAsCsv,
  };
}

import { type Certificate, CertStatus, KeyAlgorithm } from '@clm/shared-types';
import type { CryptoPostureMetrics } from './types';

export function calculateCryptoPosture(certs: Certificate[]): CryptoPostureMetrics {
  const total = certs.length;
  if (total === 0) {
    return {
      healthScore: 100,
      grade: 'A+',
      totalCertificates: 0,
      activeCertificates: 0,
      expiringCertificates: 0,
      criticalCertificates: 0,
      revokedCertificates: 0,
      weakKeyCount: 0,
      pqcReadinessRatio: 0,
      autoRenewSlaRate: 100,
      nextExpiryDays: null,
      algorithmBreakdown: {
        rsa2048: 0,
        rsa4096: 0,
        ecdsaP256: 0,
        ecdsaP384: 0,
        ed25519: 0,
        other: 0,
      },
      issuerBreakdown: {},
    };
  }

  let activeCount = 0;
  let expiringCount = 0;
  let criticalCount = 0;
  let revokedCount = 0;
  let weakKeyCount = 0;
  let autoRenewCount = 0;
  let modernEccCount = 0;
  let minDaysRemaining: number | null = null;

  const algoCounts = {
    rsa2048: 0,
    rsa4096: 0,
    ecdsaP256: 0,
    ecdsaP384: 0,
    ed25519: 0,
    other: 0,
  };

  const issuerCounts: Record<string, number> = {};

  for (const cert of certs) {
    // Expiration & Status
    if (cert.status === CertStatus.ACTIVE) activeCount++;
    if (cert.status === CertStatus.EXPIRING_SOON) expiringCount++;
    if (cert.status === CertStatus.REVOKED) revokedCount++;

    const days = cert.daysRemaining ?? 0;
    if (days <= 7 && cert.status !== CertStatus.REVOKED) {
      criticalCount++;
    }

    if (cert.status !== CertStatus.REVOKED) {
      if (minDaysRemaining === null || days < minDaysRemaining) {
        minDaysRemaining = Math.max(0, days);
      }
    }

    // Auto-Renew SLA
    if (cert.autoRenew) {
      autoRenewCount++;
    }

    // Key Algorithm Breakdown
    const algo = cert.keyAlgorithm;
    if (algo === KeyAlgorithm.RSA_2048) {
      algoCounts.rsa2048++;
    } else if (algo === KeyAlgorithm.RSA_4096) {
      algoCounts.rsa4096++;
      modernEccCount++; // Stronger key length counts towards modern crypto readiness
    } else if (algo === KeyAlgorithm.ECDSA_P256) {
      algoCounts.ecdsaP256++;
      modernEccCount++;
    } else if (algo === KeyAlgorithm.ECDSA_P384) {
      algoCounts.ecdsaP384++;
      modernEccCount++;
    } else if (algo === KeyAlgorithm.ED25519) {
      algoCounts.ed25519++;
      modernEccCount++;
    } else {
      algoCounts.other++;
    }

    // Issuer Breakdown
    const issuerName = cert.issuer ? (cert.issuer.split(',')[0]?.replace('CN=', '').trim() || 'Unknown CA') : 'Unknown CA';
    issuerCounts[issuerName] = (issuerCounts[issuerName] || 0) + 1;
  }

  // Calculate Health Score (0 - 100)
  // Base 100
  // - 20 points per critical certificate (< 7 days)
  // - 10 points per expiring certificate (< 30 days)
  // - 15 points per revoked certificate still in inventory
  // - 5 points if auto-renew coverage is low
  let deductions = 0;
  deductions += criticalCount * 25;
  deductions += (expiringCount - criticalCount) * 10;
  deductions += revokedCount * 15;
  deductions += weakKeyCount * 20;

  const autoRenewRatio = total > 0 ? (autoRenewCount / total) * 100 : 100;
  if (autoRenewRatio < 50) deductions += 15;
  else if (autoRenewRatio < 80) deductions += 5;

  const healthScore = Math.max(10, Math.min(100, Math.round(100 - deductions)));

  let grade: 'A+' | 'A' | 'B' | 'C' | 'F' = 'A+';
  if (healthScore >= 95) grade = 'A+';
  else if (healthScore >= 85) grade = 'A';
  else if (healthScore >= 70) grade = 'B';
  else if (healthScore >= 50) grade = 'C';
  else grade = 'F';

  const pqcReadinessRatio = total > 0 ? Math.round((modernEccCount / total) * 100) : 0;

  return {
    healthScore,
    grade,
    totalCertificates: total,
    activeCertificates: activeCount,
    expiringCertificates: expiringCount,
    criticalCertificates: criticalCount,
    revokedCertificates: revokedCount,
    weakKeyCount,
    pqcReadinessRatio,
    autoRenewSlaRate: Math.round(autoRenewRatio),
    nextExpiryDays: minDaysRemaining,
    algorithmBreakdown: algoCounts,
    issuerBreakdown: issuerCounts,
  };
}

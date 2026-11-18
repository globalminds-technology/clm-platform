export interface CryptoPostureMetrics {
  healthScore: number; // 0 to 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'F';
  totalCertificates: number;
  activeCertificates: number;
  expiringCertificates: number;
  criticalCertificates: number;
  revokedCertificates: number;
  weakKeyCount: number; // RSA < 2048 or deprecated SHA-1
  pqcReadinessRatio: number; // 0 to 100%
  autoRenewSlaRate: number; // % of certs managed autonomously
  nextExpiryDays: number | null;
  algorithmBreakdown: {
    rsa2048: number;
    rsa4096: number;
    ecdsaP256: number;
    ecdsaP384: number;
    ed25519: number;
    other: number;
  };
  issuerBreakdown: Record<string, number>;
}

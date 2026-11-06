import { CertStatus, KeyAlgorithm, ValidationMethod } from './cert-status';

export interface Certificate {
  id: string;
  tenantId: string;
  domain: string;
  sans: string[];
  status: CertStatus;
  keyAlgorithm: KeyAlgorithm;
  issuer: string;
  serialNumber: string;
  fingerprintSha256: string;
  notBefore: string;
  notAfter: string;
  daysRemaining: number;
  autoRenew: boolean;
  renewBeforeDays: number;
  gatewayId?: string | null;
  deployTargetCount: number;
  lastRenewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateDetail extends Certificate {
  publicKeyPem?: string;
  certificateChainPem?: string;
  deploymentTargets: Array<{
    id: string;
    targetType: string;
    targetName: string;
    status: string;
    lastDeployedAt?: string | null;
  }>;
}

export interface CreateCertificateRequest {
  domain: string;
  sans?: string[];
  keyAlgorithm: KeyAlgorithm;
  validationMethod: ValidationMethod;
  autoRenew?: boolean;
  renewBeforeDays?: number;
  gatewayId?: string;
}

export interface RenewCertificateRequest {
  forceRenew?: boolean;
  renewBeforeDays?: number;
}

export interface RevokeCertificateRequest {
  reason:
  'KEY_COMPROMISE' | 'CA_COMPROMISE' | 'SUPERSEDED' | 'CESSATION_OF_OPERATION' | 'UNSPECIFIED';
  comments?: string;
}

export interface CertificateFilterParams {
  domain?: string;
  status?: CertStatus;
  issuer?: string;
  expiringWithinDays?: number;
  gatewayId?: string;
}
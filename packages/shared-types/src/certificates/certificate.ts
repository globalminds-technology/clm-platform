import { CertStatus, KeyAlgorithm, ValidationMethod, CertificateTrackingMode } from './cert-status';

export interface Certificate {
  id: string;
  tenantId: string;
  domain: string;
  sans: string[];
  status: CertStatus;
  keyAlgorithm: KeyAlgorithm;
  trackingMode?: CertificateTrackingMode;
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

export interface LiveTlsProbeResult {
  domain: string;
  port: number;
  subject: string;
  issuer: string;
  sans: string[];
  notBefore: string;
  notAfter: string;
  daysRemaining: number;
  serialNumber: string;
  fingerprintSha256: string;
  keyAlgorithm: string;
  isExpired: boolean;
}

export interface CreateCertificateRequest {
  domain: string;
  sans?: string[];
  keyAlgorithm: KeyAlgorithm;
  validationMethod: ValidationMethod;
  trackingMode?: CertificateTrackingMode;
  autoRenew?: boolean;
  renewBeforeDays?: number;
  gatewayId?: string;
  issuer?: string;
  notBefore?: string;
  notAfter?: string;
  serialNumber?: string;
  fingerprintSha256?: string;
}

export interface ReprobeCertificateResponse {
  success: boolean;
  message: string;
  isUpdated: boolean;
  probedDomain: string;
  previousDaysRemaining: number;
  currentDaysRemaining: number;
  certificate: Certificate;
}


export interface RenewalContextResponse {
  certificateId: string;
  domain: string;
  sans: string[];
  currentKeyAlgorithm: KeyAlgorithm;
  currentIssuer: string;
  daysRemaining: number;
  organizationMetadata: {
    organizationName: string;
    department?: string;
    country: string;
    state?: string;
    locality?: string;
    contactEmail?: string;
  };
  connectedCloudAccounts: Array<{
    id: string;
    name: string;
    provider: 'AWS' | 'AZURE' | 'GCP';
    region?: string;
    maskedSecret: string;
    awsAccountId?: string;
    azureTenantId?: string;
    gcpProjectId?: string;
  }>;
  suggestedValidationMethod: ValidationMethod;
  subscriptionTier: string;
  isPaidPlan: boolean;
  maxCertificates: number;
  currentCertificatesCount: number;
  allowedCaProviders: string[];
}

export interface RenewCertificateRequest {
  forceRenew?: boolean;
  renewBeforeDays?: number;
  keyAlgorithm?: KeyAlgorithm;
  cloudAccountId?: string;
  csrOverridePem?: string;
  caProvider?: 'LETS_ENCRYPT' | 'DIGICERT' | 'SECTIGO' | 'AWS_ACM';
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
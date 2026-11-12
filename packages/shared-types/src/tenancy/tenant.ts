export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  REJECTED = 'REJECTED',
  TRIAL = 'TRIAL',
  SUSPENDED = 'SUSPENDED',
  DECOMMISSIONED = 'DECOMMISSIONED',
}

export enum SubscriptionTier {
  COMMUNITY = 'COMMUNITY',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
  AWS_MARKETPLACE_PAYGO = 'AWS_MARKETPLACE_PAYGO',
}

export enum CloudMarketplace {
  DIRECT = 'DIRECT',
  AWS_MARKETPLACE = 'AWS_MARKETPLACE',
  AZURE_MARKETPLACE = 'AZURE_MARKETPLACE',
  GCP_MARKETPLACE = 'GCP_MARKETPLACE',
  ZOHO_MARKETPLACE = 'ZOHO_MARKETPLACE',
}

export interface PlanDefinition {
  id: string;
  tier: SubscriptionTier;
  name: string;
  maxCertificates: number;
  maxGateways: number;
  priceMonthly: number;
  features: string[];
  effectiveDate?: string;
}

export interface TenantOrganizationMetadata {
  organizationName?: string;
  department?: string;
  country?: string; // 2-letter ISO country code e.g. 'US', 'IN'
  state?: string;
  locality?: string;
  contactEmail?: string;
  defaultKeyAlgorithm?: string; // 'RSA_2048' | 'RSA_4096' | 'ECDSA_P256'
  defaultCaProvider?: 'LETS_ENCRYPT' | 'DIGICERT' | 'SECTIGO' | 'AWS_ACM';
  defaultChallengeType?: 'DNS_01' | 'HTTP_01';
}

export interface TenantSettings {
  defaultRenewalWindowDays?: number;
  slackWebhookUrl?: string | null;
  emailAlerts?: boolean;
  orgMetadata?: TenantOrganizationMetadata;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  tier: SubscriptionTier;
  marketplaceProvider?: CloudMarketplace;
  effectivePlanDate?: string;
  maxCertificates: number;
  maxGateways: number;
  awsAccountId?: string | null;
  awsCustomerIdentifier?: string | null;
  awsProductCode?: string | null;
  settings?: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  tier?: SubscriptionTier;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  marketplaceProvider?: CloudMarketplace;
  awsAccountId?: string;
  awsCustomerIdentifier?: string;
  maxCertificates?: number;
  maxGateways?: number;
}

export interface RegisterTenantRequest {
  organizationName: string;
  adminEmail: string;
  password: string;
  adminFirstName: string;
  adminLastName?: string;
  marketplaceProvider?: CloudMarketplace;
}

export interface UpdateTenantRequest {
  name?: string;
  status?: TenantStatus;
  tier?: SubscriptionTier;
  marketplaceProvider?: CloudMarketplace;
  effectivePlanDate?: string;
  maxCertificates?: number;
  maxGateways?: number;
}

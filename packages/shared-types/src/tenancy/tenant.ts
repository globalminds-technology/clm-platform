export enum TenantStatus {
  ACTIVE = 'ACTIVE',
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

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  tier: SubscriptionTier;
  maxCertificates: number;
  maxGateways: number;
  awsAccountId?: string | null;
  awsCustomerIdentifier?: string | null;
  awsProductCode?: string | null;
  settings?: {
    defaultRenewalWindowDays?: number;
    slackWebhookUrl?: string | null;
    emailAlerts?: boolean;
  };
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
  awsAccountId?: string;
  awsCustomerIdentifier?: string;
  maxCertificates?: number;
  maxGateways?: number;
}

export interface UpdateTenantRequest {
  name?: string;
  status?: TenantStatus;
  tier?: SubscriptionTier;
  maxCertificates?: number;
  maxGateways?: number;
}


export enum CloudProvider {
  AWS = 'AWS',
  AZURE = 'AZURE',
  GCP = 'GCP',
}

export enum CloudAccountAuthType {
  ACCESS_KEY = 'ACCESS_KEY',
  IAM_ROLE = 'IAM_ROLE',
  SERVICE_PRINCIPAL = 'SERVICE_PRINCIPAL',
  SERVICE_ACCOUNT = 'SERVICE_ACCOUNT',
}

export enum CloudAccountStatus {
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
  UNVERIFIED = 'UNVERIFIED',
}

export interface CloudAccount {
  id: string;
  tenantId: string;
  provider: CloudProvider;
  name: string;
  authType: CloudAccountAuthType;
  status: CloudAccountStatus;
  region?: string;
  awsAccountId?: string;
  awsRoleArn?: string;
  azureTenantId?: string;
  azureClientId?: string;
  gcpProjectId?: string;
  maskedSecret: string;
  lastSyncAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCloudAccountRequest {
  provider: CloudProvider;
  name: string;
  authType?: CloudAccountAuthType;
  region?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRoleArn?: string;
  azureTenantId?: string;
  azureClientId?: string;
  azureClientSecret?: string;
  gcpProjectId?: string;
  gcpServiceAccountJson?: string;
}

export interface TestCloudAccountResponse {
  success: boolean;
  message: string;
  discoveredResourcesCount?: number;
}


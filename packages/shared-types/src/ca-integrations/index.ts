export enum CaProvider {
  LETS_ENCRYPT = 'LETS_ENCRYPT',
  DIGICERT = 'DIGICERT',
  SECTIGO = 'SECTIGO',
  AWS_PCA = 'AWS_PCA',
  VAULT = 'VAULT',
}

export enum CaIntegrationStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  ERROR = 'ERROR',
}

export interface CaIntegration {
  id: string;
  tenantId: string;
  provider: CaProvider;
  name: string;
  accountEmail?: string | null;
  externalAccountBindingId?: string | null;
  maskedSecret: string;
  isDefault: boolean;
  status: CaIntegrationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaIntegrationRequest {
  provider: CaProvider;
  name: string;
  accountEmail?: string;
  externalAccountBindingId?: string;
  eabHmacKey?: string;
  digicertApiKey?: string;
  digicertContainerId?: string;
  sectigoUsername?: string;
  sectigoPassword?: string;
  sectigoCustomerUri?: string;
  awsPcaArn?: string;
  awsCloudAccountId?: string;
  vaultAddress?: string;
  vaultToken?: string;
  isDefault?: boolean;
}

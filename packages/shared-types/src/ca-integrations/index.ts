export enum CaProvider {
  // Public CAs
  DIGICERT = 'DIGICERT',
  SECTIGO = 'SECTIGO',
  GLOBALSIGN = 'GLOBALSIGN',
  GODADDY = 'GODADDY',
  THE_SSL_STORE = 'THE_SSL_STORE',
  EMSIGN = 'EMSIGN',

  // ACME Directories
  LETS_ENCRYPT = 'LETS_ENCRYPT',
  ZEROSSL = 'ZEROSSL',
  BUYPASS = 'BUYPASS',
  TELIA = 'TELIA',
  CUSTOM_ACME = 'CUSTOM_ACME',

  // Private, Cloud & Enterprise PKI
  MSCA = 'MSCA',
  AWS_PCA = 'AWS_PCA',
  AZURE_KEYVAULT = 'AZURE_KEYVAULT',
  VAULT = 'VAULT',
  KUBERNETES = 'KUBERNETES',
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
  acmeDirectoryUrl?: string;
  digicertApiKey?: string;
  digicertContainerId?: string;
  sectigoUsername?: string;
  sectigoPassword?: string;
  sectigoCustomerUri?: string;
  apiKey?: string;
  apiSecret?: string;
  awsPcaArn?: string;
  awsCloudAccountId?: string;
  azureVaultUri?: string;
  azureTenantId?: string;
  azureClientId?: string;
  azureClientSecret?: string;
  vaultAddress?: string;
  vaultToken?: string;
  mscaServerUrl?: string;
  mscaTemplateName?: string;
  k8sClusterUrl?: string;
  k8sNamespace?: string;
  isDefault?: boolean;
}

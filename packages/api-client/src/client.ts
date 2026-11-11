import { HttpClient, type HttpClientConfig } from './http';
import { CertificatesEndpoint } from './endpoints/certificates';
import { GatewaysEndpoint } from './endpoints/gateways';
import { TenantsEndpoint } from './endpoints/tenants';
import { DeploymentsEndpoint } from './endpoints/deployments';
import { AuditEndpoint } from './endpoints/audit';
import { AuthEndpoint } from './endpoints/auth';
import { UsersEndpoint } from './endpoints/users';
import { PlansEndpoint } from './endpoints/plans';
import { CloudAccountsEndpoint } from './endpoints/cloud-accounts';
import { MockApiClient } from './mock/mock-client';

export interface ApiClientConfig extends Partial<HttpClientConfig> {
  useMock?: boolean;
}

export interface ApiClient {
  certificates: CertificatesEndpoint;
  gateways: GatewaysEndpoint;
  tenants: TenantsEndpoint;
  deployments: DeploymentsEndpoint;
  audit: AuditEndpoint;
  auth: AuthEndpoint;
  users: UsersEndpoint;
  plans: PlansEndpoint;
  cloudAccounts: CloudAccountsEndpoint;
  http?: HttpClient;
  setDefaultHeaders?: (headers: Record<string, string>) => void;
}

export function createApiClient(config: ApiClientConfig = {}): ApiClient {
  if (config.useMock) {
    return new MockApiClient() as unknown as ApiClient;
  }

  const http = new HttpClient({
    baseUrl: config.baseUrl || 'http://localhost:4000/api/v1',
    getAuthToken: config.getAuthToken,
    onUnauthorized: config.onUnauthorized,
    defaultHeaders: config.defaultHeaders,
  });

  return {
    http,
    setDefaultHeaders: (headers: Record<string, string>) => http.setDefaultHeaders(headers),
    certificates: new CertificatesEndpoint(http),
    gateways: new GatewaysEndpoint(http),
    tenants: new TenantsEndpoint(http),
    deployments: new DeploymentsEndpoint(http),
    audit: new AuditEndpoint(http),
    auth: new AuthEndpoint(http),
    users: new UsersEndpoint(http),
    plans: new PlansEndpoint(http),
    cloudAccounts: new CloudAccountsEndpoint(http),
  };
}


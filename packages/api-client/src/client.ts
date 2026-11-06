import { HttpClient, type HttpClientConfig } from './http';
import { CertificatesEndpoint } from './endpoints/certificates';
import { GatewaysEndpoint } from './endpoints/gateways';
import { TenantsEndpoint } from './endpoints/tenants';
import { DeploymentsEndpoint } from './endpoints/deployments';
import { AuditEndpoint } from './endpoints/audit';
import { AuthEndpoint } from './endpoints/auth';
import { MockApiClient } from './mock/mock-client';

export interface ApiClientConfig extends Partial<HttpClientConfig> {
  useMock?: boolean;
}

export interface ApiClient {
  certificates: CertificatesEndpoint | MockApiClient['certificates'];
  gateways: GatewaysEndpoint | MockApiClient['gateways'];
  tenants: TenantsEndpoint | MockApiClient['tenants'];
  deployments: DeploymentsEndpoint | MockApiClient['deployments'];
  audit: AuditEndpoint | MockApiClient['audit'];
  auth: AuthEndpoint | MockApiClient['auth'];
  http?: HttpClient;
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
    certificates: new CertificatesEndpoint(http),
    gateways: new GatewaysEndpoint(http),
    tenants: new TenantsEndpoint(http),
    deployments: new DeploymentsEndpoint(http),
    audit: new AuditEndpoint(http),
    auth: new AuthEndpoint(http),
  };
}


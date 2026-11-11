import { type HttpClient } from '../http';
import { type Tenant, type CreateTenantRequest, type UpdateTenantRequest } from '@clm/shared-types';

export class TenantsEndpoint {
  constructor(private http: HttpClient) {}

  list(): Promise<Tenant[]> {
    return this.http.get<Tenant[]>('tenants');
  }

  getMetrics(): Promise<any> {
    return this.http.get<any>('tenants/metrics');
  }

  getMyStatus(): Promise<{ status: string; tenant: Tenant }> {
    return this.http.get<{ status: string; tenant: Tenant }>('tenants/my-status');
  }

  updateStatus(id: string, status: string): Promise<Tenant> {
    return this.http.patch<Tenant>(`tenants/${id}/status`, { status });
  }

  getById(id: string): Promise<Tenant> {
    return this.http.get<Tenant>(`tenants/${id}`);
  }

  create(data: CreateTenantRequest): Promise<Tenant> {
    return this.http.post<Tenant>('tenants', data);
  }

  update(id: string, data: UpdateTenantRequest): Promise<Tenant> {
    return this.http.patch<Tenant>(`tenants/${id}`, data);
  }
}


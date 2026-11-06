import { type HttpClient } from '../http';
import { type Tenant, type CreateTenantRequest, type UpdateTenantRequest } from '@clm/shared-types';

export class TenantsEndpoint {
  constructor(private http: HttpClient) {}

  list(): Promise<Tenant[]> {
    return this.http.get<Tenant[]>('tenants');
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


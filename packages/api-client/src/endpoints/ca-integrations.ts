import { type HttpClient } from '../http';
import {
  type CaIntegration,
  type CreateCaIntegrationRequest,
} from '@clm/shared-types';

export class CaIntegrationsEndpoint {
  constructor(private http: HttpClient) {}

  list(): Promise<CaIntegration[]> {
    return this.http.get<CaIntegration[]>('ca-integrations');
  }

  getById(id: string): Promise<CaIntegration> {
    return this.http.get<CaIntegration>(`ca-integrations/${id}`);
  }

  create(data: CreateCaIntegrationRequest): Promise<CaIntegration> {
    return this.http.post<CaIntegration>('ca-integrations', data);
  }

  setDefault(id: string): Promise<CaIntegration> {
    return this.http.patch<CaIntegration>(`ca-integrations/${id}/default`, {});
  }

  delete(id: string): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`ca-integrations/${id}`);
  }
}

import { type HttpClient } from '../http';
import {
  type CloudAccount,
  type CreateCloudAccountRequest,
  type TestCloudAccountResponse,
} from '@clm/shared-types';

export class CloudAccountsEndpoint {
  constructor(private http: HttpClient) {}

  list(): Promise<CloudAccount[]> {
    return this.http.get<CloudAccount[]>('cloud-accounts');
  }

  create(data: CreateCloudAccountRequest): Promise<CloudAccount> {
    return this.http.post<CloudAccount>('cloud-accounts', data);
  }

  testConnection(id: string): Promise<TestCloudAccountResponse> {
    return this.http.post<TestCloudAccountResponse>(`cloud-accounts/${id}/test`);
  }

  delete(id: string): Promise<void> {
    return this.http.delete<void>(`cloud-accounts/${id}`);
  }
}


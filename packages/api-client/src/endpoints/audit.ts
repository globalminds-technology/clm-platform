import { type HttpClient } from '../http';
import { type AuditLog, type AuditFilterParams } from '@clm/shared-types';

export class AuditEndpoint {
  constructor(private http: HttpClient) {}

  list(filters?: AuditFilterParams): Promise<AuditLog[]> {
    return this.http.get<AuditLog[]>('audit', filters);
  }
}


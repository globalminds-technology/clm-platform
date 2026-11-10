import { type HttpClient } from '../http';
import { type AuditLog, type AuditFilterParams } from '@clm/shared-types';

export class AuditEndpoint {
  constructor(private http: HttpClient) {}

  list(filters?: AuditFilterParams): Promise<AuditLog[]> {
    return this.http.get<AuditLog[]>('audit-logs', filters);
  }

  listGlobal(limit = 100, offset = 0): Promise<AuditLog[]> {
    return this.http.get<AuditLog[]>('audit-logs/global', { limit, offset });
  }
}


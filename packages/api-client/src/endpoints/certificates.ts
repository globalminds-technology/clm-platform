import { type HttpClient } from '../http';
import {
  type Certificate,
  type CertificateDetail,
  type CertificateFilterParams,
  type CreateCertificateRequest,
  type RenewCertificateRequest,
  type RevokeCertificateRequest,
} from '@clm/shared-types';

export class CertificatesEndpoint {
  constructor(private http: HttpClient) {}

  list(filters?: CertificateFilterParams): Promise<Certificate[]> {
    return this.http.get<Certificate[]>('certificates', filters);
  }

  getById(id: string): Promise<CertificateDetail> {
    return this.http.get<CertificateDetail>(`certificates/${id}`);
  }

  create(data: CreateCertificateRequest): Promise<Certificate> {
    return this.http.post<Certificate>('certificates', data);
  }

  renew(id: string, data?: RenewCertificateRequest): Promise<Certificate> {
    return this.http.post<Certificate>(`certificates/${id}/renew`, data);
  }

  revoke(id: string, data: RevokeCertificateRequest): Promise<void> {
    return this.http.post<void>(`certificates/${id}/revoke`, data);
  }
}


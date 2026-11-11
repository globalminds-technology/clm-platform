import { type HttpClient } from '../http';
import {
  type Certificate,
  type CertificateDetail,
  type CertificateFilterParams,
  type CreateCertificateRequest,
  type RenewCertificateRequest,
  type RevokeCertificateRequest,
  type LiveTlsProbeResult,
  type ReprobeCertificateResponse,
} from '@clm/shared-types';

export class CertificatesEndpoint {
  constructor(private http: HttpClient) {}

  probe(domain: string, port = 443): Promise<LiveTlsProbeResult> {
    return this.http.post<LiveTlsProbeResult>('certificates/probe', { domain, port });
  }

  reprobe(id: string): Promise<ReprobeCertificateResponse> {
    return this.http.post<ReprobeCertificateResponse>(`certificates/${id}/reprobe`, {});
  }

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


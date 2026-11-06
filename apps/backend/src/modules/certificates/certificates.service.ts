import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CertStatus,
  KeyAlgorithm,
  type Certificate,
  type CertificateFilterParams,
} from '@clm/shared-types';
import { type CreateCertificateDto } from './dto/create-certificate.dto';

@Injectable()
export class CertificatesService {
  // In-memory mock store for scaffold foundation (swapped with PostgreSQL RLS in Milestone 1)
  private certificates: Certificate[] = [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      tenantId: 'a0000000-0000-0000-0000-000000000001',
      domain: 'api.acme.com',
      sans: ['api.acme.com', 'services.acme.com'],
      status: CertStatus.ACTIVE,
      keyAlgorithm: KeyAlgorithm.RSA_2048,
      issuer: "Let's Encrypt Authority X3",
      serialNumber: '4a2b9c8d1e7f0a3b5c7d',
      fingerprintSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      notBefore: new Date(Date.now() - 30 * 86400000).toISOString(),
      notAfter: new Date(Date.now() + 60 * 86400000).toISOString(),
      daysRemaining: 60,
      autoRenew: true,
      renewBeforeDays: 30,
      gatewayId: 'g0000000-0000-0000-0000-000000000001',
      deployTargetCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      tenantId: 'a0000000-0000-0000-0000-000000000001',
      domain: 'portal.acme.com',
      sans: ['portal.acme.com'],
      status: CertStatus.EXPIRING_SOON,
      keyAlgorithm: KeyAlgorithm.ECDSA_P256,
      issuer: 'DigiCert Global Root CA',
      serialNumber: '7b8c9d0e1f2a3b4c5d6e',
      fingerprintSha256: '1234c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      notBefore: new Date(Date.now() - 350 * 86400000).toISOString(),
      notAfter: new Date(Date.now() + 15 * 86400000).toISOString(),
      daysRemaining: 15,
      autoRenew: true,
      renewBeforeDays: 30,
      gatewayId: 'g0000000-0000-0000-0000-000000000001',
      deployTargetCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  findAll(filters?: CertificateFilterParams): Certificate[] {
    let result = [...this.certificates];
    if (filters?.domain) {
      result = result.filter(c => c.domain.toLowerCase().includes(filters.domain!.toLowerCase()));
    }
    if (filters?.status) {
      result = result.filter(c => c.status === filters.status);
    }
    return result;
  }

  findById(id: string): Certificate {
    const cert = this.certificates.find(c => c.id === id);
    if (!cert) {
      throw new NotFoundException(`Certificate with ID '${id}' not found`);
    }
    return cert;
  }

  create(dto: CreateCertificateDto, tenantId = 'a0000000-0000-0000-0000-000000000001'): Certificate {
    const newCert: Certificate = {
      id: `c${Date.now()}`,
      tenantId,
      domain: dto.domain,
      sans: dto.sans ?? [dto.domain],
      status: CertStatus.PENDING_VALIDATION,
      keyAlgorithm: dto.keyAlgorithm,
      issuer: 'Let’s Encrypt Staging',
      serialNumber: `${Math.random().toString(16).substring(2, 10)}`,
      fingerprintSha256: 'pending-issuance',
      notBefore: new Date().toISOString(),
      notAfter: new Date(Date.now() + 90 * 86400000).toISOString(),
      daysRemaining: 90,
      autoRenew: dto.autoRenew ?? true,
      renewBeforeDays: dto.renewBeforeDays ?? 30,
      gatewayId: dto.gatewayId,
      deployTargetCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.certificates.unshift(newCert);
    return newCert;
  }
}


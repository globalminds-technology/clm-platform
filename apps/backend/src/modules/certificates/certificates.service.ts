import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type Certificate,
  type CertificateFilterParams,
  AuditActorType,
  AuditAction,
} from '@clm/shared-types';
import { CertificatesRepository } from './certificates.repository';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { type CreateCertificateDto } from './dto/create-certificate.dto';

@Injectable()
export class CertificatesService {
  constructor(
    private readonly certificatesRepository: CertificatesRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(tenantId: string, filters?: CertificateFilterParams): Promise<Certificate[]> {
    return this.certificatesRepository.findAll(tenantId, filters);
  }

  async findById(tenantId: string, id: string): Promise<Certificate> {
    const record = await this.certificatesRepository.findById(tenantId, id);
    if (!record) {
      throw new NotFoundException(`Certificate with ID '${id}' not found`);
    }
    return record;
  }

  async create(tenantId: string, dto: CreateCertificateDto): Promise<Certificate> {
    const record = await this.certificatesRepository.create(tenantId, dto);
    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId: 'user-active',
      action: AuditAction.CERT_REQUESTED,
      resourceType: 'CERTIFICATE',
      resourceId: record.id,
      metadata: { domain: record.domain, algorithm: record.keyAlgorithm },
    });
    return record;
  }

  async renew(tenantId: string, id: string): Promise<Certificate> {
    const updated = await this.certificatesRepository.renew(tenantId, id);
    if (!updated) {
      throw new NotFoundException(`Certificate with ID '${id}' not found`);
    }

    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId: 'user-active',
      action: AuditAction.CERT_RENEWED,
      resourceType: 'CERTIFICATE',
      resourceId: updated.id,
      metadata: { domain: updated.domain },
    });
    return updated;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const success = await this.certificatesRepository.delete(tenantId, id);
    if (!success) {
      throw new NotFoundException(`Certificate with ID '${id}' not found`);
    }

    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId: 'user-active',
      action: AuditAction.CERT_REVOKED,
      resourceType: 'CERTIFICATE',
      resourceId: id,
    });
  }
}

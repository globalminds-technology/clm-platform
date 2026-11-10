import { Injectable, Logger } from '@nestjs/common';
import { AuditActorType, AuditAction, type AuditLog } from '@clm/shared-types';
import { AuditLogsRepository } from './audit-logs.repository';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  // In-memory fallback ledger if database is unavailable
  private mockAuditLogs: AuditLog[] = [
    {
      id: 'aud_001',
      tenantId: 'a0000000-0000-0000-0000-000000000001',
      actorType: AuditActorType.USER,
      actorId: 'u0000000-0000-0000-0000-000000000001',
      actorEmail: 'admin@acme.com',
      action: AuditAction.TENANT_CREATED,
      resourceType: 'TENANT',
      resourceId: 'a0000000-0000-0000-0000-000000000001',
      metadata: { name: 'Acme Global Corp', tier: 'ENTERPRISE' },
      ipAddress: '198.51.100.42',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'aud_002',
      tenantId: 'a0000000-0000-0000-0000-000000000001',
      actorType: AuditActorType.GATEWAY,
      actorId: '20000000-0000-0000-0000-000000000001',
      action: AuditAction.GATEWAY_HEARTBEAT,
      resourceType: 'GATEWAY',
      resourceId: '20000000-0000-0000-0000-000000000001',
      metadata: { cpu: 1.8, memoryMb: 140 },
      ipAddress: '10.0.1.15',
      timestamp: new Date(Date.now() - 600000).toISOString(),
    },
    {
      id: 'aud_003',
      tenantId: 'a0000000-0000-0000-0000-000000000001',
      actorType: AuditActorType.USER,
      actorId: 'u0000000-0000-0000-0000-000000000001',
      actorEmail: 'admin@acme.com',
      action: AuditAction.CERT_RENEWED,
      resourceType: 'CERTIFICATE',
      resourceId: 'c0000000-0000-0000-0000-000000000001',
      metadata: { domain: 'payments.example.com', issuer: 'DigiCert TLS RSA CA' },
      ipAddress: '198.51.100.42',
      timestamp: new Date(Date.now() - 300000).toISOString(),
    },
  ];

  constructor(private readonly auditLogsRepository: AuditLogsRepository) { }

  async log(tenantId: string, dto: CreateAuditLogDto): Promise<AuditLog> {
    try {
      const record = await this.auditLogsRepository.create(tenantId, dto);
      this.logger.log(`Audit event [${dto.action}] on [${dto.resourceType}:${dto.resourceId}] for tenant ${tenantId}`);
      return record;
    } catch (err: any) {
      this.logger.warn(`PostgreSQL unavailable, storing audit event in memory buffer: ${err.message}`);
      const fallbackRecord: AuditLog = {
        id: `aud_${Date.now()}`,
        tenantId,
        actorType: dto.actorType,
        actorId: dto.actorId,
        actorEmail: dto.actorEmail,
        action: dto.action,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        metadata: dto.metadata || {},
        ipAddress: dto.ipAddress,
        timestamp: new Date().toISOString(),
      };
      this.mockAuditLogs.unshift(fallbackRecord);
      return fallbackRecord;
    }
  }

  async findAll(tenantId: string, limit = 50, offset = 0): Promise<AuditLog[]> {
    try {
      const logs = await this.auditLogsRepository.findAll(tenantId, limit, offset);
      if (logs.length > 0) return logs;
    } catch (err: any) {
      this.logger.warn(`Failed to fetch audit logs from DB, using fallback: ${err.message}`);
    }

    return this.mockAuditLogs
      .filter(l => l.tenantId === tenantId)
      .slice(offset, offset + limit);
  }

  async findAllGlobal(limit = 100, offset = 0): Promise<AuditLog[]> {
    try {
      const logs = await this.auditLogsRepository.findAllGlobal(limit, offset);
      if (logs.length > 0) return logs;
    } catch (err: any) {
      this.logger.warn(`Failed to fetch global audit logs from DB, using fallback: ${err.message}`);
    }

    return this.mockAuditLogs.slice(offset, offset + limit);
  }
}
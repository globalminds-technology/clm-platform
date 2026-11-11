import { Injectable, Logger } from '@nestjs/common';
import { type AuditLog } from '@clm/shared-types';
import { AuditLogsRepository } from './audit-logs.repository';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly auditLogsRepository: AuditLogsRepository) { }

  async log(tenantId: string, dto: CreateAuditLogDto): Promise<AuditLog> {
    try {
      const record = await this.auditLogsRepository.create(tenantId, dto);
      this.logger.log(`Audit event [${dto.action}] on [${dto.resourceType}:${dto.resourceId}] for tenant ${tenantId}`);
      return record;
    } catch (err: any) {
      this.logger.warn(`PostgreSQL audit log insert failed: ${err.message}`);
      return {
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
    }
  }

  async findAll(tenantId: string, limit = 50, offset = 0): Promise<AuditLog[]> {
    try {
      return await this.auditLogsRepository.findAll(tenantId, limit, offset);
    } catch (err: any) {
      this.logger.warn(`Failed to fetch audit logs from DB for tenant ${tenantId}: ${err.message}`);
      return [];
    }
  }

  async findAllGlobal(limit = 100, offset = 0): Promise<AuditLog[]> {
    try {
      return await this.auditLogsRepository.findAllGlobal(limit, offset);
    } catch (err: any) {
      this.logger.warn(`Failed to fetch global audit logs from DB: ${err.message}`);
      return [];
    }
  }
}

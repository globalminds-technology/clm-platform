import { Injectable } from '@nestjs/common';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { AuditActorType, AuditAction, type AuditLog } from '@clm/shared-types';
import { type CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditLogsRepository {
  constructor(private readonly tenantContextService: TenantContextService) { }

  async create(tenantId: string, dto: CreateAuditLogDto): Promise<AuditLog> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        `INSERT INTO audit_logs (
          tenant_id, actor_type, actor_id, actor_email, action, resource_type,
          resource_id, metadata, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;`,
        [
          tenantId,
          dto.actorType,
          dto.actorId,
          dto.actorEmail || null,
          dto.action,
          dto.resourceType,
          dto.resourceId,
          JSON.stringify(dto.metadata || {}),
          dto.ipAddress || null,
          dto.userAgent || null,
        ],
      );
      return this.mapRowToAuditLog(res.rows[0]);
    });
  }

  async findAll(tenantId: string, limit = 50, offset = 0): Promise<AuditLog[]> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        `SELECT * FROM audit_logs
         WHERE tenant_id = $1
         ORDER BY created_at DESC
        LIMIT $2 OFFSET $3; `,
        [tenantId, limit, offset],
      );
      return res.rows.map(r => this.mapRowToAuditLog(r));
    });
  }

  async findAllGlobal(limit = 100, offset = 0): Promise<AuditLog[]> {
    return this.tenantContextService.withSystemContext(async client => {
      const res = await client.query(
        `SELECT * FROM audit_logs
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2; `,
        [limit, offset],
      );
      return res.rows.map(r => this.mapRowToAuditLog(r));
    });
  }

  private mapRowToAuditLog(row: any): AuditLog {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      actorType: row.actor_type as AuditActorType,
      actorId: row.actor_id,
      actorEmail: row.actor_email,
      action: row.action as AuditAction,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      ipAddress: row.ip_address,
      timestamp: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    };
  }
}

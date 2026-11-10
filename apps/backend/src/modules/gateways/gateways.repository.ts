import { Injectable } from '@nestjs/common';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import {
  GatewayStatus,
  DeployTargetType,
  type Gateway,
  type GatewayCommand,
} from '@clm/shared-types';

@Injectable()
export class GatewaysRepository {
  constructor(private readonly tenantContextService: TenantContextService) { }

  async findAll(tenantId: string): Promise<Gateway[]> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query('SELECT * FROM gateways ORDER BY created_at DESC;');
      return res.rows.map(r => this.mapRowToGateway(r));
    });
  }

  async findById(tenantId: string, id: string): Promise<Gateway | null> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query('SELECT * FROM gateways WHERE id = $1;', [id]);
      if (res.rows.length === 0) return null;
      return this.mapRowToGateway(res.rows[0]);
    });
  }

  async findByIdGlobal(id: string): Promise<Gateway | null> {
    return this.tenantContextService.withSystemContext(async client => {
      const res = await client.query('SELECT * FROM gateways WHERE id = $1;', [id]);
      if (res.rows.length === 0) return null;
      return this.mapRowToGateway(res.rows[0]);
    });
  }

  async create(tenantId: string, data: { name: string; targetTypesSupported: DeployTargetType[]; labels?: Record<string, any> }): Promise<Gateway> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        `INSERT INTO gateways (
          tenant_id, name, hostname, ip_address, version, status, target_types_supported, labels
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;`,
        [
          tenantId,
          data.name,
          'pending-connection',
          '0.0.0.0',
          'unknown',
          GatewayStatus.OFFLINE,
          data.targetTypesSupported,
          JSON.stringify(data.labels || {}),
        ],
      );
      return this.mapRowToGateway(res.rows[0]);
    });
  }

  async saveEnrollmentToken(tenantId: string, gatewayId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.tenantContextService.withTenantContext(tenantId, async client => {
      await client.query(
        `INSERT INTO gateway_enrollment_tokens (
          tenant_id, gateway_id, token_hash, expires_at
        ) VALUES ($1, $2, $3, $4);`,
        [tenantId, gatewayId, tokenHash, expiresAt.toISOString()],
      );
    });
  }

  async findAndConsumeEnrollmentToken(tokenHash: string): Promise<{ tenantId: string; gatewayId: string } | null> {
    return this.tenantContextService.withSystemContext(async client => {
      const res = await client.query(
        `SELECT * FROM gateway_enrollment_tokens
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW();`,
        [tokenHash],
      );

      if (res.rows.length === 0) return null;

      const row = res.rows[0];
      await client.query(
        'UPDATE gateway_enrollment_tokens SET used_at = NOW() WHERE id = $1;',
        [row.id],
      );

      return {
        tenantId: row.tenant_id,
        gatewayId: row.gateway_id,
      };
    });
  }

  async activateGateway(gatewayId: string, hostname: string, ipAddress: string, version: string): Promise<void> {
    await this.tenantContextService.withSystemContext(async client => {
      await client.query(
        `UPDATE gateways
         SET hostname = $1, ip_address = $2, version = $3, status = $4,
             last_heartbeat_at = NOW(), updated_at = NOW()
         WHERE id = $5;`,
        [hostname, ipAddress, version, GatewayStatus.ONLINE, gatewayId],
      );
    });
  }

  async updateHeartbeat(gatewayId: string, ipAddress: string, version: string, metrics?: any): Promise<void> {
    await this.tenantContextService.withSystemContext(async client => {
      await client.query(
        `UPDATE gateways
         SET ip_address = $1, version = $2, status = $3,
             labels = labels || $4::jsonb,
             last_heartbeat_at = NOW(), updated_at = NOW()
         WHERE id = $5;`,
        [ipAddress, version, GatewayStatus.ONLINE, JSON.stringify({ metrics }), gatewayId],
      );
    });
  }

  async findPendingCommands(gatewayId: string): Promise<GatewayCommand[]> {
    return this.tenantContextService.withSystemContext(async client => {
      const res = await client.query(
        `SELECT * FROM gateway_commands
         WHERE gateway_id = $1 AND status = 'PENDING'
         ORDER BY created_at ASC;`,
        [gatewayId],
      );

      return res.rows.map(r => this.mapRowToCommand(r));
    });
  }

  async updateCommandStatus(commandId: string, status: 'COMPLETED' | 'FAILED', errorMessage?: string): Promise<void> {
    await this.tenantContextService.withSystemContext(async client => {
      await client.query(
        `UPDATE gateway_commands
         SET status = $1, error_message = $2, completed_at = NOW()
         WHERE id = $3;`,
        [status, errorMessage || null, commandId],
      );
    });
  }

  private mapRowToGateway(row: any): Gateway {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      hostname: row.hostname,
      ipAddress: row.ip_address,
      version: row.version,
      status: row.status as GatewayStatus,
      targetTypesSupported: row.target_types_supported as DeployTargetType[],
      labels: typeof row.labels === 'string' ? JSON.parse(row.labels) : row.labels || {},
      lastHeartbeatAt: row.last_heartbeat_at ? new Date(row.last_heartbeat_at).toISOString() : null,
      enrolledAt: row.enrolled_at ? new Date(row.enrolled_at).toISOString() : new Date().toISOString(),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  private mapRowToCommand(row: any): GatewayCommand {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      gatewayId: row.gateway_id,
      type: row.type,
      status: row.status,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      signature: row.signature,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }
}
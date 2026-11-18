import { Injectable } from '@nestjs/common';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import {
  CaProvider,
  CaIntegrationStatus,
  type CaIntegration,
} from '@clm/shared-types';

export interface CaIntegrationRecordWithCipher extends CaIntegration {
  encryptedCredentials: string;
  encryptionIv: string;
  encryptionTag: string;
}

@Injectable()
export class CaIntegrationsRepository {
  constructor(private readonly tenantContextService: TenantContextService) {}

  async create(
    tenantId: string,
    data: {
      provider: CaProvider;
      name: string;
      accountEmail?: string;
      externalAccountBindingId?: string;
      encryptedCredentials: string;
      encryptionIv: string;
      encryptionTag: string;
      maskedSecret: string;
      isDefault?: boolean;
    },
  ): Promise<CaIntegration> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      // If this is set as default, reset other integrations for this tenant
      if (data.isDefault) {
        await client.query(
          `UPDATE ca_integrations SET is_default = false WHERE tenant_id = $1;`,
          [tenantId],
        );
      }

      const res = await client.query(
        `INSERT INTO ca_integrations (
          tenant_id, provider, name, account_email, external_account_binding_id,
          encrypted_credentials, encryption_iv, encryption_tag, masked_secret,
          is_default, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;`,
        [
          tenantId,
          data.provider,
          data.name,
          data.accountEmail || null,
          data.externalAccountBindingId || null,
          data.encryptedCredentials,
          data.encryptionIv,
          data.encryptionTag,
          data.maskedSecret,
          data.isDefault || false,
          CaIntegrationStatus.ACTIVE,
        ],
      );

      return this.mapRow(res.rows[0]);
    });
  }

  async findAll(tenantId: string): Promise<CaIntegration[]> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        `SELECT id, tenant_id, provider, name, account_email, external_account_binding_id,
                masked_secret, is_default, status, created_at, updated_at
         FROM ca_integrations
         WHERE tenant_id = $1
         ORDER BY is_default DESC, created_at DESC;`,
        [tenantId],
      );
      return res.rows.map(row => this.mapRow(row));
    });
  }

  async findById(tenantId: string, id: string): Promise<CaIntegrationRecordWithCipher | null> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        `SELECT * FROM ca_integrations WHERE id = $1 AND tenant_id = $2 LIMIT 1;`,
        [id, tenantId],
      );
      if (!res.rows[0]) return null;
      return this.mapRowWithCipher(res.rows[0]);
    });
  }

  async findDefault(tenantId: string): Promise<CaIntegrationRecordWithCipher | null> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        `SELECT * FROM ca_integrations WHERE tenant_id = $1 AND is_default = true LIMIT 1;`,
        [tenantId],
      );
      if (!res.rows[0]) return null;
      return this.mapRowWithCipher(res.rows[0]);
    });
  }

  async setDefault(tenantId: string, id: string): Promise<CaIntegration | null> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      await client.query(
        `UPDATE ca_integrations SET is_default = false WHERE tenant_id = $1;`,
        [tenantId],
      );

      const res = await client.query(
        `UPDATE ca_integrations 
         SET is_default = true, updated_at = NOW() 
         WHERE id = $1 AND tenant_id = $2 
         RETURNING id, tenant_id, provider, name, account_email, external_account_binding_id,
                   masked_secret, is_default, status, created_at, updated_at;`,
        [id, tenantId],
      );

      if (!res.rows[0]) return null;
      return this.mapRow(res.rows[0]);
    });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        `DELETE FROM ca_integrations WHERE id = $1 AND tenant_id = $2;`,
        [id, tenantId],
      );
      return (res.rowCount ?? 0) > 0;
    });
  }

  private mapRow(row: any): CaIntegration {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      provider: row.provider as CaProvider,
      name: row.name,
      accountEmail: row.account_email,
      externalAccountBindingId: row.external_account_binding_id,
      maskedSecret: row.masked_secret,
      isDefault: Boolean(row.is_default),
      status: row.status as CaIntegrationStatus,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  private mapRowWithCipher(row: any): CaIntegrationRecordWithCipher {
    return {
      ...this.mapRow(row),
      encryptedCredentials: row.encrypted_credentials,
      encryptionIv: row.encryption_iv,
      encryptionTag: row.encryption_tag,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import {
  CloudProvider,
  CloudAccountAuthType,
  CloudAccountStatus,
  type CloudAccount,
} from '@clm/shared-types';

export interface CloudAccountRecordWithCipher extends CloudAccount {
  encryptedCredentials: string;
  encryptionIv: string;
  encryptionTag: string;
}

@Injectable()
export class CloudAccountsRepository {
  constructor(private readonly tenantContextService: TenantContextService) { }

  async create(
    tenantId: string,
    data: {
      provider: CloudProvider;
      name: string;
      authType: CloudAccountAuthType;
      region?: string;
      awsAccountId?: string;
      awsRoleArn?: string;
      azureTenantId?: string;
      azureClientId?: string;
      gcpProjectId?: string;
      encryptedCredentials: string;
      encryptionIv: string;
      encryptionTag: string;
      maskedSecret: string;
    },
  ): Promise<CloudAccount> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        `INSERT INTO cloud_accounts (
          tenant_id, provider, name, auth_type, status, region,
          aws_account_id, aws_role_arn, azure_tenant_id, azure_client_id, gcp_project_id,
          encrypted_credentials, encryption_iv, encryption_tag, masked_secret
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *;`,
        [
          tenantId,
          data.provider,
          data.name,
          data.authType,
          CloudAccountStatus.CONNECTED,
          data.region || null,
          data.awsAccountId || null,
          data.awsRoleArn || null,
          data.azureTenantId || null,
          data.azureClientId || null,
          data.gcpProjectId || null,
          data.encryptedCredentials,
          data.encryptionIv,
          data.encryptionTag,
          data.maskedSecret,
        ],
      );
      return this.mapRowToCloudAccount(res.rows[0]);
    });
  }

  async findAll(tenantId: string): Promise<CloudAccount[]> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        'SELECT * FROM cloud_accounts WHERE tenant_id = $1 ORDER BY created_at DESC;',
        [tenantId],
      );
      return res.rows.map(r => this.mapRowToCloudAccount(r));
    });
  }

  async findById(tenantId: string, id: string): Promise<CloudAccountRecordWithCipher | null> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        'SELECT * FROM cloud_accounts WHERE id = $1 AND tenant_id = $2;',
        [id, tenantId],
      );
      if (res.rows.length === 0) return null;
      return this.mapRowToCloudAccountWithCipher(res.rows[0]);
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: CloudAccountStatus,
    errorMessage?: string,
  ): Promise<CloudAccount> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        `UPDATE cloud_accounts
         SET status = $1, error_message = $2, last_sync_at = NOW(), updated_at = NOW()
         WHERE id = $3 AND tenant_id = $4
         RETURNING *;`,
        [status, errorMessage || null, id, tenantId],
      );
      if (res.rows.length === 0) throw new Error('Cloud account not found');
      return this.mapRowToCloudAccount(res.rows[0]);
    });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        'DELETE FROM cloud_accounts WHERE id = $1 AND tenant_id = $2;',
        [id, tenantId],
      );
      return (res.rowCount ?? 0) > 0;
    });
  }

  private mapRowToCloudAccount(row: any): CloudAccount {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      provider: row.provider as CloudProvider,
      name: row.name,
      authType: row.auth_type as CloudAccountAuthType,
      status: row.status as CloudAccountStatus,
      region: row.region || undefined,
      awsAccountId: row.aws_account_id || undefined,
      awsRoleArn: row.aws_role_arn || undefined,
      azureTenantId: row.azure_tenant_id || undefined,
      azureClientId: row.azure_client_id || undefined,
      gcpProjectId: row.gcp_project_id || undefined,
      maskedSecret: row.masked_secret,
      lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at).toISOString() : null,
      errorMessage: row.error_message || null,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    };
  }

  private mapRowToCloudAccountWithCipher(row: any): CloudAccountRecordWithCipher {
    return {
      ...this.mapRowToCloudAccount(row),
      encryptedCredentials: row.encrypted_credentials,
      encryptionIv: row.encryption_iv,
      encryptionTag: row.encryption_tag,
    };
  }
}

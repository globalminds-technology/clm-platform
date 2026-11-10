import { Injectable } from '@nestjs/common';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { CertStatus, KeyAlgorithm, type Certificate, type CertificateFilterParams } from '@clm/shared-types';
import { type CreateCertificateDto } from './dto/create-certificate.dto';

@Injectable()
export class CertificatesRepository {
  constructor(private readonly tenantContextService: TenantContextService) {}

  async findAll(tenantId: string, filters?: CertificateFilterParams): Promise<Certificate[]> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      let query = 'SELECT * FROM certificates WHERE 1=1';
      const params: any[] = [];

      if (filters?.domain) {
        params.push(`%${filters.domain}%`);
        query += ` AND domain ILIKE $${params.length}`;
      }

      if (filters?.status) {
        params.push(filters.status);
        query += ` AND status = $${params.length}`;
      }

      query += ' ORDER BY not_after ASC;';

      const res = await client.query(query, params);
      return res.rows.map(r => this.mapRowToCertificate(r));
    });
  }

  async findById(tenantId: string, id: string): Promise<Certificate | null> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query('SELECT * FROM certificates WHERE id = $1;', [id]);
      if (res.rows.length === 0) return null;
      return this.mapRowToCertificate(res.rows[0]);
    });
  }

  async create(tenantId: string, dto: CreateCertificateDto): Promise<Certificate> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const notBefore = new Date();
      const notAfter = new Date(Date.now() + 90 * 86400000);
      const serialNumber = Math.random().toString(16).substring(2, 18);
      const fingerprint = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      const res = await client.query(
        `INSERT INTO certificates (
          tenant_id, domain, sans, status, key_algorithm, issuer,
          serial_number, fingerprint_sha256, not_before, not_after,
          auto_renew, renew_before_days, gateway_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *;`,
        [
          tenantId,
          dto.domain,
          dto.sans || [dto.domain],
          CertStatus.ACTIVE,
          dto.keyAlgorithm || KeyAlgorithm.RSA_2048,
          'DigiCert TLS RSA CA',
          serialNumber,
          fingerprint,
          notBefore.toISOString(),
          notAfter.toISOString(),
          dto.autoRenew ?? true,
          dto.renewBeforeDays ?? 30,
          dto.gatewayId || null,
        ],
      );

      return this.mapRowToCertificate(res.rows[0]);
    });
  }

  async renew(tenantId: string, id: string): Promise<Certificate | null> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const notBefore = new Date();
      const notAfter = new Date(Date.now() + 90 * 86400000);

      const res = await client.query(
        `UPDATE certificates
         SET status = $1, not_before = $2, not_after = $3, last_renewed_at = NOW(), updated_at = NOW()
         WHERE id = $4
         RETURNING *;`,
        [CertStatus.ACTIVE, notBefore.toISOString(), notAfter.toISOString(), id],
      );

      if (res.rows.length === 0) return null;
      return this.mapRowToCertificate(res.rows[0]);
    });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query('DELETE FROM certificates WHERE id = $1;', [id]);
      return (res.rowCount ?? 0) > 0;
    });
  }

  private mapRowToCertificate(row: any): Certificate {
    const notAfter = new Date(row.not_after);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      id: row.id,
      tenantId: row.tenant_id,
      domain: row.domain,
      sans: row.sans || [row.domain],
      status: row.status as CertStatus,
      keyAlgorithm: row.key_algorithm as KeyAlgorithm,
      issuer: row.issuer,
      serialNumber: row.serial_number,
      fingerprintSha256: row.fingerprint_sha256,
      notBefore: row.not_before instanceof Date ? row.not_before.toISOString() : row.not_before,
      notAfter: row.not_after instanceof Date ? row.not_after.toISOString() : row.not_after,
      daysRemaining,
      autoRenew: row.auto_renew,
      renewBeforeDays: row.renew_before_days,
      gatewayId: row.gateway_id,
      deployTargetCount: 1,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    };
  }
}


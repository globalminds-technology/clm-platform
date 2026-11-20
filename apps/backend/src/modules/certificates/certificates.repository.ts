import { Injectable, ForbiddenException } from '@nestjs/common';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import {
  CertStatus,
  KeyAlgorithm,
  CertificateTrackingMode,
  type Certificate,
  type CertificateFilterParams,
  type LiveTlsProbeResult,
} from '@clm/shared-types';
import { type CreateCertificateDto } from './dto/create-certificate.dto';

@Injectable()
export class CertificatesRepository {
  constructor(private readonly tenantContextService: TenantContextService) { }

  async findAll(tenantId: string, filters?: CertificateFilterParams): Promise<Certificate[]> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      let query = 'SELECT * FROM certificates WHERE tenant_id = $1';
      const params: any[] = [tenantId];

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
      const res = await client.query(
        'SELECT * FROM certificates WHERE id = $1 AND tenant_id = $2;',
        [id, tenantId],
      );
      if (res.rows.length === 0) return null;
      return this.mapRowToCertificate(res.rows[0]);
    });
  }

  async create(tenantId: string, dto: CreateCertificateDto): Promise<Certificate> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const tenantCheck = await client.query(
        'SELECT status, tier, max_certificates FROM tenants WHERE id = $1;',
        [tenantId],
      );
      const tenantRow = tenantCheck.rows[0];
      if (tenantRow?.status === 'PENDING_APPROVAL') {
        throw new ForbiddenException('Certificate issuance is locked. Organization is pending security review.');
      }

      // Check tier quota limit strictly for this tenant
      const countRes = await client.query(
        'SELECT COUNT(*) FROM certificates WHERE tenant_id = $1 AND status != $2;',
        [tenantId, CertStatus.REVOKED],
      );
      const currentActiveCount = parseInt(countRes.rows[0].count, 10) || 0;
      const maxAllowed = tenantRow?.max_certificates || 50;

      if (currentActiveCount >= maxAllowed) {
        throw new ForbiddenException(
          `Certificate quota limit reached (${currentActiveCount}/${maxAllowed}). Free Community plan allows up to 50 active certificates. Please upgrade to Professional or Enterprise plan.`,
        );
      }

      const notBefore = dto.notBefore ? new Date(dto.notBefore) : new Date();
      const notAfter = dto.notAfter ? new Date(dto.notAfter) : new Date(Date.now() + 90 * 86400000);
      const serialNumber = dto.serialNumber || Math.random().toString(16).substring(2, 18);
      const fingerprint = dto.fingerprintSha256 || Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const issuer = dto.issuer || 'DigiCert TLS RSA CA';

      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      let status = CertStatus.ACTIVE;
      if (daysRemaining <= 0) {
        status = CertStatus.EXPIRED;
      } else if (daysRemaining <= 30) {
        status = CertStatus.EXPIRING_SOON;
      }

      const trackingMode = dto.trackingMode || CertificateTrackingMode.MANAGED_GATEWAY;

      const res = await client.query(
        `INSERT INTO certificates (
          tenant_id, domain, sans, status, key_algorithm, tracking_mode, issuer,
          serial_number, fingerprint_sha256, not_before, not_after,
          auto_renew, renew_before_days, gateway_id, ca_integration_id, cloud_account_id, deployment_target_type, certificate_pem
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *;`,
        [
          tenantId,
          dto.domain,
          dto.sans || [dto.domain],
          status,
          dto.keyAlgorithm || KeyAlgorithm.RSA_2048,
          trackingMode,
          issuer,
          serialNumber,
          fingerprint,
          notBefore.toISOString(),
          notAfter.toISOString(),
          dto.autoRenew ?? true,
          dto.renewBeforeDays ?? 30,
          dto.gatewayId || null,
          dto.caIntegrationId || null,
          dto.cloudAccountId || null,
          dto.deploymentTargetType || 'GATEWAY',
          dto.certificatePem || null,
        ],
      );

      return this.mapRowToCertificate(res.rows[0]);
    });
  }

  async upsertDiscovered(
    tenantId: string,
    data: {
      domain: string;
      sans?: string[];
      status?: CertStatus;
      keyAlgorithm?: KeyAlgorithm;
      trackingMode?: CertificateTrackingMode;
      issuer: string;
      serialNumber?: string;
      fingerprintSha256?: string;
      notBefore: Date;
      notAfter: Date;
      autoRenew?: boolean;
      renewBeforeDays?: number;
    },
  ): Promise<{ cert: Certificate; isNew: boolean }> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const existing = await client.query(
        'SELECT id, tracking_mode FROM certificates WHERE tenant_id = $1 AND domain = $2 LIMIT 1;',
        [tenantId, data.domain],
      );

      const notBefore = data.notBefore;
      const notAfter = data.notAfter;
      const daysRemaining = Math.max(0, Math.ceil((notAfter.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      let status = data.status || CertStatus.ACTIVE;
      if (daysRemaining <= 0) {
        status = CertStatus.EXPIRED;
      } else if (daysRemaining <= 30) {
        status = CertStatus.EXPIRING_SOON;
      }

      const trackingMode =
        data.trackingMode ||
        (data.issuer.includes('Amazon') || data.issuer.includes('AWS')
          ? CertificateTrackingMode.MANAGED_CLOUD
          : CertificateTrackingMode.MANAGED_GATEWAY);

      if (existing.rows.length > 0) {
        const id = existing.rows[0].id;
        const res = await client.query(
          `UPDATE certificates
           SET sans = $1, status = $2, key_algorithm = $3, tracking_mode = $4, issuer = $5,
               serial_number = $6, fingerprint_sha256 = $7, not_before = $8, not_after = $9,
               updated_at = NOW()
           WHERE id = $10 AND tenant_id = $11
           RETURNING *;`,
          [
            data.sans || [data.domain],
            status,
            data.keyAlgorithm || KeyAlgorithm.RSA_2048,
            trackingMode,
            data.issuer,
            data.serialNumber || Math.random().toString(16).substring(2, 18),
            data.fingerprintSha256 || Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            notBefore.toISOString(),
            notAfter.toISOString(),
            id,
            tenantId,
          ],
        );
        return { cert: this.mapRowToCertificate(res.rows[0]), isNew: false };
      } else {
        const tenantCheck = await client.query('SELECT tier, max_certificates FROM tenants WHERE id = $1;', [tenantId]);
        const tenantRow = tenantCheck.rows[0];
        const countRes = await client.query('SELECT COUNT(*) FROM certificates WHERE tenant_id = $1 AND status != $2;', [tenantId, CertStatus.REVOKED]);
        const currentActiveCount = parseInt(countRes.rows[0].count, 10) || 0;
        const maxAllowed = tenantRow?.max_certificates || 50;

        if (currentActiveCount >= maxAllowed) {
          throw new ForbiddenException(
            `Certificate monitoring quota limit reached (${currentActiveCount}/${maxAllowed}). Your ${tenantRow?.tier || 'COMMUNITY'} plan has reached its capacity. Please upgrade to a higher plan to monitor more domains.`,
          );
        }

        const res = await client.query(
          `INSERT INTO certificates (
            tenant_id, domain, sans, status, key_algorithm, tracking_mode, issuer,
            serial_number, fingerprint_sha256, not_before, not_after,
            auto_renew, renew_before_days
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *;`,
          [
            tenantId,
            data.domain,
            data.sans || [data.domain],
            status,
            data.keyAlgorithm || KeyAlgorithm.RSA_2048,
            trackingMode,
            data.issuer,
            data.serialNumber || Math.random().toString(16).substring(2, 18),
            data.fingerprintSha256 || Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            notBefore.toISOString(),
            notAfter.toISOString(),
            data.autoRenew ?? true,
            data.renewBeforeDays ?? 30,
          ],
        );
        return { cert: this.mapRowToCertificate(res.rows[0]), isNew: true };
      }
    });
  }

  async updateFromLiveProbe(
    tenantId: string,
    id: string,
    liveData: LiveTlsProbeResult,
  ): Promise<Certificate | null> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const notBefore = new Date(liveData.notBefore);
      const notAfter = new Date(liveData.notAfter);
      const daysRemaining = Math.max(0, Math.ceil((notAfter.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      let status = CertStatus.ACTIVE;
      if (daysRemaining <= 0) status = CertStatus.EXPIRED;
      else if (daysRemaining <= 30) status = CertStatus.EXPIRING_SOON;

      const res = await client.query(
        `UPDATE certificates
         SET issuer = $1, serial_number = $2, fingerprint_sha256 = $3,
             not_before = $4, not_after = $5, sans = $6, status = $7,
             tracking_mode = 'MONITORED', updated_at = NOW()
         WHERE id = $8 AND tenant_id = $9
         RETURNING *;`,
        [
          liveData.issuer,
          liveData.serialNumber,
          liveData.fingerprintSha256,
          notBefore.toISOString(),
          notAfter.toISOString(),
          liveData.sans || [liveData.domain],
          status,
          id,
          tenantId,
        ],
      );

      if (res.rows.length === 0) return null;
      return this.mapRowToCertificate(res.rows[0]);
    });
  }

  async renew(
    tenantId: string,
    id: string,
        issuedData ?: {
          notBefore?: string;
          notAfter?: string;
          serialNumber?: string;
          issuer?: string;
          fingerprintSha256?: string;
          caIntegrationId?: string;
          certificatePem?: string;
        },
      ): Promise<Certificate | null>{
        return this.tenantContextService.withTenantContext(tenantId, async client => {
          const check = await client.query(
            'SELECT tracking_mode, domain, ca_integration_id FROM certificates WHERE id = $1 AND tenant_id = $2;',
            [id, tenantId],
          );

          if (check.rows.length === 0) {
            return null;
          }

          if (check.rows[0].tracking_mode === CertificateTrackingMode.MONITORED) {
            throw new ForbiddenException(
              `Domain "${check.rows[0].domain}" is an external monitored domain. Renewal must be performed on the origin host (e.g. Vercel, GitHub). Use "Re-Probe Live Server" to sync live server updates.`,
            );
          }

          const notBefore = issuedData?.notBefore || new Date().toISOString();
          const notAfter = issuedData?.notAfter || new Date(Date.now() + 90 * 86400000).toISOString();

      const res = await client.query(
        `UPDATE certificates
         SET status = $1,
            not_before = $2,
            not_after = $3,
            serial_number = COALESCE($4, serial_number),
            issuer = COALESCE($5, issuer),
            fingerprint_sha256 = COALESCE($6, fingerprint_sha256),
            ca_integration_id = COALESCE($7, ca_integration_id),
            certificate_pem = COALESCE($8, certificate_pem),
            last_renewed_at = NOW(),
            updated_at = NOW()
         WHERE id = $9 AND tenant_id = $10
         RETURNING *; `,
        [
          CertStatus.ACTIVE,
          notBefore,
          notAfter,
          issuedData?.serialNumber || null,
          issuedData?.issuer || null,
          issuedData?.fingerprintSha256 || null,
          issuedData?.caIntegrationId || null,
          issuedData?.certificatePem || null,
          id,
          tenantId,
        ],
      );

      if (res.rows.length === 0) return null;
      return this.mapRowToCertificate(res.rows[0]);
    });
  }

  async updateBinding(
    tenantId: string,
    id: string,
    data: { caIntegrationId?: string | null; gatewayId?: string | null; autoRenew?: boolean; renewBeforeDays?: number },
  ): Promise<Certificate | null> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const sets: string[] = [];
      const values: any[] = [];

      if (data.caIntegrationId !== undefined) {
        values.push(data.caIntegrationId);
        sets.push(`ca_integration_id = $${ values.length } `);
      }
      if (data.gatewayId !== undefined) {
        values.push(data.gatewayId);
        sets.push(`gateway_id = $${ values.length } `);
      }
      if (data.autoRenew !== undefined) {
        values.push(data.autoRenew);
        sets.push(`auto_renew = $${ values.length } `);
      }
      if (data.renewBeforeDays !== undefined) {
        values.push(data.renewBeforeDays);
        sets.push(`renew_before_days = $${ values.length } `);
      }

      if (sets.length === 0) {
        const existing = await client.query('SELECT * FROM certificates WHERE id = $1 AND tenant_id = $2;', [id, tenantId]);
        return existing.rows.length > 0 ? this.mapRowToCertificate(existing.rows[0]) : null;
      }

      sets.push('updated_at = NOW()');
      values.push(id, tenantId);

          const query = `
        UPDATE certificates
        SET ${sets.join(', ')}
        WHERE id = $${values.length - 1} AND tenant_id = $${values.length}
        RETURNING *;
      `;

      const res = await client.query(query, values);
      if (res.rows.length === 0) return null;
      return this.mapRowToCertificate(res.rows[0]);
    });
  }

  async revoke(tenantId: string, id: string, reason?: string): Promise<Certificate | null> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        `UPDATE certificates
         SET status = $1,
        revocation_reason = $2,
        revoked_at = NOW(),
        auto_renew = false,
        updated_at = NOW()
         WHERE id = $3 AND tenant_id = $4
         RETURNING *; `,
        [CertStatus.REVOKED, reason || 'UNSPECIFIED', id, tenantId],
      );
      if (res.rows.length === 0) return null;
      return this.mapRowToCertificate(res.rows[0]);
    });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        'DELETE FROM certificates WHERE id = $1 AND tenant_id = $2;',
        [id, tenantId],
      );
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
      trackingMode: (row.tracking_mode || CertificateTrackingMode.MANAGED_GATEWAY) as CertificateTrackingMode,
      issuer: row.issuer,
      serialNumber: row.serial_number,
      fingerprintSha256: row.fingerprint_sha256,
      notBefore: row.not_before instanceof Date ? row.not_before.toISOString() : row.not_before,
      notAfter: row.not_after instanceof Date ? row.not_after.toISOString() : row.not_after,
      daysRemaining,
      autoRenew: row.auto_renew,
      renewBeforeDays: row.renew_before_days,
      gatewayId: row.gateway_id,
      caIntegrationId: row.ca_integration_id,
      cloudAccountId: row.cloud_account_id,
      deploymentTargetType: row.deployment_target_type || 'GATEWAY',
      revocationReason: row.revocation_reason || null,
      revokedAt: row.revoked_at instanceof Date ? row.revoked_at.toISOString() : row.revoked_at || null,
      deployTargetCount: 1,
      certificatePem: row.certificate_pem || null,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    };
  }
}

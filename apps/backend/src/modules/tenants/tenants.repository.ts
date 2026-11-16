import { Injectable, Logger } from '@nestjs/common';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { TenantStatus, SubscriptionTier, Role, UserStatus, type Tenant } from '@clm/shared-types';
import { type CreateTenantDto } from './dto/create-tenant.dto';
import { type UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsRepository {
  private readonly logger = new Logger(TenantsRepository.name);

  constructor(private readonly tenantContextService: TenantContextService) {}

  async create(dto: CreateTenantDto, passwordHash: string): Promise<Tenant> {
    return this.tenantContextService.withSystemContext(async client => {
      // 1. Insert Tenant record
      const tenantRes = await client.query(
        `INSERT INTO tenants (
          name, slug, status, tier, max_certificates, max_gateways, aws_account_id, aws_customer_identifier
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;`,
        [
          dto.name,
          dto.slug,
          TenantStatus.ACTIVE,
          dto.tier || SubscriptionTier.ENTERPRISE,
          dto.maxCertificates || 50,
          dto.maxGateways || 5,
          dto.awsAccountId || null,
          dto.awsCustomerIdentifier || null,
        ],
      );

      const row = tenantRes.rows[0];

      // Set the tenant session context so inserting into tenant-scoped RLS tables (users) passes WITH CHECK
      await client.query('SELECT set_config($1, $2, true);', ['app.tenant_id', row.id]);

      // 2. Provision Default Tenant Admin in users table
      await client.query(
        `INSERT INTO users (
          tenant_id, email, password_hash, first_name, last_name, role, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          row.id,
          dto.adminEmail,
          passwordHash,
          dto.adminFirstName,
          dto.adminLastName || '',
          Role.TENANT_ADMIN,
          UserStatus.ACTIVE,
        ],
      );

      this.logger.log(`Created new tenant '${dto.name}' (${row.id}) with admin '${dto.adminEmail}'`);
      return this.mapRowToTenant(row);
    });
  }

  async register(
    dto: {
      organizationName: string;
      slug: string;
      adminEmail: string;
      adminFirstName: string;
      adminLastName?: string;
      marketplaceProvider?: string;
      country?: string;
      state?: string;
      locality?: string;
      department?: string;
    },
    passwordHash: string,
  ): Promise<{ tenant: Tenant; adminUser: any }> {
    return this.tenantContextService.withSystemContext(async client => {
      const normalizedEmail = dto.adminEmail.toLowerCase().trim();

      // 0. Ensure email is strictly unique across all organizations
      const existingUserRes = await client.query(
        'SELECT id, tenant_id FROM users WHERE LOWER(email) = $1 LIMIT 1;',
        [normalizedEmail],
      );
      if (existingUserRes.rows.length > 0) {
        const error: any = new Error(
          `An account with email '${dto.adminEmail}' already exists. A single email cannot register multiple organizations. Please sign in instead.`,
        );
        error.code = '23505'; // Unique violation code
        throw error;
      }

      const orgMetadata = {
        organizationName: dto.organizationName,
        department: dto.department || '',
        country: (dto.country || '').substring(0, 2).toUpperCase(),
        state: dto.state || '',
        locality: dto.locality || '',
        contactEmail: normalizedEmail,
      };

      const settings = {
        defaultRenewalWindowDays: 30,
        emailAlerts: true,
        orgMetadata,
      };

      // 1. Insert Tenant with PENDING_APPROVAL status and user-submitted orgMetadata in settings
      const tenantRes = await client.query(
        `INSERT INTO tenants (
          name, slug, status, tier, max_certificates, max_gateways, settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;`,
        [
          dto.organizationName,
          dto.slug,
          TenantStatus.PENDING_APPROVAL,
          SubscriptionTier.COMMUNITY,
          50,
          2,
          JSON.stringify(settings),
        ],
      );

      const tenantRow = tenantRes.rows[0];

      // 2. Set context for RLS insert
      await client.query('SELECT set_config($1, $2, true);', ['app.tenant_id', tenantRow.id]);

      // 3. Create initial Admin user
      const userRes = await client.query(
        `INSERT INTO users (
          tenant_id, email, password_hash, first_name, last_name, role, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;`,
        [
          tenantRow.id,
          dto.adminEmail.toLowerCase().trim(),
          passwordHash,
          dto.adminFirstName,
          dto.adminLastName || '',
          Role.TENANT_ADMIN,
          UserStatus.ACTIVE,
        ],
      );

      const userRow = userRes.rows[0];
      return {
        tenant: this.mapRowToTenant(tenantRow),
        adminUser: {
          id: userRow.id,
          tenantId: userRow.tenant_id,
          email: userRow.email,
          firstName: userRow.first_name,
          lastName: userRow.last_name,
          role: userRow.role,
          status: userRow.status,
        },
      };
    });
  }

  async updateStatus(id: string, status: TenantStatus): Promise<Tenant | null> {
    return this.tenantContextService.withSystemContext(async client => {
      const res = await client.query(
        'UPDATE tenants SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *;',
        [status, id],
      );
      if (res.rows.length === 0) return null;
      return this.mapRowToTenant(res.rows[0]);
    });
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantContextService.withSystemContext(async client => {
      const res = await client.query('SELECT * FROM tenants ORDER BY created_at DESC;');
      return res.rows.map(r => this.mapRowToTenant(r));
    });
  }

  async getMetrics(): Promise<{
    totalTenants: number;
    activeTenants: number;
    pendingTenants: number;
    suspendedTenants: number;
    directTenants: number;
    marketplaceTenants: number;
    totalCertificates: number;
    totalGateways: number;
    usageByTenant: Array<{
      id: string;
      name: string;
      slug: string;
      tier: string;
      status: string;
      maxCertificates: number;
      maxGateways: number;
      currentCertificates: number;
      currentGateways: number;
      billingChannel: string;
      createdAt: string;
    }>;
  }> {
    return this.tenantContextService.withSystemContext(async client => {
      const usageRes = await client.query(`
        SELECT 
          t.id,
          t.name,
          t.slug,
          t.tier,
          t.status,
          t.max_certificates,
          t.max_gateways,
          t.aws_customer_identifier,
          t.aws_account_id,
          t.created_at,
          COALESCE(c.cert_count, 0)::int as current_certificates,
          COALESCE(g.gw_count, 0)::int as current_gateways
        FROM tenants t
        LEFT JOIN (
          SELECT tenant_id, COUNT(*) as cert_count FROM certificates GROUP BY tenant_id
        ) c ON t.id = c.tenant_id
        LEFT JOIN (
          SELECT tenant_id, COUNT(*) as gw_count FROM gateways GROUP BY tenant_id
        ) g ON t.id = g.tenant_id
        ORDER BY t.created_at DESC;
      `);

      const usageByTenant = usageRes.rows.map(r => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        tier: r.tier,
        status: r.status,
        maxCertificates: Number(r.max_certificates) || 50,
        maxGateways: Number(r.max_gateways) || 5,
        currentCertificates: Number(r.current_certificates) || 0,
        currentGateways: Number(r.current_gateways) || 0,
        billingChannel: r.aws_customer_identifier ? 'AWS_MARKETPLACE' : 'DIRECT',
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
      }));

      const totalTenants = usageByTenant.length;
      const activeTenants = usageByTenant.filter(t => t.status === 'ACTIVE').length;
      const pendingTenants = usageByTenant.filter(t => t.status === 'PENDING_APPROVAL').length;
      const suspendedTenants = usageByTenant.filter(t => t.status === 'SUSPENDED').length;
      const marketplaceTenants = usageByTenant.filter(t => t.billingChannel !== 'DIRECT').length;
      const directTenants = totalTenants - marketplaceTenants;
      const totalCertificates = usageByTenant.reduce((acc, t) => acc + t.currentCertificates, 0);
      const totalGateways = usageByTenant.reduce((acc, t) => acc + t.currentGateways, 0);

      return {
        totalTenants,
        activeTenants,
        pendingTenants,
        suspendedTenants,
        directTenants,
        marketplaceTenants,
        totalCertificates,
        totalGateways,
        usageByTenant,
      };
    });
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenantContextService.withSystemContext(async client => {
      const res = await client.query('SELECT * FROM tenants WHERE id = $1;', [id]);
      if (res.rows.length === 0) return null;
      return this.mapRowToTenant(res.rows[0]);
    });
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantContextService.withSystemContext(async client => {
      const res = await client.query('SELECT * FROM tenants WHERE slug = $1;', [slug]);
      if (res.rows.length === 0) return null;
      return this.mapRowToTenant(res.rows[0]);
    });
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant | null> {
    return this.tenantContextService.withSystemContext(async client => {
      const current = await this.findById(id);
      if (!current) return null;

      // Merge existing settings with newly provided settings
      let newSettings = typeof current.settings === 'string' 
        ? JSON.parse(current.settings) 
        : (current.settings || {});

      if (dto.settings) {
        const incomingSettings = typeof dto.settings === 'string'
          ? JSON.parse(dto.settings)
          : dto.settings;

        newSettings = {
          ...newSettings,
          ...incomingSettings,
          orgMetadata: {
            ...(newSettings.orgMetadata || {}),
            ...(incomingSettings.orgMetadata || {}),
          },
        };
      }

      const res = await client.query(
        `UPDATE tenants
         SET name = COALESCE($1, name),
             status = COALESCE($2, status),
             tier = COALESCE($3, tier),
             max_certificates = COALESCE($4, max_certificates),
             max_gateways = COALESCE($5, max_gateways),
             settings = $6,
             updated_at = NOW()
         WHERE id = $7
         RETURNING *;`,
        [
          dto.name,
          dto.status,
          dto.tier,
          dto.maxCertificates,
          dto.maxGateways,
          JSON.stringify(newSettings),
          id,
        ],
      );

      if (res.rows.length === 0) return null;
      return this.mapRowToTenant(res.rows[0]);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.tenantContextService.withSystemContext(async client => {
      const res = await client.query('DELETE FROM tenants WHERE id = $1;', [id]);
      return (res.rowCount ?? 0) > 0;
    });
  }

  private mapRowToTenant(row: any): Tenant {
    let parsedSettings = {};
    if (row.settings) {
      parsedSettings = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings;
    }

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status as TenantStatus,
      tier: row.tier as SubscriptionTier,
      maxCertificates: row.max_certificates,
      maxGateways: row.max_gateways,
      awsAccountId: row.aws_account_id,
      awsCustomerIdentifier: row.aws_customer_identifier,
      awsProductCode: row.aws_product_code,
      settings: parsedSettings,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    };
  }
}


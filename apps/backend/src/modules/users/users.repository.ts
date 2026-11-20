import { Injectable } from '@nestjs/common';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { Role, UserStatus, type User } from '@clm/shared-types';
import { type CreateUserDto } from './dto/create-user.dto';

export interface UserEntityWithPassword extends User {
  passwordHash: string;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly tenantContextService: TenantContextService) { }

  async findAll(tenantId: string): Promise<User[]> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        'SELECT * FROM users WHERE tenant_id = $1 ORDER BY created_at DESC;',
        [tenantId],
      );
      return res.rows.map(r => this.mapRowToUser(r));
    });
  }

  async findById(tenantId: string, id: string): Promise<User | null> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        'SELECT * FROM users WHERE id = $1 AND tenant_id = $2;',
        [id, tenantId],
      );
      if (res.rows.length === 0) return null;
      return this.mapRowToUser(res.rows[0]);
    });
  }

  async findByEmail(tenantId: string, email: string): Promise<UserEntityWithPassword | null> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        'SELECT * FROM users WHERE email = $1 AND tenant_id = $2;',
        [email.toLowerCase().trim(), tenantId],
      );
      if (res.rows.length === 0) return null;
      return this.mapRowToUserWithPassword(res.rows[0]);
    });
  }

  /**
   * System query used during initial login authentication before tenant context is set
   */
  async findByEmailGlobal(email: string): Promise<UserEntityWithPassword | null> {
    return this.tenantContextService.withSystemContext(async client => {
      const res = await client.query('SELECT * FROM users WHERE email = $1 LIMIT 1;', [
        email.toLowerCase().trim(),
      ]);
      if (res.rows.length === 0) return null;
      return this.mapRowToUserWithPassword(res.rows[0]);
    });
  }

  async create(tenantId: string, dto: CreateUserDto, passwordHash: string): Promise<User> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        `INSERT INTO users (
          tenant_id, email, password_hash, first_name, last_name, role, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;`,
        [
          tenantId,
          dto.email.toLowerCase().trim(),
          passwordHash,
          dto.firstName,
          dto.lastName,
          dto.role || Role.DEVOPS_ENGINEER,
          UserStatus.ACTIVE,
        ],
      );
      return this.mapRowToUser(res.rows[0]);
    });
  }

  async updateRole(tenantId: string, id: string, role: Role): Promise<User> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *;',
        [role, id, tenantId],
      );
      if (res.rows.length === 0) throw new Error('User not found');
      return this.mapRowToUser(res.rows[0]);
    });
  }

  async updateStatus(tenantId: string, id: string, status: UserStatus): Promise<User> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      const res = await client.query(
        'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *;',
        [status, id, tenantId],
      );
      if (res.rows.length === 0) throw new Error('User not found');
      return this.mapRowToUser(res.rows[0]);
    });
  }

  async updateLastLogin(tenantId: string, id: string): Promise<void> {
    return this.tenantContextService.withTenantContext(tenantId, async client => {
      await client.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1 AND tenant_id = $2;',
        [id, tenantId],
      );
    });
  }

  async updatePasswordGlobal(email: string, passwordHash: string): Promise<void> {
    return this.tenantContextService.withSystemContext(async client => {
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2;',
        [passwordHash, email.toLowerCase().trim()],
      );
    });
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role as Role,
      status: row.status as UserStatus,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : null,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    };
  }

  private mapRowToUserWithPassword(row: any): UserEntityWithPassword {
    return {
      ...this.mapRowToUser(row),
      passwordHash: row.password_hash,
    };
  }
}

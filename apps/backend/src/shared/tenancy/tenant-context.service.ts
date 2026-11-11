import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../database/database.module';

@Injectable()
export class TenantContextService {
  private readonly logger = new Logger(TenantContextService.name);

  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  /**
   * Executes a database operation within an isolated transaction scoped to a specific tenant ID.
   * PostgreSQL Row-Level Security (RLS) policy `tenant_isolation_policy` strictly verifies
   * that `tenant_id = current_setting('app.tenant_id', true)`.
   *
   * @param tenantId The UUID of the authenticated tenant organization
   * @param operation The database query callback receiving the scoped client
   */
  async withTenantContext<T>(
    tenantId: string,
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN;');

      // Securely set the PostgreSQL session variable for this transaction
      await client.query('SELECT set_config($1, $2, true);', ['app.tenant_id', tenantId]);

      const result = await operation(client);

      await client.query('COMMIT;');
      return result;
    } catch (error) {
      await client.query('ROLLBACK;').catch(rbErr => {
        this.logger.error('Failed to rollback transaction', rbErr);
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Executes a global system query (e.g. initial login authentication, platform admin reading tenant directory).
   * Runs via the primary pool with app.is_system flag in 7ms to allow system-level queries across tenant boundaries.
   */
  async withSystemContext<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN;');
      await client.query("SELECT set_config('app.is_system', 'true', true);");
      const result = await operation(client);
      await client.query('COMMIT;');
      return result;
    } catch (error) {
      await client.query('ROLLBACK;').catch(rbErr => {
        this.logger.error('Failed to rollback transaction', rbErr);
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

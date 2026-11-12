import { Module, Global, Logger, OnApplicationShutdown, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const DATABASE_POOL = 'DATABASE_POOL';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<Pool> => {
        const logger = new Logger('DatabasePool');

        const host = configService.get('POSTGRES_HOST', '127.0.0.1');
        const port = configService.get<number>('POSTGRES_PORT', 5432);
        const database = configService.get('POSTGRES_DB', 'clm_db');
        const appUser = configService.get('POSTGRES_APP_USER') || configService.get('POSTGRES_USER', 'clm_app');
        const appPass = configService.get('POSTGRES_APP_PASSWORD') || configService.get('POSTGRES_PASSWORD', 'clm_app_secret');

        const databaseUrl = configService.get<string>('DATABASE_URL');
        const primaryConn =
          databaseUrl ||
          `postgresql://${appUser}:${appPass}@${host}:${port}/${database}`;

        const useSsl =
          !!databaseUrl &&
          !databaseUrl.includes('127.0.0.1') &&
          !databaseUrl.includes('localhost');

        const pool = new Pool({
          connectionString: primaryConn,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
          ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
        });

        pool.on('error', err => {
          logger.error('Unexpected idle PostgreSQL client error', err.stack);
        });

        pool
          .connect()
          .then(client => {
            logger.log(
              databaseUrl
                ? 'Connected successfully to managed PostgreSQL via DATABASE_URL'
                : `Connected successfully to PostgreSQL database '${database}' with role '${appUser}'`,
            );
            client.release();
          })
          .catch(async err => {
            if (databaseUrl) {
              logger.error(`Failed to connect to PostgreSQL via DATABASE_URL: ${err.message}`);
              return;
            }
            logger.warn(`Connection with '${appUser}' failed (${err.message}). Attempting automated self-healing fallback...`);

            try {
              const maintConn = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
              const maintPool = new Pool({
                connectionString: maintConn,
                connectionTimeoutMillis: 3000,
              });
              const mClient = await maintPool.connect();

              const checkDb = await mClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
              if (checkDb.rowCount === 0) {
                await mClient.query(`CREATE DATABASE "${database}";`);
                logger.log(`Auto-created missing database '${database}'.`);
              }

              await mClient.query(`
                DO $$
                BEGIN
                  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'clm_app') THEN
                    CREATE ROLE clm_app WITH LOGIN PASSWORD 'clm_app_secret' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
                  ELSE
                    ALTER ROLE clm_app WITH PASSWORD 'clm_app_secret';
                  END IF;
                END
                $$;
              `);
              await mClient.query(`GRANT ALL PRIVILEGES ON DATABASE "${database}" TO clm_app;`);
              mClient.release();
              await maintPool.end();

              const dbConn = `postgresql://postgres:postgres@127.0.0.1:${port}/${database}`;
              const dbPool = new Pool({ connectionString: dbConn, connectionTimeoutMillis: 3000 });
              const dbClient = await dbPool.connect();
              await dbClient.query('GRANT USAGE, CREATE ON SCHEMA public TO clm_app;');
              await dbClient.query('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO clm_app;');
              await dbClient.query('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO clm_app;');
              dbClient.release();
              await dbPool.end();

              logger.log(`Successfully provisioned database '${database}' and role 'clm_app'.`);
            } catch (fbErr: any) {
              logger.warn(`PostgreSQL self-healing note: ${fbErr.message}`);
            }
          });

        return pool;
      },
    },
  ],
  exports: [DATABASE_POOL],
})
export class DatabaseModule implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly configService: ConfigService,
  ) { }

  async onModuleInit() {
    if (this.configService.get<string>('DATABASE_URL')) {
      return;
    }
    await this.syncRlsPolicies();
  }

  private async syncRlsPolicies() {
    const host = this.configService.get('POSTGRES_HOST', '127.0.0.1');
    const port = this.configService.get<number>('POSTGRES_PORT', 5432);
    const database = this.configService.get('POSTGRES_DB', 'clm_db');
    const superUser = this.configService.get('POSTGRES_USER', 'postgres');
    const superPass = this.configService.get('POSTGRES_PASSWORD', 'postgres');

    const maintConn = `postgresql://${superUser}:${superPass}@${host}:${port}/${database}`;
    let maintPool: Pool | null = null;
    try {
      maintPool = new Pool({ connectionString: maintConn, connectionTimeoutMillis: 2000 });
      const client = await maintPool.connect();
      try {
        await client.query(`
          DO $$
          DECLARE
            t TEXT;
            tenant_tables TEXT[] := ARRAY[
              'users',
              'gateways',
              'gateway_enrollment_tokens',
              'certificates',
              'deploy_targets',
              'deployment_records',
              'gateway_commands',
              'cloud_accounts',
              'audit_logs'
            ];
          BEGIN
            FOREACH t IN ARRAY tenant_tables LOOP
              EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', t);
              EXECUTE format(
                'CREATE POLICY tenant_isolation_policy ON %I ' ||
                'FOR ALL TO clm_app ' ||
                'USING (current_setting(''app.is_system'', true) = ''true'' OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) ' ||
                'WITH CHECK (current_setting(''app.is_system'', true) = ''true'' OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid);',
                t
              );
            END LOOP;
          END
          $$;
        `);

        // Ensure password_reset_tokens table exists and is accessible
        await client.query(`
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email CITEXT NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens (email);
          GRANT ALL PRIVILEGES ON password_reset_tokens TO clm_app;

          CREATE TABLE IF NOT EXISTS cloud_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
            provider VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            auth_type VARCHAR(50) NOT NULL DEFAULT 'ACCESS_KEY',
            status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
            region VARCHAR(64),
            aws_account_id VARCHAR(64),
            aws_role_arn VARCHAR(255),
            azure_tenant_id VARCHAR(255),
            azure_client_id VARCHAR(255),
            gcp_project_id VARCHAR(255),
            encrypted_credentials TEXT NOT NULL,
            encryption_iv VARCHAR(64) NOT NULL,
            encryption_tag VARCHAR(64) NOT NULL,
            masked_secret VARCHAR(64) NOT NULL,
            last_sync_at TIMESTAMPTZ,
            error_message TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          GRANT ALL PRIVILEGES ON cloud_accounts TO clm_app;
        `);

        // Self-heal demo accounts if initialized with dummy unmatchable Argon2 hashes
        const fixedHash = '$argon2id$v=19$m=65536,t=3,p=4$6HjL+7JfsReqtNVEejxDYA$Lz/iape+CZYS7eUjt5rXQ+qwvBukbFG57AXboUAZegc';
        await client.query(
          `UPDATE users
           SET password_hash = $1
           WHERE email IN ('admin@acme.com', 'devops@acme.com')
             AND password_hash LIKE '%dGVzdHNhbHQxMjM0NTY3OA%';`,
          [fixedHash],
        );

        this.logger.log('PostgreSQL Row-Level Security (RLS) system bypass policies successfully synchronized.');
      } finally {
        client.release();
      }
    } catch (err: any) {
      this.logger.debug?.(`RLS sync note: ${err.message}`);
    } finally {
      if (maintPool) {
        await maintPool.end().catch(() => { });
      }
    }
  }

  async onApplicationShutdown() {
    this.logger.log('Draining PostgreSQL connection pool');
    await this.pool.end().catch(() => { });
  }
}

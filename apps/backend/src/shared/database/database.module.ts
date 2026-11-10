import { Module, Global, Logger, OnApplicationShutdown, Inject } from '@nestjs/common';
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

        const primaryConn =
          configService.get<string>('DATABASE_URL') ||
          `postgresql://${appUser}:${appPass}@${host}:${port}/${database}`;

        const pool = new Pool({
          connectionString: primaryConn,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 3000,
        });

        pool.on('error', err => {
          logger.error('Unexpected idle PostgreSQL client error', err.stack);
        });

        // Test primary connection, auto-fallback to postgres:postgres if credentials mismatch
        pool
          .connect()
          .then(client => {
            logger.log(`Connected successfully to PostgreSQL database '${database}' with role '${appUser}'`);
            client.release();
          })
          .catch(async err => {
            logger.warn(`Connection with '${appUser}' failed (${err.message}). Attempting automated self-healing fallback...`);

            try {
              // 1. Connect to the default maintenance DB ('postgres') to provision clm_db and roles
              const maintConn = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
              const maintPool = new Pool({
                connectionString: maintConn,
                connectionTimeoutMillis: 3000,
              });
              const mClient = await maintPool.connect();

              // Auto-create clm_db if it does not exist
              const checkDb = await mClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
              if (checkDb.rowCount === 0) {
                await mClient.query(`CREATE DATABASE "${database}";`);
                logger.log(`Auto-created missing database '${database}'.`);
              }

              // Ensure clm_app role exists with correct password
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

              // 2. Connect into clm_db and ensure schemas are initialized
              const dbConn = `postgresql://postgres:postgres@127.0.0.1:${port}/${database}`;
              const dbPool = new Pool({ connectionString: dbConn, connectionTimeoutMillis: 3000 });
              const dbClient = await dbPool.connect();
              await dbClient.query('GRANT USAGE, CREATE ON SCHEMA public TO clm_app;');
              await dbClient.query('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO clm_app;');
              await dbClient.query('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO clm_app;');
              dbClient.release();
              await dbPool.end();

              logger.log(`Successfully provisioned database '${database}' and role 'clm_app'. Ready for application queries.`);
            } catch (fbErr: any) {
              logger.warn(
                `PostgreSQL is currently unreachable (${fbErr.message}). When Docker is started, database connections will automatically connect.`,
              );
            }
          });

        return pool;
      },
    },
  ],
  exports: [DATABASE_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) { }

  async onApplicationShutdown() {
    this.logger.log('Draining PostgreSQL connection pool');
    await this.pool.end();
  }
}


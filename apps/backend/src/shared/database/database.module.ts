import { Module, Global, Logger, OnApplicationShutdown } from '@nestjs/common';
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

        const connectionString =
          configService.get<string>('DATABASE_URL') ||
          `postgresql://${configService.get('POSTGRES_USER', 'clm_app')}:${configService.get(
            'POSTGRES_PASSWORD',
            'clm_app_secret',
          )}@${configService.get('POSTGRES_HOST', 'localhost')}:${configService.get(
            'POSTGRES_PORT',
            5432,
          )}/${configService.get('POSTGRES_DB', 'clm_db')}`;

        const pool = new Pool({
          connectionString,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 3000,
        });

        pool.on('error', err => {
          logger.error('Unexpected idle PostgreSQL client error', err.stack);
        });

        // Test connection non-blocking on startup
        pool
          .connect()
          .then(client => {
            logger.log('Connected successfully to PostgreSQL database with RLS role');
            client.release();
          })
          .catch(err => {
            logger.warn(
              `PostgreSQL is currently unreachable (${err.message}). When Docker is started, database connections will automatically connect.`,
            );
          });

        return pool;
      },
    },
  ],
  exports: [DATABASE_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@DATABASE_POOL private readonly pool: Pool) {}

  async onApplicationShutdown() {
    this.logger.log('Draining PostgreSQL connection pool');
    await this.pool.end();
  }
}


import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './shared/health/health.module';
import { DatabaseModule } from './shared/database/database.module';
import { TenancyModule } from './shared/tenancy/tenancy.module';
import { CryptoModule } from './shared/crypto/crypto.module';
import { MailModule } from './shared/mail/mail.module';
import { AuthModule } from './shared/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { GatewaysModule } from './modules/gateways/gateways.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { PlansModule } from './modules/plans/plans.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { CloudAccountsModule } from './modules/cloud-accounts/cloud-accounts.module';
import { LifecycleSchedulerModule } from './modules/lifecycle-scheduler/lifecycle-scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/backend/.env', '.env'],
    }),
    DatabaseModule,
    TenancyModule,
    CryptoModule,
    MailModule,
    AuthModule,
    HealthModule,
    UsersModule,
    TenantsModule,
    PlansModule,
    CertificatesModule,
    GatewaysModule,
    AuditLogsModule,
    CloudAccountsModule,
    LifecycleSchedulerModule,
  ],
})
export class AppModule { }


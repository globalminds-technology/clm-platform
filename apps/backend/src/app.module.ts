import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './shared/health/health.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { GatewaysModule } from './modules/gateways/gateways.module';
import { TenantsModule } from './modules/tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    CertificatesModule,
    GatewaysModule,
    TenantsModule,
  ],
})
export class AppModule {}


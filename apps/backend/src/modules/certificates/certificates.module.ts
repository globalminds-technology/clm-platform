import { Module, forwardRef } from '@nestjs/common';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificatesRepository } from './certificates.repository';
import { CaDriverService } from './ca-driver.service';
import { TenancyModule } from '../../shared/tenancy/tenancy.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CryptoModule } from '../../shared/crypto/crypto.module';
import { CloudAccountsModule } from '../cloud-accounts/cloud-accounts.module';
import { TenantsModule } from '../tenants/tenants.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { CaIntegrationsModule } from '../ca-integrations/ca-integrations.module';

@Module({
  imports: [
    TenancyModule,
    AuditLogsModule,
    CryptoModule,
    forwardRef(() => CloudAccountsModule),
    TenantsModule,
    GatewaysModule,
    CaIntegrationsModule,
  ],
  controllers: [CertificatesController],
  providers: [CertificatesService, CertificatesRepository, CaDriverService],
  exports: [CertificatesService, CertificatesRepository, CaDriverService],
})
export class CertificatesModule { }

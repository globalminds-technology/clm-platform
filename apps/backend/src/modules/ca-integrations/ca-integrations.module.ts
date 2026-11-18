import { Module } from '@nestjs/common';
import { CaIntegrationsController } from './ca-integrations.controller';
import { CaIntegrationsService } from './ca-integrations.service';
import { CaIntegrationsRepository } from './ca-integrations.repository';
import { CryptoModule } from '../../shared/crypto/crypto.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [CryptoModule, AuditLogsModule],
  controllers: [CaIntegrationsController],
  providers: [CaIntegrationsService, CaIntegrationsRepository],
  exports: [CaIntegrationsService, CaIntegrationsRepository],
})
export class CaIntegrationsModule {}

import { Module, forwardRef } from '@nestjs/common';
import { CloudAccountsController } from './cloud-accounts.controller';
import { CloudAccountsService } from './cloud-accounts.service';
import { CloudAccountsRepository } from './cloud-accounts.repository';
import { CryptoModule } from '../../shared/crypto/crypto.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [CryptoModule, forwardRef(() => CertificatesModule), AuditLogsModule],
  controllers: [CloudAccountsController],
  providers: [CloudAccountsService, CloudAccountsRepository],
  exports: [CloudAccountsService, CloudAccountsRepository],
})
export class CloudAccountsModule {}



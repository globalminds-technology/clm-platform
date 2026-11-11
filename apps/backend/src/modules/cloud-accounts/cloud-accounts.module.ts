import { Module } from '@nestjs/common';
import { CloudAccountsController } from './cloud-accounts.controller';
import { CloudAccountsService } from './cloud-accounts.service';
import { CloudAccountsRepository } from './cloud-accounts.repository';
import { CryptoModule } from '../../shared/crypto/crypto.module';

@Module({
  imports: [CryptoModule],
  controllers: [CloudAccountsController],
  providers: [CloudAccountsService, CloudAccountsRepository],
  exports: [CloudAccountsService, CloudAccountsRepository],
})
export class CloudAccountsModule {}


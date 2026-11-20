import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TenancyModule } from '../../shared/tenancy/tenancy.module';
import { CryptoModule } from '../../shared/crypto/crypto.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [TenancyModule, CryptoModule, AuditLogsModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService],
  exports: [UsersRepository, UsersService],
})
export class UsersModule { }


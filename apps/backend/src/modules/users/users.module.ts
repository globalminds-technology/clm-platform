import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TenancyModule } from '../../shared/tenancy/tenancy.module';
import { CryptoModule } from '../../shared/crypto/crypto.module';

@Module({
  imports: [TenancyModule, CryptoModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService],
  exports: [UsersRepository, UsersService],
})
export class UsersModule {}


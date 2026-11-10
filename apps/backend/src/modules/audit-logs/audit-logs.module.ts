import { Module } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsRepository } from './audit-logs.repository';
import { TenancyModule } from '../../shared/tenancy/tenancy.module';

@Module({
  imports: [TenancyModule],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditLogsRepository],
  exports: [AuditLogsService, AuditLogsRepository],
})
export class AuditLogsModule {}


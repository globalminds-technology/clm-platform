import { Module } from '@nestjs/common';
import { TenancyModule } from '../../shared/tenancy/tenancy.module';
import { MailModule } from '../../shared/mail/mail.module';
import { LifecycleSchedulerService } from './lifecycle-scheduler.service';
import { LifecycleSchedulerController } from './lifecycle-scheduler.controller';

@Module({
  imports: [TenancyModule, MailModule],
  controllers: [LifecycleSchedulerController],
  providers: [LifecycleSchedulerService],
  exports: [LifecycleSchedulerService],
})
export class LifecycleSchedulerModule {}


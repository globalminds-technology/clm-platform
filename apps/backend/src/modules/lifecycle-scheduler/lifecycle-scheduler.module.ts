import { Module, forwardRef } from '@nestjs/common';
import { TenancyModule } from '../../shared/tenancy/tenancy.module';
import { MailModule } from '../../shared/mail/mail.module';
import { LifecycleSchedulerService } from './lifecycle-scheduler.service';
import { LifecycleSchedulerController } from './lifecycle-scheduler.controller';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
  imports: [
    TenancyModule,
    MailModule,
    forwardRef(() => CertificatesModule),
  ],
  controllers: [LifecycleSchedulerController],
  providers: [LifecycleSchedulerService],
  exports: [LifecycleSchedulerService],
})
export class LifecycleSchedulerModule {}


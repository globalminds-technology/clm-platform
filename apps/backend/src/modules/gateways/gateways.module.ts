import { Module } from '@nestjs/common';
import { GatewaysController } from './gateways.controller';
import { GatewayIngressController } from './gateway-ingress.controller';
import { GatewaysService } from './gateways.service';
import { GatewaysRepository } from './gateways.repository';
import { TenancyModule } from '../../shared/tenancy/tenancy.module';
import { CryptoModule } from '../../shared/crypto/crypto.module';

@Module({
  imports: [TenancyModule, CryptoModule],
  controllers: [GatewaysController, GatewayIngressController],
  providers: [GatewaysService, GatewaysRepository],
  exports: [GatewaysService, GatewaysRepository],
})
export class GatewaysModule { }

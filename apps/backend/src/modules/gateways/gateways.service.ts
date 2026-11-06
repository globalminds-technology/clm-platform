import { Injectable, NotFoundException } from '@nestjs/common';
import {
  GatewayStatus,
  DeployTargetType,
  type Gateway,
  type EnrollmentTokenResponse,
} from '@clm/shared-types';
import { type EnrollGatewayDto } from './dto/enroll-gateway.dto';

@Injectable()
export class GatewaysService {
  private gateways: Gateway[] = [
    {
      id: 'g0000000-0000-0000-0000-000000000001',
      tenantId: 'a0000000-0000-0000-0000-000000000001',
      name: 'us-east-1-prod-gateway',
      hostname: 'gw-prod-01.acme.internal',
      ipAddress: '10.0.1.15',
      version: '1.0.0',
      status: GatewayStatus.ONLINE,
      targetTypesSupported: [DeployTargetType.AWS_ACM, DeployTargetType.AWS_ALB, DeployTargetType.NGINX],
      labels: { env: 'production', region: 'us-east-1' },
      lastHeartbeatAt: new Date().toISOString(),
      enrolledAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  findAll(): Gateway[] {
    return this.gateways;
  }

  findById(id: string): Gateway {
    const gw = this.gateways.find(g => g.id === id);
    if (!gw) {
      throw new NotFoundException(`Gateway with ID '${id}' not found`);
    }
    return gw;
  }

  createEnrollmentToken(
    dto: EnrollGatewayDto,
    tenantId = 'a0000000-0000-0000-0000-000000000001',
  ): EnrollmentTokenResponse {
    const newGatewayId = `g${Date.now()}`;
    const token = `clm_enroll_${Buffer.from(`${tenantId}:${newGatewayId}:${Date.now()}`).toString('base64url')}`;

    const newGateway: Gateway = {
      id: newGatewayId,
      tenantId,
      name: dto.name,
      hostname: 'pending-connection',
      ipAddress: '0.0.0.0',
      version: 'unknown',
      status: GatewayStatus.ENROLLING,
      targetTypesSupported: dto.targetTypesSupported ?? [DeployTargetType.AWS_ACM],
      labels: dto.labels ?? {},
      lastHeartbeatAt: null,
      enrolledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.gateways.push(newGateway);

    return {
      tokenId: `tok_${Date.now()}`,
      gatewayId: newGatewayId,
      token,
      installCommand: `curl -sSL https://get.clm-platform.com/install.sh | bash -s -- --token ${token}`,
      expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
    };
  }
}


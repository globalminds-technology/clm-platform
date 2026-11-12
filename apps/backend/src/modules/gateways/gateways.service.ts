import { Injectable, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import {
  GatewayStatus,
  DeployTargetType,
  type Gateway,
  type EnrollmentTokenResponse,
  type GatewayCommand,
} from '@clm/shared-types';
import { GatewaysRepository } from './gateways.repository';
import { CryptoService } from '../../shared/crypto/crypto.service';
import { type EnrollGatewayDto } from './dto/enroll-gateway.dto';
import { type GatewayHeartbeatDto } from './dto/gateway-heartbeat.dto';
import { type GatewayCommandAckDto } from './dto/gateway-command-ack.dto';

@Injectable()
export class GatewaysService {
  private readonly logger = new Logger(GatewaysService.name);

  constructor(
    private readonly gatewaysRepository: GatewaysRepository,
    private readonly cryptoService: CryptoService,
  ) {}

  async findAll(tenantId: string): Promise<Gateway[]> {
    return this.gatewaysRepository.findAll(tenantId);
  }

  async findById(tenantId: string, id: string): Promise<Gateway> {
    const gw = await this.gatewaysRepository.findById(tenantId, id);
    if (!gw) {
      throw new NotFoundException(`Gateway with ID '${id}' not found`);
    }
    return gw;
  }

  async createEnrollmentToken(
    tenantId: string,
    dto: EnrollGatewayDto,
  ): Promise<EnrollmentTokenResponse> {
    const rawToken = this.cryptoService.generateSecureToken(32);
    const tokenHash = this.cryptoService.signHmac(rawToken, 'clm-token-salt');
    const expiresAt = new Date(Date.now() + 24 * 3600000); // 24 hours

    const createdGateway = await this.gatewaysRepository.create(tenantId, {
      name: dto.name,
      targetTypesSupported: dto.targetTypesSupported || [DeployTargetType.AWS_ACM],
      labels: dto.labels,
    });
    const gatewayId = createdGateway.id;

    await this.gatewaysRepository.saveEnrollmentToken(
      tenantId,
      gatewayId,
      tokenHash,
      expiresAt,
    );

    const encodedToken = Buffer.from(`${tenantId}:${gatewayId}:${rawToken}`).toString('base64url');

    return {
      tokenId: `tok_${this.cryptoService.generateSecureToken(8)}`,
      gatewayId,
      token: `clm_enroll_${encodedToken}`,
      installCommand: `curl -sSL https://get.clm-platform.com/install.sh | bash -s -- --token clm_enroll_${encodedToken}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async enrollWithToken(
    tokenString: string,
    hostname: string,
    ipAddress: string,
    version = '1.0.0',
  ): Promise<{ gatewayId: string; tenantId: string; status: GatewayStatus }> {
    const stripped = tokenString.replace(/^clm_enroll_/, '');
    const decoded = Buffer.from(stripped, 'base64url').toString('utf8');
    const [tenantId, gatewayId, rawToken] = decoded.split(':');

    if (!tenantId || !gatewayId || !rawToken) {
      throw new UnauthorizedException('Invalid enrollment token format');
    }

    const tokenHash = this.cryptoService.signHmac(rawToken, 'clm-token-salt');

    const tokenRecord = await this.gatewaysRepository.findAndConsumeEnrollmentToken(tokenHash);
    if (!tokenRecord) {
      throw new UnauthorizedException('Token is either expired or already consumed');
    }

    await this.gatewaysRepository.activateGateway(tokenRecord.gatewayId, hostname, ipAddress, version);
    this.logger.log(`Gateway activated: ${tokenRecord.gatewayId} (${hostname}) for tenant ${tokenRecord.tenantId}`);

    return {
      gatewayId: tokenRecord.gatewayId,
      tenantId: tokenRecord.tenantId,
      status: GatewayStatus.ONLINE,
    };
  }

  async processHeartbeat(dto: GatewayHeartbeatDto): Promise<{ acknowledged: boolean; commands: GatewayCommand[] }> {
    await this.gatewaysRepository.updateHeartbeat(dto.gatewayId, dto.ipAddress, dto.version, dto.metrics);
    const pendingCommands = await this.gatewaysRepository.findPendingCommands(dto.gatewayId);
    return {
      acknowledged: true,
      commands: pendingCommands,
    };
  }

  async acknowledgeCommand(dto: GatewayCommandAckDto): Promise<{ success: boolean }> {
    await this.gatewaysRepository.updateCommandStatus(dto.commandId, dto.status, dto.errorMessage);
    this.logger.log(`Command ${dto.commandId} acknowledged by gateway ${dto.gatewayId} with status ${dto.status}`);
    return { success: true };
  }

  /**
   * Dispatches a signed DEPLOY_CERT command to a target gateway
   */
  async dispatchDeployCommand(
    tenantId: string,
    gatewayId: string,
    payload: {
      certificateId: string;
      domain: string;
      certificatePem: string;
      privateKeyPem?: string;
      targetType: string;
      targetConfig: Record<string, any>;
    },
  ): Promise<GatewayCommand> {
    const rawPayload = JSON.stringify(payload);
    const signature = this.cryptoService.signHmac(
      rawPayload,
      process.env.GATEWAY_SIGNING_KEY || 'clm-default-gateway-signing-key-32b',
    );

    this.logger.log(`Dispatching DEPLOY_CERT command for domain '${payload.domain}' to gateway ${gatewayId}`);
    return this.gatewaysRepository.createCommand(
      tenantId,
      gatewayId,
      'DEPLOY_CERT',
      payload,
      signature,
    );
  }
}

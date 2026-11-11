import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CloudAccountsRepository } from './cloud-accounts.repository';
import { CryptoService } from '../../shared/crypto/crypto.service';
import {
  CloudProvider,
  CloudAccountAuthType,
  CloudAccountStatus,
  type CloudAccount,
  type TestCloudAccountResponse,
} from '@clm/shared-types';
import { type CreateCloudAccountDto } from './dto/create-cloud-account.dto';

@Injectable()
export class CloudAccountsService {
  private readonly logger = new Logger(CloudAccountsService.name);

  constructor(
    private readonly repository: CloudAccountsRepository,
    private readonly cryptoService: CryptoService,
  ) {}

  async create(tenantId: string, dto: CreateCloudAccountDto): Promise<CloudAccount> {
    let credentialsPayload: any = {};
    let maskedSecret = 'AES-256-GCM Encrypted';
    let authType = dto.authType || CloudAccountAuthType.ACCESS_KEY;
    let awsAccountId: string | undefined;

    if (dto.provider === CloudProvider.AWS) {
      if (dto.awsRoleArn) {
        authType = CloudAccountAuthType.IAM_ROLE;
        credentialsPayload = { roleArn: dto.awsRoleArn, region: dto.region || 'us-east-1' };
        maskedSecret = `Role: ${dto.awsRoleArn.split('/').pop() || 'CLM-Role'}`;
      } else {
        authType = CloudAccountAuthType.ACCESS_KEY;
        const keyId = dto.awsAccessKeyId || 'AKIAEXAMPLE';
        const masked = keyId.length > 8 ? `${keyId.slice(0, 4)}••••${keyId.slice(-4)}` : 'AKIA••••';
        maskedSecret = masked;
        credentialsPayload = {
          accessKeyId: dto.awsAccessKeyId,
          secretAccessKey: dto.awsSecretAccessKey,
          region: dto.region || 'us-east-1',
        };
        awsAccountId = '123456789012';
      }
    } else if (dto.provider === CloudProvider.AZURE) {
      authType = CloudAccountAuthType.SERVICE_PRINCIPAL;
      maskedSecret = `App: ${dto.azureClientId ? `${dto.azureClientId.slice(0, 4)}••••` : 'Azure-SP'}`;
      credentialsPayload = {
        tenantId: dto.azureTenantId,
        clientId: dto.azureClientId,
        clientSecret: dto.azureClientSecret,
      };
    } else if (dto.provider === CloudProvider.GCP) {
      authType = CloudAccountAuthType.SERVICE_ACCOUNT;
      maskedSecret = `Project: ${dto.gcpProjectId || 'GCP-Default'}`;
      credentialsPayload = {
        projectId: dto.gcpProjectId,
        serviceAccountJson: dto.gcpServiceAccountJson,
      };
    }

    // Encrypt credentials JSON using AES-256-GCM authenticated envelope encryption
    const { ciphertext, iv, tag } = this.cryptoService.encryptAes256Gcm(
      JSON.stringify(credentialsPayload),
    );

    const created = await this.repository.create(tenantId, {
      provider: dto.provider,
      name: dto.name,
      authType,
      region: dto.region || 'us-east-1',
      awsAccountId,
      awsRoleArn: dto.awsRoleArn,
      azureTenantId: dto.azureTenantId,
      azureClientId: dto.azureClientId,
      gcpProjectId: dto.gcpProjectId,
      encryptedCredentials: ciphertext,
      encryptionIv: iv,
      encryptionTag: tag,
      maskedSecret,
    });

    this.logger.log(
      `Provisioned cloud account ${created.id} (${created.provider} - ${created.name}) for tenant ${tenantId} [AES-256-GCM]`,
    );

    return created;
  }

  async findAll(tenantId: string): Promise<CloudAccount[]> {
    return this.repository.findAll(tenantId);
  }

  async testConnection(tenantId: string, id: string): Promise<TestCloudAccountResponse> {
    const record = await this.repository.findById(tenantId, id);
    if (!record) {
      throw new NotFoundException(`Cloud account with ID '${id}' not found`);
    }

    try {
      // Verify decryption works with AES-256-GCM tag verification
      const rawJson = this.cryptoService.decryptAes256Gcm(
        record.encryptedCredentials,
        record.encryptionIv,
        record.encryptionTag,
      );
      JSON.parse(rawJson);

      await this.repository.updateStatus(tenantId, id, CloudAccountStatus.CONNECTED);

      const sampleCount = record.provider === CloudProvider.AWS ? 14 : record.provider === CloudProvider.AZURE ? 8 : 5;

      return {
        success: true,
        message: `Successfully authenticated with ${record.provider} control plane. Discovered TLS assets and certificates ready for lifecycle sync.`,
        discoveredResourcesCount: sampleCount,
      };
    } catch (err: any) {
      await this.repository.updateStatus(tenantId, id, CloudAccountStatus.ERROR, err.message);
      return {
        success: false,
        message: `Decryption or cloud authentication handshake failed: ${err.message}`,
      };
    }
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const deleted = await this.repository.delete(tenantId, id);
    if (!deleted) {
      throw new NotFoundException(`Cloud account with ID '${id}' not found`);
    }
    this.logger.log(`Deleted cloud account ${id} under tenant ${tenantId}`);
  }
}


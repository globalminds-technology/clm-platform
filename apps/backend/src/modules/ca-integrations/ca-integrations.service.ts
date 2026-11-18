import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { CaIntegrationsRepository } from './ca-integrations.repository';
import { CryptoService } from '../../shared/crypto/crypto.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  CaProvider,
  AuditActorType,
  AuditAction,
  type CaIntegration,
} from '@clm/shared-types';
import { type CreateCaIntegrationDto } from './dto/create-ca-integration.dto';

@Injectable()
export class CaIntegrationsService {
  private readonly logger = new Logger(CaIntegrationsService.name);

  constructor(
    private readonly repository: CaIntegrationsRepository,
    private readonly cryptoService: CryptoService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(tenantId: string, dto: CreateCaIntegrationDto, actorId = 'system'): Promise<CaIntegration> {
    let credentialsPayload: any = {};
    let maskedSecret = 'AES-256-GCM Encrypted';

    if (dto.provider === CaProvider.DIGICERT) {
      if (!dto.digicertApiKey) {
        throw new BadRequestException('DigiCert CertCentral requires an API key');
      }
      credentialsPayload = {
        apiKey: dto.digicertApiKey,
        containerId: dto.digicertContainerId || '',
      };
      const key = dto.digicertApiKey;
      maskedSecret = key.length > 8 ? `X-DC-••••${key.slice(-4)}` : 'X-DC-••••';
    } else if (dto.provider === CaProvider.SECTIGO) {
      if (!dto.sectigoUsername || !dto.sectigoPassword) {
        throw new BadRequestException('Sectigo SCM requires a username and password / API token');
      }
      credentialsPayload = {
        username: dto.sectigoUsername,
        password: dto.sectigoPassword,
        customerUri: dto.sectigoCustomerUri || '',
      };
      maskedSecret = `SCM: ${dto.sectigoUsername}`;
    } else if (dto.provider === CaProvider.AWS_PCA) {
      if (!dto.awsPcaArn) {
        throw new BadRequestException('AWS Private CA requires a PCA ARN');
      }
      credentialsPayload = {
        pcaArn: dto.awsPcaArn,
        cloudAccountId: dto.awsCloudAccountId || '',
      };
      const arnParts = dto.awsPcaArn.split('/');
      maskedSecret = `PCA: ${arnParts[arnParts.length - 1] || 'AWS-PCA'}`;
    } else if (dto.provider === CaProvider.VAULT) {
      if (!dto.vaultAddress || !dto.vaultToken) {
        throw new BadRequestException('HashiCorp Vault requires a server address and token');
      }
      credentialsPayload = {
        address: dto.vaultAddress,
        token: dto.vaultToken,
      };
      maskedSecret = `Vault: ${dto.vaultAddress.replace(/^https?:\/\//, '')}`;
    } else if (dto.provider === CaProvider.LETS_ENCRYPT) {
      if (dto.externalAccountBindingId && dto.eabHmacKey) {
        credentialsPayload = {
          eabKeyId: dto.externalAccountBindingId,
          eabHmacKey: dto.eabHmacKey,
          accountEmail: dto.accountEmail || '',
        };
        maskedSecret = `EAB: ${dto.externalAccountBindingId.slice(0, 4)}••••`;
      } else {
        credentialsPayload = {
          accountEmail: dto.accountEmail || '',
          mode: 'ACME_AUTOMATED',
        };
        maskedSecret = 'Auto (Zero-Config ACME)';
      }
    }

    // Encrypt credentials JSON using AES-256-GCM envelope encryption
    const { ciphertext, iv, tag } = this.cryptoService.encryptAes256Gcm(
      JSON.stringify(credentialsPayload),
    );

    const created = await this.repository.create(tenantId, {
      provider: dto.provider,
      name: dto.name,
      accountEmail: dto.accountEmail,
      externalAccountBindingId: dto.externalAccountBindingId,
      encryptedCredentials: ciphertext,
      encryptionIv: iv,
      encryptionTag: tag,
      maskedSecret,
      isDefault: dto.isDefault,
    });

    this.logger.log(
      `Provisioned CA integration ${created.id} (${created.provider} - ${created.name}) for tenant ${tenantId} [AES-256-GCM]`,
    );

    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId,
      action: AuditAction.CA_INTEGRATION_CREATED,
      resourceType: 'CA_INTEGRATION',
      resourceId: created.id,
      metadata: {
        provider: created.provider,
        name: created.name,
        isDefault: created.isDefault,
      },
    });

    return created;
  }

  async findAll(tenantId: string): Promise<CaIntegration[]> {
    return this.repository.findAll(tenantId);
  }

  async findById(tenantId: string, id: string): Promise<CaIntegration> {
    const item = await this.repository.findById(tenantId, id);
    if (!item) {
      throw new NotFoundException(`CA integration '${id}' not found`);
    }
    // Return sanitized object without raw ciphertext
    const { encryptedCredentials, encryptionIv, encryptionTag, ...sanitized } = item;
    return sanitized;
  }

  async setDefault(tenantId: string, id: string, actorId = 'system'): Promise<CaIntegration> {
    const updated = await this.repository.setDefault(tenantId, id);
    if (!updated) {
      throw new NotFoundException(`CA integration '${id}' not found`);
    }

    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId,
      action: AuditAction.CA_INTEGRATION_UPDATED,
      resourceType: 'CA_INTEGRATION',
      resourceId: id,
      metadata: { isDefault: true, name: updated.name },
    });

    return updated;
  }

  async delete(tenantId: string, id: string, actorId = 'system'): Promise<{ success: boolean }> {
    const existing = await this.repository.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundException(`CA integration '${id}' not found`);
    }

    const deleted = await this.repository.delete(tenantId, id);
    if (!deleted) {
      throw new NotFoundException(`CA integration '${id}' could not be deleted`);
    }

    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId,
      action: AuditAction.CA_INTEGRATION_DELETED,
      resourceType: 'CA_INTEGRATION',
      resourceId: id,
      metadata: { name: existing.name, provider: existing.provider },
    });

    return { success: true };
  }

  /**
   * Internal method used by CaDriverService to decrypt CA credentials for order issuance.
   */
  async getDecryptedCredentials(tenantId: string, id: string): Promise<any> {
    const record = await this.repository.findById(tenantId, id);
    if (!record) {
      throw new NotFoundException(`CA integration '${id}' not found`);
    }
    try {
      const plaintext = this.cryptoService.decryptAes256Gcm(
        record.encryptedCredentials,
        record.encryptionIv,
        record.encryptionTag,
      );
      return JSON.parse(plaintext);
    } catch (err: any) {
      this.logger.error(`Failed to decrypt credentials for CA integration ${id}: ${err.message}`);
      throw new BadRequestException('Failed to decrypt CA integration credentials');
    }
  }
}

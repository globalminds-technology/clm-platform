import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { type Tenant } from '@clm/shared-types';
import { TenantsRepository } from './tenants.repository';
import { CryptoService } from '../../shared/crypto/crypto.service';
import { StorageService } from '../../shared/storage/storage.service';
import { type CreateTenantDto } from './dto/create-tenant.dto';
import { type UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly cryptoService: CryptoService,
    private readonly storageService: StorageService,
  ) { }

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const existing = await this.tenantsRepository.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException(`Tenant with slug '${dto.slug}' already exists`);
    }

    // Generate initial temporary admin password hash using Argon2id
    const tempPassword = this.cryptoService.generateSecureToken(8);
    const passwordHash = await this.cryptoService.hashPassword(tempPassword);

    return this.tenantsRepository.create(dto, passwordHash);
  }

  async register(dto: {
    organizationName: string;
    adminEmail: string;
    password: string;
    adminFirstName: string;
    adminLastName?: string;
    marketplaceProvider?: string;
    country?: string;
    state?: string;
    locality?: string;
    department?: string;
  }): Promise<{ tenant: Tenant; adminUser: any }> {
    const baseSlug =
      dto.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `org-${Date.now()}`;

    let slug = baseSlug;
    let existing = await this.tenantsRepository.findBySlug(slug);
    let attempts = 0;
    while (existing && attempts < 5) {
      slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
      existing = await this.tenantsRepository.findBySlug(slug);
      attempts++;
    }
    if (existing) {
      slug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    const passwordHash = await this.cryptoService.hashPassword(dto.password);
    try {
      return await this.tenantsRepository.register({ ...dto, slug }, passwordHash);
    } catch (err: any) {
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        throw new ConflictException(
          `An account with email '${dto.adminEmail}' already exists. Please sign in to your workspace instead.`,
        );
      }
      throw err;
    }
  }

  async updateStatus(id: string, status: any): Promise<Tenant> {
    const tenant = await this.tenantsRepository.updateStatus(id, status);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }
    return tenant;
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantsRepository.findAll();
  }

  async getMetrics() {
    return this.tenantsRepository.getMetrics();
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    if (
      dto.settings?.logoUrl &&
      typeof dto.settings.logoUrl === 'string' &&
      dto.settings.logoUrl.startsWith('data:image/') &&
      this.storageService.isConfigured()
    ) {
      try {
        const { url } = await this.storageService.uploadBase64(`logos/${id}/logo`, dto.settings.logoUrl);
        dto.settings.logoUrl = url;
        this.logger.log(`Uploaded tenant logo to Cloudflare R2: ${url}`);
      } catch (err: any) {
        this.logger.warn(`Failed to upload logo to Cloudflare R2 (${err.message}), falling back to direct storage.`);
      }
    }

    const tenant = await this.tenantsRepository.update(id, dto);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }
    return tenant;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.tenantsRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }
  }
}

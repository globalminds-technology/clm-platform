import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { type Tenant } from '@clm/shared-types';
import { TenantsRepository } from './tenants.repository';
import { CryptoService } from '../../shared/crypto/crypto.service';
import { type CreateTenantDto } from './dto/create-tenant.dto';
import { type UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly cryptoService: CryptoService,
  ) {}

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

  async findAll(): Promise<Tenant[]> {
    return this.tenantsRepository.findAll();
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
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

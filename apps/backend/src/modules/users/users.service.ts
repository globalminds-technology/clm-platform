import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { UsersRepository, type UserEntityWithPassword } from './users.repository';
import { CryptoService } from '../../shared/crypto/crypto.service';
import { type User } from '@clm/shared-types';
import { type CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly cryptoService: CryptoService,
  ) {}

  async create(tenantId: string, dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findByEmail(tenantId, dto.email);
    if (existing) {
      throw new ConflictException(`User with email '${dto.email}' already exists in this tenant.`);
    }

    const passwordHash = await this.cryptoService.hashPassword(dto.password);
    const user = await this.usersRepository.create(tenantId, dto, passwordHash);
    this.logger.log(`Created user ${user.id} (${user.email}) under tenant ${tenantId}`);
    return user;
  }

  async findAll(tenantId: string): Promise<User[]> {
    return this.usersRepository.findAll(tenantId);
  }

  async findById(tenantId: string, id: string): Promise<User> {
    const user = await this.usersRepository.findById(tenantId, id);
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found.`);
    }
    return user;
  }

  async findByEmail(tenantId: string, email: string): Promise<UserEntityWithPassword | null> {
    return this.usersRepository.findByEmail(tenantId, email);
  }

  async findByEmailGlobal(email: string): Promise<UserEntityWithPassword | null> {
    return this.usersRepository.findByEmailGlobal(email);
  }

  async updateLastLogin(tenantId: string, id: string): Promise<void> {
    await this.usersRepository.updateLastLogin(tenantId, id);
  }
}


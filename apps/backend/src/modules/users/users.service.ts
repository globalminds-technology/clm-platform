import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { UsersRepository, type UserEntityWithPassword } from './users.repository';
import { CryptoService } from '../../shared/crypto/crypto.service';
import { MailService } from '../../shared/mail/mail.service';
import { Role, UserStatus, type User, type InviteMemberRequest } from '@clm/shared-types';
import { type CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly cryptoService: CryptoService,
    private readonly mailService: MailService,
  ) { }

  async invite(tenantId: string, req: InviteMemberRequest, tenantName ?: string): Promise < User & { temporaryPassword?: string } > {
      const existing = await this.usersRepository.findByEmail(tenantId, req.email);
      if(existing) {
        throw new ConflictException(`User with email '${req.email}' already exists in this tenant.`);
      }

    // Use admin-specified password or generate random 12-char secure temporary password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
      const tempPassword = req.password?.trim() || Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const passwordHash = await this.cryptoService.hashPassword(tempPassword);

      const user = await this.usersRepository.create(
        tenantId,
        {
          email: req.email,
          password: tempPassword,
          firstName: req.firstName,
          lastName: req.lastName,
          role: req.role,
        },
        passwordHash,
      );

      // Dispatch welcome email asynchronously without blocking transaction
      this.mailService
        .sendWelcomeCredentials({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          role: user.role,
          tempPassword,
          tenantName: tenantName || 'Your Organization',
        })
        .catch(err => {
          this.logger.error(`Error sending invitation email to ${user.email}: ${err.message}`);
        });

      this.logger.log(`Invited member ${user.id} (${user.email}) with role ${user.role}`);
      return {
        ...user,
        temporaryPassword: tempPassword,
      };
    }

  async updateRole(tenantId: string, userId: string, role: Role): Promise < User > {
      try {
        return await this.usersRepository.updateRole(tenantId, userId, role);
      } catch {
        throw new NotFoundException(`User with ID '${userId}' not found.`);
      }
    }

  async updateStatus(tenantId: string, userId: string, status: UserStatus): Promise < User > {
      try {
        return await this.usersRepository.updateStatus(tenantId, userId, status);
      } catch {
        throw new NotFoundException(`User with ID '${userId}' not found.`);
      }
    }

  async create(tenantId: string, dto: CreateUserDto): Promise < User > {
      const existing = await this.usersRepository.findByEmail(tenantId, dto.email);
      if(existing) {
        throw new ConflictException(`User with email '${dto.email}' already exists in this tenant.`);
      }

    const passwordHash = await this.cryptoService.hashPassword(dto.password);
      const user = await this.usersRepository.create(tenantId, dto, passwordHash);
      this.logger.log(`Created user ${user.id} (${user.email}) under tenant ${tenantId}`);
      return user;
    }

  async findAll(tenantId: string): Promise < User[] > {
      return this.usersRepository.findAll(tenantId);
    }

  async findById(tenantId: string, id: string): Promise < User > {
      const user = await this.usersRepository.findById(tenantId, id);
      if(!user) {
        throw new NotFoundException(`User with ID '${id}' not found.`);
      }
    return user;
    }

  async findByEmail(tenantId: string, email: string): Promise < UserEntityWithPassword | null > {
      return this.usersRepository.findByEmail(tenantId, email);
    }

  async findByEmailGlobal(email: string): Promise < UserEntityWithPassword | null > {
      return this.usersRepository.findByEmailGlobal(email);
    }

  async updateLastLogin(tenantId: string, id: string): Promise < void> {
      await this.usersRepository.updateLastLogin(tenantId, id);
    }

  async updatePasswordGlobal(email: string, passwordHash: string): Promise < void> {
      await this.usersRepository.updatePasswordGlobal(email, passwordHash);
    }
  }



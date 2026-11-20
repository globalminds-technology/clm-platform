import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role, UserStatus, AuditActorType, AuditAction, type User, type InviteMemberRequest } from '@clm/shared-types';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentTenant } from '../../shared/tenancy/current-tenant.decorator';
import { CurrentUser } from '../../shared/auth/current-user.decorator';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
  ) { }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.SECURITY_LEAD, Role.DEVOPS_ENGINEER, Role.AUDITOR)
  @ApiOperation({ summary: 'List all users belonging to the current tenant' })
  @ApiResponse({ status: 200, description: 'List of tenant users returned successfully' })
  async findAll(@CurrentTenant() tenantId: string): Promise<User[]> {
    return this.usersService.findAll(tenantId);
  }

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Invite a new team member and dispatch temporary credentials via email' })
  @ApiResponse({ status: 201, description: 'Member invited successfully' })
  @ApiResponse({ status: 409, description: 'User already exists in tenant' })
  async invite(
    @CurrentTenant() tenantId: string,
    @Body() body: InviteMemberRequest,
    @CurrentUser() user: any,
  ): Promise<User> {
    const invitedUser = await this.usersService.invite(tenantId, body);

    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId: user?.id || 'system',
      actorEmail: user?.email,
      action: AuditAction.USER_CREATED,
      resourceType: 'USER',
      resourceId: invitedUser.id,
      metadata: { email: body.email, role: body.role },
    });

    return invitedUser;
  }

  @Patch(':id/role')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update employee role within tenant' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  async updateRole(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { role: Role },
    @CurrentUser() user: any,
  ): Promise<User> {
    const updated = await this.usersService.updateRole(tenantId, id, body.role);

    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId: user?.id || 'system',
      actorEmail: user?.email,
      action: AuditAction.USER_UPDATED,
      resourceType: 'USER',
      resourceId: id,
      metadata: { newRole: body.role },
    });

    return updated;
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Activate or deactivate employee within tenant' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { status: UserStatus },
    @CurrentUser() user: any,
  ): Promise<User> {
    const updated = await this.usersService.updateStatus(tenantId, id, body.status);

    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId: user?.id || 'system',
      actorEmail: user?.email,
      action: AuditAction.USER_UPDATED,
      resourceType: 'USER',
      resourceId: id,
      metadata: { newStatus: body.status },
    });

    return updated;
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get a specific user by ID within current tenant' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<User> {
    return this.usersService.findById(tenantId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create a new user with Argon2id hashed password' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists in tenant' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateUserDto,
    @CurrentUser() user: any,
  ): Promise<User> {
    const created = await this.usersService.create(tenantId, dto);

    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId: user?.id || 'system',
      actorEmail: user?.email,
      action: AuditAction.USER_CREATED,
      resourceType: 'USER',
      resourceId: created.id,
      metadata: { email: dto.email, role: dto.role },
    });

    return created;
  }
}

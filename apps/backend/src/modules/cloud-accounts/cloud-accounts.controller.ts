import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CloudAccountsService } from './cloud-accounts.service';
import { CreateCloudAccountDto } from './dto/create-cloud-account.dto';
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { CurrentTenant } from '../../shared/tenancy/current-tenant.decorator';
import { CurrentUser } from '../../shared/auth/current-user.decorator';
import { Role } from '@clm/shared-types';

@ApiTags('Cloud Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cloud-accounts')
export class CloudAccountsController {
  constructor(private readonly service: CloudAccountsService) { }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register cloud provider account credentials (AES-256-GCM encrypted)' })
  @ApiResponse({ status: 201, description: 'Cloud account registered and encrypted' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateCloudAccountDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.SECURITY_LEAD, Role.DEVOPS_ENGINEER, Role.AUDITOR, Role.READ_ONLY)
  @ApiOperation({ summary: 'List all connected cloud accounts for this tenant with masked secrets' })
  @ApiResponse({ status: 200, description: 'Cloud accounts list' })
  async findAll(@CurrentTenant() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Post(':id/test')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test cloud credentials authentication and discover resources' })
  @ApiResponse({ status: 200, description: 'Authentication handshake test result' })
  async testConnection(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.testConnection(tenantId, id);
  }

  @Post(':id/sync-acm')
  @Roles(Role.TENANT_ADMIN, Role.SECURITY_LEAD, Role.DEVOPS_ENGINEER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Synchronize and import certificates from AWS ACM into tenant lifecycle' })
  @ApiResponse({ status: 200, description: 'Discovered certificates synchronized' })
  async syncAcm(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('email') userEmail?: string,
  ) {
    return this.service.syncAcmCertificates(tenantId, id, userEmail || 'admin@alphacorp.com');
  }

  @Delete(':id')
  @Roles(Role.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke and remove cloud provider credentials' })
  @ApiResponse({ status: 204, description: 'Cloud account removed' })
  async delete(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.service.delete(tenantId, id);
  }
}


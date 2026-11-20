import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CaIntegrationsService } from './ca-integrations.service';
import { CreateCaIntegrationDto } from './dto/create-ca-integration.dto';
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { CurrentTenant } from '../../shared/tenancy/current-tenant.decorator';
import { CurrentUser } from '../../shared/auth/current-user.decorator';
import { Role } from '@clm/shared-types';

@ApiTags('CA Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ca-integrations')
export class CaIntegrationsController {
  constructor(private readonly service: CaIntegrationsService) { }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register Certificate Authority API credentials (AES-256-GCM encrypted)' })
  @ApiResponse({ status: 201, description: 'CA integration created and credentials encrypted' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateCaIntegrationDto,
    @CurrentUser() user: any,
  ) {
    return this.service.create(tenantId, dto, user?.id || 'system');
  }

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.SECURITY_LEAD, Role.DEVOPS_ENGINEER, Role.AUDITOR, Role.READ_ONLY)
  @ApiOperation({ summary: 'List all connected CA accounts for this tenant with masked secrets' })
  @ApiResponse({ status: 200, description: 'List of CA integrations' })
  async findAll(@CurrentTenant() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  @Roles(Role.TENANT_ADMIN, Role.SECURITY_LEAD, Role.DEVOPS_ENGINEER, Role.AUDITOR, Role.READ_ONLY)
  @ApiOperation({ summary: 'Get a specific CA integration by ID' })
  @ApiResponse({ status: 200, description: 'CA integration details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  @Patch(':id/default')
  @Roles(Role.TENANT_ADMIN, Role.SECURITY_LEAD)
  @ApiOperation({ summary: 'Set this CA integration as the tenant default issuer' })
  @ApiResponse({ status: 200, description: 'Updated default CA integration' })
  async setDefault(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.setDefault(tenantId, id, user?.id || 'system');
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Remove a CA integration' })
  @ApiResponse({ status: 200, description: 'CA integration deleted' })
  async delete(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.delete(tenantId, id, user?.id || 'system');
  }
}

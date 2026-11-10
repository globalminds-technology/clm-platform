import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role, TenantStatus, type Tenant } from '@clm/shared-types';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard';
import { CurrentTenant } from '../../shared/tenancy/current-tenant.decorator';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) { }

  @Get('my-status')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.SECURITY_LEAD, Role.DEVOPS_ENGINEER, Role.AUDITOR, Role.READ_ONLY)
  @ApiOperation({ summary: 'Get current tenant verification status' })
  @ApiResponse({ status: 200, description: 'Tenant verification status returned' })
  async getMyStatus(@CurrentTenant() tenantId: string): Promise<{ status: TenantStatus; tenant: Tenant }> {
    const tenant = await this.tenantsService.findById(tenantId);
    return { status: tenant.status, tenant };
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve or Reject tenant organization (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: TenantStatus },
  ): Promise<Tenant> {
    return this.tenantsService.updateStatus(id, body.status);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Provision a new tenant organization (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Tenant organization created successfully' })
  @ApiResponse({ status: 409, description: 'Tenant slug already exists' })
  async create(@Body() createTenantDto: CreateTenantDto): Promise<Tenant> {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all tenant organizations (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'List of tenants returned' })
  async findAll(): Promise < Tenant[] > {
      return this.tenantsService.findAll();
    }

    @Get(':id')
    @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
    @ApiOperation({ summary: 'Get tenant details by UUID' })
    @ApiResponse({ status: 200, description: 'Tenant details returned' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findOne(@Param('id') id: string): Promise < Tenant > {
        return this.tenantsService.findById(id);
      }

      @Patch(':id')
      @Roles(Role.SUPER_ADMIN)
      @ApiOperation({ summary: 'Update tenant quotas, subscription tier, or status' })
      @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
      @ApiResponse({ status: 404, description: 'Tenant not found' })
      async update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto): Promise < Tenant > {
        return this.tenantsService.update(id, updateTenantDto);
      }

      @Delete(':id')
      @HttpCode(HttpStatus.NO_CONTENT)
      @Roles(Role.SUPER_ADMIN)
      @ApiOperation({ summary: 'Delete or decommission a tenant organization' })
      @ApiResponse({ status: 204, description: 'Tenant decommissioned successfully' })
      @ApiResponse({ status: 404, description: 'Tenant not found' })
      async remove(@Param('id') id: string): Promise < void> {
        return this.tenantsService.delete(id);
      }
    }

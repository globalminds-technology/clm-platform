import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role, type AuditLog } from '@clm/shared-types';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard';
import { CurrentTenant } from '../../shared/tenancy/current-tenant.decorator';
import { AuditLogsService } from './audit-logs.service';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) { }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.SECURITY_LEAD, Role.AUDITOR)
  @ApiOperation({ summary: 'Retrieve immutable chronological audit trail for the tenant' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Audit trail returned' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<AuditLog[]> {
    return this.auditLogsService.findAll(tenantId, limit ? Number(limit) : 50, offset ? Number(offset) : 0);
  }

  @Get('global')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Retrieve system-wide global audit ledger across all tenants (Super Admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Global audit ledger returned' })
  async findAllGlobal(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<AuditLog[]> {
    return this.auditLogsService.findAllGlobal(limit ? Number(limit) : 100, offset ? Number(offset) : 0);
  }
}


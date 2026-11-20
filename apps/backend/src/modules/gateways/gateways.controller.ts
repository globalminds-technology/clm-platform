import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role, AuditActorType, AuditAction, type Gateway, type EnrollmentTokenResponse } from '@clm/shared-types';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard';
import { CurrentTenant } from '../../shared/tenancy/current-tenant.decorator';
import { CurrentUser } from '../../shared/auth/current-user.decorator';
import { GatewaysService } from './gateways.service';
import { EnrollGatewayDto } from './dto/enroll-gateway.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@ApiTags('Gateways')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gateways')
export class GatewaysController {
  constructor(
    private readonly gatewaysService: GatewaysService,
    private readonly auditLogsService: AuditLogsService,
  ) { }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.SECURITY_LEAD, Role.DEVOPS_ENGINEER, Role.AUDITOR, Role.READ_ONLY)
  @ApiOperation({ summary: 'List all enrolled satellite gateways for the tenant' })
  @ApiResponse({ status: 200, description: 'List of gateways returned' })
  async findAll(@CurrentTenant() tenantId: string): Promise<Gateway[]> {
    return this.gatewaysService.findAll(tenantId);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.SECURITY_LEAD, Role.DEVOPS_ENGINEER, Role.AUDITOR, Role.READ_ONLY)
  @ApiOperation({ summary: 'Get gateway fleet details' })
  @ApiResponse({ status: 200, description: 'Gateway details returned' })
  @ApiResponse({ status: 404, description: 'Gateway not found' })
  async findOne(
  @CurrentTenant() tenantId: string,
  @Param('id') id: string,
  ): Promise<Gateway> {
    return this.gatewaysService.findById(tenantId, id);
  }

  @Post('enroll')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER)
  @ApiOperation({ summary: 'Generate a single-use token to enroll a new gateway daemon' })
  @ApiResponse({ status: 201, description: 'Enrollment token generated' })
  async enroll(
    @CurrentTenant() tenantId: string,
    @Body() enrollDto: EnrollGatewayDto,
    @CurrentUser() user: any,
  ): Promise<EnrollmentTokenResponse> {
    const res = await this.gatewaysService.createEnrollmentToken(tenantId, enrollDto);

    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId: user?.id || 'system',
      actorEmail: user?.email,
      action: AuditAction.GATEWAY_ENROLLED,
      resourceType: 'GATEWAY',
      resourceId: res.gatewayId,
      metadata: { name: enrollDto.name, targetTypes: enrollDto.targetTypesSupported },
    });

    return res;
  }

  @Post(':id/preflight')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER)
  @ApiOperation({ summary: 'Run a non-destructive pre-flight syntax check and connectivity dry run on a target gateway' })
  @ApiResponse({ status: 200, description: 'Pre-flight check report returned' })
  async preflight(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { targetType: string; domain?: string },
    @CurrentUser() user: any,
  ) {
    const report = await this.gatewaysService.runPreflight(tenantId, id, body);

    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId: user?.id || 'system',
      actorEmail: user?.email,
      action: AuditAction.COMMAND_DISPATCHED,
      resourceType: 'GATEWAY',
      resourceId: id,
      metadata: { targetType: body.targetType, domain: body.domain, passed: report?.success },
    });

    return report;
  }
}

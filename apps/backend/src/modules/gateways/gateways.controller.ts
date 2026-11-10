import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role, type Gateway, type EnrollmentTokenResponse } from '@clm/shared-types';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard';
import { CurrentTenant } from '../../shared/tenancy/current-tenant.decorator';
import { GatewaysService } from './gateways.service';
import { EnrollGatewayDto } from './dto/enroll-gateway.dto';

@ApiTags('Gateways')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gateways')
export class GatewaysController {
  constructor(private readonly gatewaysService: GatewaysService) { }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER, Role.AUDITOR)
  @ApiOperation({ summary: 'List all enrolled satellite gateways for the tenant' })
  @ApiResponse({ status: 200, description: 'List of gateways returned' })
  async findAll(@CurrentTenant() tenantId: string): Promise < Gateway[] > {
      return this.gatewaysService.findAll(tenantId);
    }

    @Get(':id')
    @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER, Role.AUDITOR)
    @ApiOperation({ summary: 'Get gateway fleet details' })
    @ApiResponse({ status: 200, description: 'Gateway details returned' })
    @ApiResponse({ status: 404, description: 'Gateway not found' })
  async findOne(
        @CurrentTenant() tenantId: string,
        @Param('id') id: string,
      ): Promise < Gateway > {
        return this.gatewaysService.findById(tenantId, id);
      }

      @Post('enroll')
      @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER)
      @ApiOperation({ summary: 'Generate a single-use token to enroll a new gateway daemon' })
      @ApiResponse({ status: 201, description: 'Enrollment token generated' })
  async enroll(
          @CurrentTenant() tenantId: string,
          @Body() enrollDto: EnrollGatewayDto,
        ): Promise < EnrollmentTokenResponse > {
          return this.gatewaysService.createEnrollmentToken(tenantId, enrollDto);
        }
      }

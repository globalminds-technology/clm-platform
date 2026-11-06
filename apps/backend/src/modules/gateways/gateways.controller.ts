import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role, type Gateway, type EnrollmentTokenResponse } from '@clm/shared-types';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { GatewaysService } from './gateways.service';
import { EnrollGatewayDto } from './dto/enroll-gateway.dto';

@ApiTags('Gateways')
@ApiBearerAuth()
@Controller('gateways')
@UseGuards(RolesGuard)
export class GatewaysController {
  constructor(private readonly gatewaysService: GatewaysService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER, Role.AUDITOR)
  @ApiOperation({ summary: 'List all enrolled satellite gateways' })
  @ApiResponse({ status: 200, description: 'List of gateways returned' })
  findAll(): Gateway[] {
    return this.gatewaysService.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER, Role.AUDITOR)
  @ApiOperation({ summary: 'Get gateway fleet details' })
  @ApiResponse({ status: 200, description: 'Gateway details returned' })
  @ApiResponse({ status: 404, description: 'Gateway not found' })
  findOne(@Param('id') id: string): Gateway {
    return this.gatewaysService.findById(id);
  }

  @Post('enroll')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER)
  @ApiOperation({ summary: 'Generate a single-use token to enroll a new gateway daemon' })
  @ApiResponse({ status: 201, description: 'Enrollment token generated' })
  enroll(@Body() enrollDto: EnrollGatewayDto): EnrollmentTokenResponse {
    return this.gatewaysService.createEnrollmentToken(enrollDto);
  }
}


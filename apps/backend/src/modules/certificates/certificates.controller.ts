import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role, type Certificate, type CertificateFilterParams, type LiveTlsProbeResult } from '@clm/shared-types';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard';
import { CurrentTenant } from '../../shared/tenancy/current-tenant.decorator';
import { CertificatesService } from './certificates.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';

@ApiTags('Certificates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) { }

  @Post('probe')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER, Role.SECURITY_LEAD)
  @ApiOperation({ summary: 'Probe live domain over TLS to extract actual X.509 certificate and remaining validity' })
  @ApiResponse({ status: 200, description: 'Live TLS probe completed successfully' })
  async probe(
    @Body() body: { domain: string; port?: number },
  ): Promise<LiveTlsProbeResult> {
    return this.certificatesService.probeLive(body.domain, body.port || 443);
  }

  @Get()
    @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER, Role.AUDITOR)
    @ApiOperation({ summary: 'List all certificates under RLS tenant isolation' })
    @ApiResponse({ status: 200, description: 'Certificates retrieved successfully' })
    async findAll(
      @CurrentTenant() tenantId: string,
      @Query() filters ?: CertificateFilterParams,
    ): Promise < Certificate[] > {
      return this.certificatesService.findAll(tenantId, filters);
    }

    @Get(':id')
    @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER, Role.AUDITOR)
    @ApiOperation({ summary: 'Get certificate details by ID' })
    @ApiResponse({ status: 200, description: 'Certificate retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Certificate not found' })
  async findOne(
        @CurrentTenant() tenantId: string,
        @Param('id') id: string,
      ): Promise < Certificate > {
        return this.certificatesService.findById(tenantId, id);
      }

      @Post()
      @HttpCode(HttpStatus.CREATED)
      @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER)
        @ApiOperation({ summary: 'Create and track a new SSL/TLS certificate' })
        @ApiResponse({ status: 201, description: 'Certificate registered' })
        async create(
          @CurrentTenant() tenantId: string,
          @Body() createDto: CreateCertificateDto,
        ): Promise < Certificate > {
          return this.certificatesService.create(tenantId, createDto);
        }

        @Post(':id/renew')
        @HttpCode(HttpStatus.OK)
        @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER)
        @ApiOperation({ summary: 'Trigger renewal workflow for a certificate' })
        @ApiResponse({ status: 200, description: 'Renewal triggered' })
        async renew(
          @CurrentTenant() tenantId: string,
          @Param('id') id: string,
        ): Promise < Certificate > {
          return this.certificatesService.renew(tenantId, id);
        }

        @Delete(':id')
        @HttpCode(HttpStatus.NO_CONTENT)
        @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
        @ApiOperation({ summary: 'Revoke and delete a certificate' })
        @ApiResponse({ status: 204, description: 'Certificate deleted' })
        async delete (
          @CurrentTenant() tenantId: string,
            @Param('id') id: string,
  ): Promise < void> {
          return this.certificatesService.delete(tenantId, id);
        }
      }

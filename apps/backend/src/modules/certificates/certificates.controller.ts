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
    @Query() filters?: CertificateFilterParams,
  ): Promise<Certificate[]> {
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
  ): Promise<Certificate> {
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
  ): Promise<Certificate> {
    return this.certificatesService.create(tenantId, createDto);
  }

  @Get(':id/renewal-context')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER, Role.SECURITY_LEAD)
  @ApiOperation({ summary: 'Get pre-populated renewal context (tenant org data + connected cloud providers) for renewal modal' })
  @ApiResponse({ status: 200, description: 'Renewal context retrieved successfully' })
  async getRenewalContext(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.certificatesService.getRenewalContext(tenantId, id);
  }

  @Post(':id/generate-csr')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER, Role.SECURITY_LEAD)
  @ApiOperation({ summary: 'Generate fresh PKCS#10 CSR and key pair with tenant metadata for CA submission' })
  @ApiResponse({ status: 200, description: 'CSR generated successfully' })
  async generateCsr(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body?: {
      keyAlgorithm?: 'RSA_2048' | 'RSA_4096';
      organization?: string;
      department?: string;
      country?: string;
    },
  ) {
    return this.certificatesService.generateRenewalCsr(tenantId, id, body);
  }

  @Post(':id/renew')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER)
  @ApiOperation({ summary: 'Trigger renewal workflow for a managed certificate with CA and DNS validation' })
  @ApiResponse({ status: 200, description: 'Renewal triggered' })
  async renew(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() renewRequest?: any,
  ): Promise<Certificate> {
    return this.certificatesService.renew(tenantId, id, renewRequest);
  }

  @Post(':id/reprobe')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER)
  @ApiOperation({ summary: 'Re-probe external live host to synchronize real TLS certificate data' })
  @ApiResponse({ status: 200, description: 'Live probe completed and database updated' })
  async reprobe(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.certificatesService.reprobe(tenantId, id);
  }

@Post(':id/revoke')
@HttpCode(HttpStatus.OK)
@Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER)
@ApiOperation({ summary: 'Revoke a certificate with RFC 5280 compliance reason code' })
@ApiResponse({ status: 200, description: 'Certificate revoked and ledger updated' })
async revoke(
  @CurrentTenant() tenantId: string,
  @Param('id') id: string,
  @Body() body ?: any,
): Promise < Certificate > {
  return this.certificatesService.revoke(tenantId, id, body);
}

@Post(':id/deploy')
@HttpCode(HttpStatus.OK)
@Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER)
@ApiOperation({ summary: 'Manually dispatch certificate deployment to assigned Satellite Gateway' })
@ApiResponse({ status: 200, description: 'Deployment command dispatched' })
async deploy(
  @CurrentTenant() tenantId: string,
  @Param('id') id: string,
  @Body('gatewayId') gatewayId ?: string,
) {
  return this.certificatesService.deploy(tenantId, id, gatewayId);
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

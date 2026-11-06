import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role, type Certificate } from '@clm/shared-types';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { CertificatesService } from './certificates.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';

@ApiTags('Certificates')
@ApiBearerAuth()
@Controller('certificates')
@UseGuards(RolesGuard)
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER, Role.AUDITOR, Role.READ_ONLY)
  @ApiOperation({ summary: 'List certificates with optional filtering' })
  @ApiResponse({ status: 200, description: 'List of certificates returned' })
  findAll(@Query('domain') domain?: string, @Query('status') status?: any): Certificate[] {
    return this.certificatesService.findAll({ domain, status });
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER, Role.AUDITOR, Role.READ_ONLY)
  @ApiOperation({ summary: 'Get certificate details by UUID' })
  @ApiResponse({ status: 200, description: 'Certificate details found' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  findOne(@Param('id') id: string): Certificate {
    return this.certificatesService.findById(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER)
  @ApiOperation({ summary: 'Request or import a new certificate' })
  @ApiResponse({ status: 201, description: 'Certificate created/requested successfully' })
  create(@Body() createCertDto: CreateCertificateDto): Certificate {
    return this.certificatesService.create(createCertDto);
  }
}


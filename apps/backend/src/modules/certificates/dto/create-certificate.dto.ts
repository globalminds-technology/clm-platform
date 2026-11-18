import { IsString, IsNotEmpty, IsArray, IsOptional, IsEnum, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KeyAlgorithm, ValidationMethod, CertificateTrackingMode, type CreateCertificateRequest } from '@clm/shared-types';

export class CreateCertificateDto implements CreateCertificateRequest {
  @ApiProperty({ description: 'Primary Fully Qualified Domain Name (FQDN)', example: 'api.example.com' })
  @IsString()
  @IsNotEmpty()
  domain!: string;

  @ApiPropertyOptional({
    description: 'Subject Alternative Names (SANs)',
    example: ['api.example.com', 'auth.example.com'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sans?: string[];

  @ApiProperty({ enum: KeyAlgorithm, default: KeyAlgorithm.RSA_2048 })
  @IsEnum(KeyAlgorithm)
  keyAlgorithm!: KeyAlgorithm;

  @ApiProperty({ enum: ValidationMethod, default: ValidationMethod.DNS_01 })
  @IsEnum(ValidationMethod)
  validationMethod!: ValidationMethod;

  @ApiPropertyOptional({ enum: CertificateTrackingMode, default: CertificateTrackingMode.MANAGED_GATEWAY })
  @IsEnum(CertificateTrackingMode)
  @IsOptional()
  trackingMode?: CertificateTrackingMode;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @ApiPropertyOptional({ default: 30 })
  @IsNumber()
  @IsOptional()
  renewBeforeDays?: number;

  @ApiPropertyOptional({ description: 'Target gateway UUID for local agent deployment' })
  @IsString()
  @IsOptional()
  gatewayId?: string;

  @ApiPropertyOptional({ description: 'Certificate Authority Integration UUID' })
  @IsString()
  @IsOptional()
  caIntegrationId?: string;

  @ApiPropertyOptional({ description: 'Cloud Provider Account UUID for DNS-01 verification' })
  @IsString()
  @IsOptional()
  cloudAccountId?: string;

  @ApiPropertyOptional({ description: 'Deployment Target Type (e.g. GATEWAY, CLOUD_ALB, VAULT_ONLY)' })
  @IsString()
  @IsOptional()
  deploymentTargetType?: string;

  @ApiPropertyOptional({ description: 'Certificate Authority Issuer name' })
  @IsString()
  @IsOptional()
  issuer?: string;

  @ApiPropertyOptional({ description: 'Certificate valid from timestamp (ISO)' })
  @IsString()
  @IsOptional()
  notBefore?: string;

  @ApiPropertyOptional({ description: 'Certificate valid to expiration timestamp (ISO)' })
  @IsString()
  @IsOptional()
  notAfter?: string;

  @ApiPropertyOptional({ description: 'Certificate Serial Number' })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Certificate SHA-256 Fingerprint' })
  @IsString()
  @IsOptional()
  fingerprintSha256?: string;
}


import { IsString, IsNotEmpty, IsArray, IsOptional, IsEnum, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KeyAlgorithm, ValidationMethod, type CreateCertificateRequest } from '@clm/shared-types';

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
}


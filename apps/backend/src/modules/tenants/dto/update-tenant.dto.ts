import { IsString, IsOptional, IsEnum, IsNumber, Min, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus, SubscriptionTier, type UpdateTenantRequest } from '@clm/shared-types';

export class UpdateTenantOrgMetadataDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  organizationName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  locality?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactEmail?: string;
}

export class UpdateTenantSettingsDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  defaultRenewalWindowDays?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  emailAlerts?: boolean;

  @ApiPropertyOptional({ type: () => UpdateTenantOrgMetadataDto })
  @ValidateNested()
  @Type(() => UpdateTenantOrgMetadataDto)
  @IsOptional()
  orgMetadata?: UpdateTenantOrgMetadataDto;
}

export class UpdateTenantDto implements UpdateTenantRequest {
  @ApiPropertyOptional({ example: 'Stripe Global Services Updated' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: TenantStatus })
  @IsEnum(TenantStatus)
  @IsOptional()
  status?: TenantStatus;

  @ApiPropertyOptional({ enum: SubscriptionTier })
  @IsEnum(SubscriptionTier)
  @IsOptional()
  tier?: SubscriptionTier;

  @ApiPropertyOptional({ example: 1000 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxCertificates?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxGateways?: number;

  @ApiPropertyOptional({ type: () => UpdateTenantSettingsDto, description: 'Tenant settings and org metadata' })
  @ValidateNested()
  @Type(() => UpdateTenantSettingsDto)
  @IsOptional()
  settings?: UpdateTenantSettingsDto;
}


import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus, SubscriptionTier, type UpdateTenantRequest } from '@clm/shared-types';

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
}


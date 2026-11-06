import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionTier, type CreateTenantRequest } from '@clm/shared-types';

export class CreateTenantDto implements CreateTenantRequest {
  @ApiProperty({ example: 'Stripe Global Services' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'stripe-global' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({ enum: SubscriptionTier, default: SubscriptionTier.ENTERPRISE })
  @IsEnum(SubscriptionTier)
  @IsOptional()
  tier?: SubscriptionTier;

  @ApiProperty({ example: 'admin@stripe.com' })
  @IsEmail()
  @IsNotEmpty()
  adminEmail!: string;

  @ApiProperty({ example: 'Sarah' })
  @IsString()
  @IsNotEmpty()
  adminFirstName!: string;

  @ApiProperty({ example: 'Connor' })
  @IsString()
  @IsNotEmpty()
  adminLastName!: string;

  @ApiPropertyOptional({ example: 500, default: 50 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxCertificates?: number;

  @ApiPropertyOptional({ example: 10, default: 5 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxGateways?: number;

  @ApiPropertyOptional({ example: '112233445566' })
  @IsString()
  @IsOptional()
  awsAccountId?: string;

  @ApiPropertyOptional({ example: 'aws-cust-stripe-corp' })
  @IsString()
  @IsOptional()
  awsCustomerIdentifier?: string;
}


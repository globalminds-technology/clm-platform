import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CloudProvider, CloudAccountAuthType } from '@clm/shared-types';

export class CreateCloudAccountDto {
  @ApiProperty({ enum: CloudProvider, example: CloudProvider.AWS })
  @IsEnum(CloudProvider)
  @IsNotEmpty()
  provider!: CloudProvider;

  @ApiProperty({ example: 'Production AWS US-East' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: CloudAccountAuthType, example: CloudAccountAuthType.ACCESS_KEY, required: false })
  @IsEnum(CloudAccountAuthType)
  @IsOptional()
  authType?: CloudAccountAuthType;

  @ApiProperty({ example: 'us-east-1', required: false })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({ example: 'AKIAIOSFODNN7EXAMPLE', required: false })
  @IsString()
  @IsOptional()
  awsAccessKeyId?: string;

  @ApiProperty({ example: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', required: false })
  @IsString()
  @IsOptional()
  awsSecretAccessKey?: string;

  @ApiProperty({ example: 'arn:aws:iam::123456789012:role/CLM-Cert-Role', required: false })
  @IsString()
  @IsOptional()
  awsRoleArn?: string;

  @ApiProperty({ example: '4a2b9c8d-1e7f-0a3b-5c7d-e3b0c44298fc', required: false })
  @IsString()
  @IsOptional()
  azureTenantId?: string;

  @ApiProperty({ example: '7b8c9d0e-1f2a-3b4c-5d6e-1234c44298fc', required: false })
  @IsString()
  @IsOptional()
  azureClientId?: string;

  @ApiProperty({ example: 'secret_value_example', required: false })
  @IsString()
  @IsOptional()
  azureClientSecret?: string;

  @ApiProperty({ example: 'my-gcp-project-123', required: false })
  @IsString()
  @IsOptional()
  gcpProjectId?: string;

  @ApiProperty({ example: '{"type": "service_account", ...}', required: false })
  @IsString()
  @IsOptional()
  gcpServiceAccountJson?: string;
}


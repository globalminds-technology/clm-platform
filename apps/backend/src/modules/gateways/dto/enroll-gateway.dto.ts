import { IsString, IsNotEmpty, IsArray, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeployTargetType, type EnrollGatewayRequest } from '@clm/shared-types';

export class EnrollGatewayDto implements EnrollGatewayRequest {
  @ApiProperty({ description: 'Human-readable name for the gateway daemon', example: 'us-east-1-k8s-cluster' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Labels for gateway fleet targeting and placement',
    example: { env: 'production', region: 'us-east-1' },
  })
  @IsOptional()
  labels?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Supported deployment targets on this gateway host',
    enum: DeployTargetType,
    isArray: true,
  })
  @IsArray()
  @IsEnum(DeployTargetType, { each: true })
  @IsOptional()
  targetTypesSupported?: DeployTargetType[];
}


import { IsString, IsNotEmpty, IsOptional, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GatewayHeartbeatDto {
  @ApiProperty({ example: '20000000-0000-0000-0000-000000000001', description: 'Enrolled Gateway UUID' })
  @IsString()
  @IsNotEmpty()
  gatewayId!: string;

  @ApiProperty({ example: '1.0.0', description: 'Installed Gateway Agent Version' })
  @IsString()
  @IsNotEmpty()
  version!: string;

  @ApiProperty({ example: '10.0.1.15', description: 'Private VPC or host IP address' })
  @IsString()
  @IsNotEmpty()
  ipAddress!: string;

  @ApiProperty({ example: 4, description: 'Number of certificates currently monitored locally' })
  @IsNumber()
  @IsOptional()
  activeCertsCount?: number;

  @ApiProperty({ example: { cpuUsage: 2.1, memoryMb: 142 }, description: 'Host resource metrics' })
  @IsObject()
  @IsOptional()
  metrics?: {
    cpuUsage: number;
    memoryMb: number;
  };
}


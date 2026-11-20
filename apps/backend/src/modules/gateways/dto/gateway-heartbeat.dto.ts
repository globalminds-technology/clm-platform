import { IsString, IsNotEmpty, IsOptional, IsNumber, IsObject, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DiscoveredCertDto {
  @ApiProperty({ example: 'api.example.com' })
  @IsString()
  @IsNotEmpty()
  domain!: string;

  @ApiProperty({ example: ['api.example.com', 'api-v2.example.com'], required: false })
  @IsArray()
  @IsOptional()
  sans?: string[];

  @ApiProperty({ example: "Let's Encrypt Authority X3" })
  @IsString()
  @IsNotEmpty()
  issuer!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fingerprintSha256?: string;

  @ApiProperty({ example: 'RSA_2048', required: false })
  @IsString()
  @IsOptional()
  keyAlgorithm?: string;

  @ApiProperty({ example: '2026-01-01T00:00:00Z' })
  @IsString()
  @IsNotEmpty()
  notBefore!: string;

  @ApiProperty({ example: '2026-04-01T00:00:00Z' })
  @IsString()
  @IsNotEmpty()
  notAfter!: string;

  @ApiProperty({ example: 45, required: false })
  @IsNumber()
  @IsOptional()
  expiryDays?: number;
}

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

  @ApiProperty({ type: [DiscoveredCertDto], required: false, description: 'Certificates discovered on local filesystem' })
  @IsArray()
  @IsOptional()
  discoveredCertificates?: DiscoveredCertDto[];
}


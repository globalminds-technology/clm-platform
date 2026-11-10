import { IsString, IsNotEmpty, IsOptional, IsIn, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GatewayCommandAckDto {
  @ApiProperty({ example: 'cmd_01a2b3c4', description: 'Dispatched Command UUID' })
  @IsString()
  @IsNotEmpty()
  commandId!: string;

  @ApiProperty({ example: '20000000-0000-0000-0000-000000000001', description: 'Reporting Gateway UUID' })
  @IsString()
  @IsNotEmpty()
  gatewayId!: string;

  @ApiProperty({ example: 'COMPLETED', enum: ['COMPLETED', 'FAILED'] })
  @IsIn(['COMPLETED', 'FAILED'])
  status!: 'COMPLETED' | 'FAILED';

  @ApiProperty({ example: { discoveredCount: 5 }, required: false })
  @IsObject()
  @IsOptional()
  result?: any;

  @ApiProperty({ example: 'Failed to bind port 443', required: false })
  @IsString()
  @IsOptional()
  errorMessage?: string;
}


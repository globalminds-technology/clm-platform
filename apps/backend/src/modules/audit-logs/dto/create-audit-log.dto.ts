import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuditActorType, AuditAction } from '@clm/shared-types';

export class CreateAuditLogDto {
  @ApiProperty({ enum: AuditActorType, example: AuditActorType.USER })
  @IsEnum(AuditActorType)
  actorType!: AuditActorType;

  @ApiProperty({ example: 'u0000000-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  actorId!: string;

  @ApiProperty({ example: 'admin@acme.com', required: false })
  @IsString()
  @IsOptional()
  actorEmail?: string;

  @ApiProperty({ enum: AuditAction, example: AuditAction.CERT_REQUESTED })
  @IsEnum(AuditAction)
  action!: AuditAction;

  @ApiProperty({ example: 'CERTIFICATE' })
  @IsString()
  @IsNotEmpty()
  resourceType!: string;

  @ApiProperty({ example: 'c0000000-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  resourceId!: string;

  @ApiProperty({ example: { domain: 'payments.example.com', issuer: 'DigiCert' }, required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ example: '198.51.100.42', required: false })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiProperty({ example: 'Mozilla/5.0...', required: false })
  @IsString()
  @IsOptional()
  userAgent?: string;
}

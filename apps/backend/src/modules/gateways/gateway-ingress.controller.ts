import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GatewaysService } from './gateways.service';
import { Public } from '../../shared/auth/public.decorator';
import { GatewayHeartbeatDto } from './dto/gateway-heartbeat.dto';
import { GatewayCommandAckDto } from './dto/gateway-command-ack.dto';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IngressEnrollDto {
  @ApiProperty({ example: 'clm_enroll_YTAwM...', description: 'Single-use bootstrap enrollment token' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'gw-prod-01.acme.internal', description: 'Host machine FQDN / hostname' })
  @IsString()
  @IsNotEmpty()
  hostname!: string;

  @ApiProperty({ example: '10.0.1.15', description: 'Host primary internal IP' })
  @IsString()
  @IsNotEmpty()
  ipAddress!: string;

  @ApiProperty({ example: '1.0.0', description: 'Gateway daemon binary version' })
  @IsString()
  @IsNotEmpty()
  version!: string;
}

@ApiTags('Gateway Ingress')
@Controller('ingress/gateway')
export class GatewayIngressController {
  constructor(private readonly gatewaysService: GatewaysService) {}

  @Public()
  @Post('enroll')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Satellite gateway enrollment handshake via bootstrap token' })
  @ApiResponse({ status: 200, description: 'Gateway registered and activated' })
  async enroll(@Body() dto: IngressEnrollDto) {
    return this.gatewaysService.enrollWithToken(
      dto.token,
      dto.hostname,
      dto.ipAddress,
      dto.version,
    );
  }

  @Public()
  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Satellite gateway heartbeat beacon and pending command fetch' })
  @ApiResponse({ status: 200, description: 'Heartbeat acknowledged with pending commands' })
  async heartbeat(@Body() dto: GatewayHeartbeatDto) {
    return this.gatewaysService.processHeartbeat(dto);
  }

  @Public()
  @Post('command-ack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Satellite gateway command completion acknowledgment' })
  @ApiResponse({ status: 200, description: 'Acknowledgment registered' })
  async commandAck(@Body() dto: GatewayCommandAckDto) {
    return this.gatewaysService.acknowledgeCommand(dto);
  }
}


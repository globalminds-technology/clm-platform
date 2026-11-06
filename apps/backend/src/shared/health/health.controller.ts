import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe endpoint' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  getLiveness() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe endpoint' })
  @ApiResponse({ status: 200, description: 'Service is ready to handle traffic' })
  getReadiness() {
    return {
      status: 'READY',
      version: '1.0.0',
      database: 'UP',
      redis: 'UP',
      timestamp: new Date().toISOString(),
    };
  }
}


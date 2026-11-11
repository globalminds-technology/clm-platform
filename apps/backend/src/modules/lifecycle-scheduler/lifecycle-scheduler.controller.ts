import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@clm/shared-types';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard';
import { CurrentTenant } from '../../shared/tenancy/current-tenant.decorator';
import { CurrentUser } from '../../shared/auth/current-user.decorator';
import { LifecycleSchedulerService, type SchedulerExecutionStats } from './lifecycle-scheduler.service';

@ApiTags('Lifecycle Scheduler')
@Controller('lifecycle-scheduler')
export class LifecycleSchedulerController {
  constructor(private readonly schedulerService: LifecycleSchedulerService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current health and statistics of the automated lifecycle watchdog engine' })
  @ApiResponse({ status: 200, description: 'Scheduler engine status and telemetry' })
  getStatus(): SchedulerExecutionStats {
    return this.schedulerService.getStatus();
  }

  @Post('evaluate-now')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.SECURITY_LEAD)
  @ApiOperation({ summary: 'Trigger an immediate background evaluation across all tenants (Auto-Renewals & Watchdog)' })
  @ApiResponse({ status: 200, description: 'Evaluation executed and stats returned' })
  async evaluateNow(): Promise<SchedulerExecutionStats> {
    return this.schedulerService.evaluateLifecycle();
  }

  @Post('send-test-alert')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.SECURITY_LEAD, Role.DEVOPS_ENGINEER)
  @ApiOperation({ summary: 'Dispatch a live test certificate expiry alert email via SMTP' })
  @ApiResponse({ status: 200, description: 'Test alert email sent' })
  async sendTestAlert(
    @CurrentTenant() tenantId: string,
    @CurrentUser('email') userEmail: string,
    @Body('targetEmail') targetEmail?: string,
  ) {
    const email = targetEmail || userEmail || 'pashokbabu.38@gmail.com';
    return this.schedulerService.sendTestAlert(tenantId, email);
  }
}



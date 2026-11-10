import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionTier, type PlanDefinition, Role } from '@clm/shared-types';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard';
import { Public } from '../../shared/auth/public.decorator';

const SYSTEM_PLANS: PlanDefinition[] = [
  {
    id: 'plan_community',
    tier: SubscriptionTier.COMMUNITY,
    name: 'Community Plan',
    maxCertificates: 50,
    maxGateways: 2,
    priceMonthly: 0,
    features: ['Up to 50 SSL certificates', '2 On-Prem Gateway daemons', 'Community Support', 'Basic Auto-Renewal'],
    effectiveDate: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan_paygo',
    tier: SubscriptionTier.AWS_MARKETPLACE_PAYGO,
    name: 'AWS Marketplace PayGO',
    maxCertificates: 250,
    maxGateways: 10,
    priceMonthly: 299,
    features: ['Up to 250 SSL certificates', '10 Local Gateways', 'Hourly Metering via AWS', 'AWS ALB & ACM Integration'],
    effectiveDate: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan_pro',
    tier: SubscriptionTier.PROFESSIONAL,
    name: 'Professional Team',
    maxCertificates: 500,
    maxGateways: 15,
    priceMonthly: 599,
    features: ['Up to 500 SSL certificates', '15 Gateways', 'Team RBAC & Audit Trails', 'Priority Email Support'],
    effectiveDate: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan_enterprise',
    tier: SubscriptionTier.ENTERPRISE,
    name: 'Enterprise Dedicated',
    maxCertificates: 1000,
    maxGateways: 25,
    priceMonthly: 1299,
    features: ['Unlimited / 1000+ Certificates', '25+ High Availability Gateways', 'Dedicated 24/7 SLA', 'Custom RLS Partitioning'],
    effectiveDate: '2026-01-01T00:00:00.000Z',
  },
];

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  private plans = [...SYSTEM_PLANS];

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all subscription plan tiers and specifications' })
  @ApiResponse({ status: 200, description: 'Plans list returned' })
  findAll(): PlanDefinition[] {
    return this.plans;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Patch(':tier')
  @ApiOperation({ summary: 'Update plan quotas, pricing, and scheduled effective date (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  update(
    @Param('tier') tier: SubscriptionTier,
    @Body()
    body: Partial<PlanDefinition>,
  ): PlanDefinition {
    const idx = this.plans.findIndex(p => p.tier === tier);
    if (idx !== -1) {
      const existing = this.plans[idx]!;
      this.plans[idx] = {
        id: existing.id,
        tier: existing.tier,
        name: body.name ?? existing.name,
        maxCertificates: body.maxCertificates ?? existing.maxCertificates,
        maxGateways: body.maxGateways ?? existing.maxGateways,
        priceMonthly: body.priceMonthly ?? existing.priceMonthly,
        features: body.features ?? existing.features,
        effectiveDate: body.effectiveDate ?? existing.effectiveDate,
      };
      return this.plans[idx]!;
    }
    return this.plans[0]!;
  }
}

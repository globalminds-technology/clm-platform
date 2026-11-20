import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Role } from '@clm/shared-types';

export const CurrentTenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;

  if (!user) {
    throw new UnauthorizedException('Authentication required. Missing user context.');
  }

  // Super Admin can inspect a specific tenant via header or query if desired
  if (user.role === Role.SUPER_ADMIN) {
    const overrideTenant = (request.headers['x-tenant-id'] as string) || (request.query?.tenantId as string);
    if (overrideTenant) {
      return overrideTenant;
    }
  }

  // Regular tenant users are strictly scoped to their own verified JWT tenantId
  const tenantId = user.tenantId;
  if (!tenantId) {
    throw new UnauthorizedException('Tenant context is required. Please authenticate with a valid JWT.');
  }

  return tenantId;
});

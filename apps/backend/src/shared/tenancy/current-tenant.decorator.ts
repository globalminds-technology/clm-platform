import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const CurrentTenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  // Extracted from JWT token payload, session user, or X-Tenant-ID header
  const tenantId = request.user?.tenantId || request.headers['x-tenant-id'];
  if (!tenantId) {
    throw new UnauthorizedException('Tenant context is required. Please authenticate or provide valid credentials.');
  }
  return tenantId;
});



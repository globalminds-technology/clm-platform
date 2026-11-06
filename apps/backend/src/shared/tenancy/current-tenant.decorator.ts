import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  // Extracted from JWT token payload, session user, or X-Tenant-ID header
  return request.user?.tenantId || request.headers['x-tenant-id'] || 'a0000000-0000-0000-0000-000000000001';
});


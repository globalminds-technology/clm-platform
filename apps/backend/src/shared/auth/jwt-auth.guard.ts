import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Role } from '@clm/shared-types';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const userRole = req.headers['x-user-role'] as Role;
    const explicitTenantId = req.headers['x-tenant-id'] as string;

    // 1. Platform Super Admin access (e.g. from admin-portal), always elevated
    if (process.env.NODE_ENV !== 'production' && userRole === Role.SUPER_ADMIN) {
      req.user = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'superadmin@clm.internal',
        role: Role.SUPER_ADMIN,
      };
      return true;
    }

    // 2. Try standard Passport JWT authentication
    try {
      const result = (await super.canActivate(context)) as boolean;
      if (result) {
        return true;
      }
    } catch {
      // In local development:
      // If token expired (15m timeout) or cookie collided between portals on localhost,
      // fallback gracefully to explicit tenant ID from headers
      if (process.env.NODE_ENV !== 'production' && explicitTenantId) {
        req.user = {
          id: '10000000-0000-0000-0000-000000000001',
          email: 'admin@alphacorp.com',
          tenantId: explicitTenantId,
          role: userRole || Role.TENANT_ADMIN,
        };
        return true;
      }
      throw new UnauthorizedException('Authentication credentials expired or invalid');
    }

    // 3. Fallback for development if no token was sent but explicitTenantId is provided
    if (process.env.NODE_ENV !== 'production' && explicitTenantId) {
      req.user = {
        id: '10000000-0000-0000-0000-000000000001',
        email: 'admin@alphacorp.com',
        tenantId: explicitTenantId,
        role: userRole || Role.TENANT_ADMIN,
      };
      return true;
    }

    return false;
  }
}


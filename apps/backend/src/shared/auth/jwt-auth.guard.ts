import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Role } from '@clm/shared-types';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    const cookie = req.cookies?.['clm_access_token'];

    // In local development, attach a default super/tenant admin user if unauthenticated
    if (!authHeader && !cookie && process.env.NODE_ENV !== 'production') {
      req.user = {
        id: '10000000-0000-0000-0000-000000000001',
        email: 'dev-admin@clm.internal',
        tenantId: req.headers['x-tenant-id'] || 'a0000000-0000-0000-0000-000000000001',
        role: (req.headers['x-user-role'] as Role) || Role.SUPER_ADMIN,
      };
      return true;
    }

    return super.canActivate(context);
  }
}


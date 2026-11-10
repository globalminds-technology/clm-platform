import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Role } from '@clm/shared-types';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: Role;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Extract from standard Authorization: Bearer <token> header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // 2. Extract from httpOnly cookie 'clm_access_token'
        (req: Request) => {
          if (req && req.cookies) {
            return req.cookies['clm_access_token'] || null;
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'clm-super-secure-jwt-secret-key-change-in-production-32bytes!'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.tenantId) {
      throw new UnauthorizedException('Malformed token payload');
    }

    return {
      id: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      role: payload.role,
    };
  }
}


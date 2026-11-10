import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../modules/users/users.service';
import { CryptoService } from '../crypto/crypto.service';
import { LoginDto } from './dto/login.dto';
import { type User } from '@clm/shared-types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  tokens: AuthTokens;
  user: User;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly cryptoService: CryptoService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResult> {
    const userWithPassword = await this.usersService.findByEmailGlobal(dto.email);
    if (!userWithPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await this.cryptoService.verifyPassword(
      dto.password,
      userWithPassword.passwordHash,
    );
    if (!isMatch) {
      this.logger.warn(`Failed login attempt for email: ${dto.email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login timestamp in tenant context
    await this.usersService.updateLastLogin(userWithPassword.tenantId, userWithPassword.id);

    const payload = {
      sub: userWithPassword.id,
      email: userWithPassword.email,
      tenantId: userWithPassword.tenantId,
      role: userWithPassword.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'clm-refresh-jwt-secret-key-change-in-production-32bytes!',
    );

    const refreshToken = this.jwtService.sign(
      { sub: userWithPassword.id, tenantId: userWithPassword.tenantId },
      {
        secret: refreshSecret,
        expiresIn: '7d',
      },
    );

    // Strip out passwordHash
    const { passwordHash: _, ...safeUser } = userWithPassword;

    this.logger.log(`User logged in successfully: ${userWithPassword.id} (${userWithPassword.email})`);

    return {
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes in seconds
      },
      user: safeUser,
    };
  }

  async refreshToken(token: string): Promise<AuthTokens> {
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'clm-refresh-jwt-secret-key-change-in-production-32bytes!',
    );

    try {
      const decoded = this.jwtService.verify(token, { secret: refreshSecret });
      const user = await this.usersService.findById(decoded.tenantId, decoded.sub);

      const payload = {
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      };

      const newAccessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
      const newRefreshToken = this.jwtService.sign(
        { sub: user.id, tenantId: user.tenantId },
        { secret: refreshSecret, expiresIn: '7d' },
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}


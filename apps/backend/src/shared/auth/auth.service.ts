import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { UsersService } from '../../modules/users/users.service';
import { CryptoService } from '../crypto/crypto.service';
import { MailService } from '../mail/mail.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { type User } from '@clm/shared-types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  tokens: AuthTokens;
  user: User;
  tenant?: any;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly cryptoService: CryptoService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly tenantContextService: TenantContextService,
  ) {}


  createTokensForUser(user: { id: string; email: string; tenantId: string; role: any }): AuthTokens {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const jwtExpiry = (this.configService.get<string>('JWT_EXPIRES_IN') || '7d') as any;

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: jwtExpiry,
    });

    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'clm-refresh-jwt-secret-key-change-in-production-32bytes!',
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, tenantId: user.tenantId },
      {
        secret: refreshSecret,
        expiresIn: '30d',
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60,
    };
  }

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

    const tokens = this.createTokensForUser(userWithPassword);

    // Strip out passwordHash
    const { passwordHash: _, ...safeUser } = userWithPassword;

    this.logger.log(`User logged in successfully: ${userWithPassword.id} (${userWithPassword.email})`);

    return {
      tokens,
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

      const jwtExpiry = (this.configService.get<string>('JWT_EXPIRES_IN') || '7d') as any;
      const newAccessToken = this.jwtService.sign(payload, { expiresIn: jwtExpiry });
      const newRefreshToken = this.jwtService.sign(
        { sub: user.id, tenantId: user.tenantId },
        { secret: refreshSecret, expiresIn: '30d' },
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 7 * 24 * 60 * 60,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; devCode?: string }> {
    const user = await this.usersService.findByEmailGlobal(dto.email);
    if (!user) {
      // Return generic message to prevent email account enumeration attacks
      return {
        message: 'If an account with that email exists, password reset instructions have been sent.',
      };
    }

    // Generate random 6-digit numeric verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = crypto.createHash('sha256').update(resetCode).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration

    await this.tenantContextService.withSystemContext(async client => {
      // Invalidate existing unused tokens for this email
      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE email = $1 AND used_at IS NULL;',
        [dto.email.toLowerCase().trim()],
      );

      await client.query(
        `INSERT INTO password_reset_tokens (email, token_hash, expires_at)
         VALUES ($1, $2, $3);`,
        [dto.email.toLowerCase().trim(), tokenHash, expiresAt],
      );
    });

    // Dispatch email (or fallback to console box)
    await this.mailService.sendPasswordResetEmail({
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      resetCode,
      expiresInMinutes: 15,
    });

    this.logger.log(`Password reset code generated and dispatched for email: ${dto.email}`);

    return {
      message: 'If an account with that email exists, password reset instructions have been sent.',
      devCode: process.env.NODE_ENV !== 'production' ? resetCode : undefined,
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = crypto.createHash('sha256').update(dto.token.trim()).digest('hex');

    const tokenRecord = await this.tenantContextService.withSystemContext(async client => {
      const res = await client.query(
        `SELECT * FROM password_reset_tokens 
         WHERE email = $1 AND token_hash = $2 AND used_at IS NULL AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1;`,
        [dto.email.toLowerCase().trim(), tokenHash],
      );
      return res.rows[0] || null;
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired password reset verification code. Please request a new code.');
    }

    // Hash the new password with Argon2id OWASP parameters
    const newPasswordHash = await this.cryptoService.hashPassword(dto.newPassword);

    await this.tenantContextService.withSystemContext(async client => {
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2;',
        [newPasswordHash, dto.email.toLowerCase().trim()],
      );
      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1;',
        [tokenRecord.id],
      );
    });

    this.logger.log(`Password reset successfully executed for user: ${dto.email}`);

    return {
      message: 'Password has been successfully reset. You can now sign in with your new password.',
    };
  }
}



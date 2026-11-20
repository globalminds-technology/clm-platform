import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService, AuthResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from './public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { TenantsService } from '../../modules/tenants/tenants.service';
import { UsersService } from '../../modules/users/users.service';
import { type RegisterTenantRequest } from '@clm/shared-types';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tenantsService: TenantsService,
    private readonly usersService: UsersService,
  ) { }

  @Public()
  @Post('register-tenant')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Self-serve tenant signup with PENDING_APPROVAL gating' })
  @ApiResponse({ status: 201, description: 'Organization created and authenticated' })
  async registerTenant(
    @Body() dto: RegisterTenantRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tenant, adminUser } = await this.tenantsService.register(dto);
    const tokens = this.authService.createTokensForUser(adminUser);

    res.cookie('clm_refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    res.cookie('clm_access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      tenant,
      user: adminUser,
      tokens,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email and Argon2 password' })
  @ApiResponse({ status: 200, description: 'Authentication successful with JWT' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResult> {
    const result = await this.authService.login(dto);

    // Set secure httpOnly cookie for refresh token per .coderabbit.yaml security rules
    res.cookie('clm_refresh_token', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth',
    });

    // Also set access token cookie for browser clients
    res.cookie('clm_access_token', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    let tenant: any = null;
      if (result.user.tenantId) {
        try {
          tenant = await this.tenantsService.findById(result.user.tenantId);
        } catch {
          // ignore
        }
      }

      return {
        ...result,
        tenant,
      };
    }

    @Public()
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request password reset verification code' })
    @ApiResponse({ status: 200, description: 'Verification code dispatched' })
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
      return this.authService.forgotPassword(dto);
    }

    @Public()
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset account password with verification code' })
    @ApiResponse({ status: 200, description: 'Password reset successfully' })
    @ApiResponse({ status: 400, description: 'Invalid or expired code' })
    async resetPassword(@Body() dto: ResetPasswordDto) {
      return this.authService.resetPassword(dto);
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
    @ApiResponse({ status: 200, description: 'Tokens renewed' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
    async refresh(
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
    ) {
      const token = req.cookies?.['clm_refresh_token'] || (req.body as any)?.refreshToken;
      if (!token) {
        throw new UnauthorizedException('Refresh token is required');
      }

      const tokens = await this.authService.refreshToken(token);

      res.cookie('clm_refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      res.cookie('clm_access_token', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      return {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      };
    }

    @Public()
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout and clear authentication cookies' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    async logout(@Res({ passthrough: true }) res: Response) {
      res.clearCookie('clm_refresh_token', { path: '/api/v1/auth' });
      res.clearCookie('clm_access_token', { path: '/' });
      return { success: true, message: 'Logged out successfully' };
    }

    @Public()
    @Get('check-email')
    @ApiOperation({ summary: 'Check if email is already registered across any organization' })
    @ApiResponse({ status: 200, description: 'Email availability status' })
    async checkEmail(@Query('email') email: string) {
      if (!email || !email.trim()) {
        return { exists: false };
      }
      const user = await this.usersService.findByEmailGlobal(email.trim());
      return {
        exists: !!user,
        message: user
          ? 'This email is already registered with an existing organization. Please sign in instead.'
          : 'Email is available.',
      };
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current authenticated user profile' })
    @ApiResponse({ status: 200, description: 'Current user profile' })
    async me(@CurrentUser() user: any) {
      if (!user) {
        throw new UnauthorizedException('Authentication required');
      }
      let fullUser = user;
      let tenant: any = null;
        if (user.tenantId) {
          try {
            const dbUser = await this.usersService.findById(user.tenantId, user.id);
            if (dbUser) fullUser = dbUser;
            tenant = await this.tenantsService.findById(user.tenantId);
          } catch {
            // ignore
          }
        }
        return {
          user: fullUser,
          tenant,
        };
      }
    }


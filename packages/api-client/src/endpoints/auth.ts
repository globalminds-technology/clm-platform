import { type HttpClient } from '../http';
import {
  type User,
  type AuthSession,
  type RegisterTenantRequest,
  type ForgotPasswordRequest,
  type ForgotPasswordResponse,
  type ResetPasswordRequest,
  type ResetPasswordResponse,
} from '@clm/shared-types';

export interface LoginRequest {
  email: string;
  password: string;
}

export class AuthEndpoint {
  constructor(private http: HttpClient) {}

  login(data: LoginRequest): Promise<AuthSession> {
    return this.http.post<AuthSession>('auth/login', data);
  }

  registerTenant(data: RegisterTenantRequest): Promise<any> {
    return this.http.post<any>('auth/register-tenant', data);
  }

  forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>('auth/forgot-password', data);
  }

  resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    return this.http.post<ResetPasswordResponse>('auth/reset-password', data);
  }

  logout(): Promise<void> {
    return this.http.post<void>('auth/logout');
  }

  checkEmail(email: string): Promise<{ exists: boolean; message: string }> {
    return this.http.get<{ exists: boolean; message: string }>(`auth/check-email?email=${encodeURIComponent(email)}`);
  }

  getMe(): Promise<User> {
    return this.http.get<User>('auth/me');
  }

  me(): Promise<{ user: User; tenant: any }> {
    return this.http.get<{ user: User; tenant: any }>('auth/me');
  }
}




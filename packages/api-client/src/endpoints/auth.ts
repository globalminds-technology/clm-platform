import { type HttpClient } from '../http';
import { type User, type AuthSession, type RegisterTenantRequest } from '@clm/shared-types';

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

  logout(): Promise<void> {
    return this.http.post<void>('auth/logout');
  }

  getMe(): Promise<User> {
    return this.http.get<User>('auth/me');
  }
}



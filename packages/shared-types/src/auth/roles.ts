export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  SECURITY_LEAD = 'SECURITY_LEAD',
  DEVOPS_ENGINEER = 'DEVOPS_ENGINEER',
  AUDITOR = 'AUDITOR',
  READ_ONLY = 'READ_ONLY',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InviteMemberRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  password?: string;
}

export interface UpdateMemberRoleRequest {
  userId: string;
  role: Role;
}

export interface UpdateMemberStatusRequest {
  userId: string;
  status: UserStatus;
}

export interface MemberListItem extends User {
  tenantName?: string;
}

export interface AuthSession {
  user: User;
  tenantId: string;
  tenant?: any;
  token?: string;
  expiresAt?: string;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  devCode?: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}


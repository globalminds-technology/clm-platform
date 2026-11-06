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

export interface AuthSession {
  user: User;
  tenantId: string;
  token: string;
  expiresAt: string;
}


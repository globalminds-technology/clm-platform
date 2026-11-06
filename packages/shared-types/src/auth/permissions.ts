import { Role } from './roles';

export enum Permission {
  CERTIFICATE_READ = 'CERTIFICATE_READ',
  CERTIFICATE_REQUEST = 'CERTIFICATE_REQUEST',
  CERTIFICATE_APPROVE = 'CERTIFICATE_APPROVE',
  CERTIFICATE_REVOKE = 'CERTIFICATE_REVOKE',
  CERTIFICATE_DEPLOY = 'CERTIFICATE_DEPLOY',
  GATEWAY_READ = 'GATEWAY_READ',
  GATEWAY_ENROLL = 'GATEWAY_ENROLL',
  GATEWAY_MANAGE = 'GATEWAY_MANAGE',
  TENANT_MANAGE = 'TENANT_MANAGE',
  USER_MANAGE = 'USER_MANAGE',
  AUDIT_READ = 'AUDIT_READ',
}

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  [Role.TENANT_ADMIN]: [
    Permission.CERTIFICATE_READ,
    Permission.CERTIFICATE_REQUEST,
    Permission.CERTIFICATE_APPROVE,
    Permission.CERTIFICATE_REVOKE,
    Permission.CERTIFICATE_DEPLOY,
    Permission.GATEWAY_READ,
    Permission.GATEWAY_ENROLL,
    Permission.GATEWAY_MANAGE,
    Permission.TENANT_MANAGE,
    Permission.USER_MANAGE,
    Permission.AUDIT_READ,
  ],
  [Role.SECURITY_LEAD]: [
    Permission.CERTIFICATE_READ,
    Permission.CERTIFICATE_REQUEST,
    Permission.CERTIFICATE_APPROVE,
    Permission.CERTIFICATE_REVOKE,
    Permission.GATEWAY_READ,
    Permission.AUDIT_READ,
  ],
  [Role.DEVOPS_ENGINEER]: [
    Permission.CERTIFICATE_READ,
    Permission.CERTIFICATE_REQUEST,
    Permission.CERTIFICATE_DEPLOY,
    Permission.GATEWAY_READ,
    Permission.GATEWAY_ENROLL,
    Permission.GATEWAY_MANAGE,
    Permission.AUDIT_READ,
  ],
  [Role.AUDITOR]: [Permission.CERTIFICATE_READ, Permission.GATEWAY_READ, Permission.AUDIT_READ],
  [Role.READ_ONLY]: [Permission.CERTIFICATE_READ, Permission.GATEWAY_READ],
};


export enum AuditActorType {
  USER = 'USER',
  GATEWAY = 'GATEWAY',
  SYSTEM = 'SYSTEM',
}

export enum AuditAction {
  // Auth actions
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',

  // Certificate actions
  CERT_REQUESTED = 'CERT_REQUESTED',
  CERT_ISSUED = 'CERT_ISSUED',
  CERT_RENEWED = 'CERT_RENEWED',
  CERT_REVOKED = 'CERT_REVOKED',
  CERT_DEPLOYED = 'CERT_DEPLOYED',
  CERT_DEPLOY_FAILED = 'CERT_DEPLOY_FAILED',
  CERT_DISCOVERED = 'CERT_DISCOVERED',

  // Gateway actions
  GATEWAY_ENROLLED = 'GATEWAY_ENROLLED',
  GATEWAY_HEARTBEAT = 'GATEWAY_HEARTBEAT',
  GATEWAY_DECOMMISSIONED = 'GATEWAY_DECOMMISSIONED',
  COMMAND_DISPATCHED = 'COMMAND_DISPATCHED',
  COMMAND_EXECUTED = 'COMMAND_EXECUTED',

  // Tenant actions
  TENANT_CREATED = 'TENANT_CREATED',
  TENANT_UPDATED = 'TENANT_UPDATED',
  TENANT_SUSPENDED = 'TENANT_SUSPENDED',
  TENANT_SETTINGS_CHANGED = 'TENANT_SETTINGS_CHANGED',

  // CA Integration actions
  CA_INTEGRATION_CREATED = 'CA_INTEGRATION_CREATED',
  CA_INTEGRATION_UPDATED = 'CA_INTEGRATION_UPDATED',
  CA_INTEGRATION_DELETED = 'CA_INTEGRATION_DELETED',
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actorType: AuditActorType;
  actorId: string;
  actorEmail?: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: string;
}

export interface AuditFilterParams {
  actorId?: string;
  action?: AuditAction;
  resourceType?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
}


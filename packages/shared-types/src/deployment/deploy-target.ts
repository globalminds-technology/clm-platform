export enum DeployTargetType {
  AWS_ACM = 'AWS_ACM',
  AWS_ALB = 'AWS_ALB',
  AWS_CLOUDFRONT = 'AWS_CLOUDFRONT',
  NGINX = 'NGINX',
  APACHE = 'APACHE',
  IIS = 'IIS',
  KUBERNETES_SECRET = 'KUBERNETES_SECRET',
  F5_BIGIP = 'F5_BIGIP',
  CLOUDFLARE = 'CLOUDFLARE',
}

export enum DeployAction {
  DEPLOY = 'DEPLOY',
  VERIFY = 'VERIFY',
  ROLLBACK = 'ROLLBACK',
}

export enum DeploymentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DEPLOYED = 'DEPLOYED',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

export interface DeployTarget {
  id: string;
  tenantId: string;
  name: string;
  targetType: DeployTargetType;
  gatewayId: string;
  config: Record<string, unknown>;
  autoDeploy: boolean;
  lastDeployedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentRecord {
  id: string;
  tenantId: string;
  certificateId: string;
  deployTargetId: string;
  action: DeployAction;
  status: DeploymentStatus;
  errorMessage?: string | null;
  logs?: string[];
  executedAt: string;
  completedAt?: string | null;
}

export interface TriggerDeployRequest {
  certificateId: string;
  targetIds: string[];
  action?: DeployAction;
}


export enum CommandType {
  DISCOVERY_SCAN = 'DISCOVERY_SCAN',
  DEPLOY_CERT = 'DEPLOY_CERT',
  VERIFY_CERT = 'VERIFY_CERT',
  ROLLBACK_CERT = 'ROLLBACK_CERT',
  HEARTBEAT_ACK = 'HEARTBEAT_ACK',
}

export enum CommandStatus {
  PENDING = 'PENDING',
  DISPATCHED = 'DISPATCHED',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface GatewayCommand<TPayload = Record<string, unknown>> {
  id: string;
  tenantId: string;
  gatewayId: string;
  type: CommandType;
  status: CommandStatus;
  payload: TPayload;
  signature: string; // HMAC/KMS signature from backend control plane
  dispatchedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface DiscoveryScanPayload {
  ipRanges: string[];
  ports: number[];
  domains: string[];
  timeoutSeconds: number;
}

export interface DiscoveryScanResult {
  host: string;
  port: number;
  domain: string;
  issuer: string;
  notAfter: string;
  fingerprintSha256: string;
  isSelfSigned: boolean;
}

export interface DeployCertPayload {
  certificateId: string;
  domain: string;
  certificatePem: string;
  privateKeyPem?: string;
  caBundlePem?: string;
  targetType: string;
  targetConfig: {
    certPath?: string;
    keyPath?: string;
    reloadCommand?: string;
    awsRegion?: string;
    acmCertificateArn?: string;
    albListenerArn?: string;
    k8sNamespace?: string;
    k8sSecretName?: string;
    [key: string]: any;
  };
}



import { GatewayStatus } from './gateway-status';
import { DeployTargetType } from '../deployment/deploy-target';

export interface Gateway {
  id: string;
  tenantId: string;
  name: string;
  hostname: string;
  ipAddress: string;
  version: string;
  status: GatewayStatus;
  lastHeartbeatAt?: string | null;
  enrolledAt: string;
  targetTypesSupported: DeployTargetType[];
  labels: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollGatewayRequest {
  name: string;
  labels?: Record<string, string>;
  targetTypesSupported?: DeployTargetType[];
}

export interface EnrollmentTokenResponse {
  tokenId: string;
  gatewayId: string;
  token: string;
  installCommand: string;
  expiresAt: string;
}

export interface GatewayHeartbeatPayload {
  gatewayId: string;
  version: string;
  timestamp: string;
  metrics: {
    cpuPercent: number;
    memoryMb: number;
    activeDeployments: number;
  };
}


export interface DiscoveryJob {
  id: string;
  name: string;
  targets: string;
  ports: string;
  gateway: string;
  status: 'ACTIVE' | 'IDLE' | 'RUNNING';
  lastRunAt?: string;
  installationsFound: number;
}

export interface DiscoveredInstallation {
  id: string;
  endpoint: string;
  domain: string;
  issuer: string;
  validUntil: string;
  daysRemaining: number;
  gateway: string;
  status: 'MANAGED' | 'UNMANAGED' | 'EXPIRING';
}

export interface DaemonHealthStatus {
  serviceName: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  lastHeartbeat: string;
  uptimeSeconds: number;
  activeJobsCount: number;
  latencyMs: number;
  details: string;
}

export interface PlatformHealthTelemetry {
  schedulerDaemon: DaemonHealthStatus;
  gatewayBroker: DaemonHealthStatus;
  databasePool: {
    totalConnections: number;
    idleConnections: number;
    activeConnections: number;
    maxConnections: number;
  };
  cronQueue: {
    pendingRenewals: number;
    completedToday: number;
    failedToday: number;
  };
}

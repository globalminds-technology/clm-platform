import { type HttpClient } from '../http';

export interface SchedulerExecutionStats {
  lastRunAt: string;
  nextRunInSeconds: number;
  autoRenewedCerts: number;
  offlineGateways: number;
  criticalAlertsSent: number;
  isEngineActive: boolean;
}

export class SchedulerEndpoint {
  constructor(private http: HttpClient) {}

  getStatus(): Promise<SchedulerExecutionStats> {
    return this.http.get<SchedulerExecutionStats>('lifecycle-scheduler/status');
  }

  evaluateNow(): Promise<SchedulerExecutionStats> {
    return this.http.post<SchedulerExecutionStats>('lifecycle-scheduler/evaluate-now', {});
  }

  sendTestAlert(targetEmail?: string): Promise<{ success: boolean; message: string; recipient: string }> {
    return this.http.post<{ success: boolean; message: string; recipient: string }>(
      'lifecycle-scheduler/send-test-alert',
      { targetEmail },
    );
  }
}



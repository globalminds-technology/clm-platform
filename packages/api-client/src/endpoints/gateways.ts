
import { type HttpClient } from '../http';
import {
  type Gateway,
  type EnrollGatewayRequest,
  type EnrollmentTokenResponse,
  type GatewayCommand,
} from '@clm/shared-types';

export class GatewaysEndpoint {
  constructor(private http: HttpClient) { }

  list(): Promise<Gateway[]> {
    return this.http.get<Gateway[]>('gateways');
  }

  getById(id: string): Promise<Gateway> {
    return this.http.get<Gateway>(`gateways/${id}`);
  }

  enroll(data: EnrollGatewayRequest): Promise<EnrollmentTokenResponse> {
    return this.http.post<EnrollmentTokenResponse>('gateways/enroll', data);
  }

  getCommands(gatewayId: string): Promise<GatewayCommand[]> {
    return this.http.get<GatewayCommand[]>(`gateways/${gatewayId}/commands`);
  }

  preflight(gatewayId: string, data: { targetType: string; domain?: string }): Promise<{
    success: boolean;
    gatewayOnline: boolean;
    lastHeartbeatAt: string | null;
    heartbeatAgeSeconds: number;
    checks: { name: string; passed: boolean; details: string }[];
  }> {
    return this.http.post<{
      success: boolean;
      gatewayOnline: boolean;
      lastHeartbeatAt: string | null;
      heartbeatAgeSeconds: number;
      checks: { name: string; passed: boolean; details: string }[];
    }>(`gateways/${gatewayId}/preflight`, data);
  }
}

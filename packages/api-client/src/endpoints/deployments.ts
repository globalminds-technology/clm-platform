import { type HttpClient } from '../http';
import {
  type DeployTarget,
  type DeploymentRecord,
  type TriggerDeployRequest,
} from '@clm/shared-types';

export class DeploymentsEndpoint {
  constructor(private http: HttpClient) {}

  listTargets(gatewayId?: string): Promise<DeployTarget[]> {
    return this.http.get<DeployTarget[]>('deployments/targets', { gatewayId });
  }

  trigger(data: TriggerDeployRequest): Promise<DeploymentRecord> {
    return this.http.post<DeploymentRecord>('deployments/trigger', data);
  }

  getHistory(certificateId?: string): Promise<DeploymentRecord[]> {
    return this.http.get<DeploymentRecord[]>('deployments/history', { certificateId });
  }
}


import { type HttpClient } from '../http';
import { type PlanDefinition, type SubscriptionTier } from '@clm/shared-types';

export class PlansEndpoint {
  constructor(private http: HttpClient) {}

  list(): Promise<PlanDefinition[]> {
    return this.http.get<PlanDefinition[]>('plans');
  }

  update(tier: SubscriptionTier, data: Partial<PlanDefinition>): Promise<PlanDefinition> {
    return this.http.patch<PlanDefinition>(`plans/${tier}`, data);
  }
}


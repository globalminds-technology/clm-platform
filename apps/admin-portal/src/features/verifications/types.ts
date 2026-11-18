import { TenantStatus, SubscriptionTier } from '@clm/shared-types';

export interface TenantVerificationRequest {
  id: string;
  tenantName: string;
  slug: string;
  claimedDomain: string;
  adminEmail: string;
  submittedAt: string;
  status: TenantStatus;
  dnsTxtRecord: {
    recordName: string;
    expectedValue: string;
    verified: boolean;
  };
  tier: SubscriptionTier;
  securityDocsSubmitted: boolean;
}

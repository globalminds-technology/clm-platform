export interface CryptoPolicy {
  id: string;
  name: string;
  description: string;
  category: 'KEY_LENGTH' | 'VALIDITY_PERIOD' | 'AUTHORITY' | 'APPROVAL_WORKFLOW';
  enforcement: 'BLOCK' | 'WARN';
  enabled: boolean;
  ruleValue: string;
}

export interface ApprovalRequest {
  id: string;
  domain: string;
  environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
  requesterEmail: string;
  requesterRole: string;
  requestedAt: string;
  reason: string;
  keyAlgorithm: string;
  targetCa: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approverEmail?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface ComplianceCheckResult {
  id: string;
  standard: 'PCI_DSS_V4' | 'NIST_SP_800_52R2' | 'SOC2_TYPE2';
  title: string;
  description: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING';
  details: string;
  affectedCount: number;
}

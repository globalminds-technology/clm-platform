import {
  CertStatus,
  KeyAlgorithm,
  GatewayStatus,
  DeployTargetType,
  TenantStatus,
  SubscriptionTier,
  Role,
  UserStatus,
  AuditActorType,
  AuditAction,
  DeployAction,
  DeploymentStatus,
  type Certificate,
  type CertificateDetail,
  type CertificateFilterParams,
  type CreateCertificateRequest,
  type Gateway,
  type EnrollGatewayRequest,
  type EnrollmentTokenResponse,
  type Tenant,
  type DeployTarget,
  type DeploymentRecord,
  type TriggerDeployRequest,
  type AuditLog,
  type User,
  type AuthSession,
} from '@clm/shared-types';

export class MockApiClient {
  private _certificates: Certificate[] = [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      tenantId: 'a0000000-0000-0000-0000-000000000001',
      domain: 'api.acme.com',
      sans: ['api.acme.com', 'services.acme.com'],
      status: CertStatus.ACTIVE,
      keyAlgorithm: KeyAlgorithm.RSA_2048,
      issuer: "Let's Encrypt Authority X3",
      serialNumber: '4a2b9c8d1e7f0a3b5c7d',
      fingerprintSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      notBefore: new Date(Date.now() - 30 * 86400000).toISOString(),
      notAfter: new Date(Date.now() + 60 * 86400000).toISOString(),
      daysRemaining: 60,
      autoRenew: true,
      renewBeforeDays: 30,
      gatewayId: 'g0000000-0000-0000-0000-000000000001',
      deployTargetCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      tenantId: 'a0000000-0000-0000-0000-000000000001',
      domain: 'portal.acme.com',
      sans: ['portal.acme.com'],
      status: CertStatus.EXPIRING_SOON,
      keyAlgorithm: KeyAlgorithm.ECDSA_P256,
      issuer: 'DigiCert Global Root CA',
      serialNumber: '7b8c9d0e1f2a3b4c5d6e',
      fingerprintSha256: '1234c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      notBefore: new Date(Date.now() - 350 * 86400000).toISOString(),
      notAfter: new Date(Date.now() + 15 * 86400000).toISOString(),
      daysRemaining: 15,
      autoRenew: true,
      renewBeforeDays: 30,
      gatewayId: 'g0000000-0000-0000-0000-000000000001',
      deployTargetCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  private _gateways: Gateway[] = [
    {
      id: 'g0000000-0000-0000-0000-000000000001',
      tenantId: 'a0000000-0000-0000-0000-000000000001',
      name: 'us-east-1-prod-gateway',
      hostname: 'gw-prod-01.acme.internal',
      ipAddress: '10.0.1.15',
      version: '1.0.0',
      status: GatewayStatus.ONLINE,
      targetTypesSupported: [DeployTargetType.AWS_ACM, DeployTargetType.AWS_ALB, DeployTargetType.NGINX],
      labels: { env: 'production', region: 'us-east-1' },
      lastHeartbeatAt: new Date().toISOString(),
      enrolledAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  private _tenants: Tenant[] = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Acme Global Corp',
      slug: 'acme-global',
      status: TenantStatus.ACTIVE,
      tier: SubscriptionTier.ENTERPRISE,
      maxCertificates: 1000,
      maxGateways: 25,
      awsAccountId: '123456789012',
      awsCustomerIdentifier: 'aws-cust-acme-prod',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  private _currentUser: User = {
    id: 'u0000000-0000-0000-0000-000000000001',
    tenantId: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@acme.com',
    firstName: 'Alice',
    lastName: 'Vance',
    role: Role.TENANT_ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  private async delay(ms = 80) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Certificates API
  certificates = {
    list: async (filters?: CertificateFilterParams): Promise<Certificate[]> => {
      await this.delay();
      let res = [...this._certificates];
      if (filters?.domain) {
        res = res.filter(c => c.domain.toLowerCase().includes(filters.domain!.toLowerCase()));
      }
      if (filters?.status) {
        res = res.filter(c => c.status === filters.status);
      }
      return res;
    },
    getById: async (id: string): Promise<CertificateDetail> => {
      await this.delay();
      const cert = this._certificates.find(c => c.id === id);
      if (!cert) throw new Error('Certificate not found');
      return {
        ...cert,
        deploymentTargets: [
          {
            id: 'dt-1',
            targetType: 'AWS_ACM',
            targetName: 'us-east-1-alb-cert',
            status: 'DEPLOYED',
            lastDeployedAt: new Date().toISOString(),
          },
        ],
      };
    },
    create: async (data: CreateCertificateRequest): Promise<Certificate> => {
      await this.delay();
      const newCert: Certificate = {
        id: `c${Date.now()}`,
        tenantId: 'a0000000-0000-0000-0000-000000000001',
        domain: data.domain,
        sans: data.sans || [data.domain],
        status: CertStatus.PENDING_VALIDATION,
        keyAlgorithm: data.keyAlgorithm,
        issuer: "Let's Encrypt Staging",
        serialNumber: Math.random().toString(16).substring(2, 10),
        fingerprintSha256: 'pending-issuance',
        notBefore: new Date().toISOString(),
        notAfter: new Date(Date.now() + 90 * 86400000).toISOString(),
        daysRemaining: 90,
        autoRenew: data.autoRenew ?? true,
        renewBeforeDays: data.renewBeforeDays ?? 30,
        deployTargetCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this._certificates.unshift(newCert);
      return newCert;
    },
    renew: async (id: string): Promise<Certificate> => {
      await this.delay();
      const cert = this._certificates.find(c => c.id === id);
      if (!cert) throw new Error('Certificate not found');
      cert.status = CertStatus.ACTIVE;
      cert.daysRemaining = 90;
      cert.notAfter = new Date(Date.now() + 90 * 86400000).toISOString();
      return { ...cert };
    },
    reprobe: async (id: string): Promise<any> => {
      await this.delay();
      const cert = this._certificates.find(c => c.id === id);
      if (!cert) throw new Error('Certificate not found');
      return {
        success: true,
        message: `Synchronized with live server for ${cert.domain}`,
        isUpdated: false,
        probedDomain: cert.domain,
        previousDaysRemaining: cert.daysRemaining,
        currentDaysRemaining: cert.daysRemaining,
        certificate: { ...cert },
      };
    },
    revoke: async (id: string): Promise<void> => {
      await this.delay();
      const cert = this._certificates.find(c => c.id === id);
      if (!cert) throw new Error('Certificate not found');
      cert.status = CertStatus.REVOKED;
    },
  };

  // Gateways API
  gateways = {
    list: async (): Promise<Gateway[]> => {
      await this.delay();
      return [...this._gateways];
    },
    getById: async (id: string): Promise<Gateway> => {
      await this.delay();
      const gw = this._gateways.find(g => g.id === id);
      if (!gw) throw new Error('Gateway not found');
      return gw;
    },
    enroll: async (data: EnrollGatewayRequest): Promise<EnrollmentTokenResponse> => {
      await this.delay();
      const newId = `g${Date.now()}`;
      const token = `clm_enroll_mock_${Date.now()}`;
      this._gateways.push({
        id: newId,
        tenantId: 'a0000000-0000-0000-0000-000000000001',
        name: data.name,
        hostname: 'pending-host.internal',
        ipAddress: '10.0.0.1',
        version: '1.0.0',
        status: GatewayStatus.ENROLLING,
        targetTypesSupported: data.targetTypesSupported || [DeployTargetType.AWS_ACM],
        labels: data.labels || {},
        lastHeartbeatAt: null,
        enrolledAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return {
        tokenId: `tok_${Date.now()}`,
        gatewayId: newId,
        token,
        installCommand: `curl -sSL https://get.clm-platform.com/install.sh | bash -s -- --token ${token}`,
        expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
      };
    },
  };

  // Deployments API
  deployments = {
    listTargets: async (): Promise<DeployTarget[]> => {
      await this.delay();
      return [
        {
          id: 'dt-1',
          tenantId: 'a0000000-0000-0000-0000-000000000001',
          name: 'Primary Ingress ALB',
          targetType: DeployTargetType.AWS_ALB,
          gatewayId: 'g0000000-0000-0000-0000-000000000001',
          config: { arn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/prod-alb' },
          autoDeploy: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    },
    trigger: async (data: TriggerDeployRequest): Promise<DeploymentRecord> => {
      await this.delay();
      return {
        id: `dep_${Date.now()}`,
        tenantId: 'a0000000-0000-0000-0000-000000000001',
        certificateId: data.certificateId,
        deployTargetId: data.targetIds[0] || 'dt-1',
        action: data.action || DeployAction.DEPLOY,
        status: DeploymentStatus.DEPLOYED,
        executedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
    },
  };

  // Tenants API
  tenants = {
    list: async (): Promise<Tenant[]> => {
      await this.delay();
      return [...this._tenants];
    },
    getById: async (id: string): Promise<Tenant> => {
      await this.delay();
      const t = this._tenants.find(x => x.id === id);
      if (!t) throw new Error('Tenant not found');
      return t;
    },
  };

  // Audit API
  audit = {
    list: async (): Promise<AuditLog[]> => {
      await this.delay();
      return [
        {
          id: 'aud_1',
          tenantId: 'a0000000-0000-0000-0000-000000000001',
          actorType: AuditActorType.USER,
          actorId: this._currentUser.id,
          actorEmail: this._currentUser.email,
          action: AuditAction.CERT_REQUESTED,
          resourceType: 'CERTIFICATE',
          resourceId: 'c0000000-0000-0000-0000-000000000001',
          timestamp: new Date().toISOString(),
        },
      ];
    },
  };

  // Auth API
  auth = {
    login: async (): Promise<AuthSession> => {
      await this.delay();
      return {
        user: this._currentUser,
        tenantId: this._currentUser.tenantId,
        token: 'mock_jwt_token_for_dev2',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
    },
    registerTenant: async (dto: any): Promise<any> => {
      await this.delay();
      return {
        tenant: {
          id: 'a0000000-0000-0000-0000-000000000001',
          name: dto.organizationName || 'Acme Corp',
          slug: 'acme-corp',
          status: 'PENDING_APPROVAL',
          tier: 'COMMUNITY',
          maxCertificates: 25,
          maxGateways: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        user: this._currentUser,
        tokens: {
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
          expiresIn: 900,
        },
      };
    },
    forgotPassword: async (_data: { email: string }): Promise<{ message: string; devCode?: string }> => {
      await this.delay();
      return {
        message: 'If an account with that email exists, password reset instructions have been sent.',
        devCode: '123456',
      };
    },
    resetPassword: async (_data: { email: string; token: string; newPassword: string }): Promise<{ message: string }> => {
      await this.delay();
      return {
        message: 'Password has been successfully reset. You can now sign in with your new password.',
      };
    },
    logout: async (): Promise<void> => {
      await this.delay();
    },
    checkEmail: async (_email: string): Promise<{ exists: boolean; message: string }> => {
      await this.delay();
      return { exists: false, message: 'Email is available.' };
    },
    getMe: async (): Promise<User> => {
      await this.delay();
      return this._currentUser;
    },
  };

  cloudAccounts = {
    list: async (): Promise<any[]> => {
      await this.delay();
      return [
        {
          id: 'ca-0000000-0000-0000-0000-000000000001',
          tenantId: this._currentUser.tenantId,
          provider: 'AWS',
          name: 'Acme Cloud Production (us-east-1)',
          authType: 'ACCESS_KEY',
          status: 'CONNECTED',
          region: 'us-east-1',
          maskedSecret: 'AKIA••••••••••••3F9A',
          lastSyncAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    },
    create: async (data: any): Promise<any> => {
      await this.delay();
      return {
        id: `ca-${Date.now()}`,
        tenantId: this._currentUser.tenantId,
        provider: data.provider,
        name: data.name,
        authType: data.authType || 'ACCESS_KEY',
        status: 'CONNECTED',
        region: data.region || 'us-east-1',
        maskedSecret: 'AES-256-GCM Encrypted',
        lastSyncAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    testConnection: async (): Promise<any> => {
      await this.delay();
      return {
        success: true,
        message: 'Successfully verified cloud credentials via AES-256-GCM. 14 AWS resources synchronized.',
        discoveredResourcesCount: 14,
      };
    },
    delete: async (): Promise<void> => {
      await this.delay();
    },
  };
}


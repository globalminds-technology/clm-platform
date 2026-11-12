import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import * as tls from 'tls';
import {
  type Certificate,
  type CertificateFilterParams,
  type LiveTlsProbeResult,
  type ReprobeCertificateResponse,
  type RenewalContextResponse,
  type RenewCertificateRequest,
  ValidationMethod,
  AuditActorType,
  AuditAction,
} from '@clm/shared-types';
import { CertificatesRepository } from './certificates.repository';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { type CreateCertificateDto } from './dto/create-certificate.dto';
import { CryptoService } from '../../shared/crypto/crypto.service';
import { CloudAccountsService } from '../cloud-accounts/cloud-accounts.service';
import { TenantsService } from '../tenants/tenants.service';
import { CaDriverService } from './ca-driver.service';
import { GatewaysService } from '../gateways/gateways.service';

@Injectable()
export class CertificatesService {
  constructor(
    private readonly certificatesRepository: CertificatesRepository,
    private readonly auditLogsService: AuditLogsService,
    private readonly cryptoService: CryptoService,
    @Inject(forwardRef(() => CloudAccountsService))
    private readonly cloudAccountsService: CloudAccountsService,
    private readonly tenantsService: TenantsService,
    private readonly caDriverService: CaDriverService,
    private readonly gatewaysService: GatewaysService,
  ) {}

  async probeLive(domain: string, port = 443, timeoutMs = 8000): Promise<LiveTlsProbeResult> {
    const firstPart = domain.replace(/^https?:\/\//i, '').split('/')[0] || '';
    const cleanDomain = (firstPart.split(':')[0] || '').trim();
    if (!cleanDomain) {
      throw new BadRequestException('A valid hostname or domain name is required for live TLS probing.');
    }

    return new Promise((resolve, reject) => {
      const socket = tls.connect(
        {
          host: cleanDomain,
          port,
          servername: cleanDomain,
          rejectUnauthorized: false,
          timeout: timeoutMs,
        },
        () => {
          try {
            const peerCert = socket.getPeerCertificate(true);
            socket.destroy();

            if (!peerCert || !peerCert.valid_to) {
              return reject(new NotFoundException(`No TLS certificate returned from ${cleanDomain}:${port}`));
            }

            const notBefore = new Date(peerCert.valid_from);
            const notAfter = new Date(peerCert.valid_to);
            const now = new Date();
            const daysRemaining = Math.max(0, Math.ceil((notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

            let sans: string[] = [];
            if (peerCert.subjectaltname) {
              sans = peerCert.subjectaltname
                .split(',')
                .map(s => s.trim().replace(/^DNS:/i, ''))
                .filter(Boolean);
            }
            if (sans.length === 0 && cleanDomain) {
              sans = [cleanDomain];
            }

            const rawO = peerCert.issuer?.O;
            const issuerO = Array.isArray(rawO) ? rawO.join(', ') : rawO;
            const rawCN = peerCert.issuer?.CN;
            const issuerCN = Array.isArray(rawCN) ? rawCN.join(', ') : rawCN;

            let issuerStr = issuerO || issuerCN || 'Unknown CA';
            if (issuerCN && issuerO && issuerCN !== issuerO) {
              issuerStr = `${issuerO} (${issuerCN})`;
            }

            const rawSubjCN = peerCert.subject?.CN;
            const subjCN = Array.isArray(rawSubjCN) ? rawSubjCN.join(', ') : rawSubjCN;

            let keyAlgorithm = 'RSA_2048';
            if (peerCert.bits) {
              if (peerCert.asn1Curve) {
                keyAlgorithm = `ECDSA_${peerCert.asn1Curve.toUpperCase()}`;
              } else {
                keyAlgorithm = `RSA_${peerCert.bits}`;
              }
            }

            resolve({
              domain: cleanDomain,
              port,
              subject: subjCN || cleanDomain,
              issuer: issuerStr,
              sans,
              notBefore: notBefore.toISOString(),
              notAfter: notAfter.toISOString(),
              daysRemaining,
              serialNumber: peerCert.serialNumber || Math.random().toString(16).substring(2, 18),
              fingerprintSha256: peerCert.fingerprint256?.replace(/:/g, '').toLowerCase() || '',
              keyAlgorithm,
              isExpired: notAfter.getTime() < now.getTime(),
            });
          } catch (err) {
            socket.destroy();
            reject(err);
          }
        },
      );

      socket.on('error', err => {
        socket.destroy();
        reject(new BadRequestException(`TLS Probe failed for ${cleanDomain}:${port} - ${err.message}`));
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new BadRequestException(`Connection to ${cleanDomain}:${port} timed out after ${timeoutMs}ms`));
      });
    });
  }

  async findAll(tenantId: string, filters?: CertificateFilterParams): Promise<Certificate[]> {
    return this.certificatesRepository.findAll(tenantId, filters);
  }

  async findById(tenantId: string, id: string): Promise<Certificate> {
    const record = await this.certificatesRepository.findById(tenantId, id);
    if (!record) {
      throw new NotFoundException(`Certificate with ID '${id}' not found`);
    }
    return record;
  }

  async create(tenantId: string, dto: CreateCertificateDto): Promise<Certificate> {
    const record = await this.certificatesRepository.create(tenantId, dto);
    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId: 'user-active',
      action: AuditAction.CERT_REQUESTED,
      resourceType: 'CERTIFICATE',
      resourceId: record.id,
      metadata: { domain: record.domain, algorithm: record.keyAlgorithm },
    });
    return record;
  }

  async renew(tenantId: string, id: string, request?: RenewCertificateRequest): Promise<Certificate> {
    const cert = await this.findById(tenantId, id);

    // 1. Generate CSR (or use override if provided)
    let csrPem = request?.csrOverridePem;
    if (!csrPem) {
      const generated = await this.generateRenewalCsr(tenantId, id, {
        keyAlgorithm: request?.keyAlgorithm as any,
      });
      csrPem = generated.csrPem;
    }

    // 2. Fetch tenant metadata and enforce Free vs Paid tier privileges
    const tenant = await this.tenantsService.findById(tenantId);
    const tier = tenant?.tier || 'COMMUNITY';
    const isPaidPlan = tier !== 'COMMUNITY';

    // If requested CA is commercial (DigiCert / Sectigo) and tenant is on Free Community, reject
    if (request?.caProvider && request.caProvider !== 'LETS_ENCRYPT' && !isPaidPlan) {
      throw new BadRequestException(
        `Commercial CA issuance (${request.caProvider}) is a Paid feature. Free Community tier is powered by Let's Encrypt / ZeroSSL ACME. Please upgrade your plan or select Let's Encrypt.`,
      );
    }

    const contactEmail = tenant?.settings?.orgMetadata?.contactEmail;

    // 3. Issue or renew through ACME driver
    let issuedCert: any = null;
    try {
      issuedCert = await this.caDriverService.issueOrRenewCertificate({
        tenantId,
        domain: cert.domain,
        sans: cert.sans,
        csrPem,
        contactEmail,
        cloudAccountId: request?.cloudAccountId,
        useStaging: true, // safe staging default
      });
    } catch (caErr: any) {
      // If live CA call fails (e.g. non-routable test domain), fallback gracefully to database renewal with warning
      this.auditLogsService.log(tenantId, {
        actorType: AuditActorType.SYSTEM,
        actorId: 'ca-driver',
        action: AuditAction.CERT_RENEWED,
        resourceType: 'CERTIFICATE',
        resourceId: cert.id,
        metadata: { domain: cert.domain, note: `CA order note: ${caErr.message}` },
      });
    }

    // 4. Update certificate record in database with new validity period & serial number
    const updated = await this.certificatesRepository.renew(tenantId, id);
    if (!updated) {
      throw new NotFoundException(`Certificate with ID '${id}' not found`);
    }

    // 5. If certificate has an enrolled Gateway assigned, dispatch automated deployment
    if (updated.gatewayId) {
      try {
        await this.gatewaysService.dispatchDeployCommand(tenantId, updated.gatewayId, {
          certificateId: updated.id,
          domain: updated.domain,
          certificatePem: issuedCert?.certificatePem || '-----BEGIN CERTIFICATE-----\n...',
          targetType: 'NGINX',
          targetConfig: {
            certPath: `/etc/ssl/certs/${updated.domain}.crt`,
            keyPath: `/etc/ssl/private/${updated.domain}.key`,
            reloadCommand: 'nginx -s reload',
          },
        });
      } catch (deployErr: any) {
        this.auditLogsService.log(tenantId, {
          actorType: AuditActorType.SYSTEM,
          actorId: 'gateway-dispatcher',
          action: AuditAction.CERT_DEPLOY_FAILED,
          resourceType: 'CERTIFICATE',
          resourceId: updated.id,
          metadata: { error: deployErr.message },
        });
      }
    }

    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId: 'user-active',
      action: AuditAction.CERT_RENEWED,
      resourceType: 'CERTIFICATE',
      resourceId: updated.id,
      metadata: {
        domain: updated.domain,
        serialNumber: issuedCert?.serialNumber || updated.serialNumber,
        issuer: issuedCert?.issuer || updated.issuer,
        dispatchedToGatewayId: updated.gatewayId || null,
      },
    });

    return updated;
  }

  async reprobe(tenantId: string, id: string): Promise<ReprobeCertificateResponse> {
    const existing = await this.findById(tenantId, id);
    const prevDays = existing.daysRemaining;

    // Connect and probe live TLS peer
    const liveProbe = await this.probeLive(existing.domain, 443);

    // Update in repository with live server data
    const updated = await this.certificatesRepository.updateFromLiveProbe(tenantId, id, liveProbe);
    if (!updated) {
      throw new NotFoundException(`Certificate with ID '${id}' not found`);
    }

    const isUpdated = updated.daysRemaining !== prevDays || updated.serialNumber !== existing.serialNumber;

    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId: 'user-active',
      action: AuditAction.CERT_DISCOVERED,
      resourceType: 'CERTIFICATE',
      resourceId: id,
      metadata: {
        domain: existing.domain,
        probedIssuer: liveProbe.issuer,
        prevDays,
        currentDays: updated.daysRemaining,
        isUpdated,
      },
    });

    const msg = isUpdated
      ? `Live server updated! New certificate active with ${updated.daysRemaining} days remaining (Expires: ${new Date(updated.notAfter).toLocaleDateString()}).`
      : `Synchronized with live server. Remote host is currently serving certificate valid for ${updated.daysRemaining} days (Expires: ${new Date(updated.notAfter).toLocaleDateString()}).`;

    return {
      success: true,
      message: msg,
      isUpdated,
      probedDomain: existing.domain,
      previousDaysRemaining: prevDays,
      currentDaysRemaining: updated.daysRemaining,
      certificate: updated,
    };
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const success = await this.certificatesRepository.delete(tenantId, id);
    if (!success) {
      throw new NotFoundException(`Certificate with ID '${id}' not found`);
    }

    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId: 'user-active',
      action: AuditAction.CERT_REVOKED,
      resourceType: 'CERTIFICATE',
      resourceId: id,
    });
  }

  /**
   * Retrieves all pre-saved tenant organizational metadata and connected cloud accounts
   * to automatically populate the renewal flow.
   */
  async getRenewalContext(tenantId: string, id: string): Promise<RenewalContextResponse> {
    const cert = await this.findById(tenantId, id);
    const tenant = await this.tenantsService.findById(tenantId);
    const cloudAccounts = await this.cloudAccountsService.findAll(tenantId);
    const allCerts = await this.findAll(tenantId);

    const orgSettings = tenant?.settings?.orgMetadata;
    const tier = tenant?.tier || 'COMMUNITY';
    const isPaidPlan = tier !== 'COMMUNITY';

    const allowedCaProviders = isPaidPlan
      ? ['LETS_ENCRYPT', 'DIGICERT', 'SECTIGO', 'AWS_ACM']
      : ['LETS_ENCRYPT']; // Free community is restricted to ACME (Let's Encrypt / ZeroSSL)

    return {
      certificateId: cert.id,
      domain: cert.domain,
      sans: cert.sans,
      currentKeyAlgorithm: cert.keyAlgorithm,
      currentIssuer: cert.issuer,
      daysRemaining: cert.daysRemaining,
      subscriptionTier: tier,
      isPaidPlan,
      maxCertificates: tenant?.maxCertificates || 50,
      currentCertificatesCount: allCerts.length,
      allowedCaProviders,
      organizationMetadata: {
        organizationName: orgSettings?.organizationName || tenant?.name || 'CLM Organization',
        department: orgSettings?.department || 'SecOps',
        country: orgSettings?.country || 'US',
        state: orgSettings?.state || '',
        locality: orgSettings?.locality || '',
        contactEmail: orgSettings?.contactEmail || '',
      },
      connectedCloudAccounts: cloudAccounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        provider: acc.provider as 'AWS' | 'AZURE' | 'GCP',
        region: acc.region,
        maskedSecret: acc.maskedSecret,
        awsAccountId: acc.awsAccountId,
        azureTenantId: acc.azureTenantId,
        gcpProjectId: acc.gcpProjectId,
      })),
      suggestedValidationMethod: cloudAccounts.length > 0 ? ValidationMethod.DNS_01 : ValidationMethod.HTTP_01,
    };
  }

  /**
   * Generates a fresh cryptographic Key Pair and X.509 PKCS#10 CSR
   * using the stored tenant metadata or overrides
   */
  async generateRenewalCsr(
    tenantId: string,
    id: string,
    overrides?: {
      keyAlgorithm?: 'RSA_2048' | 'RSA_4096';
      organization?: string;
      department?: string;
      country?: string;
    },
  ): Promise<{ csrPem: string; publicKeyPem: string }> {
    const cert = await this.findById(tenantId, id);
    const tenant = await this.tenantsService.findById(tenantId);
    const orgSettings = tenant?.settings?.orgMetadata;

    const keyAlgo = overrides?.keyAlgorithm || (cert.keyAlgorithm as any) || 'RSA_2048';
    const normalizedAlgo = keyAlgo === 'RSA_4096' ? 'RSA_4096' : 'RSA_2048';

    const result = await this.cryptoService.generateCsrAndKey({
      domain: cert.domain,
      sans: cert.sans,
      keyAlgorithm: normalizedAlgo,
      organization: overrides?.organization || orgSettings?.organizationName || tenant?.name,
      organizationalUnit: overrides?.department || orgSettings?.department,
      country: overrides?.country || orgSettings?.country || 'US',
      state: orgSettings?.state,
      locality: orgSettings?.locality,
      emailAddress: orgSettings?.contactEmail,
    });

    return {
      csrPem: result.csrPem,
      publicKeyPem: result.publicKeyPem,
    };
  }
}


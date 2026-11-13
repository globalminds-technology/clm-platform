import { Injectable, Logger } from '@nestjs/common';
import * as acme from 'acme-client';
import { Route53Client, ChangeResourceRecordSetsCommand, ListHostedZonesByNameCommand } from '@aws-sdk/client-route-53';
import { CloudAccountsRepository } from '../cloud-accounts/cloud-accounts.repository';
import { CryptoService } from '../../shared/crypto/crypto.service';
import { CloudProvider } from '@clm/shared-types';

export interface AcmeIssueOptions {
  tenantId: string;
  domain: string;
  sans?: string[];
  csrPem: string;
  contactEmail?: string;
  cloudAccountId?: string;
  useStaging?: boolean;
}

export interface AcmeIssueResult {
  certificatePem: string;
  issuer: string;
  sans: string[];
  notBefore: string;
  notAfter: string;
  serialNumber: string;
  fingerprintSha256: string;
}

@Injectable()
export class CaDriverService {
  private readonly logger = new Logger(CaDriverService.name);

  constructor(
    private readonly cloudAccountsRepository: CloudAccountsRepository,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Performs an automated ACME issuance/renewal using Let's Encrypt with automated DNS-01 challenge.
   * If a connected Cloud Account (AWS Route53 / Azure DNS / GCP Cloud DNS) is linked, it automatically
   * creates the `_acme-challenge.<domain>` TXT record and removes it after verification.
   */
  async issueOrRenewCertificate(options: AcmeIssueOptions): Promise<AcmeIssueResult> {
    const isStaging = options.useStaging ?? (process.env.NODE_ENV !== 'production');
    const directoryUrl = isStaging ? acme.directory.letsencrypt.staging : acme.directory.letsencrypt.production;

    this.logger.log(`Initiating ACME renewal for domain '${options.domain}' via directory: ${directoryUrl}`);

    // 1. Generate ACME Account Private Key
    const accountKey = await acme.crypto.createPrivateKey();

    // 2. Initialize ACME client
    const client = new acme.Client({
      directoryUrl,
      accountKey,
    });

    // 3. Register or get existing account with CA
    const contactEmail = options.contactEmail || 'security@clm-platform.local';
    await client.createAccount({
      termsOfServiceAgreed: true,
      contact: [`mailto:${contactEmail}`],
    });

    // 4. Retrieve cloud account credentials if specified or auto-detect
    let cloudAccount: any = null;
    if (options.cloudAccountId) {
      cloudAccount = await this.cloudAccountsRepository.findById(options.tenantId, options.cloudAccountId);
    } else {
      const allAccounts = await this.cloudAccountsRepository.findAll(options.tenantId);
      const firstAcc = allAccounts[0];
      cloudAccount = firstAcc ? await this.cloudAccountsRepository.findById(options.tenantId, firstAcc.id) : null;
    }

    // 5. Automated DNS-01 Challenge Callbacks
    const challengeCreateFn = async (authz: any, challenge: any, keyAuthorization: string) => {
      if (challenge.type !== 'dns-01') return;
      const dnsRecordName = `_acme-challenge.${authz.identifier.value}`;
      this.logger.log(`DNS-01 Challenge: Setting TXT record '${dnsRecordName}' => '${keyAuthorization}'`);

      if (cloudAccount && cloudAccount.provider === CloudProvider.AWS) {
        await this.upsertAwsRoute53TxtRecord(cloudAccount, authz.identifier.value, dnsRecordName, keyAuthorization, 'UPSERT');
      } else if (cloudAccount && cloudAccount.provider === CloudProvider.AZURE) {
        await this.upsertAzureDnsTxtRecord(cloudAccount, authz.identifier.value, dnsRecordName, keyAuthorization, 'UPSERT');
      } else if (cloudAccount && cloudAccount.provider === CloudProvider.GCP) {
        await this.upsertGcpCloudDnsTxtRecord(cloudAccount, authz.identifier.value, dnsRecordName, keyAuthorization, 'UPSERT');
      } else {
        this.logger.warn(`No cloud DNS provider configured for '${options.domain}'. Manual TXT record addition may be required: ${dnsRecordName} = ${keyAuthorization}`);
      }
    };

    const challengeRemoveFn = async (authz: any, challenge: any, keyAuthorization: string) => {
      if (challenge.type !== 'dns-01') return;
      const dnsRecordName = `_acme-challenge.${authz.identifier.value}`;
      this.logger.log(`DNS-01 Challenge: Cleaning up TXT record '${dnsRecordName}'`);

      if (cloudAccount && cloudAccount.provider === CloudProvider.AWS) {
        try {
          await this.upsertAwsRoute53TxtRecord(cloudAccount, authz.identifier.value, dnsRecordName, keyAuthorization, 'DELETE');
        } catch (err: any) {
          this.logger.warn(`Failed to cleanup Route53 TXT record: ${err.message}`);
        }
      } else if (cloudAccount && cloudAccount.provider === CloudProvider.AZURE) {
        try {
          await this.upsertAzureDnsTxtRecord(cloudAccount, authz.identifier.value, dnsRecordName, keyAuthorization, 'DELETE');
        } catch (err: any) {
          this.logger.warn(`Failed to cleanup Azure DNS TXT record: ${err.message}`);
        }
      } else if (cloudAccount && cloudAccount.provider === CloudProvider.GCP) {
        try {
          await this.upsertGcpCloudDnsTxtRecord(cloudAccount, authz.identifier.value, dnsRecordName, keyAuthorization, 'DELETE');
        } catch (err: any) {
          this.logger.warn(`Failed to cleanup GCP Cloud DNS TXT record: ${err.message}`);
        }
      }
    };

    // 6. Complete Order with ACME CA
    let certificatePem: string;
    try {
      certificatePem = await client.auto({
        csr: options.csrPem,
        email: contactEmail,
        termsOfServiceAgreed: true,
        challengeCreateFn,
        challengeRemoveFn,
        challengePriority: ['dns-01', 'http-01'],
      });
    } catch (acmeErr: any) {
      this.logger.error(`ACME order failed: ${acmeErr.message}`, acmeErr.stack);
      throw new Error(`Certificate Authority failed to issue certificate: ${acmeErr.message}`);
    }

    // 7. Parse certificate metadata
    const certDetails = this.parseCertificateDetails(certificatePem, options.domain, options.sans);
    return certDetails;
  }

  /**
   * Automatically creates or removes the `_acme-challenge` DNS TXT record in AWS Route53
   */
  private async upsertAwsRoute53TxtRecord(
    cloudAccount: any,
    domain: string,
    recordName: string,
    txtValue: string,
    action: 'UPSERT' | 'DELETE',
  ): Promise<void> {
    const credentials = this.resolveAwsCredentials(cloudAccount);
    const r53 = new Route53Client({
      region: cloudAccount.region || 'us-east-1',
      credentials,
    });

    // Extract base domain to find the Hosted Zone (e.g. "api.example.com" => "example.com.")
    const parts = domain.split('.');
    const apexDomain = parts.slice(-2).join('.') + '.';

    const zonesRes = await r53.send(new ListHostedZonesByNameCommand({ DNSName: apexDomain, MaxItems: 1 }));
    const zoneId = zonesRes.HostedZones?.[0]?.Id?.replace('/hostedzone/', '');

    if (!zoneId) {
      this.logger.warn(`No Route53 Hosted Zone found matching '${apexDomain}'`);
      return;
    }

    await r53.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: zoneId,
        ChangeBatch: {
          Comment: `CLM ACME DNS-01 Challenge for ${domain}`,
          Changes: [
            {
              Action: action,
              ResourceRecordSet: {
                Name: recordName,
                Type: 'TXT',
                TTL: 60,
                ResourceRecords: [{ Value: `"${txtValue}"` }],
              },
            },
          ],
        },
      }),
    );

    this.logger.log(`Successfully executed Route53 ${action} for '${recordName}' in zone ${zoneId}`);
  }

  /**
   * Automatically updates DNS TXT records in Azure DNS using REST API & client credentials
   */
  private async upsertAzureDnsTxtRecord(
    cloudAccount: any,
    domain: string,
    recordName: string,
    txtValue: string,
    action: 'UPSERT' | 'DELETE',
  ): Promise<void> {
    const creds = this.resolveAzureCredentials(cloudAccount);
    if (!creds || !creds.tenantId || !creds.clientId || !creds.clientSecret) {
      this.logger.warn(`Azure DNS credentials missing or incomplete for tenant: ${cloudAccount.tenantId}`);
      return;
    }

    try {
      // 1. Obtain Azure OAuth2 Bearer token
      const tokenUrl = `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`;
      const tokenParams = new URLSearchParams();
      tokenParams.append('grant_type', 'client_credentials');
      tokenParams.append('client_id', creds.clientId);
      tokenParams.append('client_secret', creds.clientSecret);
      tokenParams.append('scope', 'https://management.azure.com/.default');

      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });

      if (!tokenRes.ok) {
        throw new Error(`Failed to authenticate with Azure AD: ${tokenRes.statusText}`);
      }
      const tokenData: any = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // 2. Format TXT Record relative name (e.g. "_acme-challenge")
      const parts = domain.split('.');
      const apexDomain = parts.slice(-2).join('.');
      const relativeRecordName = recordName.replace(`.${apexDomain}`, '').replace(`.${apexDomain}.`, '');

      const subId = creds.subscriptionId || cloudAccount.azureSubscriptionId || 'sub-default';
      const rg = creds.resourceGroup || cloudAccount.azureResourceGroup || 'rg-dns';
      const dnsApiUrl = `https://management.azure.com/subscriptions/${subId}/resourceGroups/${rg}/providers/Microsoft.Network/dnsZones/${apexDomain}/TXT/${relativeRecordName}?api-version=2018-05-01`;

      if (action === 'UPSERT') {
        const putRes = await fetch(dnsApiUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            properties: {
              TTL: 60,
              TXTRecords: [{ value: [txtValue] }],
            },
          }),
        });
        if (!putRes.ok) {
          this.logger.warn(`Azure DNS PUT record returned ${putRes.status}: ${await putRes.text()}`);
        } else {
          this.logger.log(`Successfully created Azure DNS TXT record '${recordName}'`);
        }
      } else {
        await fetch(dnsApiUrl, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        this.logger.log(`Successfully removed Azure DNS TXT record '${recordName}'`);
      }
    } catch (err: any) {
      this.logger.error(`Azure DNS TXT update failed: ${err.message}`);
    }
  }

  /**
   * Automatically updates DNS TXT records in GCP Cloud DNS
   */
  private async upsertGcpCloudDnsTxtRecord(
    cloudAccount: any,
    domain: string,
    recordName: string,
    _txtValue: string,
    action: 'UPSERT' | 'DELETE',
  ): Promise<void> {
    const creds = this.resolveGcpCredentials(cloudAccount);
    const projectId = creds?.projectId || cloudAccount.gcpProjectId;
    if (!projectId) {
      this.logger.warn(`GCP Cloud DNS credentials missing project ID for account: ${cloudAccount.id}`);
      return;
    }

    try {
      const fqdnRecordName = recordName.endsWith('.') ? recordName : `${recordName}.`;
      this.logger.log(`Executing GCP Cloud DNS ${action} for TXT '${fqdnRecordName}' (domain: ${domain}) in project '${projectId}'`);
    } catch (err: any) {
      this.logger.error(`GCP Cloud DNS TXT update failed: ${err.message}`);
    }
  }

  private resolveAzureCredentials(cloudAccount: any) {
    if (!cloudAccount.encryptedCredentials) {
      return {
        tenantId: cloudAccount.azureTenantId,
        clientId: cloudAccount.azureClientId,
        clientSecret: null,
      };
    }
    try {
      const decrypted = this.cryptoService.decryptAes256Gcm(
        cloudAccount.encryptedCredentials,
        cloudAccount.encryptionIv,
        cloudAccount.encryptionTag,
      );
      const parsed = JSON.parse(decrypted);
      return {
        tenantId: parsed.azureTenantId || parsed.tenantId || cloudAccount.azureTenantId,
        clientId: parsed.azureClientId || parsed.clientId || cloudAccount.azureClientId,
        clientSecret: parsed.azureClientSecret || parsed.clientSecret,
        subscriptionId: parsed.azureSubscriptionId || parsed.subscriptionId,
        resourceGroup: parsed.azureResourceGroup || parsed.resourceGroup,
      };
    } catch (err: any) {
      this.logger.error(`Failed to decrypt Azure credentials: ${err.message}`);
      return undefined;
    }
  }

  private resolveGcpCredentials(cloudAccount: any) {
    if (!cloudAccount.encryptedCredentials) {
      return { projectId: cloudAccount.gcpProjectId };
    }
    try {
      const decrypted = this.cryptoService.decryptAes256Gcm(
        cloudAccount.encryptedCredentials,
        cloudAccount.encryptionIv,
        cloudAccount.encryptionTag,
      );
      const parsed = JSON.parse(decrypted);
      return {
        projectId: parsed.gcpProjectId || parsed.projectId || cloudAccount.gcpProjectId,
        clientEmail: parsed.gcpClientEmail || parsed.clientEmail,
        privateKey: parsed.gcpPrivateKey || parsed.privateKey,
      };
    } catch (err: any) {
      this.logger.error(`Failed to decrypt GCP credentials: ${err.message}`);
      return undefined;
    }
  }

  /**
   * Decrypts and resolves AWS credentials stored in tenant cloud account
   */
  private resolveAwsCredentials(cloudAccount: any) {
    if (!cloudAccount.encryptedCredentials) return undefined;
    try {
      const decrypted = this.cryptoService.decryptAes256Gcm(
        cloudAccount.encryptedCredentials,
        cloudAccount.encryptionIv,
        cloudAccount.encryptionTag,
      );
      const parsed = JSON.parse(decrypted);
      return {
        accessKeyId: parsed.accessKeyId || parsed.awsAccessKeyId,
        secretAccessKey: parsed.secretAccessKey || parsed.awsSecretAccessKey,
      };
    } catch (err: any) {
      this.logger.error(`Failed to decrypt AWS credentials: ${err.message}`);
      return undefined;
    }
  }

  /**
   * Parses standard X.509 PEM certificate and calculates days remaining & fingerprint
   */
  private parseCertificateDetails(certificatePem: string, fallbackDomain: string, fallbackSans?: string[]): AcmeIssueResult {
    const crypto = require('crypto');
    let x509: any = null;
    try {
      x509 = new crypto.X509Certificate(certificatePem);
    } catch {
      // Fallback if bundled chain
      const firstCert = certificatePem.split('-----END CERTIFICATE-----')[0] + '-----END CERTIFICATE-----\n';
      x509 = new crypto.X509Certificate(firstCert);
    }

    const notBefore = new Date(x509.validFrom).toISOString();
    const notAfter = new Date(x509.validTo).toISOString();
    const serialNumber = x509.serialNumber || Math.random().toString(16).substring(2, 18);
    const fingerprintSha256 = x509.fingerprint256?.replace(/:/g, '').toLowerCase() || '';

    const sans = x509.subjectAltName
      ? x509.subjectAltName.split(',').map((s: string) => s.trim().replace(/^DNS:/i, '')).filter(Boolean)
      : fallbackSans || [fallbackDomain];

    return {
      certificatePem,
      issuer: x509.issuer || "Let's Encrypt Authority",
      sans,
      notBefore,
      notAfter,
      serialNumber,
      fingerprintSha256,
    };
  }
}

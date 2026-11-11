import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as tls from 'tls';
import {
  type Certificate,
  type CertificateFilterParams,
  type LiveTlsProbeResult,
  type ReprobeCertificateResponse,
  AuditActorType,
  AuditAction,
} from '@clm/shared-types';
import { CertificatesRepository } from './certificates.repository';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { type CreateCertificateDto } from './dto/create-certificate.dto';

@Injectable()
export class CertificatesService {
  constructor(
    private readonly certificatesRepository: CertificatesRepository,
    private readonly auditLogsService: AuditLogsService,
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

  async renew(tenantId: string, id: string): Promise<Certificate> {
    const updated = await this.certificatesRepository.renew(tenantId, id);
    if (!updated) {
      throw new NotFoundException(`Certificate with ID '${id}' not found`);
    }

    await this.auditLogsService.log(tenantId, {
      actorType: AuditActorType.USER,
      actorId: 'user-active',
      action: AuditAction.CERT_RENEWED,
      resourceType: 'CERTIFICATE',
      resourceId: updated.id,
      metadata: { domain: updated.domain },
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
}

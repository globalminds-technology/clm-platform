import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface WelcomeCredentialsPayload {
  email: string;
  name: string;
  role: string;
  tempPassword: string;
  portalUrl?: string;
  tenantName?: string;
}

export interface PasswordResetPayload {
  email: string;
  name: string;
  resetCode: string;
  expiresInMinutes?: number;
}

export interface CertificateExpiryAlertPayload {
  email: string;
  domain: string;
  daysRemaining: number;
  expiryDate: string;
  issuer: string;
  tenantName: string;
  portalUrl?: string;
}


@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly isConfigured: boolean;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const rawPass = process.env.SMTP_PASS;
    const pass = rawPass?.replace(/\s+/g, '');

    if (host && user && pass && host !== 'smtp.example.com') {
      const transportConfig: any = host.includes('gmail')
        ? {
            service: 'gmail',
            auth: { user, pass },
          }
        : {
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
          };
      this.transporter = nodemailer.createTransport(transportConfig);
      this.isConfigured = true;
      this.logger.log(`SMTP Mailer initialized with host: ${host}:${port} for ${user}`);
    } else {
      this.isConfigured = false;
      this.logger.warn('SMTP not configured or dummy settings detected. Falling back to secure console credential logging.');
    }
  }

  async sendWelcomeCredentials(payload: WelcomeCredentialsPayload): Promise<boolean> {
    const { email, name, role, tempPassword, portalUrl = 'http://localhost:3000', tenantName = 'Your Organization' } = payload;
    const fromAddress = process.env.SMTP_FROM || '"CLM Security Team" <no-reply@clm-platform.com>';

    const subject = `Welcome to ${tenantName} on CLM Platform - Your Access Credentials`;
    const textContent = `
Hello ${name},

You have been invited to join ${tenantName} on the Certificate Lifecycle Management (CLM) Platform as a ${role}.

Your Temporary Credentials:
------------------------------------------
Portal URL: ${portalUrl}
Username:   ${email}
Password:   ${tempPassword}
------------------------------------------

Please log in and update your password upon first access.

Security Notice: This is a system-generated credential. Never share this with anyone.
`;

    const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px;">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 20px; border-radius: 12px; color: white; text-align: center;">
    <h2 style="margin: 0; font-size: 20px;">Welcome to ${tenantName}</h2>
    <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">Certificate Lifecycle Management Platform</p>
  </div>
  <div style="padding: 24px 0;">
    <p>Hello <strong>${name}</strong>,</p>
    <p>You have been invited as <strong>${role}</strong>. Here are your temporary credentials to access the portal:</p>
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace; font-size: 14px;">
      <p style="margin: 4px 0;"><strong>Portal:</strong> <a href="${portalUrl}">${portalUrl}</a></p>
      <p style="margin: 4px 0;"><strong>Username:</strong> ${email}</p>
      <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <span style="color: #2563eb; font-weight: bold;">${tempPassword}</span></p>
    </div>
    <p style="font-size: 12px; color: #64748b;">Please log in and change your password immediately.</p>
  </div>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
  <p style="font-size: 11px; color: #94a3b8; text-align: center;">CLM Platform &bull; Zero-Trust Enterprise Certificate Infrastructure</p>
</div>
`;

    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: fromAddress,
          to: email,
          subject,
          text: textContent,
          html: htmlContent,
        });
        this.logger.log(`Credentials email dispatched successfully to ${email}`);
        return true;
      } catch (err: any) {
        this.logger.error(`Failed to dispatch SMTP email to ${email}: ${err.message}`);
      }
    }

    // Console formatted fallback box
    console.log('\n' + '='.repeat(64));
    console.log('📨 [DEV CONSOLE MAIL FALLBACK] INVITATION DISPATCHED');
    console.log('='.repeat(64));
    console.log(`Recipient:   ${name} <${email}>`);
    console.log(`Role:        ${role}`);
    console.log(`Tenant:      ${tenantName}`);
    console.log(`Portal URL:  ${portalUrl}`);
    console.log(`Temp Pass:   ${tempPassword}`);
    console.log('='.repeat(64) + '\n');

    return false;
  }

  async sendPasswordResetEmail(payload: PasswordResetPayload): Promise<boolean> {
    const { email, name, resetCode, expiresInMinutes = 15 } = payload;
    const fromAddress = process.env.SMTP_FROM || '"CLM Security Team" <no-reply@clm-platform.com>';
    const subject = 'Reset Your CLM Platform Password - Verification Code';

    const textContent = `
Hello ${name || email},

We received a request to reset your password on the CLM Platform.

Your Password Reset Verification Code:
------------------------------------------
${resetCode}
------------------------------------------

This code will expire in ${expiresInMinutes} minutes.

If you did not request a password reset, please ignore this email or notify your security administrator.
`;

    const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 20px; border-radius: 12px; color: white; text-align: center;">
    <h2 style="margin: 0; font-size: 20px;">Password Reset Request</h2>
    <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">Certificate Lifecycle Management Platform</p>
  </div>
  <div style="padding: 24px 0;">
    <p>Hello <strong>${name || email}</strong>,</p>
    <p>A password reset was requested for your CLM account. Use the verification code below to set a new password:</p>
    <div style="background: #f8fafc; border: 2px dashed #2563eb; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
      <span style="font-family: monospace; font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #2563eb;">${resetCode}</span>
    </div>
    <p style="font-size: 12px; color: #64748b;">This code expires in <strong>${expiresInMinutes} minutes</strong>. If you did not make this request, you can safely ignore this email.</p>
  </div>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
  <p style="font-size: 11px; color: #94a3b8; text-align: center;">CLM Platform &bull; Zero-Trust Enterprise Certificate Infrastructure</p>
</div>
`;

    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: fromAddress,
          to: email,
          subject,
          text: textContent,
          html: htmlContent,
        });
        this.logger.log(`Password reset email dispatched successfully to ${email}`);
        return true;
      } catch (err: any) {
        this.logger.error(`Failed to dispatch reset email to ${email}: ${err.message}`);
      }
    }

    // Console formatted fallback box
    console.log('\n' + '='.repeat(64));
    console.log('🔑 [DEV CONSOLE MAIL FALLBACK] PASSWORD RESET CODE');
    console.log('='.repeat(64));
    console.log(`Recipient:   ${name || email} <${email}>`);
    console.log(`Reset Code:  ${resetCode}`);
    console.log(`Expires In:  ${expiresInMinutes} minutes`);
    console.log('='.repeat(64) + '\n');

    return false;
  }

  async sendCertificateExpiryWarning(payload: CertificateExpiryAlertPayload): Promise<boolean> {
    const { email, domain, daysRemaining, expiryDate, issuer, tenantName, portalUrl = 'http://localhost:3000' } = payload;
    const fromAddress = process.env.SMTP_FROM || `"CertFlow CLM Security" <${process.env.SMTP_USER || 'no-reply@clm-platform.com'}>`;
    const isCritical = daysRemaining <= 7;
    const subject = `[${isCritical ? 'URGENT CRITICAL' : 'WARNING'}] Certificate for ${domain} expires in ${daysRemaining} days`;

    const textContent = `
CRITICAL CERTIFICATE EXPIRATION ALERT
Organization: ${tenantName}
Domain:       ${domain}
Days Left:    ${daysRemaining} days (Expires ${expiryDate})
CA Issuer:    ${issuer}

Action Required:
A certificate deployed in your infrastructure is reaching expiration.
Log into your CLM portal to verify auto-renewal status or trigger immediate re-issuance:
${portalUrl}

--
CertFlow CLM Platform Automated Security Watchdog
`;

    const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
  <div style="background: ${isCritical ? 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)' : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'}; padding: 20px; border-radius: 12px; color: white; text-align: center;">
    <h2 style="margin: 0; font-size: 20px;">${isCritical ? '⚠️ Critical Expiry Alert' : '⚡ Certificate Expiry Warning'}</h2>
    <p style="margin: 4px 0 0 0; opacity: 0.95; font-size: 13px;">${tenantName} &bull; Automated Lifecycle Watchdog</p>
  </div>
  <div style="padding: 24px 0;">
    <p style="font-size: 14px; color: #334155;">Hello,</p>
    <p style="font-size: 14px; color: #334155;">The following SSL/TLS certificate is approaching expiration in your environment:</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 18px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 140px;">Primary Domain:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #0f172a; font-family: monospace;">${domain}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Remaining Days:</td>
          <td style="padding: 6px 0; font-weight: 800; color: ${isCritical ? '#e11d48' : '#d97706'}; font-size: 16px;">${daysRemaining} days left</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Expiration Date:</td>
          <td style="padding: 6px 0; color: #334155;">${expiryDate}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">CA Issuer:</td>
          <td style="padding: 6px 0; color: #334155;">${issuer}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${portalUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 10px; font-weight: bold; text-decoration: none; font-size: 13px;">Open CLM Portal & Renew</a>
    </div>
  </div>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
  <p style="font-size: 11px; color: #94a3b8; text-align: center;">CLM Platform &bull; Zero-Trust Enterprise Certificate Infrastructure</p>
</div>
`;

    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: fromAddress,
          to: email,
          subject,
          text: textContent,
          html: htmlContent,
        });
        this.logger.log(`Certificate expiry alert dispatched via SMTP to ${email} for domain: ${domain}`);
        return true;
      } catch (err: any) {
        this.logger.error(`Failed to dispatch expiry alert to ${email} via SMTP: ${err.message}`);
      }
    }

    console.log('\n' + '='.repeat(64));
    console.log('⚠️ [DEV CONSOLE MAIL FALLBACK] CERTIFICATE EXPIRY WARNING');
    console.log('='.repeat(64));
    console.log(`To:          ${email}`);
    console.log(`Domain:      ${domain} (${daysRemaining} days remaining)`);
    console.log(`Expiry:      ${expiryDate}`);
    console.log('='.repeat(64) + '\n');
    return false;
  }
}



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

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly isConfigured: boolean;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass && host !== 'smtp.example.com') {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.isConfigured = true;
      this.logger.log(`SMTP Mailer initialized with host: ${host}:${port}`);
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
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Msg91Service } from './msg91.service';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendNotificationEmailOptions {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
  plainText?: string;
  templateId?: string;
  variables?: Record<string, any>;
  attachments?: EmailAttachment[];
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);
  private smtpTransporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly msg91Service: Msg91Service,
  ) {
    this.initSmtp();
  }

  private initSmtp() {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 465);
    const secure = port === 465;

    if (host && user && pass) {
      try {
        this.smtpTransporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
          tls: {
            rejectUnauthorized: false,
          },
        });
        this.logger.log(`SMTP transporter initialized for ${user}@${host}:${port}`);
      } catch (err) {
        this.logger.error('Failed to initialize SMTP transporter', err);
      }
    }
  }

  /**
   * Sends an email using MSG91 as the default primary provider,
   * falling back automatically to direct SMTP if MSG91 is unconfigured or fails.
   */
  async send(options: SendNotificationEmailOptions): Promise<{ success: boolean; method: string; error?: string }> {
    const fromEmail =
      this.configService.get<string>('MSG91_FROM_EMAIL') ??
      this.configService.get<string>('SMTP_FROM_EMAIL') ??
      'info@thankamevents.in';
    const fromName =
      this.configService.get<string>('MSG91_FROM_NAME') ??
      this.configService.get<string>('SMTP_FROM_NAME') ??
      'Thankam Events';

    let msg91Attempted = false;
    let msg91Error: string | undefined;

    // ── Strategy 1 (Default): MSG91 Email API ─────────────────────────────────
    const msg91AuthKey = this.configService.get<string>('MSG91_AUTH_KEY');
    const templateId =
      options.templateId ??
      this.configService.get<string>('MSG91_EMAIL_TEMPLATE_ID');

    if (msg91AuthKey) {
      msg91Attempted = true;
      try {
        await this.msg91Service.sendEmail({
          to: { name: options.toName, email: options.toEmail },
          subject: options.subject,
          ...(templateId
            ? {
                templateId,
                variables: {
                  name: options.toName,
                  customer_name: options.toName,
                  subject: options.subject,
                  ...(options.variables || {}),
                },
              }
            : {
                html: options.htmlContent,
              }),
          attachments: options.attachments?.map((att) => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType,
          })),
        });

        this.logger.log(
          `Email dispatched via MSG91 (default) to ${options.toEmail} — "${options.subject}"`,
        );
        return { success: true, method: 'MSG91' };
      } catch (error: any) {
        msg91Error = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `MSG91 email delivery failed for ${options.toEmail}: ${msg91Error}. Falling back to SMTP...`,
        );
      }
    } else {
      this.logger.log(
        `MSG91_AUTH_KEY not configured. Falling back to SMTP for ${options.toEmail}...`,
      );
    }

    // ── Strategy 2 (Fallback): Direct SMTP (Hostinger / Titan / Google / Custom) ─
    if (!this.smtpTransporter) {
      this.initSmtp();
    }

    if (this.smtpTransporter) {
      try {
        const smtpFromEmail =
          this.configService.get<string>('SMTP_FROM_EMAIL') ?? fromEmail;
        const smtpFromName =
          this.configService.get<string>('SMTP_FROM_NAME') ?? fromName;

        await this.smtpTransporter.sendMail({
          from: `"${smtpFromName}" <${smtpFromEmail}>`,
          to: `"${options.toName}" <${options.toEmail}>`,
          subject: options.subject,
          text: options.plainText || undefined,
          html: options.htmlContent,
          attachments: options.attachments?.map((att) => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType || 'application/pdf',
          })),
        });

        this.logger.log(
          `Email dispatched via SMTP (fallback) to ${options.toEmail} — "${options.subject}"`,
        );
        return { success: true, method: msg91Attempted ? 'SMTP (fallback)' : 'SMTP' };
      } catch (error: any) {
        const smtpError = error instanceof Error ? error.message : String(error);
        this.logger.error(`SMTP fallback delivery failed to ${options.toEmail}: ${smtpError}`);
        return {
          success: false,
          method: 'FAILED',
          error: `MSG91 failed (${msg91Error || 'Not configured'}) and SMTP fallback failed (${smtpError})`,
        };
      }
    }

    // ── Neither Provider Succeeded / Configured ──────────────────────────────
    this.logger.warn(
      `No email delivery provider succeeded for ${options.toEmail}. MSG91: ${msg91Error || 'Not configured'}. SMTP: Not configured.`,
    );

    return {
      success: false,
      method: 'NONE',
      error: msg91Error || 'Neither MSG91 nor SMTP is configured in environment.',
    };
  }
}

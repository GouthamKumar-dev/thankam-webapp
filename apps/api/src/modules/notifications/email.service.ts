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
   * Sends an email using SMTP if configured, or falls back to MSG91 Email API.
   */
  async send(options: SendNotificationEmailOptions): Promise<{ success: boolean; method: string; error?: string }> {
    const fromEmail =
      this.configService.get<string>('SMTP_FROM_EMAIL') ??
      this.configService.get<string>('MSG91_FROM_EMAIL') ??
      'info@thankamevents.in';
    const fromName =
      this.configService.get<string>('SMTP_FROM_NAME') ??
      this.configService.get<string>('MSG91_FROM_NAME') ??
      'Thankam Events';

    // ── Strategy 1: Direct SMTP (Hostinger / Titan / Google / Custom) ─────
    if (this.smtpTransporter) {
      try {
        await this.smtpTransporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
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

        this.logger.log(`Email dispatched via SMTP to ${options.toEmail} — "${options.subject}"`);
        return { success: true, method: 'SMTP' };
      } catch (error) {
        this.logger.error(`SMTP delivery failed to ${options.toEmail}`, error);
        // continue to try MSG91 fallback if available
      }
    }

    // ── Strategy 2: MSG91 Email API ───────────────────────────────────────
    const msg91AuthKey = this.configService.get<string>('MSG91_AUTH_KEY');
    const templateId =
      options.templateId ??
      this.configService.get<string>('MSG91_EMAIL_TEMPLATE_ID');

    if (msg91AuthKey && templateId) {
      try {
        await this.msg91Service.sendEmail({
          to: { name: options.toName, email: options.toEmail },
          subject: options.subject,
          templateId,
          variables: {
            name: options.toName,
            customer_name: options.toName,
            subject: options.subject,
            ...(options.variables || {}),
          },
          attachments: options.attachments?.map((att) => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType,
          })),
        });

        this.logger.log(`Email dispatched via MSG91 to ${options.toEmail}`);
        return { success: true, method: 'MSG91' };
      } catch (error: any) {
        this.logger.warn(`MSG91 email delivery failed: ${error?.message || error}`);
        return {
          success: false,
          method: 'MSG91',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    this.logger.warn(
      `No email delivery provider configured to send to ${options.toEmail}. Configure SMTP_HOST/SMTP_USER/SMTP_PASS or MSG91_EMAIL_TEMPLATE_ID in .env.`,
    );

    return {
      success: false,
      method: 'NONE',
      error: 'No valid SMTP or MSG91 Email Template configured in environment.',
    };
  }
}

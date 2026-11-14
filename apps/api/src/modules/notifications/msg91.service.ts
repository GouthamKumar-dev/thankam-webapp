import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Msg91EmailRecipient {
  name: string;
  email: string;
}

export interface SendEmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: Msg91EmailRecipient;
  subject: string;
  html?: string;
  templateId?: string;
  variables?: Record<string, any>;
  attachments?: SendEmailAttachment[];
}

@Injectable()
export class Msg91Service {
  private readonly logger = new Logger(Msg91Service.name);

  constructor(private readonly configService: ConfigService) {}

  // ─── MSG91 OTP Widget Platform (Server-Side) ─────────────────────────────────

  async sendWidgetOtp(
    phone: string,
    channel: string = '11',
  ): Promise<{ success: boolean; reqId?: string; error?: string }> {
    const authKey = this.configService.get<string>('MSG91_AUTH_KEY');
    const widgetId =
      this.configService.get<string>('MSG91_WIDGET_ID') ??
      this.configService.get<string>('MSG91_SMS_OTP_TEMPLATE_ID') ??
      '366978695162363839313732';

    if (!authKey || !widgetId) {
      this.logger.warn('MSG91 credentials not fully configured');
      return { success: false, error: 'MSG91 credentials not configured' };
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const identifier = `91${cleanPhone}`;

    try {
      const res = await fetch(
        'https://control.msg91.com/api/v5/widget/sendOtp',
        {
          method: 'POST',
          headers: {
            authkey: authKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            widgetId,
            identifier,
          }),
        },
      );

      const raw = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch {
        /* non-JSON */
      }

      this.logger.log(`MSG91 widget sendOtp response for ${identifier}: ${raw}`);

      if (res.ok && data.type === 'success' && data.message) {
        const reqId = String(data.message);

        // If WhatsApp was requested (channel '12'), trigger WhatsApp delivery immediately
        if (channel === '12') {
          const retryRes = await this.retryWidgetOtp(reqId, '12');
          this.logger.log(
            `MSG91 widget immediate WhatsApp dispatch for ${identifier} (reqId: ${reqId}): ${JSON.stringify(retryRes)}`,
          );
        }

        return { success: true, reqId };
      }

      const errMsg = data.message ?? `HTTP ${res.status}: ${raw}`;
      return { success: false, error: errMsg };
    } catch (error) {
      this.logger.error('Failed to call MSG91 widget sendOtp', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async retryWidgetOtp(
    reqId: string,
    channel?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const authKey = this.configService.get<string>('MSG91_AUTH_KEY');
    const widgetId =
      this.configService.get<string>('MSG91_WIDGET_ID') ??
      this.configService.get<string>('MSG91_SMS_OTP_TEMPLATE_ID') ??
      '366978695162363839313732';

    if (!authKey || !widgetId || !reqId) {
      return { success: false, error: 'Missing parameters for retry' };
    }

    try {
      const res = await fetch(
        'https://control.msg91.com/api/v5/widget/retryOtp',
        {
          method: 'POST',
          headers: {
            authkey: authKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            widgetId,
            reqId,
            retryChannel: channel || '11',
          }),
        },
      );

      const raw = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch {
        /* non-JSON */
      }

      this.logger.log(`MSG91 widget retryOtp response for ${reqId}: ${raw}`);
      if (res.ok && data.type === 'success') {
        return { success: true };
      }
      return { success: false, error: data.message ?? raw };
    } catch (error) {
      this.logger.error('Failed to call MSG91 widget retryOtp', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async verifyWidgetOtp(reqId: string, otp: string): Promise<boolean> {
    const authKey = this.configService.get<string>('MSG91_AUTH_KEY');
    const widgetId =
      this.configService.get<string>('MSG91_WIDGET_ID') ??
      this.configService.get<string>('MSG91_SMS_OTP_TEMPLATE_ID') ??
      '366978695162363839313732';

    if (!authKey || !widgetId || !reqId || !otp) {
      return false;
    }

    try {
      const res = await fetch(
        'https://control.msg91.com/api/v5/widget/verifyOtp',
        {
          method: 'POST',
          headers: {
            authkey: authKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            widgetId,
            reqId,
            otp: String(otp).trim(),
          }),
        },
      );

      const raw = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch {
        /* non-JSON */
      }

      this.logger.log(`MSG91 widget verifyOtp response for ${reqId}: ${raw}`);
      return res.ok && data.type === 'success';
    } catch (error) {
      this.logger.error('Failed to verify OTP with MSG91 widget', error);
      return false;
    }
  }

  // ─── Legacy Method for direct compatibility ──────────────────────────────────

  async sendOtp(phone: string, otp: string): Promise<void> {
    const res = await this.sendWidgetOtp(phone);
    if (!res.success) {
      this.logger.warn(`MSG91 OTP dispatch note: ${res.error}`);
    }
  }

  // ─── Transactional Email ─────────────────────────────────────────────────────

  async sendEmail(opts: SendEmailOptions): Promise<void> {
    const authKey = this.configService.get<string>('MSG91_AUTH_KEY');
    const fromEmail = this.configService.get<string>('MSG91_FROM_EMAIL');
    const fromName =
      this.configService.get<string>('MSG91_FROM_NAME') ?? 'Thankam Events';

    if (!authKey || !fromEmail) {
      this.logger.warn('MSG91 email credentials not configured');
      throw new InternalServerErrorException(
        'Email service is not configured. Please contact administrator.',
      );
    }

    const domain = fromEmail.includes('@') ? fromEmail.split('@')[1] : undefined;

    const payload: Record<string, any> = {
      recipients: [
        {
          to: [{ name: opts.to.name, email: opts.to.email }],
          ...(opts.variables ? { variables: opts.variables } : {}),
        },
      ],
      from: { name: fromName, email: fromEmail },
      domain,
      subject: opts.subject,
    };

    if (opts.templateId) {
      payload.template_id = opts.templateId;
    } else if (opts.html) {
      payload.body = {
        type: 'text/html',
        data: opts.html,
      };
    }

    if (opts.attachments && opts.attachments.length > 0) {
      payload.attachments = opts.attachments.map((att) => {
        const mime = att.contentType || 'application/pdf';
        const b64 = Buffer.isBuffer(att.content)
          ? att.content.toString('base64')
          : String(att.content);
        const dataUri = b64.startsWith('data:')
          ? b64
          : `data:${mime};base64,${b64}`;
        return {
          file: dataUri,
          fileName: att.filename,
        };
      });
    }

    try {
      const res = await fetch('https://control.msg91.com/api/v5/email/send', {
        method: 'POST',
        headers: {
          authkey: authKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      let data: { type?: string; message?: string; errors?: any } = {};
      try {
        data = JSON.parse(raw);
      } catch {
        /* non-JSON */
      }

      if (!res.ok || data.type === 'error') {
        const errorDetail = data.errors ? JSON.stringify(data.errors) : (data.message ?? raw);
        throw new Error(`MSG91 email failed (${res.status}): ${errorDetail}`);
      }

      this.logger.log(`Email sent to ${opts.to.email} — "${opts.subject}"`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${opts.to.email}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Failed to send email. Please try again later.',
      );
    }
  }

  // ─── Widget Access Token Verification ────────────────────────────────────────

  async verifyWidgetAccessToken(accessToken: string): Promise<boolean> {
    const authKey = this.configService.get<string>('MSG91_AUTH_KEY');
    if (!authKey || !accessToken) return false;

    try {
      const res = await fetch(
        'https://control.msg91.com/api/v5/widget/verifyAccessToken',
        {
          method: 'POST',
          headers: {
            authkey: authKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            'access-token': accessToken,
          }),
        },
      );

      const raw = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch {
        /* non-JSON */
      }

      this.logger.log(`MSG91 verifyAccessToken response: ${raw}`);
      return (
        res.ok &&
        (data.type === 'success' ||
          data.status === 'success' ||
          data.message === 'Token verified successfully' ||
          Boolean(data.message && /^\d+$/.test(String(data.message))))
      );
    } catch (error) {
      this.logger.error(
        'Failed to verify MSG91 widget access token',
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}

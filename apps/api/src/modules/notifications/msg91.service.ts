import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface Msg91EmailRecipient {
  name: string;
  email: string;
}

@Injectable()
export class Msg91Service {
  private readonly logger = new Logger(Msg91Service.name);

  constructor(private readonly configService: ConfigService) {}

  // ─── SMS OTP ────────────────────────────────────────────────────────────────
  // Provider priority: Fast2SMS (no DLT) → MSG91 (needs DLT sender ID)

  async sendOtp(phone: string, otp: string): Promise<void> {
    const fast2smsKey = this.configService.get<string>('FAST2SMS_API_KEY');
    const msg91AuthKey = this.configService.get<string>('MSG91_AUTH_KEY');
    const msg91SenderId = this.configService.get<string>('MSG91_SMS_SENDER_ID');
    const msg91TemplateId = this.configService.get<string>('MSG91_SMS_OTP_TEMPLATE_ID');

    if (fast2smsKey) {
      await this.sendOtpViaFast2Sms(phone, otp, fast2smsKey);
    } else if (msg91AuthKey && msg91SenderId && msg91TemplateId) {
      await this.sendOtpViaMsg91(phone, otp, msg91AuthKey, msg91SenderId, msg91TemplateId);
    } else {
      this.logger.warn(
        'No SMS provider configured. Set FAST2SMS_API_KEY (recommended, no DLT) ' +
        'or MSG91_AUTH_KEY + MSG91_SMS_SENDER_ID + MSG91_SMS_OTP_TEMPLATE_ID.',
      );
    }
  }

  private async sendOtpViaFast2Sms(
    phone: string,
    otp: string,
    apiKey: string,
  ): Promise<void> {
    try {
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message: `Your Thankam Events OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`,
          language: 'english',
          flash: 0,
          numbers: phone, // Fast2SMS uses 10-digit without country code
        }),
      });

      const raw = await res.text();
      let data: { return?: boolean; message?: string[] | string } = {};
      try { data = JSON.parse(raw); } catch { /* non-JSON */ }

      this.logger.log(`Fast2SMS OTP response for ${phone}: ${raw}`);

      if (!res.ok || data.return === false) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : (data.message ?? raw);
        throw new Error(`Fast2SMS error: ${msg}`);
      }

      this.logger.log(`OTP SMS sent to ${phone} via Fast2SMS`);
    } catch (error) {
      this.logger.error(
        `Failed to send OTP SMS to ${phone} via Fast2SMS`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async sendOtpViaMsg91(
    phone: string,
    otp: string,
    authKey: string,
    senderId: string,
    templateId: string,
  ): Promise<void> {
    const mobile = `91${phone}`;

    try {
      const res = await fetch('https://api.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          authkey: authKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: templateId,
          mobile,
          otp,
          sender: senderId,
          otp_expiry: 5,
        }),
      });

      const raw = await res.text();
      let data: { type?: string; message?: string } = {};
      try { data = JSON.parse(raw); } catch { /* non-JSON */ }

      this.logger.log(`MSG91 OTP response for ${phone}: ${raw}`);

      if (!res.ok || data.type === 'error') {
        throw new Error(data.message ?? `MSG91 status ${res.status}: ${raw}`);
      }

      this.logger.log(`OTP SMS sent to ${phone} via MSG91`);
    } catch (error) {
      this.logger.error(
        `Failed to send OTP SMS to ${phone} via MSG91`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // ─── Transactional Email ─────────────────────────────────────────────────────

  async sendEmail(opts: {
    to: Msg91EmailRecipient;
    subject: string;
    html: string;
  }): Promise<void> {
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

    try {
      const res = await fetch('https://api.msg91.com/api/v5/email/send', {
        method: 'POST',
        headers: {
          authkey: authKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: [
            {
              to: [{ name: opts.to.name, email: opts.to.email }],
            },
          ],
          from: { name: fromName, email: fromEmail },
          subject: opts.subject,
          body: opts.html,
        }),
      });

      const raw = await res.text();
      let data: { type?: string; message?: string } = {};
      try { data = JSON.parse(raw); } catch { /* non-JSON */ }

      if (!res.ok || data.type === 'error') {
        throw new Error(data.message ?? `MSG91 email status ${res.status}: ${raw}`);
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
}

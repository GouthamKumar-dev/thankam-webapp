import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailNotificationService } from '../notifications/email.service';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailNotificationService,
  ) {}

  findAll() {
    return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
  }

  async findOne(key: string) {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    if (!row) {
      throw new NotFoundException('Setting not found');
    }

    return row;
  }

  upsert(key: string, value: Record<string, unknown>) {
    const jsonValue = value as Prisma.InputJsonValue;

    return this.prisma.setting.upsert({
      where: { key },
      update: { value: jsonValue },
      create: { key, value: jsonValue },
    });
  }

  async testEmail(targetEmail: string) {
    if (!targetEmail || !targetEmail.includes('@')) {
      throw new BadRequestException('A valid email address is required for testing');
    }

    const testTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    return this.emailService.send({
      toEmail: targetEmail.trim(),
      toName: 'Thankam Events Admin',
      subject: '✅ Thankam Events Email Test — Delivery Confirmed',
      htmlContent: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #0F172A; margin: 0 0 10px;">Email System Verified</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            This test email confirms that transactional notifications from Thankam Events Management are functioning and reaching inboxes properly.
          </p>
          <div style="background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 10px; padding: 14px 18px; margin: 20px 0;">
            <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Dispatched At:</strong> ${testTime}</p>
            <p style="margin: 4px 0 0; font-size: 13px; color: #334155;"><strong>Destination:</strong> ${targetEmail.trim()}</p>
          </div>
          <p style="color: #94A3B8; font-size: 11px; margin: 0;">Thankam Events Management • Kollam, Kerala</p>
        </div>
      `,
    });
  }
}

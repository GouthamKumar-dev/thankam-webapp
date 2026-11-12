import { Module } from '@nestjs/common';
import { Msg91Service } from './msg91.service';
import { EmailNotificationService } from './email.service';

@Module({
  providers: [Msg91Service, EmailNotificationService],
  exports: [Msg91Service, EmailNotificationService],
})
export class NotificationsModule {}

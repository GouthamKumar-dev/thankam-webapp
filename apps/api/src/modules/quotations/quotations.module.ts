import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CategoriesModule } from '../categories/categories.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QuotationsController } from './quotations.controller';
import { QuotationsPublicController } from './quotations-public.controller';
import { QuotationsWorkflowGateway } from './quotations-workflow.gateway';
import { CustomerPortalAuthGuard } from './guards/customer-portal-auth.guard';
import { QuotationsService } from './quotations.service';
import { QuotationPdfService } from './quotation-pdf.service';

@Module({
  imports: [CategoriesModule, JwtModule.register({}), NotificationsModule],
  controllers: [QuotationsController, QuotationsPublicController],
  providers: [QuotationsService, QuotationPdfService, CustomerPortalAuthGuard, QuotationsWorkflowGateway],
  exports: [QuotationsService, QuotationPdfService],
})
export class QuotationsModule {}

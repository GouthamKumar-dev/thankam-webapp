import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CategoriesModule } from '../categories/categories.module';
import { QuotationsController } from './quotations.controller';
import { QuotationsPublicController } from './quotations-public.controller';
import { QuotationsWorkflowGateway } from './quotations-workflow.gateway';
import { CustomerPortalAuthGuard } from './guards/customer-portal-auth.guard';
import { QuotationsService } from './quotations.service';

@Module({
  imports: [CategoriesModule, JwtModule.register({})],
  controllers: [QuotationsController, QuotationsPublicController],
  providers: [QuotationsService, CustomerPortalAuthGuard, QuotationsWorkflowGateway],
  exports: [QuotationsService],
})
export class QuotationsModule {}

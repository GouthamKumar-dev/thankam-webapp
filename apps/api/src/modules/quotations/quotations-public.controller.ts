import { Body, Controller, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CategoriesService } from '../categories/categories.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { RejectAgreementDto } from './dto/reject-agreement.dto';
import { RespondPortalQuotationDto } from './dto/respond-portal-quotation.dto';
import { RequestCustomerOtpDto } from './dto/request-customer-otp.dto';
import { VerifyCustomerOtpDto } from './dto/verify-customer-otp.dto';
import { CurrentCustomerPhone } from './decorators/current-customer-phone.decorator';
import { CustomerPortalAuthGuard } from './guards/customer-portal-auth.guard';
import { QuotationsService } from './quotations.service';

@Controller('portal')
export class QuotationsPublicController {
  constructor(
    private readonly quotationsService: QuotationsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  @Get('catalog')
  catalog() {
    return this.categoriesService.findPublicTree();
  }

  @Get('templates')
  templates() {
    return this.quotationsService.getTemplates();
  }

  @Get('website-content')
  websiteContent() {
    return this.quotationsService.getPublicWebsiteContent();
  }

  @Post('quotation-request')
  @UseGuards(CustomerPortalAuthGuard)
  createQuotationRequest(
    @Body() dto: CreateQuotationDto,
    @CurrentCustomerPhone() phone: string,
  ) {
    return this.quotationsService.createPublicRequest(dto, phone);
  }

  @Post('auth/request-otp')
  requestOtp(@Body() dto: RequestCustomerOtpDto) {
    return this.quotationsService.requestCustomerOtp(dto.phone);
  }

  @Post('auth/resend-otp')
  resendOtp(@Body() body: { phone: string; channel?: string }) {
    return this.quotationsService.resendCustomerOtp(body.phone, body.channel);
  }

  @Post('auth/verify-otp')
  verifyOtp(@Body() dto: VerifyCustomerOtpDto) {
    return this.quotationsService.verifyCustomerOtp(
      dto.phone,
      dto.otp,
      dto.name,
      dto.email,
      dto.msg91Token,
    );
  }

  @Get('quotations/my')
  @UseGuards(CustomerPortalAuthGuard)
  myQuotations(@CurrentCustomerPhone() phone: string) {
    return this.quotationsService.getMyPortalQuotations(phone);
  }

  @Get('quotations/my/:id')
  @UseGuards(CustomerPortalAuthGuard)
  myQuotationById(
    @CurrentCustomerPhone() phone: string,
    @Param('id') id: string,
  ) {
    return this.quotationsService.getMyPortalQuotationById(phone, id);
  }

  @Get('quotations/my/:id/pdf')
  @UseGuards(CustomerPortalAuthGuard)
  async downloadMyQuotationPdf(
    @CurrentCustomerPhone() phone: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.quotationsService.generatePortalPdfStream(phone, id, 'QUOTATION');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('quotations/my/:id/agreement-pdf')
  @UseGuards(CustomerPortalAuthGuard)
  async downloadMyQuotationAgreementPdf(
    @CurrentCustomerPhone() phone: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.quotationsService.generatePortalPdfStream(phone, id, 'AGREEMENT');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Patch('quotations/my/:id')
  @UseGuards(CustomerPortalAuthGuard)
  updateMyQuotation(
    @CurrentCustomerPhone() phone: string,
    @Param('id') id: string,
    @Body() dto: CreateQuotationDto,
  ) {
    return this.quotationsService.updateMyPortalQuotation(phone, id, dto);
  }

  @Post('quotations/my/:id/respond')
  @UseGuards(CustomerPortalAuthGuard)
  respondToMyQuotation(
    @CurrentCustomerPhone() phone: string,
    @Param('id') id: string,
    @Body() dto: RespondPortalQuotationDto,
  ) {
    return this.quotationsService.respondMyPortalQuotation(
      phone,
      id,
      dto.action,
      dto.reason,
    );
  }

  @Get('quotations/my/:id/agreement-html')
  @UseGuards(CustomerPortalAuthGuard)
  myQuotationAgreementHtml(
    @CurrentCustomerPhone() phone: string,
    @Param('id') id: string,
  ) {
    return this.quotationsService.getMyPortalAgreementHtml(phone, id);
  }

  @Post('quotations/my/:id/agreement/accept')
  @UseGuards(CustomerPortalAuthGuard)
  acceptMyQuotationAgreement(
    @CurrentCustomerPhone() phone: string,
    @Param('id') id: string,
  ) {
    return this.quotationsService.acceptMyPortalAgreement(phone, id);
  }

  @Post('quotations/my/:id/agreement/reject')
  @UseGuards(CustomerPortalAuthGuard)
  rejectMyQuotationAgreement(
    @CurrentCustomerPhone() phone: string,
    @Param('id') id: string,
    @Body() dto: RejectAgreementDto,
  ) {
    return this.quotationsService.rejectMyPortalAgreement(phone, id, dto.reason);
  }
}

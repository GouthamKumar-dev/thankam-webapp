import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { QuotationStatus, Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/types/jwt-user.type';
import { CustomerRequestQueryDto } from './dto/customer-request-query.dto';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateCustomerRequestStatusDto } from './dto/update-customer-request-status.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QuotationsService } from './quotations.service';

@Controller('quotations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateQuotationDto, @CurrentUser() user: JwtUser) {
    return this.quotationsService.create(dto, user.sub);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.quotationsService.findAll(query);
  }

  @Get('customer-requests')
  @Roles(Role.ADMIN)
  findCustomerRequests(@Query() query: CustomerRequestQueryDto) {
    return this.quotationsService.findCustomerRequests(query);
  }

  @Get('templates/all')
  templates() {
    return this.quotationsService.getTemplates();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quotationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateQuotationDto) {
    return this.quotationsService.update(id, dto);
  }

  @Patch(':id/request-status')
  @Roles(Role.ADMIN)
  updateRequestStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerRequestStatusDto,
  ) {
    return this.quotationsService.updateCustomerRequestStatus(
      id,
      dto.requestStatus,
    );
  }

  @Post(':id/finalize')
  @Roles(Role.ADMIN)
  finalize(@Param('id') id: string) {
    return this.quotationsService.setStatus(id, QuotationStatus.FINALIZED);
  }

  @Post(':id/draft')
  @Roles(Role.ADMIN)
  draft(@Param('id') id: string) {
    return this.quotationsService.setStatus(id, QuotationStatus.DRAFT);
  }

  @Post(':id/duplicate')
  @Roles(Role.ADMIN)
  duplicate(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.quotationsService.duplicate(id, user.sub);
  }

  @Get(':id/pdf-data')
  pdfData(@Param('id') id: string) {
    return this.quotationsService.getPdfData(id);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.quotationsService.generatePdfStream(id, 'QUOTATION');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id/agreement-pdf')
  async downloadAgreementPdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.quotationsService.generatePdfStream(id, 'AGREEMENT');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id/print-html')
  printHtml(@Param('id') id: string) {
    return this.quotationsService.getPrintableHtml(id);
  }

  @Get(':id/agreement-html')
  agreementHtml(@Param('id') id: string) {
    return this.quotationsService.getAgreementHtml(id);
  }

  @Post(':id/agreement/initiate')
  @Roles(Role.ADMIN)
  initiateAgreement(@Param('id') id: string) {
    return this.quotationsService.initiateAgreement(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.quotationsService.remove(id);
  }
}

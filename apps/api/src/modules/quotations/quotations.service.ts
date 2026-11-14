import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AgreementStatus,
  CustomerRequestStatus,
  Prisma,
  QuotationStatus,
  Role,
} from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { toSkipTake } from '../../common/dto/pagination.util';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Msg91Service } from '../notifications/msg91.service';
import { EmailNotificationService } from '../notifications/email.service';
import { QuotationPdfService } from './quotation-pdf.service';
import {
  CreateQuotationDto,
  QuotationLineDto,
} from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QuotationsWorkflowGateway } from './quotations-workflow.gateway';

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);
  private readonly customerInterestedTag = '[CUSTOMER_INTERESTED]';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly workflowGateway: QuotationsWorkflowGateway,
    private readonly msg91: Msg91Service,
    private readonly emailService: EmailNotificationService,
    private readonly pdfService: QuotationPdfService,
  ) {}

  async create(dto: CreateQuotationDto, createdById: string) {
    const quotationNumber = await this.generateQuotationNumber();
    const normalized = await this.normalizeItems(dto.items, dto.menuId);
    const totals = this.calculateTotals(normalized, dto);

    const created = await this.prisma.quotation.create({
      data: {
        quotationNumber,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerAddress: dto.customerAddress,
        eventDate: new Date(dto.eventDate),
        eventType: dto.eventType,
        venue: dto.venue,
        guestCount: dto.guestCount,
        menuId: dto.menuId,
        notes: dto.notes,
        terms: dto.terms,
        templateStyle: dto.templateStyle,
        discountAmount: totals.discountAmount,
        extraChargesAmount: totals.extraChargesAmount,
        gstPercent: totals.gstPercent,
        subTotal: totals.subTotal,
        gstAmount: totals.gstAmount,
        grandTotal: totals.grandTotal,
        createdById,
        items: {
          create: normalized.map((item, index) => ({
            itemId: item.itemId,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            amount: item.amount,
            sortOrder: index,
          })),
        },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        menu: true,
      },
    });

    this.workflowGateway.emitRequestCreated({
      quotationId: created.id,
      quotationNumber: created.quotationNumber,
      customerPhone: created.customerPhone,
      requestStatus: created.requestStatus,
    });

    return created;
  }

  async createPublicRequest(dto: CreateQuotationDto, customerPhone: string) {
    const normalizedPhone = this.normalizePhone(customerPhone);
    const payloadPhone = this.normalizePhone(dto.customerPhone);
    if (payloadPhone && payloadPhone !== normalizedPhone) {
      throw new UnauthorizedException(
        'You can submit requests only for your logged-in phone number',
      );
    }

    const adminUser = await this.prisma.user.findFirst({
      where: {
        role: Role.ADMIN,
        isActive: true,
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!adminUser) {
      throw new BadRequestException(
        'No active admin user available to receive customer requests',
      );
    }

    const created = await this.create(
      {
        ...dto,
        customerPhone: normalizedPhone,
        notes: dto.notes
          ? `${dto.notes}\n\n[Submitted from customer portal]`
          : '[Submitted from customer portal]',
      },
      adminUser.id,
    );

    await this.prisma.quotation.update({
      where: { id: created.id },
      data: {
        source: 'CUSTOMER_PORTAL',
        requestStatus: 'NEW',
        requestStatusUpdatedAt: new Date(),
      },
    });

    const result = await this.findOne(created.id);
    this.workflowGateway.emitRequestCreated({
      quotationId: result.id,
      quotationNumber: result.quotationNumber,
      customerPhone: result.customerPhone,
      requestStatus: result.requestStatus,
    });
    return result;
  }

  async findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { skip, take } = toSkipTake(page, limit);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.quotation.findMany({
        where: { isDeleted: false },
        skip,
        take,
        include: {
          menu: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quotation.count({ where: { isDeleted: false } }),
    ]);

    return {
      data: rows,
      meta: { page, limit, total },
    };
  }

  async findCustomerRequests(query: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { skip, take } = toSkipTake(page, limit);

    const where: Prisma.QuotationWhereInput = {
      isDeleted: false,
      source: 'CUSTOMER_PORTAL',
      ...(query.status
        ? { requestStatus: this.mapPublicRequestStatusToDb(query.status) }
        : {}),
      ...(query.search
        ? {
            OR: [
              { quotationNumber: { contains: query.search, mode: 'insensitive' } },
              { customerName: { contains: query.search, mode: 'insensitive' } },
              { customerPhone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.quotation.findMany({
        where,
        skip,
        take,
        include: {
          menu: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return {
      data: rows,
      meta: { page, limit, total },
    };
  }

  async findOne(id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, isDeleted: false },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            item: {
              include: {
                category: true,
              },
            },
          },
        },
        menu: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    return quotation;
  }

  getTemplates() {
    return this.prisma.quotationTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, dto: UpdateQuotationDto) {
    const existing = await this.findOne(id);

    const itemsInput = dto.items ?? existing.items.map((item) => ({
      itemId: item.itemId ?? undefined,
      name: item.name,
      quantity: Number(item.quantity),
      unit: item.unit ?? undefined,
      unitPrice: Number(item.unitPrice),
    }));

    const normalized = await this.normalizeItems(itemsInput, dto.menuId ?? existing.menuId ?? undefined);

    const totals = this.calculateTotals(normalized, {
      ...dto,
      discountAmount: dto.discountAmount ?? Number(existing.discountAmount),
      extraChargesAmount:
        dto.extraChargesAmount ?? Number(existing.extraChargesAmount),
      gstPercent:
        dto.gstPercent !== undefined
          ? Number(dto.gstPercent)
          : Number(existing.gstPercent),
    });

    await this.prisma.quotationItem.deleteMany({ where: { quotationId: id } });

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerAddress: dto.customerAddress,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
        eventType: dto.eventType,
        venue: dto.venue,
        guestCount: dto.guestCount,
        menuId: dto.menuId,
        notes: dto.notes,
        terms: dto.terms,
        templateStyle: dto.templateStyle,
        discountAmount: totals.discountAmount,
        extraChargesAmount: totals.extraChargesAmount,
        gstPercent: totals.gstPercent,
        subTotal: totals.subTotal,
        gstAmount: totals.gstAmount,
        grandTotal: totals.grandTotal,
        items: {
          create: normalized.map((item, index) => ({
            itemId: item.itemId,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            amount: item.amount,
            sortOrder: index,
          })),
        },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        menu: true,
      },
    });

    this.workflowGateway.emitRequestUpdated({
      quotationId: updated.id,
      quotationNumber: updated.quotationNumber,
      customerPhone: updated.customerPhone,
      requestStatus: updated.requestStatus,
    });

    void this.notifyCustomerByEmail(updated.id, 'QUOTATION_UPDATED');

    return updated;
  }

  async setStatus(id: string, status: QuotationStatus) {
    await this.findOne(id);

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: { status },
    });
    this.workflowGateway.emitQuotationStatusUpdated({
      quotationId: updated.id,
      quotationNumber: updated.quotationNumber,
      customerPhone: updated.customerPhone,
      status: updated.status,
    });

    if (status === QuotationStatus.FINALIZED) {
      void this.notifyCustomerByEmail(updated.id, 'QUOTATION_UPDATED');
    }

    return updated;
  }

  async updateCustomerRequestStatus(id: string, requestStatus: string) {
    const existing = await this.findOne(id);
    if (existing.source !== 'CUSTOMER_PORTAL') {
      throw new BadRequestException(
        'Only customer portal requests can be updated in request queue',
      );
    }

    const mappedRequestStatus = this.mapPublicRequestStatusToDb(requestStatus);

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        requestStatus: mappedRequestStatus,
        requestStatusUpdatedAt: new Date(),
      },
    });
    this.workflowGateway.emitRequestStatusUpdated({
      quotationId: updated.id,
      quotationNumber: updated.quotationNumber,
      customerPhone: updated.customerPhone,
      requestStatus: updated.requestStatus ?? mappedRequestStatus,
    });

    if (mappedRequestStatus === 'QUOTED') {
      void this.notifyCustomerByEmail(updated.id, 'QUOTATION_UPDATED');
    }

    return updated;
  }

  async duplicate(id: string, createdById: string) {
    const quotation = await this.findOne(id);

    const dto: CreateQuotationDto = {
      customerName: quotation.customerName,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress ?? undefined,
      eventDate: quotation.eventDate.toISOString(),
      eventType: quotation.eventType,
      venue: quotation.venue,
      guestCount: quotation.guestCount,
      menuId: quotation.menuId ?? undefined,
      templateStyle: quotation.templateStyle,
      discountAmount: Number(quotation.discountAmount),
      extraChargesAmount: Number(quotation.extraChargesAmount),
      gstPercent: Number(quotation.gstPercent),
      notes: quotation.notes ?? undefined,
      terms: quotation.terms ?? undefined,
      items: quotation.items.map((item) => ({
        itemId: item.itemId ?? undefined,
        name: item.name,
        quantity: Number(item.quantity),
        unit: item.unit ?? undefined,
        unitPrice: Number(item.unitPrice),
      })),
    };

    return this.create(dto, createdById);
  }

  async getPdfData(id: string) {
    const quotation = await this.findOne(id);
    const settings = await this.prisma.setting.findMany();

    return {
      quotation,
      settings,
      generatedAt: new Date().toISOString(),
      print: {
        pageSize: 'A4',
        orientation: 'portrait',
        templateStyle: quotation.templateStyle,
      },
    };
  }

  async getPrintableHtml(id: string) {
    const quotation = await this.findOne(id);
    const company = await this.getCompanyBranding();
    const styles = this.getTemplateStyleCss(quotation.templateStyle);
    const companyLogoMarkup = company.logoUrl
      ? `<img src="${this.escapeHtml(company.logoUrl)}" alt="${this.escapeHtml(company.logoName || company.name)}" style="max-height:54px;max-width:140px;object-fit:contain;" />`
      : this.escapeHtml(company.logoName || 'Logo');
    const rows = quotation.items
      .map(
        (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>${item.unit ?? '-'}</td>
          <td>${item.unitPrice}</td>
          <td>${item.amount}</td>
        </tr>`,
      )
      .join('');

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${quotation.quotationNumber}</title>
${company.faviconUrl ? `<link rel="icon" href="${this.escapeHtml(company.faviconUrl)}" />` : ''}
<style>
  body { font-family: Arial, sans-serif; margin: 30px; color: #222; }
  ${styles}
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #d5d5d5; padding: 8px; text-align: left; font-size: 12px; }
  th { background: #f7f7f7; }
  .summary { margin-top: 14px; text-align: right; }
  .summary p { margin: 4px 0; font-size: 13px; }
  .title { margin-bottom: 14px; }
</style>
</head>
<body class="${quotation.templateStyle}">
  <div class="title">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="min-width:54px;min-height:54px;border:1px solid #d8d8d8;border-radius:10px;padding:4px;display:flex;align-items:center;justify-content:center;">
        ${companyLogoMarkup}
      </div>
      <div>
        <h2 style="margin:0;">${this.escapeHtml(company.legalName || company.name)}</h2>
        <p style="margin:4px 0 0;font-size:12px;color:#555;">${this.escapeHtml(company.website)}</p>
      </div>
    </div>
    <p>Quotation Number: ${quotation.quotationNumber}</p>
  </div>
  <div>
    <p><strong>Customer:</strong> ${quotation.customerName}</p>
    <p><strong>Phone:</strong> ${quotation.customerPhone}</p>
    <p><strong>Event:</strong> ${quotation.eventType} on ${quotation.eventDate.toDateString()}</p>
    <p><strong>Venue:</strong> ${quotation.venue}</p>
    <p><strong>Guests:</strong> ${quotation.guestCount}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th>Qty</th>
        <th>Unit</th>
        <th>Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="summary">
    <p>Sub Total: ${quotation.subTotal}</p>
    <p>Discount: ${quotation.discountAmount}</p>
    <p>Extra Charges: ${quotation.extraChargesAmount}</p>
    <p>GST (${quotation.gstPercent}%): ${quotation.gstAmount}</p>
    <p><strong>Grand Total: ${quotation.grandTotal}</strong></p>
  </div>
  <div style="margin-top: 20px;">
    <p><strong>Notes:</strong> ${quotation.notes ?? '-'}</p>
    <p><strong>Terms:</strong> ${quotation.terms ?? '-'}</p>
  </div>
</body>
</html>`;

    return { html };
  }

  async getAgreementHtml(id: string) {
    const quotation = await this.findOne(id);
    if (quotation.status !== QuotationStatus.FINALIZED) {
      throw new BadRequestException(
        'Agreement can be generated only for finalized quotations',
      );
    }

    const company = await this.getCompanyBranding();
    const companyName = company.name;
    const companyWebsite = company.website;
    const companyContact = company.contact;
    const companyAddress = company.address;
    const companyEmail = company.email;
    const companyLogoName = company.logoName;
    const companyLogoUrl = company.logoUrl;
    const companyFaviconUrl = company.faviconUrl;

    const categoryMap = new Map<
      string,
      Array<{
        name: string;
        quantity: string;
        unit: string;
        unitPrice: string;
        amount: string;
      }>
    >();

    for (const line of quotation.items) {
      const categoryName = line.item?.category?.name ?? 'General';
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, []);
      }
      categoryMap.get(categoryName)?.push({
        name: line.name,
        quantity: Number(line.quantity).toFixed(2),
        unit: line.unit ?? '-',
        unitPrice: Number(line.unitPrice).toFixed(2),
        amount: Number(line.amount).toFixed(2),
      });
    }

    const categorySections = Array.from(categoryMap.entries())
      .map(([category, items]) => {
        const rows = items
          .map(
            (item) => `
          <tr>
            <td>${this.escapeHtml(item.name)}</td>
            <td>${this.escapeHtml(item.quantity)}</td>
            <td>${this.escapeHtml(item.unit)}</td>
            <td style="text-align:right;">₹${this.escapeHtml(item.unitPrice)}</td>
            <td style="text-align:right;">₹${this.escapeHtml(item.amount)}</td>
          </tr>`,
          )
          .join('');

        return `
        <div class="section-block">
          <h4>${this.escapeHtml(category)}</h4>
          <table>
            <thead>
              <tr>
                <th style="width:40%;">Item</th>
                <th style="width:12%;">Qty</th>
                <th style="width:12%;">Unit</th>
                <th style="width:18%; text-align:right;">Rate (₹)</th>
                <th style="width:18%; text-align:right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
      })
      .join('');

    const subtotal = Number(quotation.subTotal);
    const guestCount = Number(quotation.guestCount || 0);
    const ratePerPlate = guestCount > 0 ? subtotal / guestCount : 0;
    const grandTotal = Number(quotation.grandTotal);
    const advanceAmount = 0;
    const balanceAmount = Math.max(grandTotal - advanceAmount, 0);

    const notesHtml = this.escapeHtml(quotation.notes ?? '-').replace(/\n/g, '<br/>');
    const termsFromQuote = quotation.terms
      ? quotation.terms
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => `<li>${this.escapeHtml(line)}</li>`)
          .join('')
      : '';

    const defaultTerms = `
      <li>Booking is confirmed only upon receipt of agreed advance payment.</li>
      <li>Cancellation charges apply based on cancellation timeline from event date.</li>
      <li>Client shall provide uninterrupted venue access, power, water, and service permissions.</li>
      <li>Catering team shall provide menu and service standards as per finalized quotation.</li>
      <li>Any damage to hired equipment/utensils due to client-side handling is chargeable.</li>
      <li>Force majeure events beyond control of both parties shall be handled by mutual discussion.</li>
      <li>Food safety and hygiene will be maintained as per applicable standards and best practices.</li>
      <li>Final guest count must be confirmed at least 48 hours before event time.</li>
      <li>Additional guests beyond confirmed count are chargeable at applicable per plate rate.</li>
      <li>Delayed payments may attract service holdback or late charges as per policy.</li>
    `;

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Service Agreement — ${this.escapeHtml(quotation.quotationNumber)}</title>
  ${companyFaviconUrl ? `<link rel="icon" href="${this.escapeHtml(companyFaviconUrl)}" />` : ''}
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    @page { size: A4; margin: 14mm 16mm; }

    :root {
      --navy:       #0F1B3C;
      --navy-2:     #1A2D5A;
      --navy-light: #E8EDF6;
      --gold:       #B8860B;
      --gold-light: #D4AF37;
      --gold-pale:  #FDF6DC;
      --gold-mid:   #F5E6A3;
      --ink:        #1E293B;
      --muted:      #64748B;
      --line:       #E2E8F0;
      --bg:         #F8FAFC;
      --white:      #FFFFFF;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      font-size: 12.5px;
      line-height: 1.55;
      color: var(--ink);
      background: var(--white);
    }
    .doc { max-width: 210mm; margin: 0 auto; padding: 0; }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, var(--navy) 0%, var(--navy-2) 100%);
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .header-body {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      padding: 20px 22px 16px;
    }
    .brand-row { display: flex; align-items: center; gap: 14px; }
    .logo-wrap {
      width: 56px; height: 56px;
      border-radius: 12px;
      background: rgba(255,255,255,0.12);
      border: 1.5px solid rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; flex-shrink: 0;
      font-size: 10px; font-weight: 800;
      color: #fff; text-transform: uppercase;
      letter-spacing: 1px;
    }
    .logo-wrap img { width: 100%; height: 100%; object-fit: contain; }
    .brand-info h1 {
      font-size: 19px; font-weight: 800;
      color: #fff; letter-spacing: -0.3px;
      margin-bottom: 4px;
    }
    .brand-info p {
      font-size: 11px;
      color: rgba(255,255,255,0.65);
      margin: 1.5px 0;
      line-height: 1.4;
    }
    .brand-info p strong { color: rgba(255,255,255,0.85); font-weight: 500; }
    .header-ref {
      text-align: right;
      flex-shrink: 0;
    }
    .header-ref .ref-label {
      font-size: 10px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 1.5px;
      color: rgba(255,255,255,0.45);
    }
    .header-ref .ref-number {
      font-size: 16px; font-weight: 800;
      color: var(--gold-light);
      margin-top: 2px; letter-spacing: 0.5px;
    }
    .header-ref .ref-date {
      font-size: 11px;
      color: rgba(255,255,255,0.5);
      margin-top: 10px;
    }
    .header-footer {
      background: rgba(255,255,255,0.07);
      border-top: 1px solid rgba(255,255,255,0.1);
      padding: 10px 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-footer .doc-title {
      font-size: 13px; font-weight: 700;
      color: var(--gold-light);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .header-footer .status-pill {
      font-size: 10px; font-weight: 700;
      background: rgba(212,175,55,0.2);
      border: 1px solid rgba(212,175,55,0.4);
      color: var(--gold-light);
      padding: 3px 10px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    /* ── Section heading ── */
    .section { margin-bottom: 18px; }
    .section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1.5px;
      color: var(--navy);
      margin-bottom: 10px;
      padding-bottom: 7px;
      border-bottom: 2px solid var(--gold-mid);
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 4px; height: 14px;
      background: var(--gold);
      border-radius: 2px;
      flex-shrink: 0;
    }

    /* ── Intro ── */
    .intro-box {
      background: var(--bg);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 12.5px;
      color: var(--muted);
      line-height: 1.65;
    }

    /* ── Meta cards ── */
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
    .card {
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
    }
    .card-header {
      background: var(--navy);
      color: #fff;
      padding: 8px 14px;
      font-size: 10.5px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1.2px;
      display: flex; align-items: center; gap: 6px;
    }
    .card-header::before {
      content: '';
      width: 3px; height: 12px;
      background: var(--gold-light);
      border-radius: 2px;
    }
    .card-body { padding: 10px 14px; }
    .info-row {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 4px 10px;
      padding: 5px 0;
      border-bottom: 1px solid var(--line);
      align-items: baseline;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-size: 11px; color: var(--muted); font-weight: 500; }
    .info-value { font-size: 12.5px; font-weight: 600; color: var(--ink); }

    /* ── Tables ── */
    .section-block { margin-bottom: 14px; }
    .section-block h4 {
      font-size: 12px; font-weight: 700;
      color: var(--navy);
      margin-bottom: 6px;
      padding: 5px 10px;
      background: var(--navy-light);
      border-radius: 6px;
      border-left: 3px solid var(--navy);
    }
    table { width: 100%; border-collapse: collapse; border-radius: 10px; overflow: hidden; }
    thead tr th {
      background: var(--navy);
      color: #fff;
      font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.8px;
      padding: 9px 10px;
      text-align: left;
      border: none;
    }
    tbody tr { border-bottom: 1px solid var(--line); }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:nth-child(even) { background: #FAFBFC; }
    td { padding: 8px 10px; font-size: 12px; color: var(--ink); border: none; vertical-align: top; }
    td:last-child { font-weight: 600; }

    /* ── Pricing table ── */
    .pricing-table { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
    .pricing-table tbody tr td { font-size: 12.5px; }
    .pricing-table tbody tr td:last-child { text-align: right; font-weight: 600; }
    .pricing-table .row-total td { background: var(--gold-pale); color: var(--gold); border-top: 1px solid var(--gold-mid); }
    .pricing-table .row-grand td {
      background: var(--navy); color: #fff;
      font-size: 13.5px; font-weight: 800;
    }
    .pricing-table .row-grand td:last-child { color: var(--gold-light); font-size: 14px; }
    .pricing-table .row-balance td { background: var(--bg); color: var(--muted); }

    /* ── Lists ── */
    ul.terms-list { padding-left: 0; list-style: none; }
    ul.terms-list li {
      position: relative;
      padding: 6px 10px 6px 22px;
      font-size: 12px; color: var(--ink);
      border-bottom: 1px solid var(--line);
    }
    ul.terms-list li:last-child { border-bottom: none; }
    ul.terms-list li::before {
      content: '✓';
      position: absolute; left: 6px;
      color: var(--gold); font-weight: 700; font-size: 11px;
    }
    .terms-box { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }

    /* ── Notes ── */
    .notes-box {
      background: var(--bg); border: 1px solid var(--line);
      border-radius: 10px; padding: 12px 14px;
      font-size: 12.5px; color: var(--muted); line-height: 1.65;
    }

    /* ── Declaration ── */
    .declaration {
      background: var(--gold-pale);
      border: 1.5px solid var(--gold-mid);
      border-radius: 12px;
      padding: 14px 18px;
      font-size: 12.5px;
      color: var(--navy);
      line-height: 1.65;
      font-weight: 500;
      text-align: center;
    }

    /* ── Signatures ── */
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 4px;
    }
    .sig-block {
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
    }
    .sig-header {
      background: var(--navy);
      color: #fff;
      padding: 8px 14px;
      font-size: 10.5px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .sig-body { padding: 14px; }
    .sig-line {
      border-top: 1.5px solid var(--navy);
      margin-top: 50px;
      padding-top: 6px;
      font-size: 11px; font-weight: 600;
      color: var(--ink);
    }
    .sig-name { font-size: 12px; color: var(--muted); margin-top: 2px; }
    .seal-area {
      margin-top: 10px;
      border: 1px dashed var(--line);
      border-radius: 8px;
      height: 54px;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; color: var(--muted);
      letter-spacing: 0.5px;
    }
    .sig-date {
      margin-top: 10px;
      font-size: 11.5px; color: var(--muted);
    }

    /* ── Footer ── */
    .doc-footer {
      margin-top: 22px;
      padding-top: 12px;
      border-top: 1px solid var(--line);
      display: flex; justify-content: space-between; align-items: center;
      font-size: 10.5px; color: var(--muted);
    }
    .doc-footer strong { color: var(--navy); }

    .muted { color: var(--muted); }
    @media print { .doc { max-width: 100%; } body { background: #fff; } }
  </style>
</head>
<body>
  <div class="doc">

    <!-- ── Header ── -->
    <div class="header">
      <div class="header-body">
        <div class="brand-row">
          <div class="logo-wrap">${
            companyLogoUrl
              ? `<img src="${this.escapeHtml(companyLogoUrl)}" alt="${this.escapeHtml(companyLogoName || companyName)}" />`
              : this.escapeHtml(companyLogoName?.slice(0, 2).toUpperCase() || 'TE')
          }</div>
          <div class="brand-info">
            <h1>${this.escapeHtml(companyName)}</h1>
            <p><strong>Address:</strong> ${this.escapeHtml(companyAddress)}</p>
            <p><strong>Phone:</strong> ${this.escapeHtml(companyContact)}</p>
            <p><strong>Email:</strong> ${this.escapeHtml(companyEmail)}</p>
            ${companyWebsite ? `<p><strong>Web:</strong> ${this.escapeHtml(companyWebsite)}</p>` : ''}
          </div>
        </div>
        <div class="header-ref">
          <div class="ref-label">Agreement No.</div>
          <div class="ref-number">${this.escapeHtml(quotation.quotationNumber)}</div>
          <div class="ref-date">Date: ${this.escapeHtml(quotation.eventDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))}</div>
        </div>
      </div>
      <div class="header-footer">
        <span class="doc-title">Catering Service Agreement</span>
        <span class="status-pill">Official Document</span>
      </div>
    </div>

    <!-- ── Introduction ── -->
    <div class="section">
      <div class="section-title">Agreement Introduction</div>
      <div class="intro-box">
        This Catering Service Agreement is entered into between <strong>${this.escapeHtml(companyName)}</strong> and the Client mentioned below for the purpose of providing catering and event-related food services for the specified event. Both parties agree to abide by the terms and conditions outlined in this document.
      </div>
    </div>

    <!-- ── Client & Event Details ── -->
    <div class="meta">
      <div class="card">
        <div class="card-header">Client Details</div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">Client Name</span>
            <span class="info-value">${this.escapeHtml(quotation.customerName)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Address</span>
            <span class="info-value">${this.escapeHtml(quotation.customerAddress ?? '—')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Phone</span>
            <span class="info-value">${this.escapeHtml(quotation.customerPhone)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email</span>
            <span class="info-value muted">—</span>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">Event Details</div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">Event Type</span>
            <span class="info-value">${this.escapeHtml(quotation.eventType)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Venue</span>
            <span class="info-value">${this.escapeHtml(quotation.venue)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Event Date</span>
            <span class="info-value">${this.escapeHtml(quotation.eventDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }))}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Guest Count</span>
            <span class="info-value">${this.escapeHtml(String(quotation.guestCount))} guests</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Menu Details ── -->
    <div class="section">
      <div class="section-title">Menu Details</div>
      ${categorySections || '<div class="notes-box muted">No menu items recorded.</div>'}
    </div>

    <!-- ── Pricing Summary ── -->
    <div class="section">
      <div class="section-title">Pricing Summary</div>
      <table class="pricing-table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align:right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Rate Per Plate</td><td style="text-align:right;">₹${ratePerPlate.toFixed(2)}</td></tr>
          <tr><td>Guest Count</td><td style="text-align:right;">${this.escapeHtml(String(quotation.guestCount))}</td></tr>
          <tr><td>Subtotal</td><td style="text-align:right;">₹${Number(quotation.subTotal).toFixed(2)}</td></tr>
          <tr><td>Addons / Additional Charges</td><td style="text-align:right;">+ ₹${Number(quotation.extraChargesAmount).toFixed(2)}</td></tr>
          <tr><td>Discount</td><td style="text-align:right;">− ₹${Number(quotation.discountAmount).toFixed(2)}</td></tr>
          <tr class="row-total"><td>Taxable Amount</td><td style="text-align:right;">₹${(Number(quotation.subTotal) + Number(quotation.extraChargesAmount) - Number(quotation.discountAmount)).toFixed(2)}</td></tr>
          <tr><td>GST (${Number(quotation.gstPercent).toFixed(2)}%)</td><td style="text-align:right;">₹${Number(quotation.gstAmount).toFixed(2)}</td></tr>
          <tr class="row-grand"><td>Grand Total</td><td style="text-align:right;">₹${Number(quotation.grandTotal).toFixed(2)}</td></tr>
          <tr class="row-balance"><td>Advance Paid</td><td style="text-align:right;">₹${advanceAmount.toFixed(2)}</td></tr>
          <tr class="row-balance"><td>Balance Due</td><td style="text-align:right; font-weight:700; color:#0F1B3C;">₹${balanceAmount.toFixed(2)}</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ── Payment Terms ── -->
    <div class="section">
      <div class="section-title">Payment Terms</div>
      <div class="terms-box">
        <ul class="terms-list">
          <li>Advance payment is required to confirm booking and resource allocation.</li>
          <li>Balance amount shall be paid on or before event day before service commencement.</li>
          <li>Accepted modes: UPI, Bank Transfer, and Cash (as permitted under applicable law).</li>
        </ul>
      </div>
    </div>

    <!-- ── Terms & Conditions ── -->
    <div class="section">
      <div class="section-title">Terms &amp; Conditions</div>
      <div class="terms-box">
        <ul class="terms-list">
          ${defaultTerms}
          ${termsFromQuote}
        </ul>
      </div>
    </div>

    <!-- ── Notes ── -->
    ${quotation.notes ? `
    <div class="section">
      <div class="section-title">Notes</div>
      <div class="notes-box">${notesHtml}</div>
    </div>` : ''}

    <!-- ── Declaration ── -->
    <div class="section">
      <div class="declaration">
        Both parties confirm that they have read, understood, and agreed to all the terms and conditions mentioned in this agreement.
        This document constitutes the final and binding Service Agreement between <strong>${this.escapeHtml(companyName)}</strong> and <strong>${this.escapeHtml(quotation.customerName)}</strong>.
      </div>
    </div>

    <!-- ── Signatures ── -->
    <div class="section">
      <div class="section-title">Signatures</div>
      <div class="signatures">
        <div class="sig-block">
          <div class="sig-header">Authorized Signatory</div>
          <div class="sig-body">
            <div class="sig-line">Signature</div>
            <div class="sig-name">${this.escapeHtml(companyName)}</div>
            <div class="seal-area">Official Seal</div>
          </div>
        </div>
        <div class="sig-block">
          <div class="sig-header">Client Acknowledgement</div>
          <div class="sig-body">
            <div class="sig-line">Signature</div>
            <div class="sig-name">${this.escapeHtml(quotation.customerName)}</div>
            <div class="sig-date">Date: ____________________</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Footer ── -->
    <div class="doc-footer">
      <span>Generated by <strong>${this.escapeHtml(companyName)}</strong></span>
      <span>Agreement No: <strong>${this.escapeHtml(quotation.quotationNumber)}</strong></span>
      <span>Confidential Document</span>
    </div>

  </div>
</body>
</html>`;

    return { html };
  }

  async initiateAgreement(id: string) {
    const quotation = await this.findOne(id);
    if (
      quotation.source === 'CUSTOMER_PORTAL' &&
      quotation.requestStatus !== CustomerRequestStatus.CONVERTED
    ) {
      throw new BadRequestException(
        'Agreement can be generated only after customer accepts the quoted request',
      );
    }
    if (
      quotation.status !== QuotationStatus.FINALIZED &&
      quotation.source !== 'CUSTOMER_PORTAL'
    ) {
      throw new BadRequestException(
        'Agreement can be initiated only for finalized quotations',
      );
    }

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.FINALIZED,
        agreementStatus: AgreementStatus.INITIATED,
        agreementRejectReason: null,
        agreementAcceptedAt: null,
        agreementUpdatedAt: new Date(),
      },
      select: {
        id: true,
        quotationNumber: true,
        customerPhone: true,
        status: true,
      },
    });

    if (quotation.status !== QuotationStatus.FINALIZED) {
      this.workflowGateway.emitQuotationStatusUpdated({
        quotationId: updated.id,
        quotationNumber: updated.quotationNumber,
        customerPhone: updated.customerPhone,
        status: updated.status,
      });
    }

    this.workflowGateway.emitAgreementInitiated({
      quotationId: updated.id,
      quotationNumber: updated.quotationNumber,
      customerPhone: updated.customerPhone,
    });

    void this.notifyCustomerByEmail(updated.id, 'AGREEMENT_INITIATED');

    return {
      message: 'Agreement initiated successfully',
      quotationId: updated.id,
      quotationNumber: updated.quotationNumber,
      agreementStatus: AgreementStatus.INITIATED,
    };
  }

  async requestCustomerOtp(phone: string) {
    const normalizedPhone = this.normalizePhone(phone);
    if (!/^\d{10}$/.test(normalizedPhone)) {
      throw new BadRequestException('Valid phone number is required');
    }

    await this.ensureNoAdminCustomerCredentialConflict(normalizedPhone);
    const existingCustomer = await this.isKnownPortalCustomer(normalizedPhone);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Dispatch OTP via MSG91 Widget Platform
    const msg91Result = await this.msg91.sendWidgetOtp(normalizedPhone);

    let codeHash: string;
    let fallbackDevCode: string | undefined;

    if (msg91Result.success && msg91Result.reqId) {
      codeHash = `msg91:${msg91Result.reqId}`;
      this.logger.log(`MSG91 OTP requested for ${normalizedPhone}, reqId=${msg91Result.reqId}`);
    } else {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      fallbackDevCode = code;
      codeHash = await this.hashOtp(code);
      this.logger.warn(`MSG91 offline or fallback. Local code generated for ${normalizedPhone}: ${code}`);
    }

    await this.prisma.customerPortalOtp.create({
      data: {
        phone: normalizedPhone,
        codeHash,
        expiresAt,
      },
    });

    return {
      message: 'OTP sent successfully',
      existingCustomer,
      ...(fallbackDevCode && process.env.NODE_ENV !== 'production' ? { otp: fallbackDevCode } : {}),
    };
  }

  async resendCustomerOtp(phone: string, channel?: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const latestOtp = await this.prisma.customerPortalOtp.findFirst({
      where: {
        phone: normalizedPhone,
        verifiedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestOtp && latestOtp.codeHash.startsWith('msg91:')) {
      const reqId = latestOtp.codeHash.replace('msg91:', '');
      const retryRes = await this.msg91.retryWidgetOtp(reqId, channel);
      if (retryRes.success) {
        return { message: 'OTP resent successfully via MSG91' };
      }
    }

    return this.requestCustomerOtp(phone);
  }

  async verifyCustomerOtp(
    phone: string,
    otp: string,
    name?: string,
    email?: string,
    msg91Token?: string,
  ) {
    const normalizedPhone = this.normalizePhone(phone);
    if (!/^\d{10}$/.test(normalizedPhone)) {
      throw new BadRequestException('Valid phone number is required');
    }

    await this.ensureNoAdminCustomerCredentialConflict(normalizedPhone, email);
    const existingCustomer = await this.isKnownPortalCustomer(normalizedPhone);

    if (!existingCustomer && !name?.trim()) {
      throw new BadRequestException('Name is required for new customer');
    }

    let isVerified = false;
    if (msg91Token) {
      const msg91Valid = await this.msg91.verifyWidgetAccessToken(msg91Token);
      if (msg91Valid) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      const latestOtp = await this.prisma.customerPortalOtp.findFirst({
        where: {
          phone: normalizedPhone,
          verifiedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!latestOtp || latestOtp.expiresAt <= new Date()) {
        throw new UnauthorizedException('OTP expired or invalid');
      }

      if (latestOtp.codeHash.startsWith('msg91:')) {
        const reqId = latestOtp.codeHash.replace('msg91:', '');
        const msg91Matched = await this.msg91.verifyWidgetOtp(reqId, otp);
        if (!msg91Matched) {
          await this.prisma.customerPortalOtp.update({
            where: { id: latestOtp.id },
            data: { attempts: { increment: 1 } },
          });
          throw new UnauthorizedException('Invalid OTP');
        }
      } else {
        const matched = await this.compareOtp(otp, latestOtp.codeHash);
        if (!matched) {
          await this.prisma.customerPortalOtp.update({
            where: { id: latestOtp.id },
            data: { attempts: { increment: 1 } },
          });
          throw new UnauthorizedException('OTP expired or invalid');
        }
      }

      await this.prisma.customerPortalOtp.update({
        where: { id: latestOtp.id },
        data: { verifiedAt: new Date() },
      });
    } else {
      await this.prisma.customerPortalOtp.updateMany({
        where: {
          phone: normalizedPhone,
          verifiedAt: null,
        },
        data: { verifiedAt: new Date() },
      });
    }

    const secret =
      this.configService.get<string>('CUSTOMER_PORTAL_JWT_SECRET') ??
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const expiresIn =
      this.configService.get<string>('CUSTOMER_PORTAL_JWT_EXPIRES') ?? '7d';

    const accessToken = await this.jwtService.signAsync(
      {
        phone: normalizedPhone,
        type: 'customer_portal',
      },
      {
        secret,
        expiresIn: expiresIn as any,
      },
    );

    const pendingOtpRequests = await this.prisma.quotation.findMany({
      where: {
        customerPhone: normalizedPhone,
        source: 'CUSTOMER_PORTAL',
        isDeleted: false,
        requestStatus: { in: ['NEW', 'CONTACTED'] as any },
      },
      select: {
        id: true,
        quotationNumber: true,
        customerPhone: true,
      },
    });

    if (pendingOtpRequests.length > 0) {
      await this.prisma.quotation.updateMany({
        where: {
          id: { in: pendingOtpRequests.map((item) => item.id) },
        },
        data: {
          requestStatus: 'OTP_VERIFIED',
          requestStatusUpdatedAt: new Date(),
        },
      });
      for (const request of pendingOtpRequests) {
        this.workflowGateway.emitRequestStatusUpdated({
          quotationId: request.id,
          quotationNumber: request.quotationNumber,
          customerPhone: request.customerPhone,
          requestStatus: 'OTP_VERIFIED',
        });
      }
    }

    this.workflowGateway.emitCustomerOtpVerified({
      customerPhone: normalizedPhone,
      existingCustomer,
    });

    const resolvedCustomerName =
      name?.trim() || (await this.findMostRecentCustomerName(normalizedPhone)) || null;

    return {
      accessToken,
      phone: normalizedPhone,
      existingCustomer,
      customerName: resolvedCustomerName,
      customerEmail: email?.trim() || null,
    };
  }

  async getPublicWebsiteContent() {
    const [gallery, reviews, companySetting] = await this.prisma.$transaction([
      this.prisma.media.findMany({
        where: { isWebsiteGallery: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          url: true,
          thumbnailUrl: true,
          isFeatured: true,
          createdAt: true,
        },
      }),
      this.prisma.websiteReview.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          clientName: true,
          title: true,
          testimonial: true,
          rating: true,
          mediaUrl: true,
          mediaType: true,
          isFeatured: true,
        },
      }),
      this.prisma.setting.findUnique({
        where: { key: 'company' },
        select: { value: true },
      }),
    ]);

    const company = this.normalizeCompanySetting(
      (companySetting?.value as Record<string, unknown> | null) ?? null,
    );
    return {
      company: {
        app: company.app,
        name: company.name,
        legalName: company.legalName,
        logoName: company.logoName,
        logoUrl: company.logoUrl,
        faviconUrl: company.faviconUrl,
        tagline: company.tagline,
        website: company.website,
        contact: company.contact,
        altContact: company.altContact,
        email: company.email,
        gstNumber: company.gstNumber,
        address: company.address,
      },
      gallery,
      reviews,
    };
  }

  async getMyPortalQuotations(phone: string) {
    const normalizedPhone = this.normalizePhone(phone);
    return this.prisma.quotation.findMany({
      where: {
        OR: this.buildPortalPhoneWhere(normalizedPhone),
        source: 'CUSTOMER_PORTAL',
        isDeleted: false,
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            item: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyPortalQuotationById(phone: string, id: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const quotation = await this.prisma.quotation.findFirst({
      where: {
        id,
        OR: this.buildPortalPhoneWhere(normalizedPhone),
        source: 'CUSTOMER_PORTAL',
        isDeleted: false,
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            item: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    return quotation;
  }

  async updateMyPortalQuotation(phone: string, id: string, dto: CreateQuotationDto) {
    const quotation = await this.getMyPortalQuotationById(phone, id);
    const requestStatus = (quotation.requestStatus ?? 'NEW').toUpperCase();
    if (!['NEW', 'OTP_VERIFIED'].includes(requestStatus)) {
      throw new BadRequestException(
        'This quotation can no longer be edited as it is already under review',
      );
    }
    const updated = await this.update(id, dto);
    this.workflowGateway.emitRequestUpdated({
      quotationId: updated.id,
      quotationNumber: updated.quotationNumber,
      customerPhone: updated.customerPhone,
      requestStatus: updated.requestStatus,
    });
    return updated;
  }

  async respondMyPortalQuotation(
    phone: string,
    id: string,
    action: 'ACCEPT' | 'DECLINE' | 'INTERESTED',
    reason?: string,
  ) {
    const quotation = await this.getMyPortalQuotationById(phone, id);
    if ((quotation.requestStatus ?? 'NEW') !== CustomerRequestStatus.QUOTED) {
      throw new BadRequestException(
        'Customer response is allowed only after admin marks it as quoted',
      );
    }

    const trimmedReason = reason?.trim() || '';
    if (action === 'DECLINE' && !trimmedReason) {
      throw new BadRequestException('Reason is mandatory when declining');
    }

    const nextStatus =
      action === 'ACCEPT'
        ? CustomerRequestStatus.CONVERTED
        : action === 'DECLINE'
          ? CustomerRequestStatus.CLOSED_REJECTED
          : CustomerRequestStatus.CONTACTED;

    const nextNotes = this.buildCustomerResponseNotes(
      quotation.notes ?? '',
      action,
      trimmedReason,
    );

    const updated = await this.prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        requestStatus: nextStatus,
        requestStatusUpdatedAt: new Date(),
        notes: nextNotes,
      },
      select: {
        id: true,
        quotationNumber: true,
        customerPhone: true,
        requestStatus: true,
      },
    });

    this.workflowGateway.emitRequestStatusUpdated({
      quotationId: updated.id,
      quotationNumber: updated.quotationNumber,
      customerPhone: updated.customerPhone,
      requestStatus: updated.requestStatus ?? nextStatus,
    });

    if (action === 'INTERESTED') {
      this.workflowGateway.emitCustomerInterested({
        quotationId: updated.id,
        quotationNumber: updated.quotationNumber,
        customerPhone: updated.customerPhone,
        reason: trimmedReason || undefined,
      });
    }

    return {
      message:
        action === 'ACCEPT'
          ? 'Quote accepted successfully'
          : action === 'DECLINE'
            ? 'Quote declined'
            : 'Marked as interested. Admin will contact you shortly',
      requestStatus: updated.requestStatus,
      adminContact:
        action === 'INTERESTED'
          ? await this.getAdminContactSummary()
          : undefined,
    };
  }

  async getMyPortalAgreementHtml(phone: string, id: string) {
    const quotation = await this.getMyPortalQuotationById(phone, id);
    if (quotation.status !== QuotationStatus.FINALIZED) {
      throw new BadRequestException(
        'Agreement will be available after quotation finalization',
      );
    }
    if (quotation.agreementStatus === AgreementStatus.NOT_INITIATED) {
      throw new BadRequestException(
        'Agreement has not been initiated by admin yet',
      );
    }
    return this.getAgreementHtml(id);
  }

  async acceptMyPortalAgreement(phone: string, id: string) {
    const quotation = await this.getMyPortalQuotationById(phone, id);
    if (quotation.status !== QuotationStatus.FINALIZED) {
      throw new BadRequestException(
        'Only finalized quotations can be accepted as agreement',
      );
    }
    if (quotation.agreementStatus === AgreementStatus.NOT_INITIATED) {
      throw new BadRequestException(
        'Agreement has not been initiated by admin yet',
      );
    }

    const updated = await this.prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        agreementStatus: AgreementStatus.ACCEPTED,
        agreementRejectReason: null,
        agreementAcceptedAt: new Date(),
        agreementUpdatedAt: new Date(),
      },
      select: {
        id: true,
        quotationNumber: true,
        customerPhone: true,
      },
    });

    this.workflowGateway.emitAgreementFeedback({
      quotationId: updated.id,
      quotationNumber: updated.quotationNumber,
      customerPhone: updated.customerPhone,
      status: 'ACCEPTED',
    });

    void this.notifyCustomerByEmail(updated.id, 'AGREEMENT_ACCEPTED');

    return {
      message: 'Agreement accepted successfully',
      agreementStatus: AgreementStatus.ACCEPTED,
    };
  }

  async rejectMyPortalAgreement(phone: string, id: string, reason: string) {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const quotation = await this.getMyPortalQuotationById(phone, id);
    if (quotation.status !== QuotationStatus.FINALIZED) {
      throw new BadRequestException(
        'Only finalized quotations can be reviewed for agreement',
      );
    }
    if (quotation.agreementStatus === AgreementStatus.NOT_INITIATED) {
      throw new BadRequestException(
        'Agreement has not been initiated by admin yet',
      );
    }

    const updated = await this.prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        agreementStatus: AgreementStatus.REJECTED,
        agreementRejectReason: trimmedReason,
        agreementAcceptedAt: null,
        agreementUpdatedAt: new Date(),
      },
      select: {
        id: true,
        quotationNumber: true,
        customerPhone: true,
      },
    });

    this.workflowGateway.emitAgreementFeedback({
      quotationId: updated.id,
      quotationNumber: updated.quotationNumber,
      customerPhone: updated.customerPhone,
      status: 'REJECTED',
      reason: trimmedReason,
    });

    return {
      message: 'Agreement sent back for correction',
      agreementStatus: AgreementStatus.REJECTED,
    };
  }

  async remove(id: string) {
    const quotation = await this.findOne(id);

    await this.prisma.quotation.update({
      where: { id },
      data: { isDeleted: true },
    });

    this.workflowGateway.emitRequestUpdated({
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      customerPhone: quotation.customerPhone,
      requestStatus: 'DELETED',
    });

    return { message: 'Quotation deleted' };
  }

  private async normalizeItems(items: QuotationLineDto[], menuId?: string) {
    const resolvedItems = [...items];

    if (menuId) {
      const menu = await this.prisma.menu.findUnique({
        where: { id: menuId },
        include: {
          menuItems: {
            include: { item: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      if (!menu) {
        throw new BadRequestException('Invalid menu selected');
      }

      const existingItemIds = new Set(resolvedItems.map((i) => i.itemId).filter(Boolean));
      for (const menuItem of menu.menuItems) {
        if (!existingItemIds.has(menuItem.itemId)) {
          resolvedItems.push({
            itemId: menuItem.itemId,
            name: menuItem.item.name,
            quantity: 1,
            unit: menuItem.item.unit ?? undefined,
            unitPrice: Number(menuItem.item.basePrice),
          });
        }
      }
    }

    return resolvedItems.map((item) => {
      const quantity = Number(item.quantity ?? 0);
      const unitPrice = Number(item.unitPrice ?? 0);
      return {
        itemId: item.itemId,
        name: item.name,
        quantity,
        unit: item.unit,
        unitPrice,
        amount: quantity * unitPrice,
      };
    });
  }

  private calculateTotals(
    items: Array<{ amount: number }>,
    dto: {
      discountAmount?: number;
      extraChargesAmount?: number;
      gstPercent?: number;
    },
  ) {
    const subTotal = items.reduce((sum, item) => sum + item.amount, 0);
    const discountAmount = dto.discountAmount ?? 0;
    const extraChargesAmount = dto.extraChargesAmount ?? 0;
    const rawGst =
      dto.gstPercent !== undefined
        ? Number(dto.gstPercent)
        : Number(process.env.GST_PERCENT_DEFAULT ?? 5);
    const gstPercent = Math.max(Number.isFinite(rawGst) ? rawGst : 0, 0);

    const taxable = Math.max(subTotal - discountAmount + extraChargesAmount, 0);
    const gstAmount = gstPercent > 0 ? (taxable * gstPercent) / 100 : 0;
    const grandTotal = taxable + gstAmount;

    return {
      subTotal: this.toDecimal(subTotal),
      discountAmount: this.toDecimal(discountAmount),
      extraChargesAmount: this.toDecimal(extraChargesAmount),
      gstPercent: this.toDecimal(gstPercent),
      gstAmount: this.toDecimal(gstAmount),
      grandTotal: this.toDecimal(grandTotal),
    };
  }

  private mapPublicRequestStatusToDb(status: string): CustomerRequestStatus {
    const normalized = status.trim().toUpperCase();
    const map: Record<string, CustomerRequestStatus> = {
      REQUESTED: CustomerRequestStatus.NEW,
      UNDER_REVIEW: CustomerRequestStatus.CONTACTED,
      REVIEWING: CustomerRequestStatus.CONTACTED,
      QUOTED: CustomerRequestStatus.QUOTED,
      ACCEPTED: CustomerRequestStatus.CONVERTED,
      DECLINED: CustomerRequestStatus.CLOSED_REJECTED,
      CONTACTED: CustomerRequestStatus.CONTACTED,
      FINALIZED: CustomerRequestStatus.CONVERTED,
      REJECTED: CustomerRequestStatus.CLOSED_REJECTED,
      NEW: CustomerRequestStatus.NEW,
      OTP_VERIFIED: CustomerRequestStatus.OTP_VERIFIED,
      CONVERTED: CustomerRequestStatus.CONVERTED,
      CLOSED_REJECTED: CustomerRequestStatus.CLOSED_REJECTED,
    };

    const resolved = map[normalized];
    if (!resolved) {
      throw new BadRequestException(`Invalid request status: ${status}`);
    }
    return resolved;
  }

  private buildCustomerResponseNotes(
    existingNotes: string,
    action: 'ACCEPT' | 'DECLINE' | 'INTERESTED',
    reason?: string,
  ) {
    const lines = existingNotes
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line && !line.includes(this.customerInterestedTag));

    if (action === 'INTERESTED') {
      lines.push(
        `${this.customerInterestedTag} ${new Date().toISOString()}${reason ? ` - ${reason}` : ''}`,
      );
      return lines.join('\n');
    }

    if (reason) {
      lines.push(
        `[CUSTOMER_${action}] ${new Date().toISOString()} - ${reason}`,
      );
    }
    return lines.join('\n');
  }

  private async getAdminContactSummary() {
    const companySetting = await this.prisma.setting.findUnique({
      where: { key: 'company' },
      select: { value: true },
    });
    const company = (companySetting?.value as Record<string, unknown> | null) ?? {};

    const firstAdmin = await this.prisma.user.findFirst({
      where: {
        role: Role.ADMIN,
        isActive: true,
      },
      select: {
        name: true,
        phone: true,
        email: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      name: String(company.name ?? firstAdmin?.name ?? 'Admin Team'),
      phone: String(company.contact ?? firstAdmin?.phone ?? ''),
      email: String(company.email ?? firstAdmin?.email ?? ''),
    };
  }

  private async getCompanyBranding() {
    const companySetting = await this.prisma.setting.findUnique({
      where: { key: 'company' },
      select: { value: true },
    });
    return this.normalizeCompanySetting(
      (companySetting?.value as Record<string, unknown> | null) ?? null,
    );
  }

  private normalizeCompanySetting(raw: Record<string, unknown> | null) {
    const app = this.resolveCompanyAppUrl(
      String(raw?.app ?? 'https://thankamevents.in/admin'),
    );
    const name = String(raw?.name ?? 'Thankam Events');
    const legalName = String(raw?.legalName ?? name);
    const logoName = String(raw?.logoName ?? 'Logo');
    const website = String(raw?.website ?? 'https://thankamevents.in');
    const contact = String(raw?.contact ?? '+91');
    const altContact = String(raw?.altContact ?? '');
    const email = String(raw?.email ?? 'info@thankamevents.in');
    const address = String(raw?.address ?? 'Kerala, India');
    const gstNumber = String(raw?.gstNumber ?? '');
    const tagline = String(raw?.tagline ?? 'Celebrations Crafted');
    const logoUrl = this.resolveCompanyAssetUrl(String(raw?.logoUrl ?? ''), website);
    const faviconUrl = this.resolveCompanyAssetUrl(
      String(raw?.faviconUrl ?? ''),
      website,
    );
    return {
      app,
      name,
      legalName,
      logoName,
      logoUrl,
      faviconUrl,
      tagline,
      website,
      contact,
      altContact,
      email,
      gstNumber,
      address,
    };
  }

  private resolveCompanyAssetUrl(url: string, website: string) {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (!trimmed.startsWith('/')) return trimmed;
    try {
      const origin = new URL(website).origin;
      return `${origin}${trimmed}`;
    } catch {
      return trimmed;
    }
  }

  private resolveCompanyAppUrl(url: string) {
    const trimmed = url.trim();
    if (!trimmed || trimmed === 'https://app.thankamevents.in') {
      return 'https://thankamevents.in/admin';
    }
    return trimmed;
  }

  private async generateQuotationNumber() {
    const year = new Date().getFullYear();
    const prefix = `Q-${year}-`;
    const count = await this.prisma.quotation.count({
      where: { quotationNumber: { startsWith: prefix } },
    });

    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private toDecimal(value: number): Prisma.Decimal {
    return new Prisma.Decimal(Number(value.toFixed(2)));
  }

  private normalizePhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  private async isKnownPortalCustomer(phone: string) {
    const existing = await this.prisma.quotation.count({
      where: {
        OR: this.buildPortalPhoneWhere(phone),
        isDeleted: false,
      },
    });
    return existing > 0;
  }

  private buildPortalPhoneWhere(phone: string): Prisma.QuotationWhereInput[] {
    return [{ customerPhone: phone }, { customerPhone: { endsWith: phone } }];
  }

  private async findMostRecentCustomerName(phone: string) {
    const row = await this.prisma.quotation.findFirst({
      where: {
        OR: this.buildPortalPhoneWhere(phone),
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      select: { customerName: true },
    });
    return row?.customerName?.trim() || '';
  }

  private async ensureNoAdminCustomerCredentialConflict(
    phone: string,
    email?: string,
  ) {
    // Allow admin/staff phone numbers to access customer portal for testing & inquiries
    const trimmedEmail = email?.trim();
    if (!trimmedEmail) return;

    const emailConflict = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: trimmedEmail,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });
    if (emailConflict) {
      this.logger.log(`Customer email ${trimmedEmail} matches an existing staff account.`);
    }
  }

  private async hashOtp(otp: string) {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(otp, 10);
  }

  private async compareOtp(rawOtp: string, hash: string) {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(rawOtp, hash);
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getTemplateStyleCss(style: string) {
    const map: Record<string, string> = {
      MODERN_MINIMAL: `.MODERN_MINIMAL h2 { font-weight: 700; color: #0f172a; }`,
      PREMIUM_GOLD: `.PREMIUM_GOLD h2 { color: #8a6c2f; } .PREMIUM_GOLD th { background: #f3e8c8; }`,
      TRADITIONAL_KERALA: `.TRADITIONAL_KERALA h2 { color: #7c2d12; } .TRADITIONAL_KERALA th { background: #fde68a; }`,
      ELEGANT_CORPORATE: `.ELEGANT_CORPORATE h2 { color: #1d4ed8; } .ELEGANT_CORPORATE th { background: #dbeafe; }`,
      CLEAN_SIMPLE: `.CLEAN_SIMPLE h2 { color: #334155; }`,
    };

    return map[style] ?? map.CLEAN_SIMPLE;
  }

  // ─── PDF Stream Exporters ───────────────────────────────────────────────────

  async generatePdfStream(id: string, type: 'QUOTATION' | 'AGREEMENT') {
    const quotation = await this.findOne(id);
    const company = await this.getCompanyBranding();

    if (type === 'AGREEMENT') {
      const buffer = await this.pdfService.generateAgreementPdf(quotation, company);
      return { buffer, filename: `Agreement-${quotation.quotationNumber}.pdf` };
    }
    const buffer = await this.pdfService.generateQuotationPdf(quotation, company);
    return { buffer, filename: `Quotation-${quotation.quotationNumber}.pdf` };
  }

  async generatePortalPdfStream(phone: string, id: string, type: 'QUOTATION' | 'AGREEMENT') {
    const quotation = await this.getMyPortalQuotationById(phone, id);
    const company = await this.getCompanyBranding();

    if (type === 'AGREEMENT') {
      const buffer = await this.pdfService.generateAgreementPdf(quotation, company);
      return { buffer, filename: `Agreement-${quotation.quotationNumber}.pdf` };
    }
    const buffer = await this.pdfService.generateQuotationPdf(quotation, company);
    return { buffer, filename: `Quotation-${quotation.quotationNumber}.pdf` };
  }

  // ─── Customer Email Notifications ───────────────────────────────────────────

  private extractCustomerEmail(notes?: string | null, address?: string | null): string | null {
    const text = `${notes || ''} ${address || ''}`;
    const tagMatch = text.match(/\[(?:Email|Customer Email|Mail):\s*([^\]\s]+)\]/i);
    if (tagMatch && tagMatch[1]) return tagMatch[1].trim();

    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const rawMatch = text.match(emailRegex);
    return rawMatch ? rawMatch[1].trim() : null;
  }

  async notifyCustomerByEmail(
    quotationId: string,
    eventType: 'QUOTATION_UPDATED' | 'AGREEMENT_INITIATED' | 'AGREEMENT_ACCEPTED' | 'QUOTATION_CREATED',
  ) {
    try {
      const quotation = await this.prisma.quotation.findUnique({
        where: { id: quotationId },
        include: { items: true, menu: true },
      });
      if (!quotation) return;

      const customerEmail = this.extractCustomerEmail(quotation.notes, quotation.customerAddress);
      if (!customerEmail) {
        this.logger.log(`No email found for quotation ${quotation.quotationNumber}, skipping email notification.`);
        return;
      }

      const company = await this.getCompanyBranding();
      const customerName = quotation.customerName || 'Valued Customer';
      const eventDateStr = quotation.eventDate
        ? new Date(quotation.eventDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : 'To Be Confirmed';

      const grandTotalStr = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(Number(quotation.grandTotal || 0));

      let subject = `Quotation #${quotation.quotationNumber} — Thankam Events`;
      let title = 'Quotation Update';
      let message = 'Your catering proposal has been updated. Please find the attached official PDF for details.';
      let portalUrl = 'https://thankamevents.in/customer/track';
      let buttonText = 'Review Proposal Online';
      let pdfBuffer: Buffer;
      let pdfFilename = `Quotation-${quotation.quotationNumber}.pdf`;

      if (eventType === 'AGREEMENT_INITIATED') {
        subject = `Catering Service Agreement #${quotation.quotationNumber} — Action Required`;
        title = 'Catering Service Agreement Ready';
        message = 'Thank you for choosing Thankam Events! Your banquet catering agreement is now ready for your digital review and formal acceptance.';
        portalUrl = 'https://thankamevents.in/customer/agreement';
        buttonText = 'Review & Accept Agreement';
        pdfBuffer = await this.pdfService.generateAgreementPdf(quotation, company);
        pdfFilename = `Agreement-${quotation.quotationNumber}.pdf`;
      } else if (eventType === 'AGREEMENT_ACCEPTED') {
        subject = `Confirmed: Catering Agreement Locked #${quotation.quotationNumber} — Thankam Events`;
        title = 'Booking Confirmed & Agreement Locked';
        message = 'We have received your acceptance of the catering agreement. Your event booking is officially locked in our catering calendar.';
        portalUrl = 'https://thankamevents.in/customer/agreement';
        buttonText = 'View Locked Agreement';
        pdfBuffer = await this.pdfService.generateAgreementPdf(quotation, company);
        pdfFilename = `Signed-Agreement-${quotation.quotationNumber}.pdf`;
      } else {
        pdfBuffer = await this.pdfService.generateQuotationPdf(quotation, company);
      }

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thankam Events</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center">
        <!-- Master Card Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
          
          <!-- Brand Gold Bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #F3CA52, #E0A926, #B8860B); height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header Section with Official Logo -->
          <tr>
            <td align="center" style="background-color: #0A1128; padding: 36px 24px 30px; text-align: center;">
              <!-- Logo Container -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 16px;">
                <tr>
                  <td align="center" style="background-color: #ffffff; padding: 6px; border-radius: 18px; border: 2px solid #F3CA52; box-shadow: 0 4px 14px rgba(0,0,0,0.3);">
                    <img src="https://thankamevents.in/assets/img/Thankam_Logo.png" alt="Thankam Events Logo" width="76" height="76" style="display: block; border-radius: 12px; object-fit: contain;" />
                  </td>
                </tr>
              </table>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">THANKAM EVENTS</h1>
              <p style="margin: 6px 0 0; color: #F3CA52; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">PREMIER WEDDING, RECEPTION &amp; BANQUET CATERING</p>
              <p style="margin: 4px 0 0; color: #94A3B8; font-size: 11px;">Central Kitchen, Kollam • Serving All 14 Districts of Kerala</p>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 32px 28px 20px;">
              <!-- Status Pill Badge -->
              <div style="display: inline-block; background-color: #FEF3C7; border: 1px solid #FDE68A; color: #92400E; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 20px;">
                ✦ ${title}
              </div>

              <div style="font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 10px;">
                Dear ${customerName},
              </div>

              <div style="font-size: 14px; line-height: 1.65; color: #475569; margin-bottom: 26px;">
                ${message}
              </div>

              <!-- Banquet Details Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; overflow: hidden; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px 20px; background-color: #F1F5F9; border-bottom: 1px solid #E2E8F0;">
                    <span style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 1px;">Event &amp; Booking Specifications</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748B; font-weight: 500;">Reference Number:</td>
                        <td align="right" style="padding: 7px 0; font-size: 13px; color: #0F172A; font-weight: 700; font-family: monospace;">${quotation.quotationNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748B; font-weight: 500; border-top: 1px dashed #E2E8F0;">Event Date:</td>
                        <td align="right" style="padding: 7px 0; font-size: 13px; color: #0F172A; font-weight: 700; border-top: 1px dashed #E2E8F0;">${eventDateStr}</td>
                      </tr>
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748B; font-weight: 500; border-top: 1px dashed #E2E8F0;">Occasion / Venue:</td>
                        <td align="right" style="padding: 7px 0; font-size: 13px; color: #0F172A; font-weight: 700; border-top: 1px dashed #E2E8F0;">${quotation.eventType || 'Catering'} • ${quotation.venue || 'Kerala'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748B; font-weight: 500; border-top: 1px dashed #E2E8F0;">Expected Guests:</td>
                        <td align="right" style="padding: 7px 0; font-size: 13px; color: #0F172A; font-weight: 700; border-top: 1px dashed #E2E8F0;">${quotation.guestCount} Pax</td>
                      </tr>
                      <tr>
                        <td style="padding: 9px 0 3px; font-size: 14px; color: #0F172A; font-weight: 800; border-top: 2px solid #E2E8F0;">Total Commercial Estimate:</td>
                        <td align="right" style="padding: 9px 0 3px; font-size: 17px; color: #D97706; font-weight: 900; font-family: monospace; border-top: 2px solid #E2E8F0;">${grandTotalStr}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Interactive Portal Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 24px;">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #F59E0B, #EA580C); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 15px 36px; border-radius: 12px; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.35);">
                      ${buttonText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Attached PDF Notice Callout -->
              <div style="background-color: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 12px; padding: 14px 18px; text-align: center; margin-top: 20px;">
                <p style="margin: 0; font-size: 12.5px; color: #64748B; line-height: 1.5;">
                  📎 <strong>Attached Official Document:</strong> <span style="font-family: monospace; font-weight: 700; color: #0F172A;">${pdfFilename}</span> has been attached to this email for your offline accounting and print records.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="background-color: #0F172A; padding: 24px 28px; text-align: center; border-top: 1px solid #1E293B;">
              <p style="margin: 0 0 8px; color: #F3CA52; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">THANKAM EVENTS • KOLLAM CENTRAL KITCHEN</p>
              <p style="margin: 0 0 12px; color: #94A3B8; font-size: 11px; line-height: 1.6;">
                Pure Cow Ghee • Fresh Banana Leaf Banquets • Live Counters • Authentic Travancore Feasts<br>
                Helpline: +91 97456 84766 / +91 92076 06150 &bull; <a href="https://thankamevents.in" target="_blank" style="color: #F3CA52; text-decoration: none;">thankamevents.in</a>
              </p>
              <p style="margin: 0; color: #64748B; font-size: 10px;">
                This is an official automated notification issued by Thankam Events Management.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      await this.emailService.send({
        toEmail: customerEmail,
        toName: customerName,
        subject,
        htmlContent,
        variables: {
          customer_name: customerName,
          title,
          TITLE: title,
          subject,
          Subject: subject,
          message,
          quote_no: quotation.quotationNumber,
          event_date: eventDateStr,
          venue: `${quotation.eventType || 'Catering'} • ${quotation.venue || 'Kerala'}`,
          guest_count: `${quotation.guestCount} Pax`,
          total_amount: grandTotalStr,
          portal_url: portalUrl,
          button_text: buttonText,
          pdf_filename: pdfFilename,
        },
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
    } catch (err) {
      this.logger.error(`Error notifying customer by email for quotation ${quotationId}:`, err);
    }
  }
}

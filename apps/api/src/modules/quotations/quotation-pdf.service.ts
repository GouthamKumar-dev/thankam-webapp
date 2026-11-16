import { Injectable, Logger } from '@nestjs/common';
import type * as PDFKitTypes from 'pdfkit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument: typeof PDFKitTypes = require('pdfkit');

function fmtInr(n?: number | null | string): string {
  const val = Number(n || 0);
  return 'Rs. ' + new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(val);
}

function fmtDate(d?: string | Date | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(d);
  }
}

function fmtFullDate(d?: string | Date | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(d);
  }
}

function formatServiceLineTitle(rawName: string): { title: string; subtitle?: string } {
  if (!rawName) return { title: '' };
  const separatorRegex = /\s*(?:---|--|—|–)\s*/;
  if (separatorRegex.test(rawName)) {
    const parts = rawName.split(separatorRegex);
    const title = parts[0].trim();
    const subtitle = parts.slice(1).join(' • ').trim();
    return { title, subtitle: subtitle || undefined };
  }
  return { title: rawName.trim() };
}

function isServiceItem(name: string, category?: string): boolean {
  const combined = `${name || ''} ${category || ''}`.toLowerCase();
  const serviceKeywords = [
    'decor', 'stage', 'floral', 'arch', 'pathway', 'backdrop', 'flower', 'sofa',
    'sound', 'audio', 'light', 'genset', 'generator', 'pyro', 'fog', 'dry ice', 'melam', 'band',
    'rental', 'chair', 'table', 'crockery', 'buffet', 'gazebo', 'counter', 'linen', 'cutlery',
    'staff', 'boy', 'captain', 'chef', 'crew', 'clean', 'waiter', 'service crew',
    'stall', 'tea shop', 'juice counter', 'pooja', 'ceremonial', 'mala', 'nirapara',
  ];
  return serviceKeywords.some((kw) => combined.includes(kw));
}

@Injectable()
export class QuotationPdfService {
  private readonly logger = new Logger(QuotationPdfService.name);

  /**
   * Generates a clean vector PDF buffer for a Quotation matching the browser preview
   */
  async generateQuotationPdf(quotation: any, company?: any): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 36,
        size: 'A4',
        info: {
          Title: `Quotation - ${quotation.quotationNumber}`,
          Author: company?.name || 'Thankam Events',
          Subject: `Catering Quotation for ${quotation.customerName}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: any) => reject(err));

      const primaryNavy = '#0F1B3C';
      const goldColor = '#B8860B';
      const goldBanner = '#FDF3D0';
      const warmBoxBg = '#FFFDF7';
      const warmBorder = '#EDE8DF';
      const textDark = '#1A202C';
      const textMuted = '#64748B';
      const pageWidth = 595.28;
      const margin = 36;
      const contentWidth = pageWidth - margin * 2; // 523.28

      // Determine Per Person Package Mode
      const rawItems = Array.isArray(quotation.items) ? quotation.items : [];
      let isPerPerson = false;
      let perPersonRate = 0;
      let perPersonGuests = Number(quotation.guestCount || 0);

      const foodItems: any[] = [];
      const serviceItems: any[] = [];

      for (const it of rawItems) {
        const name = String(it.item?.name || it.name || '').trim();
        const cat = String(it.item?.category?.name || it.category || '').trim();
        const unit = String(it.unit || '').toLowerCase();
        const price = Number(it.unitPrice || 0);
        const qty = Number(it.quantity || 1);

        if (name.toLowerCase().includes('per person') || unit === 'person') {
          isPerPerson = true;
          perPersonRate = price > 0 ? price : perPersonRate;
          if (qty > 0) perPersonGuests = qty;
          continue; // Don't show the calculation placeholder row in the dishes list
        }

        if (isServiceItem(name, cat)) {
          serviceItems.push({ ...it, cleanName: name, category: cat || 'Event Services' });
        } else {
          foodItems.push({ ...it, cleanName: name, category: cat || 'Dishes' });
        }
      }

      // Group food items by course / category
      const foodGroups = new Map<string, any[]>();
      for (const it of foodItems) {
        const cat = it.category || 'Dishes';
        if (!foodGroups.has(cat)) foodGroups.set(cat, []);
        foodGroups.get(cat)!.push(it);
      }

      // Helper: check page break
      const ensureSpace = (needed: number) => {
        if (doc.y + needed > 780) {
          doc.addPage();
          doc.rect(margin, 20, contentWidth, 3).fill(goldColor);
          doc.y = 35;
        }
      };

      // ── 1. Top Accent & Header Bar ──────────────────────────────
      doc.rect(margin, 20, contentWidth, 3.5).fill(goldColor);
      doc.y = 32;

      // Company info (Left)
      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor(primaryNavy)
        .text(company?.name ?? 'THANKAM EVENTS', margin, 32);

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(goldColor)
        .text(company?.tagline ?? 'CELEBRATIONS CRAFTED • KOLLAM CENTRAL KITCHEN', margin, 56);

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(textMuted)
        .text('Central Kitchen: Chinnakada, Kollam, Kerala | Phone: +91 97456 84766 / +91 92076 06150', margin, 68);

      // Quote details (Right)
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(goldColor)
        .text('QUOTATION ESTIMATE', margin + 280, 32, { width: contentWidth - 280, align: 'right' });

      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(primaryNavy)
        .text(quotation.quotationNumber, margin + 280, 47, { width: contentWidth - 280, align: 'right' });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(textMuted)
        .text(`Date: ${fmtDate(quotation.createdAt)}`, margin + 280, 64, { width: contentWidth - 280, align: 'right' });

      // ── 2. Customer & Event Details Box ────────────────────────
      doc.y = 86;
      const boxY = doc.y;
      const boxH = 68;
      doc.roundedRect(margin, boxY, contentWidth, boxH, 6).fill(warmBoxBg).stroke(warmBorder);

      // Left Column: Customer
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(goldColor)
        .text('CUSTOMER DETAILS', margin + 14, boxY + 10);

      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor(primaryNavy)
        .text(quotation.customerName || 'Valued Guest', margin + 14, boxY + 22);

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(textDark)
        .text(`Phone: ${quotation.customerPhone || '—'}`, margin + 14, boxY + 36);

      if (quotation.customerEmail) {
        doc.text(`Email: ${quotation.customerEmail}`, margin + 14, boxY + 48, { width: 220, ellipsis: true });
      } else if (quotation.customerAddress) {
        doc.text(`Location: ${quotation.customerAddress}`, margin + 14, boxY + 48, { width: 220, ellipsis: true });
      }

      // Right Column: Event
      const rightColX = margin + 270;
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(goldColor)
        .text('EVENT SPECIFICATIONS', rightColX, boxY + 10);

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(primaryNavy)
        .text(quotation.eventType || 'Banquet Catering', rightColX, boxY + 22);

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(textDark)
        .text(`Date: ${fmtDate(quotation.eventDate)}   |   Guests: ${quotation.guestCount || '—'} Pax`, rightColX, boxY + 36);

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(textDark)
        .text(`Venue: ${quotation.venue || 'To be specified'}`, rightColX, boxY + 48, { width: 230, ellipsis: true });

      doc.y = boxY + boxH + 16;

      // ── 3. Section Title: Food Menu ────────────────────────────
      ensureSpace(40);
      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(goldColor)
        .text('1. CATERING FOOD MENU' + (isPerPerson ? ' (INCLUDED IN PACKAGE)' : ''), margin, doc.y);

      doc.y += 8;

      // Dishes Table Header
      const tableX = margin;
      let currentY = doc.y;

      doc.rect(tableX, currentY, contentWidth, 18).fill(primaryNavy);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
      doc.text('#', tableX + 8, currentY + 5);
      doc.text('Dish Description', tableX + 32, currentY + 5);

      if (!isPerPerson) {
        doc.text('Qty', tableX + 340, currentY + 5, { width: 35, align: 'center' });
        doc.text('Rate', tableX + 390, currentY + 5, { width: 55, align: 'right' });
        doc.text('Amount', tableX + 455, currentY + 5, { width: 60, align: 'right' });
      } else {
        doc.text('Course Allocation', tableX + 410, currentY + 5, { width: 105, align: 'right' });
      }

      currentY += 18;

      let globalDishIndex = 1;

      // Iterate through each grouped category
      for (const [categoryName, items] of foodGroups.entries()) {
        ensureSpace(32);
        currentY = doc.y;

        // Category Course Header Bar
        doc.rect(tableX, currentY, contentWidth, 16).fill(goldBanner);
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(goldColor)
          .text(categoryName.toUpperCase(), tableX + 10, currentY + 4);
        currentY += 16;

        for (const it of items) {
          ensureSpace(22);
          currentY = doc.y;

          const { title, subtitle } = formatServiceLineTitle(it.cleanName);
          const qty = Number(it.quantity || 1);
          const unit = it.unit || 'plate';
          const unitPrice = Number(it.unitPrice || 0);
          const amount = Number(it.amount ?? (qty * unitPrice));

          const rowH = subtitle ? 24 : 17;
          if (globalDishIndex % 2 === 0) {
            doc.rect(tableX, currentY, contentWidth, rowH).fill('#FAF8F5');
          }

          doc.font('Helvetica').fontSize(8).fillColor(textMuted).text(String(globalDishIndex), tableX + 8, currentY + 4);

          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(textDark).text(title, tableX + 32, currentY + 4, {
            width: isPerPerson ? 370 : 300,
            ellipsis: true,
          });

          if (subtitle) {
            doc
              .font('Helvetica-Oblique')
              .fontSize(7.5)
              .fillColor(textMuted)
              .text(subtitle, tableX + 32, currentY + 14, { width: isPerPerson ? 370 : 300, ellipsis: true });
          }

          if (!isPerPerson) {
            doc.font('Helvetica').fontSize(8).fillColor(textDark);
            doc.text(`${qty} ${unit}`, tableX + 340, currentY + 4, { width: 35, align: 'center' });
            doc.text(unitPrice > 0 ? fmtInr(unitPrice) : '—', tableX + 390, currentY + 4, { width: 55, align: 'right' });
            doc.font('Helvetica-Bold').text(amount > 0 ? fmtInr(amount) : 'Included', tableX + 455, currentY + 4, {
              width: 60,
              align: 'right',
            });
          } else {
            doc
              .font('Helvetica')
              .fontSize(8)
              .fillColor(goldColor)
              .text('Included in Package', tableX + 410, currentY + 4, { width: 105, align: 'right' });
          }

          currentY += rowH;
          globalDishIndex++;
          doc.y = currentY;
        }
      }

      // Per Person Package Highlight Banner
      if (isPerPerson && perPersonRate > 0) {
        ensureSpace(45);
        const ppBoxY = doc.y + 6;
        const ppTotal = perPersonRate * (perPersonGuests || Number(quotation.guestCount || 0));

        doc.roundedRect(tableX, ppBoxY, contentWidth, 38, 5).fill(warmBoxBg).stroke(goldColor);
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(goldColor)
          .text('PACKAGE PRICING CALCULATION', tableX + 12, ppBoxY + 8);

        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor(textDark)
          .text(
            `${perPersonGuests} Guests   ×   ${fmtInr(perPersonRate)} / Person   =   `,
            tableX + 12,
            ppBoxY + 20,
          );

        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(goldColor)
          .text(fmtInr(ppTotal), tableX + 340, ppBoxY + 19, { width: 170, align: 'right' });

        doc.y = ppBoxY + 46;
      }

      // ── 4. Decor, Production & Event Rentals ───────────────────
      if (serviceItems.length > 0) {
        ensureSpace(60);
        doc
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .fillColor(goldColor)
          .text('2. DECOR, PRODUCTION & EVENT RENTALS', margin, doc.y + 10);

        doc.y += 18;
        currentY = doc.y;

        doc.rect(tableX, currentY, contentWidth, 18).fill(primaryNavy);
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
        doc.text('#', tableX + 8, currentY + 5);
        doc.text('Service / Production Item', tableX + 32, currentY + 5);
        doc.text('Rate', tableX + 390, currentY + 5, { width: 55, align: 'right' });
        doc.text('Total', tableX + 455, currentY + 5, { width: 60, align: 'right' });
        currentY += 18;

        serviceItems.forEach((s, idx) => {
          ensureSpace(20);
          currentY = doc.y;
          const { title, subtitle } = formatServiceLineTitle(s.cleanName);
          const price = Number(s.unitPrice || 0);
          const qty = Number(s.quantity || 1);
          const tot = Number(s.amount ?? (qty * price));
          const rowH = subtitle ? 24 : 17;

          if (idx % 2 === 0) {
            doc.rect(tableX, currentY, contentWidth, rowH).fill('#FAF8F5');
          }

          doc.font('Helvetica').fontSize(8).fillColor(textMuted).text(String(idx + 1), tableX + 8, currentY + 4);
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(textDark).text(title, tableX + 32, currentY + 4, {
            width: 340,
            ellipsis: true,
          });

          if (subtitle) {
            doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(textMuted).text(subtitle, tableX + 32, currentY + 14, {
              width: 340,
              ellipsis: true,
            });
          }

          doc.font('Helvetica').fontSize(8).fillColor(textDark).text(fmtInr(price), tableX + 390, currentY + 4, {
            width: 55,
            align: 'right',
          });
          doc.font('Helvetica-Bold').text(fmtInr(tot), tableX + 455, currentY + 4, {
            width: 60,
            align: 'right',
          });

          currentY += rowH;
          doc.y = currentY;
        });
      }

      // ── 5. Commercial Summary / Totals Box ─────────────────────
      ensureSpace(120);
      const totalsY = doc.y + 12;
      const totBoxW = 220;
      const totBoxX = margin + contentWidth - totBoxW;

      const subTotal = Number(quotation.subTotal || quotation.grandTotal || 0);
      const discount = Number(quotation.discountAmount || 0);
      const extra = Number(quotation.extraChargesAmount || 0);
      const gst = Number(quotation.gstAmount || 0);
      const grandTotal = Number(quotation.grandTotal || subTotal);

      let ty = totalsY;

      doc.font('Helvetica').fontSize(8.5).fillColor(textMuted).text('Sub Total:', totBoxX, ty);
      doc.font('Helvetica-Bold').fillColor(textDark).text(fmtInr(subTotal), totBoxX + 90, ty, { width: 130, align: 'right' });
      ty += 14;

      if (discount > 0) {
        doc.font('Helvetica').fillColor('#DC2626').text('Discount (−):', totBoxX, ty);
        doc.font('Helvetica-Bold').text(`− ${fmtInr(discount)}`, totBoxX + 90, ty, { width: 130, align: 'right' });
        ty += 14;
      }

      if (extra > 0) {
        doc.font('Helvetica').fillColor(textMuted).text('Extra Services (+):', totBoxX, ty);
        doc.font('Helvetica-Bold').fillColor(textDark).text(`+ ${fmtInr(extra)}`, totBoxX + 90, ty, { width: 130, align: 'right' });
        ty += 14;
      }

      if (gst > 0) {
        const gstPct = Number(quotation.gstPercent || 5);
        doc.font('Helvetica').fillColor(textMuted).text(`GST (${gstPct}%):`, totBoxX, ty);
        doc.font('Helvetica-Bold').fillColor(textDark).text(fmtInr(gst), totBoxX + 90, ty, { width: 130, align: 'right' });
        ty += 14;
      } else {
        doc.font('Helvetica').fillColor(textMuted).text('GST:', totBoxX, ty);
        doc.font('Helvetica').text('Not Applicable (0%)', totBoxX + 90, ty, { width: 130, align: 'right' });
        ty += 14;
      }

      // Grand Total Box
      ty += 2;
      doc.roundedRect(totBoxX - 6, ty, totBoxW + 6, 26, 4).fill(primaryNavy);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF').text('Grand Total:', totBoxX + 6, ty + 7);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#F3CA52').text(fmtInr(grandTotal), totBoxX + 90, ty + 7, {
        width: 124,
        align: 'right',
      });

      doc.y = ty + 38;

      // ── 6. Terms & Signature Blocks ───────────────────────────
      ensureSpace(110);
      const termsY = doc.y + 6;

      // Terms note
      doc.roundedRect(margin, termsY, contentWidth, 38, 4).fill(warmBoxBg).stroke(warmBorder);
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(goldColor)
        .text('BOOKING CONDITIONS & NOTES', margin + 10, termsY + 6);

      const termsText =
        quotation.terms?.trim() ||
        '1. 50% advance payment required upon quote acceptance to confirm booking. 2. Final guest count must be locked 72 hours prior to the event. 3. Pure cow ghee and certified culinary ingredients used in all preparations.';

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(textDark)
        .text(termsText, margin + 10, termsY + 16, { width: contentWidth - 20, lineGap: 1.5 });

      // Signatures
      const sigY = termsY + 46;
      doc.roundedRect(margin, sigY, 245, 48, 4).fill(warmBoxBg).stroke(warmBorder);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(goldColor).text('CLIENT ACCEPTANCE', margin + 10, sigY + 6);
      doc.font('Helvetica').fontSize(7.5).fillColor(textMuted).text('Name: ' + quotation.customerName, margin + 10, sigY + 18);
      doc.text('Signature: __________________________', margin + 10, sigY + 32);

      const compSigX = margin + 278;
      doc.roundedRect(compSigX, sigY, 245, 48, 4).fill(warmBoxBg).stroke(warmBorder);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(goldColor).text('AUTHORIZED SIGNATORY', compSigX + 10, sigY + 6);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(primaryNavy).text('Thankam Events Management', compSigX + 10, sigY + 18);
      doc.font('Helvetica').fontSize(7).fillColor(textMuted).text('Central Kitchen Fleet • Kollam, Kerala', compSigX + 10, sigY + 32);

      // Footer
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(textMuted)
        .text(
          'Thank you for choosing Thankam Events • Computer Generated Quotation • https://thankamevents.in',
          margin,
          800,
          { align: 'center', width: contentWidth },
        );

      doc.end();
    });
  }

  /**
   * Generates a clean vector PDF buffer for a Catering Agreement matching the browser preview
   */
  async generateAgreementPdf(quotation: any, company?: any): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 36,
        size: 'A4',
        info: {
          Title: `Catering Agreement - ${quotation.quotationNumber}`,
          Author: company?.name || 'Thankam Events',
          Subject: `Legal Catering Agreement for ${quotation.customerName}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: any) => reject(err));

      const primaryNavy = '#0F1B3C';
      const goldColor = '#B8860B';
      const goldBanner = '#FDF3D0';
      const warmBoxBg = '#FFFDF7';
      const warmBorder = '#EDE8DF';
      const textDark = '#1A202C';
      const textMuted = '#64748B';
      const pageWidth = 595.28;
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;

      const ensureSpace = (needed: number) => {
        if (doc.y + needed > 780) {
          doc.addPage();
          doc.rect(margin, 20, contentWidth, 3).fill(goldColor);
          doc.y = 35;
        }
      };

      // Header Bar
      doc.rect(margin, 20, contentWidth, 3.5).fill(goldColor);
      doc.y = 30;

      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor(primaryNavy)
        .text('CATERING & BANQUET SERVICE AGREEMENT', margin, 30, { align: 'center', width: contentWidth });

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(goldColor)
        .text(
          `DOCUMENT REFERENCE: ${quotation.quotationNumber}   •   DATE: ${fmtDate(quotation.createdAt)}`,
          margin,
          50,
          { align: 'center', width: contentWidth },
        );

      doc.y = 68;

      // Clause 1: Parties & Engagement
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryNavy).text('1. PARTIES & ENGAGEMENT', margin, doc.y);
      doc.y += 4;
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(textDark)
        .text(
          `This Catering & Event Agreement is entered into between ${quotation.customerName} (hereinafter referred to as the "Client") and Thankam Events Management (hereinafter referred to as the "Company"). The Company agrees to provide culinary preparations, banquet service crew, and event management deliverables for the event specified herein.`,
          margin,
          doc.y,
          { width: contentWidth, lineGap: 1.5 },
        );

      doc.y += 8;

      // Clause 2: Event Specifications Box
      ensureSpace(50);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryNavy).text('2. EVENT SPECIFICATIONS', margin, doc.y);
      doc.y += 4;

      const specY = doc.y;
      doc.roundedRect(margin, specY, contentWidth, 34, 4).fill(warmBoxBg).stroke(warmBorder);
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(textDark)
        .text(`Client: ${quotation.customerName}`, margin + 10, specY + 6);
      doc.text(`Phone: ${quotation.customerPhone || '—'}`, margin + 10, specY + 18);

      doc.text(`Event: ${quotation.eventType || 'Banquet'}`, margin + 180, specY + 6);
      doc.text(`Date: ${fmtDate(quotation.eventDate)}`, margin + 180, specY + 18);

      doc.text(`Guests: ${quotation.guestCount || '—'} Pax`, margin + 350, specY + 6);
      doc.text(`Venue: ${quotation.venue || 'To be specified'}`, margin + 350, specY + 18, { width: 130, ellipsis: true });

      doc.y = specY + 42;

      // Clause 3: Commercial Terms & Payment Schedule
      ensureSpace(80);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryNavy).text('3. COMMERCIAL CONSIDERATIONS & PAYMENT TERMS', margin, doc.y);
      doc.y += 4;

      const commY = doc.y;
      const gTot = Number(quotation.grandTotal || quotation.subTotal || 0);
      const advance = Math.round(gTot * 0.5);
      const balance = gTot - advance;

      doc.roundedRect(margin, commY, contentWidth, 48, 4).fill(warmBoxBg).stroke(warmBorder);

      doc.font('Helvetica-Bold').fontSize(8).fillColor(goldColor);
      doc.text('TOTAL CONTRACT VALUE', margin + 10, commY + 6);
      doc.text('50% ADVANCE (CONFIRMATION)', margin + 180, commY + 6);
      doc.text('50% FINAL BALANCE (PRE-DEPLOYMENT)', margin + 350, commY + 6);

      doc.font('Helvetica-Bold').fontSize(11).fillColor(primaryNavy);
      doc.text(fmtInr(gTot), margin + 10, commY + 18);
      doc.text(fmtInr(advance), margin + 180, commY + 18);
      doc.text(fmtInr(balance), margin + 350, commY + 18);

      doc.font('Helvetica').fontSize(7).fillColor(textMuted);
      doc.text('Inclusive of all applicable taxes', margin + 10, commY + 34);
      doc.text('Due within 3 business days of signing', margin + 180, commY + 34);
      doc.text('Due at least 3 days prior to event', margin + 350, commY + 34);

      doc.y = commY + 56;

      // Clause 4: Menu Deliverables Summary
      ensureSpace(60);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryNavy).text('4. CATERING DELIVERABLES & MENU SUMMARY', margin, doc.y);
      doc.y += 4;

      const items: any[] = Array.isArray(quotation.items) ? quotation.items : [];
      const foodNames = items
        .filter((i: any) => !isServiceItem(i.name, i.category) && !String(i.name).toLowerCase().includes('per person'))
        .map((i: any) => i.name)
        .slice(0, 15);

      const menuSummary = foodNames.length > 0 ? foodNames.join(' • ') : 'Standard celebratory catering spread';

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(textDark)
        .text(
          `The Company will prepare and serve the agreed menu for ${quotation.guestCount || '—'} guests: ${menuSummary}. All dishes will be cooked fresh using pure cow ghee and authentic ingredients.`,
          margin,
          doc.y,
          { width: contentWidth, lineGap: 1.5 },
        );

      doc.y += 10;

      // Clause 5: Cancellation & Refund Policy (Full Schedule)
      ensureSpace(90);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryNavy).text('5. CANCELLATION & REFUND POLICY', margin, doc.y);
      doc.y += 4;

      const cancY = doc.y;
      doc.rect(margin, cancY, contentWidth, 14).fill(goldBanner);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(goldColor);
      doc.text('Notice Period Prior to Event', margin + 10, cancY + 3);
      doc.text('Applicable Cancellation Charge', margin + 250, cancY + 3);
      doc.text('Refund Eligibility', margin + 410, cancY + 3);

      let cy = cancY + 14;
      const cancRows = [
        { period: 'More than 30 days prior', fee: '20% of Total Contract Value', refund: '80% Refund' },
        { period: '15 to 30 days prior', fee: '50% of Total Contract Value', refund: '50% Refund' },
        { period: '7 to 14 days prior', fee: '75% of Total Contract Value', refund: '25% Refund' },
        { period: 'Less than 7 days prior', fee: '100% of Total Contract Value', refund: 'No Refund' },
      ];

      cancRows.forEach((r, idx) => {
        if (idx % 2 === 0) doc.rect(margin, cy, contentWidth, 12).fill('#FAF8F5');
        doc.font('Helvetica').fontSize(7).fillColor(textDark).text(r.period, margin + 10, cy + 2);
        doc.text(r.fee, margin + 250, cy + 2);
        doc.font('Helvetica-Bold').text(r.refund, margin + 410, cy + 2);
        cy += 12;
      });

      doc.y = cy + 8;

      // Clause 6: Quality, Hygiene & Kitchen Standards
      ensureSpace(50);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryNavy).text('6. QUALITY, HYGIENE & KITCHEN STANDARDS', margin, doc.y);
      doc.y += 4;
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(textDark)
        .text(
          '1. FSSAI Certified: All cooking processes adhere strictly to Food Safety and Standards Authority of India (FSSAI) guidelines.\n' +
            '2. Pure Ingredients: We exclusively use pure cow ghee, cold-pressed coconut oils, and authentic South Indian spices.\n' +
            '3. Hygiene Guarantee: Chefs, service boys, and captains wear certified uniforms, head covers, and gloves during service.',
          margin,
          doc.y,
          { width: contentWidth, lineGap: 2 },
        );

      doc.y += 10;

      // Clause 7: Venue Provisions & Force Majeure
      ensureSpace(45);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryNavy).text('7. VENUE PROVISIONS & JURISDICTION', margin, doc.y);
      doc.y += 4;
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(textDark)
        .text(
          'The host/venue is responsible for providing uninterrupted running water, clean electricity, and accessible kitchen setup area. In the event of force majeure (acts of God, government prohibitions), both parties will mutually reschedule. Any legal disputes shall be subject to the exclusive jurisdiction of the Courts in Kollam, Kerala.',
          margin,
          doc.y,
          { width: contentWidth, lineGap: 1.5 },
        );

      doc.y += 10;

      // Clause 8: Digital Acceptance Record & Execution
      ensureSpace(95);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryNavy).text('8. DIGITAL ACCEPTANCE & EXECUTION RECORD', margin, doc.y);
      doc.y += 4;

      const isAccepted = quotation.agreementStatus === 'ACCEPTED';
      const sigBoxY = doc.y;

      doc.roundedRect(margin, sigBoxY, contentWidth, 54, 4).fill(isAccepted ? '#ECFDF5' : warmBoxBg).stroke(isAccepted ? '#A7F3D0' : warmBorder);

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(isAccepted ? '#065F46' : goldColor)
        .text(
          isAccepted ? '✓ DIGITALLY ACCEPTED & LOCKED RECORD' : '⏳ PENDING DIGITAL ACCEPTANCE',
          margin + 12,
          sigBoxY + 8,
        );

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(textDark)
        .text(`Client Signatory: ${quotation.customerName}`, margin + 12, sigBoxY + 22);

      doc.text(
        isAccepted
          ? `Status: Digitally Signed on ${fmtFullDate(quotation.agreementAcceptedAt)}`
          : 'Status: Pending digital confirmation via Thankam Customer Portal',
        margin + 12,
        sigBoxY + 36,
      );

      const compColX = margin + 300;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(primaryNavy).text('Authorized Company Signatory:', compColX, sigBoxY + 14);
      doc.text('Thankam Events Management', compColX, sigBoxY + 26);
      doc.font('Helvetica').fontSize(7).fillColor(textMuted).text('Central Kitchen Fleet • Kollam, Kerala', compColX, sigBoxY + 38);

      // Footer
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(textMuted)
        .text(
          'Thankam Events Management • Legally Binding Contract • https://thankamevents.in',
          margin,
          800,
          { align: 'center', width: contentWidth },
        );

      doc.end();
    });
  }
}

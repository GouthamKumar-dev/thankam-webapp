import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

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

@Injectable()
export class QuotationPdfService {
  private readonly logger = new Logger(QuotationPdfService.name);

  /**
   * Generates a clean vector PDF buffer for a Quotation
   */
  async generateQuotationPdf(quotation: any, company?: any): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        info: {
          Title: `Quotation - ${quotation.quotationNumber}`,
          Author: 'Thankam Events',
          Subject: `Catering Quotation for ${quotation.customerName}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#0F1B3C';
      const goldColor = '#B8860B';
      const slateLight = '#64748B';
      const slateDark = '#1E293B';
      const bgBox = '#F8FAFC';

      // ── Header Bar ───────────────────────────────────────────
      doc.rect(40, 40, 515, 4).fill(goldColor);
      doc.moveDown(0.8);

      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor(primaryColor)
        .text(company?.name ?? 'THANKAM EVENTS', 40, 50);

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(goldColor)
        .text(company?.tagline ?? 'CELEBRATIONS CRAFTED • KOLLAM CENTRAL KITCHEN', 40, 75);

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(slateLight)
        .text(
          'Phone: +91 97456 84766 / +91 92076 06150  |  Email: info@thankamevents.in  |  Kollam, Kerala',
          40,
          87,
        );

      // Top Right Document Tag
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor(goldColor)
        .text('QUOTATION ESTIMATE', 360, 50, { align: 'right' });

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(slateDark)
        .text(`No: ${quotation.quotationNumber}`, 360, 68, { align: 'right' });

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(slateLight)
        .text(`Date: ${fmtDate(quotation.createdAt)}`, 360, 82, { align: 'right' });

      // ── Event & Client Information Box ───────────────────────
      const boxY = 105;
      doc.roundedRect(40, boxY, 515, 68, 6).fill(bgBox).stroke('#E2E8F0');

      // Left Column: Client
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(goldColor)
        .text('CLIENT DETAILS', 55, boxY + 10);

      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor(primaryColor)
        .text(quotation.customerName, 55, boxY + 22);

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(slateDark)
        .text(`Phone: ${quotation.customerPhone || '—'}`, 55, boxY + 36);

      if (quotation.customerEmail) {
        doc.text(`Email: ${quotation.customerEmail}`, 55, boxY + 48);
      } else if (quotation.customerAddress) {
        doc.text(`Address: ${quotation.customerAddress}`, 55, boxY + 48, { width: 220, ellipsis: true });
      }

      // Right Column: Event
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(goldColor)
        .text('EVENT DETAILS', 315, boxY + 10);

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(primaryColor)
        .text(quotation.eventType || 'Banquet Catering', 315, boxY + 22);

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(slateDark)
        .text(`Date: ${fmtDate(quotation.eventDate)}   |   Guests: ${quotation.guestCount || '—'} Pax`, 315, boxY + 36);

      doc.text(`Venue: ${quotation.venue || 'To be confirmed'}`, 315, boxY + 48, { width: 225, ellipsis: true });

      // ── Items Table ──────────────────────────────────────────
      let tableY = 185;

      doc.rect(40, tableY, 515, 20).fill(primaryColor);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF');
      doc.text('#', 48, tableY + 5);
      doc.text('Item Description', 70, tableY + 5);
      doc.text('Qty', 330, tableY + 5, { width: 35, align: 'center' });
      doc.text('Unit', 370, tableY + 5, { width: 45, align: 'center' });
      doc.text('Rate', 420, tableY + 5, { width: 55, align: 'right' });
      doc.text('Amount', 480, tableY + 5, { width: 65, align: 'right' });

      tableY += 20;

      const items = Array.isArray(quotation.items) ? quotation.items : [];
      let itemIndex = 1;

      for (const it of items) {
        if (tableY > 720) {
          doc.addPage();
          tableY = 40;
          doc.rect(40, tableY, 515, 20).fill(primaryColor);
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF');
          doc.text('#', 48, tableY + 5);
          doc.text('Item Description', 70, tableY + 5);
          doc.text('Qty', 330, tableY + 5, { width: 35, align: 'center' });
          doc.text('Unit', 370, tableY + 5, { width: 45, align: 'center' });
          doc.text('Rate', 420, tableY + 5, { width: 55, align: 'right' });
          doc.text('Amount', 480, tableY + 5, { width: 65, align: 'right' });
          tableY += 20;
        }

        const itemName = it.item?.name || it.name || 'Menu Dish';
        const category = it.item?.category?.name || it.category || '';
        const qty = Number(it.quantity || 1);
        const unit = it.unit || 'plate';
        const unitPrice = Number(it.unitPrice || 0);
        const amount = Number(it.amount ?? (qty * unitPrice));

        if (itemIndex % 2 === 0) {
          doc.rect(40, tableY, 515, 18).fill('#F8FAFC');
        }

        doc.font('Helvetica').fontSize(8).fillColor(slateDark);
        doc.text(String(itemIndex), 48, tableY + 4);
        doc.font('Helvetica-Bold').text(itemName, 70, tableY + 4, { width: 250, ellipsis: true });
        doc.font('Helvetica').text(String(qty), 330, tableY + 4, { width: 35, align: 'center' });
        doc.text(unit, 370, tableY + 4, { width: 45, align: 'center' });
        doc.text(unitPrice > 0 ? fmtInr(unitPrice) : '—', 420, tableY + 4, { width: 55, align: 'right' });
        doc.font('Helvetica-Bold').text(amount > 0 ? fmtInr(amount) : 'Included', 480, tableY + 4, { width: 65, align: 'right' });

        tableY += 18;
        itemIndex++;
      }

      // ── Commercial Totals ────────────────────────────────────
      tableY += 10;
      if (tableY > 670) {
        doc.addPage();
        tableY = 40;
      }

      const totX = 330;
      const totValX = 430;
      const totW = 115;

      const subTotal = Number(quotation.subTotal || quotation.grandTotal || 0);
      const discount = Number(quotation.discountAmount || 0);
      const extra = Number(quotation.extraChargesAmount || 0);
      const gst = Number(quotation.gstAmount || 0);
      const grandTotal = Number(quotation.grandTotal || subTotal);

      doc.font('Helvetica').fontSize(8.5).fillColor(slateLight);
      doc.text('Subtotal:', totX, tableY);
      doc.font('Helvetica-Bold').fillColor(slateDark).text(fmtInr(subTotal), totValX, tableY, { width: totW, align: 'right' });
      tableY += 14;

      if (discount > 0) {
        doc.font('Helvetica').fillColor('#DC2626').text('Discount:', totX, tableY);
        doc.font('Helvetica-Bold').text(`- ${fmtInr(discount)}`, totValX, tableY, { width: totW, align: 'right' });
        tableY += 14;
      }

      if (extra > 0) {
        doc.font('Helvetica').fillColor(slateLight).text('Additional Services:', totX, tableY);
        doc.font('Helvetica-Bold').fillColor(slateDark).text(`+ ${fmtInr(extra)}`, totValX, tableY, { width: totW, align: 'right' });
        tableY += 14;
      }

      if (gst > 0) {
        const gstPct = Number(quotation.gstPercent || 5);
        doc.font('Helvetica').fillColor(slateLight).text(`GST (${gstPct}%):`, totX, tableY);
        doc.font('Helvetica-Bold').fillColor(slateDark).text(fmtInr(gst), totValX, tableY, { width: totW, align: 'right' });
        tableY += 14;
      }

      // Grand Total Box
      tableY += 4;
      doc.roundedRect(totX - 10, tableY - 4, 235, 26, 4).fill(primaryColor);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF').text('GRAND TOTAL:', totX, tableY + 3);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#F3CA52').text(fmtInr(grandTotal), totValX, tableY + 2, { width: totW, align: 'right' });
      tableY += 36;

      // ── Notes & Terms ────────────────────────────────────────
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(primaryColor)
        .text('TERMS & NOTES:', 40, tableY);

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(slateLight)
        .text(
          quotation.terms ??
            '1. 50% advance payable upon contract confirmation.\n2. Final balance due 3 days prior to the banquet date.\n3. Pure cow ghee, fresh banana leaf, and authentic Travancore preparation.\n4. Quotation valid for 15 days from issue date.',
          40,
          tableY + 12,
          { width: 515, lineGap: 2 },
        );

      // ── Footer ───────────────────────────────────────────────
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#94A3B8')
        .text(
          'Thankam Events Management • Computer Generated Document • https://thankamevents.in',
          40,
          800,
          { align: 'center', width: 515 },
        );

      doc.end();
    });
  }

  /**
   * Generates a clean vector PDF buffer for a Catering Agreement
   */
  async generateAgreementPdf(quotation: any, company?: any): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        info: {
          Title: `Catering Agreement - ${quotation.quotationNumber}`,
          Author: 'Thankam Events',
          Subject: `Legal Catering Agreement for ${quotation.customerName}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#0F1B3C';
      const goldColor = '#B8860B';
      const slateLight = '#64748B';
      const slateDark = '#1E293B';

      // Header
      doc.rect(40, 40, 515, 4).fill(goldColor);
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor(primaryColor)
        .text('CATERING & BANQUET SERVICE AGREEMENT', 40, 52, { align: 'center', width: 515 });

      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(goldColor)
        .text(`AGREEMENT REFERENCE: ${quotation.quotationNumber}`, 40, 75, { align: 'center', width: 515 });

      doc.moveDown(1.5);
      let y = 100;

      // Preamble
      doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text('1. PARTIES & ENGAGEMENT', 40, y);
      y += 14;
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(slateDark)
        .text(
          `This Catering & Event Services Agreement is entered into between ${quotation.customerName} (hereinafter referred to as the "Client") and Thankam Events Management (hereinafter referred to as the "Company"). The Company agrees to provide culinary, catering fleet, and banquet management deliverables for the specified event in accordance with the terms herein.`,
          40,
          y,
          { width: 515, lineGap: 2 },
        );
      y += 35;

      // Event Details
      doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text('2. EVENT SPECIFICATIONS', 40, y);
      y += 14;
      doc.rect(40, y, 515, 40).fill('#F8FAFC').stroke('#E2E8F0');
      doc.font('Helvetica').fontSize(8).fillColor(slateDark);
      doc.text(`Event: ${quotation.eventType || 'Banquet'}`, 50, y + 8);
      doc.text(`Date: ${fmtDate(quotation.eventDate)}`, 220, y + 8);
      doc.text(`Guests: ${quotation.guestCount || 0} Pax`, 380, y + 8);
      doc.text(`Venue: ${quotation.venue || 'To be specified'}`, 50, y + 22, { width: 480, ellipsis: true });
      y += 50;

      // Commercial Terms
      doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text('3. COMMERCIAL CONSIDERATION', 40, y);
      y += 14;
      doc.font('Helvetica').fontSize(8).fillColor(slateDark);
      doc.text(`• Total Contract Value: ${fmtInr(quotation.grandTotal)} (Inclusive of applicable taxes).`, 50, y);
      y += 12;
      doc.text(`• Advance Payment (50%): ${fmtInr(Number(quotation.grandTotal || 0) * 0.5)} payable upon confirmation.`, 50, y);
      y += 12;
      doc.text(`• Final Balance (50%): Payable 3 days prior to event deployment.`, 50, y);
      y += 24;

      // Standard Terms
      doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text('4. GENERAL CONDITIONS & CANCELLATIONS', 40, y);
      y += 14;
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(slateLight)
        .text(
          '1. Cancellations made more than 30 days prior to the event will incur a 20% administrative fee.\n' +
            '2. Cancellations made between 7 and 30 days will forfeit the 50% advance deposit.\n' +
            '3. The Company will ensure the highest standard of kitchen hygiene, pure cow ghee, and raw ingredients.\n' +
            '4. Safe power, running water, and kitchen access at the venue are the responsibility of the host/venue owner.',
          40,
          y,
          { width: 515, lineGap: 2.5 },
        );
      y += 55;

      // Digital Acceptance or Signatures
      const isAccepted = quotation.agreementStatus === 'ACCEPTED';

      doc.roundedRect(40, y, 515, 75, 4).fill(isAccepted ? '#ECFDF5' : '#FFFDF5').stroke(isAccepted ? '#A7F3D0' : '#FDE68A');
      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(isAccepted ? '#065F46' : '#92400E')
        .text(isAccepted ? '✓ DIGITAL ACCEPTANCE RECORD' : '⏳ PENDING CLIENT ACCEPTANCE', 50, y + 8);

      doc.font('Helvetica').fontSize(8).fillColor(slateDark);
      doc.text(`Client Name: ${quotation.customerName}`, 50, y + 24);
      doc.text(`Contact: ${quotation.customerPhone}`, 50, y + 36);
      doc.text(
        isAccepted
          ? `Status: Digitally Accepted & Locked on ${fmtDate(quotation.agreementAcceptedAt)}`
          : 'Status: Pending digital confirmation via Thankam Customer Portal',
        50,
        y + 48,
      );

      doc.text('Authorized Signatory:', 350, y + 24);
      doc.font('Helvetica-Bold').text('Thankam Events Management', 350, y + 36);
      doc.font('Helvetica').fontSize(7.5).fillColor(slateLight).text('Kollam Central Kitchen Fleet', 350, y + 48);

      // Footer
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#94A3B8')
        .text(
          'Thankam Events Management • Legally Binding Contract • https://thankamevents.in',
          40,
          800,
          { align: 'center', width: 515 },
        );

      doc.end();
    });
  }
}

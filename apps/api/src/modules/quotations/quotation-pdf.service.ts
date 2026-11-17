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

function formatFoodMenuQtyAndUnit(qty: number, rawUnit?: string | null): string {
  const u = (rawUnit || '').toLowerCase().trim();
  const guestLabel = qty === 1 ? 'Guest' : 'Guests';

  if (u === 'glass' || u === 'glasses') {
    return `${qty} ${qty === 1 ? 'Glass' : 'Glasses'}`;
  }
  if (u === 'cup' || u === 'cups') {
    return `${qty} ${qty === 1 ? 'Cup' : 'Cups'}`;
  }
  if (u === 'piece' || u === 'pieces' || u === 'pcs') {
    return `${qty} Pcs`;
  }
  if (u === 'bowl' || u === 'bowls') {
    return `${qty} ${qty === 1 ? 'Bowl' : 'Bowls'}`;
  }
  if (u === 'scoop' || u === 'scoops') {
    return `${qty} ${qty === 1 ? 'Scoop' : 'Scoops'}`;
  }
  if (u === 'plate' || u === 'plates') {
    return `${qty} ${qty === 1 ? 'Plate' : 'Plates'}`;
  }
  // Default for food dishes, per-head lines, kg, gm, person, pax, guests, etc.
  return `${qty} ${guestLabel}`;
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
        bufferPages: true,
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
      const textDark = '#1E293B';
      const textMuted = '#64748B';
      const warmBoxBg = '#FBFBF9';
      const warmBorder = '#E2DDD5';
      const pageWidth = 595.28;
      const margin = 36;
      const contentWidth = pageWidth - margin * 2; // 523.28

      // Column Geometry: 5 pixel-perfect aligned columns
      const tableX = margin;
      const colX0 = tableX; // 36
      const colW0 = 24;      // # (index)
      const colX1 = 62;      // Description
      const colW1 = 250;
      const colX2 = 316;     // Quantity
      const colW2 = 78;
      const colX3 = 398;     // Rate
      const colW3 = 56;
      const colX4 = 458;     // Amount
      const colW4 = 65;

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

      const drawDishesTableHeader = (yPos: number) => {
        doc.rect(tableX, yPos, contentWidth, 20).fill(primaryNavy);
        doc.rect(tableX, yPos + 18.5, contentWidth, 1.5).fill(goldColor);
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
        doc.text('#', colX0, yPos + 6, { width: colW0, align: 'center' });
        doc.text('Dish Description', colX1, yPos + 6, { width: colW1, align: 'left' });

        if (!isPerPerson) {
          doc.text('Quantity', colX2, yPos + 6, { width: colW2, align: 'center' });
          doc.text('Rate', colX3, yPos + 6, { width: colW3, align: 'right' });
          doc.text('Amount', colX4, yPos + 6, { width: colW4, align: 'right' });
        } else {
          doc.text('Course Allocation', colX2, yPos + 6, { width: colW2 + colW3 + colW4, align: 'right' });
        }
        return yPos + 20;
      };

      const drawRunningHeader = () => {
        doc.rect(margin, 18, contentWidth, 2.5).fill(goldColor);
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(primaryNavy)
          .text(company?.name ?? 'THANKAM EVENTS MANAGEMENT', margin, 26);
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(textMuted)
          .text('Catering Quotation Proposal', margin, 38);

        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(goldColor)
          .text(quotation.quotationNumber, margin + 250, 26, { width: contentWidth - 250, align: 'right' });
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(textDark)
          .text(
            `${quotation.customerName || 'Valued Guest'}  •  ${quotation.guestCount || '—'} Guests`,
            margin + 250,
            38,
            { width: contentWidth - 250, align: 'right' },
          );

        doc.rect(margin, 49, contentWidth, 0.5).fill('#CBD5E1');
        doc.y = 56;
      };

      // Helper: check page break with continuation header
      const ensureSpace = (needed: number, onNewPage?: () => void) => {
        if (doc.y + needed > 750) {
          doc.addPage();
          drawRunningHeader();
          if (onNewPage) {
            onNewPage();
          }
        }
      };

      // ── 1. Top Accent & Header Bar ──────────────────────────────
      doc.rect(margin, 20, contentWidth, 3.5).fill(goldColor);
      doc.y = 32;

      // Company info (Left)
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor(primaryNavy)
        .text(company?.name ?? 'THANKAM EVENTS MANAGEMENT', margin, 30);

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(goldColor)
        .text(company?.tagline ?? 'CELEBRATIONS CRAFTED • KOLLAM CENTRAL KITCHEN', margin, 52);

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(textMuted)
        .text('Central Kitchen: Chinnakkada, Kollam, Kerala | Phone: +91 97456 84766 / +91 92076 06150', margin, 64);

      // Quote details (Right)
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(goldColor)
        .text('QUOTATION ESTIMATE', margin + 280, 30, { width: contentWidth - 280, align: 'right' });

      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(primaryNavy)
        .text(quotation.quotationNumber, margin + 280, 44, { width: contentWidth - 280, align: 'right' });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(textMuted)
        .text(`Date: ${fmtDate(quotation.createdAt)}`, margin + 280, 62, { width: contentWidth - 280, align: 'right' });

      // ── 2. Customer & Event Details Box ────────────────────────
      doc.y = 80;
      const boxY = doc.y;
      const boxH = 68;
      doc.roundedRect(margin, boxY, contentWidth, boxH, 6).fill(warmBoxBg).stroke(warmBorder);

      // Vertical dividing line down the middle of the box
      doc.rect(margin + 261, boxY + 8, 0.75, boxH - 16).fill(warmBorder);

      // Left Column: Customer Details
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
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
        doc.text(`Email: ${quotation.customerEmail}`, margin + 14, boxY + 48, { width: 235, ellipsis: true });
      } else if (quotation.customerAddress) {
        doc.text(`Location: ${quotation.customerAddress}`, margin + 14, boxY + 48, { width: 235, ellipsis: true });
      } else {
        doc.text('Location: Kollam, Kerala', margin + 14, boxY + 48, { width: 235, ellipsis: true });
      }

      // Right Column: Event Specifications
      const rightColX = margin + 275;
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(goldColor)
        .text('EVENT SPECIFICATIONS', rightColX, boxY + 10);

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(primaryNavy)
        .text(quotation.eventType || 'Catering Event', rightColX, boxY + 22);

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(textDark)
        .text(`Date: ${fmtDate(quotation.eventDate)}   •   Guests: ${quotation.guestCount || '—'}`, rightColX, boxY + 36);

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(textDark)
        .text(`Venue: ${quotation.venue || 'To be specified'}`, rightColX, boxY + 48, { width: 235, ellipsis: true });

      doc.y = boxY + boxH + 14;

      // ── 3. Section Title: Food Menu ────────────────────────────
      ensureSpace(40);
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(goldColor)
        .text('1. CATERING FOOD MENU' + (isPerPerson ? ' (INCLUDED IN PACKAGE)' : ''), margin, doc.y);

      doc.y += 6;

      // Dishes Table Header
      let currentY = doc.y;
      currentY = drawDishesTableHeader(currentY);
      doc.y = currentY;

      let globalDishIndex = 1;

      // Iterate through each grouped category
      for (const [categoryName, items] of foodGroups.entries()) {
        ensureSpace(32, () => {
          doc.y = drawDishesTableHeader(doc.y);
        });
        currentY = doc.y;

        // Category Course Header Bar
        doc.rect(tableX, currentY, contentWidth, 18).fill('#FBF9F5');
        doc.rect(tableX, currentY, 3, 18).fill(goldColor); // Left accent indicator
        doc.rect(tableX, currentY + 17.5, contentWidth, 0.5).fill('#EAE5DC');

        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(primaryNavy)
          .text(categoryName.toUpperCase(), tableX + 10, currentY + 5);

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(textMuted)
          .text(`${items.length} ${items.length === 1 ? 'Item' : 'Items'}`, colX2, currentY + 5.5, {
            width: colW2 + colW3 + colW4,
            align: 'right',
          });

        currentY += 18;
        doc.y = currentY;

        for (const it of items) {
          ensureSpace(24, () => {
            doc.y = drawDishesTableHeader(doc.y);
          });
          currentY = doc.y;

          const { title, subtitle } = formatServiceLineTitle(it.cleanName);
          const qty = Number(it.quantity || 1);
          const unit = it.unit || 'plate';
          const unitPrice = Number(it.unitPrice || 0);
          const amount = Number(it.amount ?? qty * unitPrice);

          const rowH = subtitle ? 25 : 18;
          if (globalDishIndex % 2 === 0) {
            doc.rect(tableX, currentY, contentWidth, rowH).fill('#FAFAFA');
          }
          doc.rect(tableX, currentY + rowH - 0.5, contentWidth, 0.5).fill('#F1F5F9');

          // #
          doc.font('Helvetica').fontSize(7.5).fillColor(textMuted).text(String(globalDishIndex), colX0, currentY + 5, {
            width: colW0,
            align: 'center',
          });

          // Title & Subtitle
          doc.font('Helvetica-Bold').fontSize(8).fillColor(textDark).text(title, colX1, currentY + 5, {
            width: isPerPerson ? 340 : colW1,
            ellipsis: true,
          });

          if (subtitle) {
            doc
              .font('Helvetica-Oblique')
              .fontSize(7)
              .fillColor(textMuted)
              .text(subtitle, colX1, currentY + 14.5, { width: isPerPerson ? 340 : colW1, ellipsis: true });
          }

          if (!isPerPerson) {
            doc.font('Helvetica').fontSize(8).fillColor('#334155');
            const qtyText = formatFoodMenuQtyAndUnit(qty, unit);
            doc.text(qtyText, colX2, currentY + 5, { width: colW2, align: 'center' });
            doc.text(unitPrice > 0 ? fmtInr(unitPrice) : '—', colX3, currentY + 5, { width: colW3, align: 'right' });
            doc.font('Helvetica-Bold').fillColor(primaryNavy).text(amount > 0 ? fmtInr(amount) : 'Included', colX4, currentY + 5, {
              width: colW4,
              align: 'right',
            });
          } else {
            doc
              .font('Helvetica-Bold')
              .fontSize(7.5)
              .fillColor(goldColor)
              .text('Included in Package', colX2, currentY + 5, { width: colW2 + colW3 + colW4, align: 'right' });
          }

          currentY += rowH;
          globalDishIndex++;
          doc.y = currentY;
        }
      }

      // Per Person Package Highlight Banner (if applicable)
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
          .fontSize(9)
          .fillColor(goldColor)
          .text('2. DECOR, PRODUCTION & EVENT RENTALS', margin, doc.y + 10);

        doc.y += 14;
        let sTableY = doc.y;

        doc.rect(tableX, sTableY, contentWidth, 20).fill(primaryNavy);
        doc.rect(tableX, sTableY + 18.5, contentWidth, 1.5).fill(goldColor);
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
        doc.text('#', colX0, sTableY + 6, { width: colW0, align: 'center' });
        doc.text('Service / Production Deliverable', colX1, sTableY + 6, { width: colW1, align: 'left' });
        doc.text('Quantity', colX2, sTableY + 6, { width: colW2, align: 'center' });
        doc.text('Rate', colX3, sTableY + 6, { width: colW3, align: 'right' });
        doc.text('Total', colX4, sTableY + 6, { width: colW4, align: 'right' });
        sTableY += 20;
        doc.y = sTableY;

        serviceItems.forEach((s, idx) => {
          ensureSpace(22);
          const sCurrentY = doc.y;
          const { title, subtitle } = formatServiceLineTitle(s.cleanName);
          const price = Number(s.unitPrice || 0);
          const qty = Number(s.quantity || 1);
          const unit = s.unit || 'unit';
          const tot = Number(s.amount ?? qty * price);
          const rowH = subtitle ? 25 : 18;

          if (idx % 2 === 1) {
            doc.rect(tableX, sCurrentY, contentWidth, rowH).fill('#FAFAFA');
          }
          doc.rect(tableX, sCurrentY + rowH - 0.5, contentWidth, 0.5).fill('#F1F5F9');

          doc.font('Helvetica').fontSize(7.5).fillColor(textMuted).text(String(idx + 1), colX0, sCurrentY + 5, {
            width: colW0,
            align: 'center',
          });
          doc.font('Helvetica-Bold').fontSize(8).fillColor(textDark).text(title, colX1, sCurrentY + 5, {
            width: colW1,
            ellipsis: true,
          });

          if (subtitle) {
            doc.font('Helvetica-Oblique').fontSize(7).fillColor(textMuted).text(subtitle, colX1, sCurrentY + 14.5, {
              width: colW1,
              ellipsis: true,
            });
          }

          doc.font('Helvetica').fontSize(8).fillColor('#334155').text(`${qty} ${unit}`, colX2, sCurrentY + 5, {
            width: colW2,
            align: 'center',
          });
          doc.font('Helvetica').fontSize(8).fillColor('#334155').text(price > 0 ? fmtInr(price) : '—', colX3, sCurrentY + 5, {
            width: colW3,
            align: 'right',
          });
          doc.font('Helvetica-Bold').fillColor(primaryNavy).text(tot > 0 ? fmtInr(tot) : 'Included', colX4, sCurrentY + 5, {
            width: colW4,
            align: 'right',
          });

          doc.y = sCurrentY + rowH;
        });
      }

      // ── 5. Balanced Side-by-Side Summary & Terms Block ─────────
      ensureSpace(230);
      doc.y += 12;
      const cardY = doc.y;
      const cardH = 138;

      const subTotal = Number(quotation.subTotal || quotation.grandTotal || 0);
      const discount = Number(quotation.discountAmount || 0);
      const extra = Number(quotation.extraChargesAmount || 0);
      const gst = Number(quotation.gstAmount || 0);
      const grandTotal = Number(quotation.grandTotal || subTotal);

      // Left Column: Payment Milestones & Quality Standards Card
      const leftCardX = margin;
      const leftCardW = 252;
      doc.roundedRect(leftCardX, cardY, leftCardW, cardH, 5).fill('#FBFBFA').stroke('#E8E4DD');

      // Card Header
      doc.rect(leftCardX, cardY, leftCardW, 22).fill('#F4EFE6');
      doc.rect(leftCardX, cardY, 3, 22).fill(goldColor);
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(primaryNavy)
        .text('PAYMENT MILESTONES & CATERING STANDARDS', leftCardX + 10, cardY + 7);

      let lcy = cardY + 28;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(primaryNavy).text('1. Advance Deposit (50%):', leftCardX + 10, lcy);
      doc.font('Helvetica').fontSize(7.5).fillColor(textDark).text('Required to confirm date & reserve kitchen slot.', leftCardX + 10, lcy + 10);
      lcy += 23;

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(primaryNavy).text('2. Balance Settlement (50%):', leftCardX + 10, lcy);
      doc.font('Helvetica').fontSize(7.5).fillColor(textDark).text('Due on event date upon banquet delivery.', leftCardX + 10, lcy + 10);
      lcy += 23;

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(primaryNavy).text('3. Guest Count Policy:', leftCardX + 10, lcy);
      doc.font('Helvetica').fontSize(7.5).fillColor(textDark).text('Final head count must be locked 72 hrs prior.', leftCardX + 10, lcy + 10);
      lcy += 23;

      // Divider & Quality badge
      doc.rect(leftCardX + 10, lcy, leftCardW - 20, 0.5).fill('#E2E8F0');
      lcy += 6;
      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor(goldColor)
        .text('✓ 100% Pure Cow Ghee  •  Cold-Pressed Oils  •  Master Chefs', leftCardX + 10, lcy, {
          width: leftCardW - 20,
          align: 'center',
        });

      // Right Column: Commercial Estimate Summary Card
      const rightCardX = margin + 262;
      const rightCardW = contentWidth - 262; // 261.28
      doc.roundedRect(rightCardX, cardY, rightCardW, cardH, 5).fill('#FFFFFF').stroke('#E2E8F0');

      // Card Header
      doc.rect(rightCardX, cardY, rightCardW, 22).fill(primaryNavy);
      doc.rect(rightCardX, cardY + 20.5, rightCardW, 1.5).fill(goldColor);
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#FFFFFF')
        .text('COMMERCIAL ESTIMATE SUMMARY', rightCardX + 10, cardY + 7);

      let rcy = cardY + 28;
      const labelX = rightCardX + 10;
      const valX = rightCardX + 115;
      const valW = rightCardW - 125;

      doc.font('Helvetica').fontSize(8).fillColor(textMuted).text('Sub Total (Menu Items):', labelX, rcy);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(textDark).text(fmtInr(subTotal), valX, rcy, { width: valW, align: 'right' });
      rcy += 15;

      if (discount > 0) {
        doc.font('Helvetica').fontSize(8).fillColor('#DC2626').text('Discount Privilege (-):', labelX, rcy);
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#DC2626').text(`- ${fmtInr(discount)}`, valX, rcy, { width: valW, align: 'right' });
        rcy += 15;
      }

      if (extra > 0) {
        doc.font('Helvetica').fontSize(8).fillColor(textMuted).text('Extra Services / Logistics (+):', labelX, rcy);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(textDark).text(`+ ${fmtInr(extra)}`, valX, rcy, { width: valW, align: 'right' });
        rcy += 15;
      }

      const gstPct = Number(quotation.gstPercent || 5);
      if (gst > 0) {
        doc.font('Helvetica').fontSize(8).fillColor(textMuted).text(`Applicable GST (${gstPct}%):`, labelX, rcy);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(textDark).text(fmtInr(gst), valX, rcy, { width: valW, align: 'right' });
        rcy += 15;
      } else {
        doc.font('Helvetica').fontSize(8).fillColor(textMuted).text('GST:', labelX, rcy);
        doc.font('Helvetica').fontSize(8).fillColor(textMuted).text('Not Applicable (0%)', valX, rcy, { width: valW, align: 'right' });
        rcy += 15;
      }

      // Grand Total Highlight Banner
      const gTotY = cardY + cardH - 30;
      doc.roundedRect(rightCardX + 6, gTotY, rightCardW - 12, 24, 4).fill(primaryNavy);
      doc.rect(rightCardX + 6, gTotY, 3, 24).fill(goldColor);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF').text('TOTAL AMOUNT:', rightCardX + 14, gTotY + 7);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#F3CA52').text(fmtInr(grandTotal), rightCardX + 110, gTotY + 6, {
        width: rightCardW - 122,
        align: 'right',
      });

      doc.y = cardY + cardH + 10;

      // ── 6. Terms & Execution Notes ────────────────────────────
      ensureSpace(115);
      const termsY = doc.y;
      doc.roundedRect(margin, termsY, contentWidth, 40, 4).fill('#FBFBFA').stroke('#E8E4DD');
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(goldColor)
        .text('GENERAL BOOKING CONDITIONS & EXECUTION NOTES', margin + 10, termsY + 6);

      const defaultTerms =
        '1. 50% advance payment required upon quote acceptance to confirm booking. 2. Final guest count must be locked 72 hours prior to the event. 3. Pure cow ghee and certified culinary ingredients used in all preparations. 4. Host venue must provide uninterrupted running water, power, and setup access.';
      const termsText = quotation.terms?.trim() || defaultTerms;

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(textDark)
        .text(termsText, margin + 10, termsY + 16, { width: contentWidth - 20, lineGap: 1.5 });

      // ── 7. Balanced Dual Signatures Block ──────────────────────
      const sigY = termsY + 46;
      const sigBoxW = 252;

      // Client Acceptance Card (Left)
      doc.roundedRect(margin, sigY, sigBoxW, 52, 4).fill('#FFFFFF').stroke('#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(goldColor).text('CLIENT ACCEPTANCE & APPROVAL', margin + 10, sigY + 6);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark).text('Client: ' + (quotation.customerName || 'Valued Guest'), margin + 10, sigY + 18);
      doc.font('Helvetica').fontSize(7).fillColor(textMuted).text('Signature: ................................................................', margin + 10, sigY + 31);
      doc.font('Helvetica').fontSize(7).fillColor(textMuted).text('Date: ........................................', margin + 10, sigY + 41);

      // Authorized Signatory Card (Right)
      const compSigX = margin + 271;
      doc.roundedRect(compSigX, sigY, sigBoxW, 52, 4).fill('#FFFFFF').stroke('#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(goldColor).text('AUTHORIZED SIGNATORY', compSigX + 10, sigY + 6);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(primaryNavy).text('Thankam Events Management', compSigX + 10, sigY + 18);
      doc.font('Helvetica').fontSize(7).fillColor(textMuted).text('Seal & Signature: ........................................................', compSigX + 10, sigY + 31);
      doc.font('Helvetica').fontSize(7).fillColor(textMuted).text('Central Kitchen Fleet • Kollam, Kerala', compSigX + 10, sigY + 41);

      // ── 8. Strict Two-Pass Footer (Zero Overflow Engine) ───────
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        const oldBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        // Bottom hairline rule
        doc.rect(margin, 804, contentWidth, 0.5).fill('#CBD5E1');

        // Left Footer
        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(textMuted)
          .text(
            'Thankam Events Management  •  Celebrations Crafted  •  Central Kitchen: Chinnakkada, Kollam  •  https://thankamevents.in',
            margin,
            810,
            { width: contentWidth - 90, align: 'left', lineBreak: false },
          );

        // Right Footer: Exact Page X of Y
        doc
          .font('Helvetica-Bold')
          .fontSize(7)
          .fillColor(textMuted)
          .text(`Page ${i + 1} of ${range.count}`, margin, 810, {
            width: contentWidth,
            align: 'right',
            lineBreak: false,
          });

        doc.page.margins.bottom = oldBottom;
      }

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
        bufferPages: true,
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
        .text('CATERING & EVENT SERVICE AGREEMENT', margin, 30, { align: 'center', width: contentWidth });

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
          `This Catering & Event Agreement is entered into between ${quotation.customerName} (hereinafter referred to as the "Client") and Thankam Events Management (hereinafter referred to as the "Company"). The Company agrees to provide culinary preparations, catering service crew, and event management deliverables for the event specified herein.`,
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

      doc.text(`Event: ${quotation.eventType || 'Catering Event'}`, margin + 180, specY + 6);
      doc.text(`Date: ${fmtDate(quotation.eventDate)}`, margin + 180, specY + 18);

      doc.text(`Guests: ${quotation.guestCount || '—'}`, margin + 350, specY + 6);
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

      // ── Two-Pass Footer (Zero Overflow Engine) ─────────────────
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        const oldBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        doc.rect(margin, 804, contentWidth, 0.5).fill('#CBD5E1');
        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(textMuted)
          .text(
            'Thankam Events Management  •  Legally Binding Contract  •  https://thankamevents.in',
            margin,
            810,
            { width: contentWidth - 90, align: 'left', lineBreak: false },
          );
        doc
          .font('Helvetica-Bold')
          .fontSize(7)
          .fillColor(textMuted)
          .text(`Page ${i + 1} of ${range.count}`, margin, 810, {
            width: contentWidth,
            align: 'right',
            lineBreak: false,
          });

        doc.page.margins.bottom = oldBottom;
      }

      doc.end();
    });
  }
}

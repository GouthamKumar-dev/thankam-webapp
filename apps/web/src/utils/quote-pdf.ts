import html2pdf from 'html2pdf.js';
import {
  isEventServiceItem,
  getServiceDepartmentGroup,
  formatServiceLineTitle,
} from '@/features/quotations/event-services.catalog';

export type PdfLine = {
  name: string;
  category?: string;
  quantity: number;
  unit?: string | null;
  unitPrice?: number | null;
  amount?: number | null;
  imageUrl?: string | null;
};

export type RejectionEntry = { date: string; reason: string };

export type PdfQuoteInput = {
  quotationNumber: string;
  createdAt?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  eventType?: string;
  eventDate?: string;
  venue?: string;
  guestCount?: number;
  lines: PdfLine[];
  /* Per Person mode */
  isPerPerson?: boolean;
  perPersonRate?: number;
  perPersonGuests?: number;
  /* Totals */
  subTotal?: number;
  discountAmount?: number;
  extraChargesAmount?: number;
  gstPercent?: number;
  gstAmount?: number;
  grandTotal?: number;
  /* Revision history */
  rejectionHistory?: RejectionEntry[];
  companyName?: string;
  companyTagline?: string;
  companyLogoUrl?: string;
};

function fmt(d?: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function inr(n?: number | null) {
  if (n === undefined || n === null || n === 0) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);
}

function inrFull(n?: number | null) {
  const val = Number(n || 0);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(val);
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
  // All catering food dishes, breads (porotta, appam, chappathi), dosas,
  // snacks, pieces, plates, bowls, scoops, kg, gm, person, pax, etc. display as Guests!
  return `${qty} ${guestLabel}`;
}

export function generateQuoteHtml(q: PdfQuoteInput): string {
  const isPP = Boolean(q.isPerPerson && q.perPersonRate && q.perPersonGuests);

  // Split lines into Food dishes vs Event Services & Rentals
  const foodLines: PdfLine[] = [];
  const serviceLines: PdfLine[] = [];

  for (const l of q.lines) {
    if (isPP) {
      if (isEventServiceItem(l) || Number(l.amount || 0) > 0 || Number(l.unitPrice || 0) > 0) {
        serviceLines.push(l);
      } else {
        foodLines.push(l);
      }
    } else {
      if (isEventServiceItem(l)) {
        serviceLines.push(l);
      } else {
        foodLines.push(l);
      }
    }
  }

  // Group food lines by category
  const foodGroups: Record<string, PdfLine[]> = {};
  for (const l of foodLines) {
    const cat = l.category || 'Dishes';
    (foodGroups[cat] = foodGroups[cat] ?? []).push(l);
  }

  // Group service lines by department (Decor, Production, Rentals, Staff)
  const serviceGroups: Record<string, { icon: string; lines: PdfLine[] }> = {};
  for (const l of serviceLines) {
    const meta = getServiceDepartmentGroup(l.name, l.category);
    if (!serviceGroups[meta.group]) {
      serviceGroups[meta.group] = { icon: meta.icon, lines: [] };
    }
    serviceGroups[meta.group].lines.push(l);
  }

  let tableHtml = '';

  /* ── 1. Food Menu Section ── */
  if (foodLines.length > 0 || isPP) {
    let globalIndex = 1;
    const catRows = Object.entries(foodGroups).map(([cat, lines]) => {
      const categoryHeader = `
        <tr class="cat-header-tr">
          <td colspan="5" class="cat-cell">
            <div class="cat-content">
              <span class="cat-title">${cat.toUpperCase()}</span>
              <span class="cat-count">${lines.length} ${lines.length === 1 ? 'ITEM' : 'ITEMS'}</span>
            </div>
          </td>
        </tr>`;

      const itemRows = lines.map((l) => {
        const { title, subtitle } = formatServiceLineTitle(l.name);
        const qty = Number(l.quantity || 1);
        const unit = l.unit || 'plate';
        const unitPrice = Number(l.unitPrice || 0);
        const amount = Number(l.amount ?? qty * unitPrice);
        const rowNum = globalIndex++;

        return `
          <tr class="dish-row ${rowNum % 2 === 0 ? 'even-row' : ''}">
            <td class="col-num">${rowNum}</td>
            <td class="col-desc">
              <div class="dish-title">${title}</div>
              ${subtitle ? `<div class="dish-sub">${subtitle}</div>` : ''}
            </td>
            <td class="col-qty">${formatFoodMenuQtyAndUnit(qty, unit)}</td>
            <td class="col-rate">${unitPrice > 0 ? inr(unitPrice) : '—'}</td>
            <td class="col-amount">${amount > 0 ? inr(amount) : '<span class="incl-text">Included</span>'}</td>
          </tr>`;
      }).join('');

      return categoryHeader + itemRows;
    }).join('');

    tableHtml += `
      <div class="menu-sec-header">
        <div class="sec-title-main">1. CATERING FOOD MENU ${isPP ? '(INCLUDED IN PACKAGE)' : ''}</div>
        <div class="sec-title-meta">${foodLines.length} CURATED DISHES &bull; ${q.guestCount || '—'} GUESTS</div>
      </div>
      <table class="luxury-table">
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th class="col-desc">DISH DESCRIPTION</th>
            <th class="col-qty">QUANTITY</th>
            <th class="col-rate">RATE</th>
            <th class="col-amount">AMOUNT</th>
          </tr>
        </thead>
        <tbody>${catRows}</tbody>
      </table>`;

    if (isPP && q.perPersonRate && q.perPersonGuests) {
      tableHtml += `
        <div class="pp-banner">
          <div class="pp-label">PACKAGE PRICING CALCULATION</div>
          <div class="pp-calc">
            <span>${q.perPersonGuests} Guests &nbsp;&times;&nbsp; <strong>${inrFull(q.perPersonRate)}</strong> / Person &nbsp;=&nbsp;</span>
            <span class="pp-total">${inrFull(q.perPersonRate * q.perPersonGuests)}</span>
          </div>
        </div>`;
    }
  }

  /* ── 2. Event Decor, Production & Rentals Section ── */
  if (serviceLines.length > 0) {
    let serviceIndex = 1;
    const sRows = Object.entries(serviceGroups).map(([groupName, { icon, lines }]) => {
      const gHeader = `
        <tr class="cat-header-tr">
          <td colspan="5" class="cat-cell service-cat">
            <div class="cat-content">
              <span class="cat-title">${icon ? icon + ' ' : ''}${groupName.toUpperCase()}</span>
              <span class="cat-count">${lines.length} ${lines.length === 1 ? 'ITEM' : 'ITEMS'}</span>
            </div>
          </td>
        </tr>`;

      const items = lines.map(l => {
        const { title, subtitle } = formatServiceLineTitle(l.name);
        const qty = Number(l.quantity || 1);
        const unit = l.unit || 'unit';
        const price = Number(l.unitPrice || 0);
        const tot = Number(l.amount ?? qty * price);
        const rowNum = serviceIndex++;

        return `
          <tr class="dish-row ${rowNum % 2 === 0 ? 'even-row' : ''}">
            <td class="col-num">${rowNum}</td>
            <td class="col-desc">
              <div class="dish-title">${title}</div>
              ${subtitle ? `<div class="dish-sub">${subtitle}</div>` : ''}
            </td>
            <td class="col-qty">${qty} ${unit}</td>
            <td class="col-rate">${price > 0 ? inr(price) : '—'}</td>
            <td class="col-amount">${tot > 0 ? inr(tot) : '<span class="incl-text">Included</span>'}</td>
          </tr>`;
      }).join('');

      return gHeader + items;
    }).join('');

    tableHtml += `
      <div class="menu-sec-header" style="margin-top:16px;">
        <div class="sec-title-main gold-sec">2. DECOR, PRODUCTION &amp; EVENT RENTALS</div>
      </div>
      <table class="luxury-table">
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th class="col-desc">SERVICE / PRODUCTION DELIVERABLE</th>
            <th class="col-qty">QUANTITY</th>
            <th class="col-rate">RATE</th>
            <th class="col-amount">TOTAL</th>
          </tr>
        </thead>
        <tbody>${sRows}</tbody>
      </table>`;
  }

  /* ── Totals Calculation ── */
  const subTotal = Number(q.subTotal || q.grandTotal || 0);
  const discount = Number(q.discountAmount || 0);
  const extra = Number(q.extraChargesAmount || 0);
  const gst = Number(q.gstAmount || 0);
  const grandTotal = Number(q.grandTotal || subTotal);
  const hasGst = gst > 0 && Number(q.gstPercent || 0) > 0;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Quotation ${q.quotationNumber}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body, .quote-body {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1E293B;
  background: #ffffff;
  padding: 30px 36px;
  font-size: 8.5px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}

/* ── Top Header ── */
.top-bar-navy {
  height: 3.5px;
  background: #0F1B3C;
  width: 100%;
  margin-bottom: 14px;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 12px;
  border-bottom: 1px solid #E2E8F0;
  margin-bottom: 12px;
}
.co-info-left {
  flex: 1;
  max-width: 62%;
}
.co-name {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 21px;
  font-weight: 700;
  color: #0F1B3C;
  letter-spacing: -0.2px;
  line-height: 1.15;
}
.co-tag {
  font-size: 8px;
  font-weight: 700;
  color: #B8860B;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-top: 4px;
}
.co-addr {
  font-size: 7.5px;
  color: #64748B;
  margin-top: 4px;
  line-height: 1.35;
}

.q-meta-right {
  display: flex;
  align-items: stretch;
  gap: 12px;
  text-align: right;
}
.gold-divider-v {
  width: 2px;
  background: #B8860B;
  border-radius: 1px;
}
.q-meta-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.q-meta-lbl {
  font-size: 8.5px;
  font-weight: 700;
  color: #B8860B;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.q-meta-num {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 16px;
  font-weight: 700;
  color: #0F1B3C;
  margin-top: 2px;
}
.q-meta-date {
  font-size: 8px;
  color: #64748B;
  margin-top: 2px;
}

/* ── Customer Details Box ── */
.details-box {
  border: 1px solid #E2E8F0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 14px;
  background: #FFFFFF;
}
.details-header {
  background: #0F1B3C;
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 5px 12px;
}
.details-col-title {
  font-size: 8px;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.details-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 0;
}
.details-left {
  padding: 8px 12px;
  border-right: 1px solid #E2E8F0;
}
.details-right {
  padding: 8px 12px;
}
.d-name {
  font-size: 11px;
  font-weight: 700;
  color: #0F1B3C;
  margin-bottom: 3px;
}
.d-text {
  font-size: 8px;
  color: #334155;
  margin-bottom: 2px;
  line-height: 1.3;
}

/* ── Section Titles ── */
.menu-sec-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
  margin-top: 10px;
}
.sec-title-main {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 11px;
  font-weight: 700;
  color: #0F1B3C;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.sec-title-main.gold-sec {
  color: #B8860B;
}
.sec-title-meta {
  font-size: 8px;
  font-weight: 700;
  color: #B8860B;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* ── Table Styling ── */
.luxury-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 8px;
}
.luxury-table thead tr {
  background: #0F1B3C;
  border-bottom: 1.5px solid #B8860B;
}
.luxury-table th {
  padding: 6px 8px;
  font-size: 7.5px;
  font-weight: 700;
  color: #FFFFFF;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.col-num { width: 28px; text-align: center; }
.col-desc { text-align: left; }
.col-qty { width: 85px; text-align: center; }
.col-rate { width: 65px; text-align: right; }
.col-amount { width: 75px; text-align: right; }

.cat-header-tr {
  page-break-after: avoid;
}
.cat-cell {
  background: #FBF9F5;
  border-left: 3px solid #B8860B;
  border-bottom: 1px solid #EAE5DC;
  padding: 4px 8px;
}
.cat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cat-title {
  font-size: 8px;
  font-weight: 700;
  color: #0F1B3C;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.cat-count {
  font-size: 7.5px;
  color: #64748B;
  font-weight: 500;
}
.dish-row {
  border-bottom: 1px solid #F1F5F9;
  page-break-inside: avoid;
}
.dish-row.even-row {
  background: #FAFAFA;
}
.dish-row td {
  padding: 5px 8px;
  vertical-align: middle;
}
.dish-row .col-num {
  font-size: 7.5px;
  color: #64748B;
}
.dish-title {
  font-size: 8px;
  font-weight: 700;
  color: #1E293B;
}
.dish-sub {
  font-size: 7px;
  font-style: italic;
  color: #64748B;
  margin-top: 1px;
}
.dish-row .col-qty {
  font-size: 8px;
  color: #334155;
}
.dish-row .col-rate {
  font-size: 8px;
  color: #334155;
}
.dish-row .col-amount {
  font-size: 8px;
  font-weight: 700;
  color: #0F1B3C;
}
.incl-text {
  color: #0F1B3C;
  font-weight: 700;
}

/* ── Per Person Banner ── */
.pp-banner {
  border: 1px solid #B8860B;
  border-radius: 4px;
  overflow: hidden;
  margin: 8px 0 12px 0;
  page-break-inside: avoid;
}
.pp-label {
  font-size: 7.5px;
  font-weight: 700;
  color: #B8860B;
  background: #FDF3D0;
  padding: 4px 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.pp-calc {
  padding: 8px 10px;
  font-size: 9px;
  background: #FBFBF9;
  color: #1E293B;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pp-total {
  font-size: 11px;
  font-weight: 800;
  color: #B8860B;
}

/* ── Side-by-Side Summary Cards ── */
.cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
  margin-bottom: 10px;
  page-break-inside: avoid;
}
.card {
  border-radius: 4px;
  overflow: hidden;
}
.left-card {
  border: 1px solid #E8E4DD;
  background: #FBFBFA;
}
.right-card {
  border: 1px solid #E2E8F0;
  background: #FFFFFF;
}
.card-header {
  background: #0F1B3C;
  border-bottom: 1.5px solid #B8860B;
  padding: 5px 10px;
  font-size: 7.5px;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.card-body {
  padding: 8px 10px;
}
.milestone-item {
  font-size: 7.5px;
  color: #1E293B;
  margin-bottom: 6px;
  line-height: 1.35;
}
.milestone-item strong {
  color: #0F1B3C;
}
.card-divider-dotted {
  border-top: 1px dotted #CBD5E1;
  margin: 6px 0;
}
.quality-badge {
  text-align: center;
  font-size: 7px;
  font-weight: 700;
  color: #B8860B;
  letter-spacing: 0.04em;
}

.summary-line {
  display: flex;
  justify-content: space-between;
  font-size: 8px;
  color: #64748B;
  margin-bottom: 4px;
}
.summary-line .val-bold {
  font-weight: 700;
  color: #1E293B;
}
.summary-line.discount-line {
  color: #DC2626;
}
.summary-line.discount-line .val-bold {
  color: #DC2626;
}
.card-divider-solid {
  border-top: 1px solid #E2E8F0;
  margin: 6px 0;
}
.total-banner {
  background: #0F1B3C;
  border-left: 3px solid #B8860B;
  border-radius: 3px;
  padding: 5px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.total-lbl {
  color: #FFFFFF;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.total-val {
  color: #F3CA52;
  font-size: 11px;
  font-weight: 800;
}

/* ── General Booking Conditions ── */
.notes-box {
  border: 1px solid #E8E4DD;
  border-left: 3px solid #B8860B;
  border-radius: 3px;
  background: #FBFBFA;
  padding: 7px 10px;
  margin-bottom: 10px;
  page-break-inside: avoid;
}
.notes-title {
  font-size: 7.5px;
  font-weight: 700;
  color: #B8860B;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.notes-content {
  font-size: 7px;
  color: #334155;
  line-height: 1.4;
}

/* ── Dual Signatures Block ── */
.sig-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
  page-break-inside: avoid;
}
.sig-card {
  border: 1px solid #E2E8F0;
  border-radius: 4px;
  background: #FFFFFF;
  padding: 6px 10px;
}
.sig-title {
  font-size: 7.5px;
  font-weight: 700;
  color: #0F1B3C;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 14px;
}
.sig-line {
  border-bottom: 1px solid #CBD5E1;
  margin-bottom: 4px;
}
.sig-footer {
  display: flex;
  justify-content: space-between;
  font-size: 7px;
  color: #334155;
}

/* ── Footer ── */
.doc-footer {
  border-top: 0.5px solid #CBD5E1;
  padding-top: 6px;
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  font-size: 7px;
  color: #64748B;
  page-break-inside: avoid;
}

/* ── Revision History ── */
.rev-section {
  margin-top: 14px;
  page-break-inside: avoid;
}
.rev-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 4px;
}
.rev-table th {
  font-size: 7.5px;
  font-weight: 700;
  color: #999;
  padding: 5px 8px;
  background: #fff5f5;
  text-align: left;
  border-bottom: 1.5px solid #fecaca;
}
.rev-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #fff0f0;
  font-size: 7.5px;
}
.rev-num { width: 28px; text-align: center; color: #ef4444; font-weight: 800; }
.rev-badge {
  display: inline-block;
  background: #fee2e2;
  color: #b91c1c;
  border-radius: 999px;
  font-size: 7px;
  font-weight: 700;
  padding: 1px 6px;
  text-transform: uppercase;
}

@media print {
  body { padding: 0; }
  @page { margin: 8mm 10mm; }
}
</style>
</head>
<body>
<div class="top-bar-navy"></div>

<div class="header-row">
  <div class="co-info-left">
    <div class="co-name">${q.companyName ?? 'Thankam Events Management'}</div>
    <div class="co-tag">${q.companyTagline ?? 'CELEBRATIONS CRAFTED'}</div>
    <div class="co-addr">Central Kitchen: Chinnakkada, Kollam, Kerala | Phone: +91 97456 84766 / +91 92076 06150 &bull; Web: https://thankamevents.in</div>
  </div>
  <div class="q-meta-right">
    <div class="gold-divider-v"></div>
    <div class="q-meta-content">
      <div class="q-meta-lbl">QUOTATION ESTIMATE</div>
      <div class="q-meta-num">${q.quotationNumber}</div>
      <div class="q-meta-date">Issued: ${fmt(q.createdAt)}</div>
    </div>
  </div>
</div>

<div class="details-box">
  <div class="details-header">
    <span class="details-col-title">CUSTOMER DETAILS</span>
    <span class="details-col-title">EVENT SPECIFICATIONS</span>
  </div>
  <div class="details-body">
    <div class="details-left">
      <div class="d-name">${q.customerName}</div>
      <div class="d-text">Phone: ${q.customerPhone || '—'}</div>
      <div class="d-text">Email: ${q.customerEmail || '—'}</div>
    </div>
    <div class="details-right">
      <div class="d-name">${q.eventType || 'Catering Event'}</div>
      <div class="d-text">Event Date: ${fmt(q.eventDate)} &nbsp;&bull;&nbsp; Guests: ${q.guestCount || '—'}</div>
      <div class="d-text">Venue: ${q.venue || 'To be specified'}</div>
    </div>
  </div>
</div>

${tableHtml}

<div class="cards-grid">
  <!-- Left Card: Milestones & Catering Standards -->
  <div class="card left-card">
    <div class="card-header">PAYMENT MILESTONES &amp; CATERING STANDARDS</div>
    <div class="card-body">
      <div class="milestone-item">
        <strong>1. Advance Deposit (50%):</strong>
        <span>Required to confirm date &amp; reserve kitchen slot.</span>
      </div>
      <div class="milestone-item">
        <strong>2. Balance Settlement (50%):</strong>
        <span>Due on event date upon banquet delivery.</span>
      </div>
      <div class="milestone-item">
        <strong>3. Guest Count Policy:</strong>
        <span>Final head count must be locked 72 hrs prior.</span>
      </div>
      <div class="card-divider-dotted"></div>
      <div class="quality-badge">&check; 100% Pure Cow Ghee &bull; Cold-Pressed Oils &bull; Master Chefs</div>
    </div>
  </div>

  <!-- Right Card: Commercial Estimate Summary -->
  <div class="card right-card">
    <div class="card-header">COMMERCIAL ESTIMATE SUMMARY</div>
    <div class="card-body">
      <div class="summary-line">
        <span>Sub Total (Menu Items):</span>
        <span class="val-bold">${inrFull(subTotal)}</span>
      </div>
      ${discount > 0 ? `
      <div class="summary-line discount-line">
        <span>Discount Privilege (&minus;):</span>
        <span class="val-bold">&minus; ${inrFull(discount)}</span>
      </div>` : ''}
      ${extra > 0 ? `
      <div class="summary-line">
        <span>Extra Services / Logistics (+):</span>
        <span class="val-bold">+ ${inrFull(extra)}</span>
      </div>` : ''}
      <div class="summary-line">
        <span>GST:</span>
        <span>${hasGst ? inrFull(q.gstAmount) : 'Not Applicable (0%)'}</span>
      </div>
      <div class="card-divider-solid"></div>
      <div class="total-banner">
        <span class="total-lbl">TOTAL AMOUNT:</span>
        <span class="total-val">${inrFull(grandTotal)}</span>
      </div>
    </div>
  </div>
</div>

<!-- Booking Conditions & Execution Notes -->
<div class="notes-box">
  <div class="notes-title">GENERAL BOOKING CONDITIONS &amp; EXECUTION NOTES</div>
  <div class="notes-content">
    1. 50% advance payment required upon quote acceptance to confirm booking.<br/>
    2. Final guest count must be locked 72 hours prior to the event.<br/>
    3. Pure cow ghee and certified culinary ingredients used in all preparations.<br/>
    4. Host venue must provide uninterrupted running water, power, and setup access.
  </div>
</div>

<!-- Dual Signatures Block -->
<div class="sig-grid">
  <div class="sig-card">
    <div class="sig-title">CLIENT ACCEPTANCE &amp; APPROVAL</div>
    <div class="sig-line"></div>
    <div class="sig-footer">
      <span>Client: <strong>${q.customerName}</strong></span>
      <span>Date: ________________</span>
    </div>
  </div>
  <div class="sig-card">
    <div class="sig-title">AUTHORIZED SIGNATORY</div>
    <div class="sig-line"></div>
    <div class="sig-footer">
      <span>Thankam Events Management</span>
      <span style="color:#64748B;">Central Kitchen Fleet, Kollam</span>
    </div>
  </div>
</div>

${q.rejectionHistory && q.rejectionHistory.length > 0 ? `
<div class="rev-section">
  <div class="sec-title-main" style="margin-bottom:4px">Revision History &nbsp;<span style="font-size:8px;font-weight:600;color:#888">(${q.rejectionHistory.length} decline${q.rejectionHistory.length > 1 ? 's' : ''})</span></div>
  <table class="rev-table">
    <thead><tr><th class="rev-num">#</th><th>Date</th><th>Customer's Reason</th></tr></thead>
    <tbody>
      ${q.rejectionHistory.map((e, i) => `
        <tr>
          <td class="rev-num">${i + 1}</td>
          <td style="width:130px;color:#64748B">${new Date(e.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
          <td>
            <div class="rev-badge">Declined</div><br/>${e.reason}
          </td>
        </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<div class="doc-footer">
  <span>Thankam Events Management &bull; Celebrations Crafted &bull; Central Kitchen: Chinnakkada, Kollam &bull; https://thankamevents.in</span>
  <span>Official Quotation Proposal</span>
</div>
</body>
</html>`;

  return html;
}

export async function downloadQuotePdf(q: PdfQuoteInput): Promise<void> {
  const html = generateQuoteHtml(q);
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '-100000px';
  host.style.width = '794px';
  host.style.height = 'auto';
  host.style.overflow = 'hidden';
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-99999';

  const container = document.createElement('div');
  container.className = 'quote-body';
  container.innerHTML = html;
  container.style.width = '794px';
  container.style.background = '#ffffff';

  host.appendChild(container);
  document.body.appendChild(host);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    const images = Array.from(container.querySelectorAll('img'));
    if (images.length > 0) {
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
              } else {
                img.onload = () => resolve();
                img.onerror = () => resolve();
                setTimeout(resolve, 2000);
              }
            }),
        ),
      );
    }

    const opt = {
      margin: 8,
      filename: `Quotation-${q.quotationNumber}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const, compress: true },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };
    await html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.error('Direct PDF generation fallback to popup window', err);
    const win = window.open('', '_blank', 'width=960,height=720');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
    }
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}

export async function generateQuotePdfBase64(q: PdfQuoteInput): Promise<string> {
  const html = generateQuoteHtml(q);
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '-100000px';
  host.style.width = '794px';
  host.style.height = 'auto';
  host.style.overflow = 'hidden';
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-99999';

  const container = document.createElement('div');
  container.className = 'quote-body';
  container.innerHTML = html;
  container.style.width = '794px';
  container.style.background = '#ffffff';

  host.appendChild(container);
  document.body.appendChild(host);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    const images = Array.from(container.querySelectorAll('img'));
    if (images.length > 0) {
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
              } else {
                img.onload = () => resolve();
                img.onerror = () => resolve();
                setTimeout(resolve, 2000);
              }
            }),
        ),
      );
    }

    const opt = {
      margin: 8,
      filename: `Quotation-${q.quotationNumber}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const, compress: true },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataUri = await (html2pdf() as any).set(opt).from(container).outputPdf('datauristring');
    const base64 = typeof dataUri === 'string' && dataUri.includes(',') ? dataUri.split(',')[1] : String(dataUri);
    return base64;
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}

export function openQuotePdf(q: PdfQuoteInput) {
  void downloadQuotePdf(q);
}

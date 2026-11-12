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
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function inr(n?: number | null) {
  if (!n || n === 0) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);
}

function inrFull(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);
}

const ALLOWED_UNITS = ['plate', 'bowl', 'glass', 'piece', 'scoop'];
function safeUnit(u?: string | null) {
  const r = (u ?? '').toLowerCase().trim();
  return ALLOWED_UNITS.includes(r) ? r : 'plate';
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

  const thumb = (url?: string | null) => url
    ? `<img src="${url}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;border:1px solid #EDE8DF;display:block" alt=""/>`
    : `<div style="width:36px;height:36px;background:#f5f0e8;border-radius:6px;border:1px solid #EDE8DF"></div>`;

  let tableHtml = '';

  /* ── 1. Food Menu Section ── */
  if (foodLines.length > 0 || isPP) {
    if (isPP) {
      const rows = Object.entries(foodGroups).map(([cat, lines]) => `
        <tr><td colspan="3" class="cat-row">${cat}</td></tr>
        ${lines.map((l, i) => {
          const { title, subtitle } = formatServiceLineTitle(l.name);
          return `
          <tr>
            <td style="width:44px;padding:6px 8px">${thumb(l.imageUrl)}</td>
            <td class="right" style="width:32px;color:#aaa;font-size:11px">${i + 1}</td>
            <td>
              <div style="font-weight:600;color:#1A202C">${title}</div>
              ${subtitle ? `<div style="font-size:10.5px;color:#666;font-style:italic;margin-top:2px;line-height:1.3">${subtitle}</div>` : ''}
            </td>
          </tr>`;
        }).join('')}
      `).join('');

      tableHtml += `
        <div class="sec-title" style="margin-bottom:8px">1. Food Menu</div>
        <table>
          <thead><tr><th style="width:44px"></th><th style="width:32px">#</th><th>Dishes Included</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="pp-banner" style="margin-top:10px;margin-bottom:18px">
          <div class="pp-label">Rate / Person</div>
          <div class="pp-calc">
            ${q.perPersonGuests} guests
            &nbsp;×&nbsp;
            <strong>${inrFull(q.perPersonRate!)}</strong>
            &nbsp;=&nbsp;
            <span class="pp-total">${inrFull((q.perPersonRate ?? 0) * (q.perPersonGuests ?? 0))}</span>
          </div>
        </div>`;
    } else {
      const rows = Object.entries(foodGroups).map(([cat, lines]) => `
        <tr><td colspan="4" class="cat-row">${cat}</td></tr>
        ${lines.map(l => {
          const { title, subtitle } = formatServiceLineTitle(l.name);
          return `
          <tr>
            <td style="width:44px;padding:6px 8px">${thumb(l.imageUrl)}</td>
            <td>
              <div style="font-weight:600;color:#1A202C">${title}</div>
              ${subtitle ? `<div style="font-size:10.5px;color:#666;font-style:italic;margin-top:2px;line-height:1.3">${subtitle}</div>` : ''}
            </td>
            <td class="right">${inr(l.unitPrice ?? undefined)}</td>
            <td class="right">${inr(l.amount ?? undefined)}</td>
          </tr>`;
        }).join('')}
      `).join('');

      tableHtml += `
        <div class="sec-title" style="margin-bottom:8px">1. Food Menu</div>
        <table>
          <thead><tr><th style="width:44px"></th><th>Item</th><th class="right">Rate</th><th class="right">Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    }
  }

  /* ── 2. Event Decor, Production & Rentals Section ── */
  if (serviceLines.length > 0) {
    const sRows = Object.entries(serviceGroups).map(([groupName, { icon, lines }]) => `
      <tr>
        <td colspan="4" class="cat-row" style="background:#FAF8F5;color:#8B6F20;font-weight:700;letter-spacing:0.04em">
          <span style="font-size:13px;margin-right:6px">${icon}</span> ${groupName.toUpperCase()}
        </td>
      </tr>
      ${lines.map((l, i) => {
        const { title, subtitle } = formatServiceLineTitle(l.name);
        return `
        <tr>
          <td class="right" style="width:32px;color:#aaa;font-size:11px">${i + 1}</td>
          <td>
            <div style="font-weight:600;color:#1A202C">${title}</div>
            ${subtitle ? `<div style="font-size:10.5px;color:#666;font-style:italic;margin-top:2px;line-height:1.3">${subtitle}</div>` : ''}
          </td>
          <td class="right" style="width:110px">${inr(l.unitPrice ?? undefined)}</td>
          <td class="right" style="width:110px;font-weight:700;color:#1A202C">${inr(l.amount ?? (l.quantity * (l.unitPrice ?? 0)))}</td>
        </tr>`;
      }).join('')}
    `).join('');

    tableHtml += `
      <div class="sec-title" style="margin-top:24px;margin-bottom:8px">2. Decor, Production &amp; Event Rentals</div>
      <table>
        <thead>
          <tr>
            <th class="right" style="width:32px">#</th>
            <th>Service / Production Item</th>
            <th class="right" style="width:110px">Rate</th>
            <th class="right" style="width:110px">Total</th>
          </tr>
        </thead>
        <tbody>${sRows}</tbody>
      </table>`;
  }

  /* ── Totals ──────────────────────────────────────────────── */
  const hasGst = Number(q.gstAmount ?? 0) > 0 && Number(q.gstPercent ?? 0) > 0;
  const totalsRows = [
    q.subTotal           ? `<div class="t-row"><span>Sub Total</span><span>${inr(q.subTotal)}</span></div>` : '',
    q.discountAmount     ? `<div class="t-row"><span>Discount</span><span class="neg">− ${inr(q.discountAmount)}</span></div>` : '',
    q.extraChargesAmount ? `<div class="t-row"><span>Extra Charges</span><span>+ ${inr(q.extraChargesAmount)}</span></div>` : '',
    hasGst
      ? `<div class="t-row"><span>GST (${q.gstPercent}%)</span><span>${inr(q.gstAmount)}</span></div>`
      : `<div class="t-row" style="color:#718096"><span>GST</span><span style="font-size:11px;font-weight:600">Not Applicable (0%)</span></div>`,
    `<div class="t-row grand"><span>Grand Total</span><span class="gold">${inr(q.grandTotal)}</span></div>`,
  ].join('');

  /* ── Full HTML ───────────────────────────────────────────── */
  const logoHtml = q.companyLogoUrl
    ? `<img src="${q.companyLogoUrl}" alt="${q.companyName ?? ''}" style="height:60px;width:auto;object-fit:contain;display:block;margin-bottom:10px" />`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Quotation ${q.quotationNumber}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,400;1,600&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Montserrat',sans-serif;color:#1a1a2e;background:#fff;padding:44px;font-size:13px;line-height:1.5}
@media screen and (max-width:680px){
  body{padding:16px 12px}
  .header{flex-direction:column;gap:12px;align-items:flex-start}
  .q-meta{text-align:left}
  .info-grid{grid-template-columns:1fr}
  table{min-width:480px;display:block;overflow-x:auto}
}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid #B8860B;margin-bottom:24px}
.co-name{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:700;color:#0F1B3C;letter-spacing:-0.3px}
.co-tag{font-size:11px;color:#999;margin-top:3px}
.q-meta{text-align:right}
.q-num{font-size:20px;font-weight:900;color:#B8860B}
.q-date{font-size:11px;color:#888;margin-top:4px}
.sec{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#B8860B;margin:20px 0 8px}
.info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;background:#FFFDF7;border:1px solid #EDE8DF;border-radius:8px;padding:14px;margin-bottom:4px}
.info-item label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;display:block;margin-bottom:2px}
.info-item span{font-size:13px;font-weight:600;color:#0F1B3C}
table{width:100%;border-collapse:collapse;margin-top:4px}
th{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;padding:8px 12px;background:#FFFDF7;text-align:left;border-bottom:2px solid #EDE8DF}
th.right,td.right{text-align:right}
td{padding:9px 12px;border-bottom:1px solid #f5f0e8;vertical-align:middle}
.cat-row{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#B8860B;background:#FDF3D0;padding:5px 12px}
/* Per Person pricing banner */
.pp-banner{margin-top:16px;border:1.5px solid #B8860B;border-radius:10px;overflow:hidden}
.pp-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#B8860B;background:#FDF3D0;padding:6px 16px;border-bottom:1px solid #EDE8DF}
.pp-calc{padding:14px 16px;font-size:15px;color:#444;background:#FFFDF7}
.pp-calc strong{color:#0F1B3C;font-weight:700}
.pp-total{font-size:18px;font-weight:900;color:#B8860B}
/* Totals */
.totals{margin-top:18px;padding-top:12px;border-top:2px solid #EDE8DF;max-width:300px;margin-left:auto}
.t-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#555;border-bottom:1px solid #f5f0e8}
.t-row.grand{font-size:16px;font-weight:900;color:#0F1B3C;border-top:2px solid #0F1B3C;border-bottom:none;margin-top:6px;padding-top:10px}
.gold{color:#B8860B}.neg{color:#e53e3e}
/* Revision history */
.rev-section{margin-top:24px}
.rev-table{width:100%;border-collapse:collapse;margin-top:4px}
.rev-table th{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;padding:8px 12px;background:#fff5f5;text-align:left;border-bottom:2px solid #fecaca}
.rev-table td{padding:9px 12px;border-bottom:1px solid #fff0f0;vertical-align:top}
.rev-num{width:36px;font-size:10px;font-weight:800;color:#ef4444;text-align:center}
.rev-date{width:160px;font-size:11px;color:#888}
.rev-reason{font-size:13px;color:#3d1515}
.rev-badge{display:inline-block;background:#fee2e2;color:#b91c1c;border-radius:999px;font-size:9px;font-weight:700;padding:2px 8px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.footer{margin-top:48px;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #EDE8DF;padding-top:16px}
@media print{body{padding:0}@page{margin:14mm}button{display:none}}
</style>
</head>
<body>
<div class="header">
  <div style="display:flex;align-items:center;gap:16px">
    ${logoHtml}
    <div>
      <div class="co-name">${q.companyName ?? 'Thankam Events'}</div>
      <div class="co-tag">${q.companyTagline ?? 'Premier Catering &amp; Event Management · Kollam, Kerala'}</div>
    </div>
  </div>
  <div class="q-meta">
    <div class="q-num">${q.quotationNumber}</div>
    <div class="q-date">Date: ${fmt(q.createdAt)}</div>
  </div>
</div>

<div class="sec">Customer &amp; Event Details</div>
<div class="info-grid">
  <div class="info-item"><label>Customer</label><span>${q.customerName}</span></div>
  <div class="info-item"><label>Phone</label><span>${q.customerPhone ?? '—'}</span></div>
  <div class="info-item"><label>Event Type</label><span>${q.eventType ?? '—'}</span></div>
  <div class="info-item"><label>Event Date</label><span>${fmt(q.eventDate)}</span></div>
  <div class="info-item"><label>Venue</label><span>${q.venue ?? '—'}</span></div>
  <div class="info-item"><label>Guests</label><span>${q.guestCount ?? '—'}</span></div>
</div>

<div class="sec">${isPP ? 'Included Items' : 'Items'}</div>
${tableHtml}

<div class="totals">${totalsRows}</div>

${q.rejectionHistory && q.rejectionHistory.length > 0 ? `
<div class="rev-section">
  <div class="sec">Revision History &nbsp;<span style="font-size:11px;font-weight:600;color:#888">(${q.rejectionHistory.length} decline${q.rejectionHistory.length > 1 ? 's' : ''})</span></div>
  <table class="rev-table">
    <thead><tr><th class="rev-num">#</th><th class="rev-date">Date</th><th class="rev-reason">Customer's Reason</th></tr></thead>
    <tbody>
      ${q.rejectionHistory.map((e, i) => `
        <tr>
          <td class="rev-num">${i + 1}</td>
          <td class="rev-date">${new Date(e.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
          <td class="rev-reason">
            <div class="rev-badge">Declined</div><br/>${e.reason}
          </td>
        </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<div class="footer">
  Thank you for choosing ${q.companyName ?? 'Thankam Events'}.<br/>
  This is a computer-generated quotation.
  ${q.rejectionHistory && q.rejectionHistory.length > 0 ? `<br/><span style="color:#e53e3e">This is Quote Attempt #${q.rejectionHistory.length + 1}</span>` : ''}
</div>
</body>
</html>`;

  return html;
}

export async function downloadQuotePdf(q: PdfQuoteInput): Promise<void> {
  const html = generateQuoteHtml(q);
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.background = '#ffffff';
  document.body.appendChild(container);

  try {
    const opt = {
      margin: 8,
      filename: `Quotation-${q.quotationNumber}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
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
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

export function openQuotePdf(q: PdfQuoteInput) {
  void downloadQuotePdf(q);
}

export type AgreementItem = {
  name: string;
  category?: string;
  quantity: number;
  unit?: string | null;
  unitPrice?: number | null;
  amount?: number | null;
  imageUrl?: string | null;
};

/* Fetch any image URL as a base64 data-URL so it embeds reliably in popup/iframe documents */
export async function fetchImageBase64(url?: string): Promise<string | undefined> {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) return undefined;
    const blob = await resp.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch { return undefined; }
}

export type AgreementInput = {
  quotationNumber: string;
  createdAt?: string;
  eventDate?: string;
  eventType?: string;
  venue?: string;
  guestCount?: number;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: AgreementItem[];
  isPerPerson?: boolean;
  perPersonRate?: number;
  subTotal?: number;
  discountAmount?: number;
  extraChargesAmount?: number;
  gstPercent?: number;
  gstAmount?: number;
  grandTotal?: number;
  agreementStatus?: string;
  agreementAcceptedAt?: string;
  companyName?: string;
  companyTagline?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogoUrl?: string;
  terms?: string | null;
  notes?: string | null;
  isAdminGenerated?: boolean;
};

function fmt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtShort(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtFull(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function inr(n?: number | null) {
  if (!n) return '₹0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);
}

const DEFAULT_TERMS = `
<h3>1. Payment Terms</h3>
<p>1.1 An advance payment of <strong>50% of the Total Contract Value</strong> is due within 3 business days of signing this agreement to confirm the booking.</p>
<p>1.2 The remaining balance shall be paid in full <strong>at least 3 days prior</strong> to the event date. Failure to pay the balance may result in suspension of services.</p>
<p>1.3 All payments shall be made via bank transfer, UPI, or other agreed modes. Cash payments exceeding ₹2,00,000 are not accepted as per applicable laws.</p>
<p>1.4 A valid receipt will be issued for every payment received.</p>

<h3>2. Cancellation & Refund Policy</h3>
<p>2.1 Cancellations must be communicated in writing to the Company's registered email address.</p>
<p>2.2 The following cancellation charges apply based on days prior to the event date:</p>
<table class="terms-table">
  <thead><tr><th>Notice Period</th><th>Cancellation Fee</th></tr></thead>
  <tbody>
    <tr><td>More than 30 days</td><td>20% of Total Contract Value</td></tr>
    <tr><td>15 – 30 days</td><td>50% of Total Contract Value</td></tr>
    <tr><td>7 – 14 days</td><td>75% of Total Contract Value</td></tr>
    <tr><td>Less than 7 days</td><td>100% of Total Contract Value (non-refundable)</td></tr>
  </tbody>
</table>
<p>2.3 Refunds (if applicable) will be processed within 7–14 business days after deducting applicable charges.</p>

<h3>3. Service Delivery & Scope</h3>
<p>3.1 The Company agrees to deliver all services as itemized in the attached Service Schedule.</p>
<p>3.2 The Company reserves the right to substitute specific items with products/services of equivalent or superior quality, subject to prior written notification to the Client.</p>
<p>3.3 Setup team will arrive at the venue at least <strong>4 hours prior</strong> to the event start time. The Client must ensure venue access at the specified time.</p>
<p>3.4 Any additional services requested on the day of the event will be billed at standard rates and must be paid immediately or added to the final settlement.</p>
<p>3.5 The quantity of food, beverages, and consumable items is estimated based on the declared guest count. Variations of up to 10% in actual attendance will not entitle the Client to a refund or additional charges.</p>

<h3>4. Client Responsibilities</h3>
<p>4.1 The Client is solely responsible for obtaining all necessary permissions, licenses, and clearances from the venue, local authorities, and government bodies.</p>
<p>4.2 The Client agrees to provide accurate event details (venue, timings, guest count) and to inform the Company immediately of any changes.</p>
<p>4.3 The Client is responsible for ensuring a safe and accessible working environment for all Company staff and subcontractors at the venue.</p>
<p>4.4 Damage to Company equipment or property caused by the Client, Client's guests, or third parties engaged by the Client will be billed to the Client at replacement cost.</p>

<h3>5. Liability & Indemnification</h3>
<p>5.1 The Company's total liability under this agreement shall not exceed the Total Contract Value paid by the Client.</p>
<p>5.2 The Company shall not be liable for any indirect, incidental, consequential, or special damages arising from performance or non-performance of services.</p>
<p>5.3 The Client agrees to indemnify and hold harmless the Company, its officers, employees, and agents from any claims, losses, or damages arising out of the Client's negligence or breach of this agreement.</p>

<h3>6. Force Majeure</h3>
<p>6.1 Neither party shall be held liable for failure to perform obligations due to circumstances beyond reasonable control, including but not limited to natural disasters, floods, fires, earthquakes, epidemics, government orders, civil unrest, or acts of God.</p>
<p>6.2 In such events, the Company will endeavour to reschedule services at no additional charge. If rescheduling is not possible, the Company will refund payments after deducting actual costs incurred.</p>

<h3>7. Amendments & Modifications</h3>
<p>7.1 Any changes to the scope of services, guest count, items, or pricing must be agreed upon in writing by both parties and will result in an amended quotation.</p>
<p>7.2 Verbal modifications to this agreement are not binding.</p>
<p>7.3 Changes requested less than 5 days before the event are subject to additional surcharges and are subject to the Company's capacity at that time.</p>

<h3>8. Confidentiality</h3>
<p>8.1 Both parties agree to keep confidential any proprietary information, pricing, vendor details, and personal data exchanged under this agreement.</p>
<p>8.2 The Company may use photographs and media from the event for portfolio and marketing purposes unless the Client expressly objects in writing before the event date.</p>

<h3>9. Governing Law & Dispute Resolution</h3>
<p>9.1 This agreement shall be governed by and construed in accordance with the laws of the Republic of India.</p>
<p>9.2 Any disputes arising from this agreement shall first be resolved through mutual negotiation. If unresolved within 30 days, disputes shall be referred to arbitration in <strong>Kollam, Kerala</strong> under the Arbitration and Conciliation Act, 1996.</p>
<p>9.3 The courts of <strong>Kollam, Kerala</strong> shall have exclusive jurisdiction over any legal proceedings relating to this agreement.</p>

<h3>10. Entire Agreement</h3>
<p>10.1 This document, including all schedules and attachments, constitutes the entire agreement between the parties and supersedes all prior discussions, understandings, and agreements, whether oral or written.</p>
<p>10.2 If any provision of this agreement is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.</p>
`;

export function generateAgreementHtml(q: AgreementInput): string {
  const co    = q.companyName    ?? 'Thankam Events';
  const coTag = q.companyTagline ?? 'Premier Catering & Event Management · Kollam, Kerala';
  const coAddr  = q.companyAddress ?? 'Uliyacovil, Kollam, Kerala – 691001';
  const coPhone = q.companyPhone   ?? '+91 9745684766';
  const coEmail = q.companyEmail   ?? 'info@thankamevents.in';

  // Group items by category
  const groups: Record<string, AgreementItem[]> = {};
  for (const it of q.items) {
    const cat = it.category ?? 'General';
    (groups[cat] = groups[cat] ?? []).push(it);
  }

  const isPP = Boolean(q.isPerPerson && q.perPersonRate);

  const thumb = (url?: string | null) => url
    ? `<img src="${url}" style="width:34px;height:34px;object-fit:cover;border-radius:5px;border:1px solid #EDE8DF;display:block" alt=""/>`
    : `<div style="width:34px;height:34px;background:#f5f0e8;border-radius:5px;border:1px solid #EDE8DF"></div>`;

  // Per Person: 3-col (img + sl + name); Per Item: 7-col with pricing
  const itemRowsHtml = isPP
    ? Object.entries(groups).map(([cat, lines], gi) => `
        <tr class="cat-row"><td colspan="3">${gi + 1}. ${cat.toUpperCase()}</td></tr>
        ${lines.map((l, li) => `
          <tr>
            <td class="img-cell">${thumb(l.imageUrl)}</td>
            <td class="sl">${li + 1}</td>
            <td>${l.name}</td>
          </tr>`).join('')}
      `).join('')
    : Object.entries(groups).map(([cat, lines], gi) => `
        <tr class="cat-row"><td colspan="7">${gi + 1}. ${cat.toUpperCase()}</td></tr>
        ${lines.map((l, li) => `
          <tr>
            <td class="img-cell">${thumb(l.imageUrl)}</td>
            <td class="sl">${li + 1}</td>
            <td>${l.name}</td>
            <td class="center">${l.quantity}</td>
            <td class="center">${l.unit ?? 'plate'}</td>
            <td class="right">${l.unitPrice ? inr(l.unitPrice) : '—'}</td>
            <td class="right">${l.amount ? inr(l.amount) : '—'}</td>
          </tr>`).join('')}
      `).join('');

  const ppHtml = isPP
    ? `<div class="pp-box no-break">
        <div class="pp-label">Pricing Mode: Per Person</div>
        <div class="pp-calc">${q.guestCount ?? 0} guests × ${inr(q.perPersonRate)} = <strong>${inr((q.perPersonRate ?? 0) * (q.guestCount ?? 0))}</strong></div>
       </div>`
    : '';

  const totals = [
    q.subTotal           ? `<div class="t-row"><span>Sub Total</span><span>${inr(q.subTotal)}</span></div>` : '',
    q.discountAmount     ? `<div class="t-row disc"><span>Discount (–)</span><span>${inr(q.discountAmount)}</span></div>` : '',
    q.extraChargesAmount ? `<div class="t-row"><span>Extra Charges (+)</span><span>${inr(q.extraChargesAmount)}</span></div>` : '',
    q.gstAmount          ? `<div class="t-row"><span>GST (${q.gstPercent ?? 18}%)</span><span>${inr(q.gstAmount)}</span></div>` : '',
    `<div class="t-row grand"><span>Total Contract Value</span><span>${inr(q.grandTotal)}</span></div>`,
  ].join('');

  const isAccepted = (q.agreementStatus ?? '').toUpperCase() === 'ACCEPTED';

  const statusBanner = q.isAdminGenerated
    ? `<div class="status-badge exec">FOR PHYSICAL EXECUTION · PLEASE SIGN &amp; SEAL</div>`
    : isAccepted
      ? `<div class="status-badge accepted">✓ DIGITALLY ACCEPTED — ${fmtFull(q.agreementAcceptedAt)}</div>`
      : `<div class="status-badge pending">PENDING CUSTOMER ACCEPTANCE</div>`;

  const customTerms = q.terms?.trim()
    ? `<div class="custom-terms"><h3>Special Conditions</h3><p>${q.terms.replace(/\n/g, '<br/>')}</p></div>`
    : '';

  const logoHtml = q.companyLogoUrl
    ? `<img src="${q.companyLogoUrl}" alt="${co}" style="height:56px;width:auto;object-fit:contain;display:block;margin-bottom:6px"/>`
    : '';

  /* Compact page header used at the top of T&C and Signature sections */
  const miniHeader = `
    <div class="mini-header">
      <div style="display:flex;align-items:center;gap:10px">
        ${q.companyLogoUrl ? `<img src="${q.companyLogoUrl}" alt="${co}" style="height:32px;width:auto;object-fit:contain;display:block"/>` : ''}
        <div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:700;color:#0F1B3C">${co}</div>
          <div style="font-size:9px;color:#999">${coTag}</div>
        </div>
      </div>
      <div style="text-align:right;font-size:10px;color:#888">${q.quotationNumber}</div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Agreement — ${q.quotationNumber}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,400;1,600&display=swap" rel="stylesheet"/>
<style>
/* ── Reset ── */
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Montserrat',sans-serif;color:#1a1a2e;background:#f0f2f5;font-size:13px;line-height:1.65}

/* ── Document wrapper ── */
.doc{max-width:820px;margin:0 auto;background:#fff;padding:48px 52px}
@media screen{.doc{box-shadow:0 4px 32px rgba(0,0,0,.10);min-height:100vh}}

/* ── Print ── */
@media print{
  html,body{background:#fff!important}
  .doc{max-width:none;margin:0;padding:0;box-shadow:none}
  @page{margin:14mm 16mm;size:A4}

  /* Table structure: header row repeats on every page */
  thead{display:table-header-group}
  tfoot{display:table-footer-group}

  /* Category label must stay with the first item row below it */
  .cat-row{page-break-after:avoid}
  /* No row splits */
  tr{page-break-inside:avoid}

  /* Section titles must not be left stranded at the bottom of a page */
  .sec-title{page-break-after:avoid}
  .mini-header{page-break-after:avoid;page-break-inside:avoid}
  .doc-header{page-break-inside:avoid;page-break-after:avoid}

  /* Terms headings must stay with the paragraph that follows them */
  .terms-body h3{page-break-after:avoid}
  /* Widow/orphan control for terms paragraphs */
  .terms-body p{orphans:3;widows:3}

  /* Structural blocks that must not split */
  .no-break{page-break-inside:avoid}
  .cover-grid{page-break-inside:avoid}
  .total-box{page-break-inside:avoid}
  .party-grid{page-break-inside:avoid}
  .pp-box{page-break-inside:avoid}
  .totals-wrap{page-break-inside:avoid}
  .summary-grid{page-break-inside:avoid}
  .acceptance-box{page-break-inside:avoid}
  .sig-grid{page-break-inside:avoid}
  .stamp-area{page-break-inside:avoid}
  .sig-note{page-break-inside:avoid}

  /* Force new page before T&C and Signatures */
  .break-before{page-break-before:always}
}

/* ── Document header ── */
.doc-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid #B8860B;margin-bottom:28px}
.co-name{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#0F1B3C;letter-spacing:-.3px}
.co-sub{font-size:10px;color:#999;margin-top:3px}
.co-contact{font-size:10px;color:#777;margin-top:5px;line-height:1.9}
.doc-meta{text-align:right}
.doc-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#B8860B}
.doc-num{font-size:20px;font-weight:900;color:#0F1B3C;margin-top:3px}
.doc-date{font-size:10px;color:#888;margin-top:3px}

/* ── Mini header (T&C + Sig pages) ── */
.mini-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:2px solid #B8860B;margin-bottom:20px}

/* ── Cover hero ── */
.cover-hero{text-align:center;padding:26px 0 18px;border-bottom:1px solid #EDE8DF;margin-bottom:24px}
.cover-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#B8860B;margin-bottom:10px}
.cover-title{font-size:34px;font-weight:900;color:#0F1B3C;letter-spacing:-1px;line-height:1.1}
.cover-subtitle{font-size:13px;color:#888;margin-top:7px}

/* ── Grids ── */
.cover-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #EDE8DF;border-radius:10px;overflow:hidden;margin-bottom:18px}
.cover-cell{padding:13px 16px;border-right:1px solid #EDE8DF;border-bottom:1px solid #EDE8DF}
.cover-cell:nth-child(2n){border-right:none}
.cover-cell:nth-last-child(-n+2){border-bottom:none}
.cell-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#B8860B;margin-bottom:3px}
.cell-value{font-size:13px;font-weight:700;color:#0F1B3C}

/* ── Total box ── */
.total-box{background:linear-gradient(135deg,#0F1B3C,#1a2d5a);color:#fff;border-radius:10px;padding:16px 22px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.total-box .lbl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,.6)}
.total-box .amt{font-size:24px;font-weight:900;color:#F0C040}

/* ── Parties ── */
.party-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
.party-box{border:1px solid #EDE8DF;border-radius:9px;padding:13px 16px;background:#FFFDF7}
.party-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#B8860B;margin-bottom:5px}
.party-name{font-size:13px;font-weight:900;color:#0F1B3C;margin-bottom:3px}
.party-detail{font-size:11px;color:#666;line-height:1.7}

/* ── Status badge ── */
.status-badge{text-align:center;padding:9px 18px;border-radius:8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:0}
.status-badge.accepted{background:#ecfdf5;color:#065f46;border:1px solid #6ee7b7}
.status-badge.pending{background:#fefce8;color:#854d0e;border:1px solid #fde047}
.status-badge.exec{background:#EDE8DF;color:#0F1B3C;border:2px solid #B8860B;letter-spacing:2px}

/* ── Section title ── */
.sec-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#B8860B;margin:24px 0 10px;padding-bottom:5px;border-bottom:2px solid #FDF3D0}

/* ── Items table — flows across pages ── */
table{width:100%;border-collapse:collapse}
th{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;padding:8px 10px;background:#FFFDF7;border-bottom:2px solid #EDE8DF;text-align:left}
th.right,td.right{text-align:right}
th.center,td.center{text-align:center}
td{padding:8px 10px;border-bottom:1px solid #f5f0e8;vertical-align:middle;font-size:12px}
.sl{width:30px;color:#aaa;text-align:center;font-size:11px}
.img-cell{width:46px;padding:5px 8px;vertical-align:middle}
.cat-row td{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#B8860B;background:#FDF3D0;padding:5px 10px}

/* ── Per person ── */
.pp-box{margin:14px 0;border:1.5px solid #B8860B;border-radius:9px;overflow:hidden}
.pp-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#B8860B;background:#FDF3D0;padding:5px 12px;border-bottom:1px solid #EDE8DF}
.pp-calc{padding:12px;font-size:14px;color:#444;background:#FFFDF7}
.pp-calc strong{color:#0F1B3C;font-weight:800}

/* ── Totals ── */
.totals-wrap{max-width:290px;margin:14px 0 0 auto;border-top:2px solid #EDE8DF;padding-top:10px}
.t-row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:#555;border-bottom:1px solid #f5f0e8}
.t-row.disc span:last-child{color:#e53e3e}
.t-row.grand{font-size:14px;font-weight:900;color:#0F1B3C;border-top:2px solid #0F1B3C;border-bottom:none;margin-top:4px;padding-top:8px}
.t-row.grand span:last-child{color:#B8860B}

/* ── Summary grid ── */
.summary-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #EDE8DF;border-radius:10px;overflow:hidden;margin-top:20px}

/* ── Terms ── */
.terms-body h3{font-size:12px;font-weight:800;color:#0F1B3C;margin:16px 0 5px;padding-left:9px;border-left:3px solid #B8860B}
.terms-body p{font-size:11px;color:#444;line-height:1.8;margin-bottom:7px}
.terms-table{width:100%;border-collapse:collapse;margin:8px 0 12px}
.terms-table th{background:#FDF3D0;color:#B8860B;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:7px 10px;border-bottom:2px solid #EDE8DF;text-align:left}
.terms-table td{padding:7px 10px;border-bottom:1px solid #f5f0e8;font-size:11px;color:#444}
.custom-terms{margin-top:14px;border-left:3px solid #B8860B;background:#FFFDF7;padding:12px 14px;border-radius:0 8px 8px 0}
.custom-terms h3{margin-top:0}

/* ── Signatures ── */
.sig-note{background:#FFFDF7;border:1px solid #EDE8DF;border-radius:9px;padding:13px 16px;font-size:11px;color:#555;line-height:1.8;margin-bottom:18px}
.sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-bottom:24px}
.sig-box{border-top:2px solid #0F1B3C;padding-top:10px}
.sig-name{font-size:13px;font-weight:800;color:#0F1B3C;margin-bottom:2px}
.sig-role{font-size:10px;color:#888;margin-bottom:10px}
.sig-line{border-top:1.5px dashed #ccc;margin:20px 0 6px}
.sig-field-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#B8860B}
.acceptance-box{border:2px solid #B8860B;border-radius:10px;padding:14px 16px;background:#FFFDF7;margin-bottom:14px}
.acceptance-box.done{border-color:#059669;background:#f0fdf4}
.acceptance-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#B8860B;margin-bottom:8px}
.acceptance-box.done .acceptance-title{color:#059669}
.acceptance-row{display:flex;gap:8px;margin-bottom:4px;font-size:11px;color:#555}
.acceptance-row strong{color:#0F1B3C;min-width:130px}
.stamp-area{border:2px dashed #D4A017;border-radius:9px;padding:18px;text-align:center;color:#ccc;font-size:11px}
</style>
</head>
<body>
<div class="doc">

<!-- ══ SECTION 1: COVER ══ -->
<div class="doc-header no-break">
  <div style="display:flex;align-items:center;gap:14px">
    ${logoHtml}
    <div>
      <div class="co-name">${co}</div>
      <div class="co-sub">${coTag}</div>
      <div class="co-contact">${coAddr}<br/>${coPhone} · ${coEmail}</div>
    </div>
  </div>
  <div class="doc-meta">
    <div class="doc-title">Service Agreement</div>
    <div class="doc-num">${q.quotationNumber}</div>
    <div class="doc-date">Prepared: ${fmt(q.createdAt)}</div>
  </div>
</div>

<div class="cover-hero no-break">
  <div class="cover-label">Event Service Agreement</div>
  <div class="cover-title">SERVICE &amp; CATERING<br/>AGREEMENT</div>
  <div class="cover-subtitle">This agreement sets out the terms for services provided by ${co}</div>
</div>

<div class="cover-grid">
  <div class="cover-cell"><div class="cell-label">Event Type</div><div class="cell-value">${q.eventType ?? '—'}</div></div>
  <div class="cover-cell"><div class="cell-label">Event Date</div><div class="cell-value">${fmt(q.eventDate)}</div></div>
  <div class="cover-cell"><div class="cell-label">Venue</div><div class="cell-value">${q.venue ?? '—'}</div></div>
  <div class="cover-cell"><div class="cell-label">Expected Guests</div><div class="cell-value">${q.guestCount ?? '—'} guests</div></div>
</div>

<div class="total-box">
  <div><div class="lbl">Total Contract Value</div><div style="font-size:10px;color:rgba(255,255,255,.5);margin-top:2px">Inclusive of all charges &amp; taxes</div></div>
  <div class="amt">${inr(q.grandTotal)}</div>
</div>

<div class="party-grid">
  <div class="party-box">
    <div class="party-title">Client (Party A)</div>
    <div class="party-name">${q.customerName}</div>
    <div class="party-detail">${q.customerPhone ? `Phone: ${q.customerPhone}` : ''}${q.customerAddress ? `<br/>${q.customerAddress}` : ''}</div>
  </div>
  <div class="party-box">
    <div class="party-title">Service Provider (Party B)</div>
    <div class="party-name">${co}</div>
    <div class="party-detail">${coAddr}<br/>${coPhone}<br/>${coEmail}</div>
  </div>
</div>

${statusBanner}

<!-- ══ SECTION 2: SERVICE SCHEDULE ══ -->
<div class="sec-title" style="margin-top:28px">Schedule A — ${isPP ? 'Included Services' : 'Itemized Services'}</div>
<table>
  <thead>
    ${isPP
      ? `<tr><th style="width:46px"></th><th class="sl">#</th><th>Included Item / Service</th></tr>`
      : `<tr><th style="width:46px"></th><th class="sl">#</th><th>Item / Service</th><th class="center" style="width:52px">Qty</th><th class="center" style="width:52px">Unit</th><th class="right" style="width:90px">Rate (₹)</th><th class="right" style="width:90px">Amount (₹)</th></tr>`}
  </thead>
  <tbody>${itemRowsHtml}</tbody>
</table>

${ppHtml}
<div class="totals-wrap no-break">${totals}</div>

<div class="summary-grid no-break">
  <div class="cover-cell"><div class="cell-label">Quotation No.</div><div class="cell-value" style="font-size:12px">${q.quotationNumber}</div></div>
  <div class="cover-cell"><div class="cell-label">Agreement Date</div><div class="cell-value" style="font-size:12px">${fmt(q.createdAt)}</div></div>
  <div class="cover-cell"><div class="cell-label">Event Date</div><div class="cell-value" style="font-size:12px">${fmt(q.eventDate)}</div></div>
  <div class="cover-cell"><div class="cell-label">Guest Count</div><div class="cell-value" style="font-size:12px">${q.guestCount ?? '—'}</div></div>
  <div class="cover-cell"><div class="cell-label">Venue</div><div class="cell-value" style="font-size:12px">${q.venue ?? '—'}</div></div>
  <div class="cover-cell"><div class="cell-label">Total Amount</div><div class="cell-value" style="font-size:12px;color:#B8860B">${inr(q.grandTotal)}</div></div>
</div>

<!-- ══ SECTION 3: TERMS & CONDITIONS (always starts on a new print page) ══ -->
<div class="break-before">
  ${miniHeader}
  <div class="sec-title" style="margin-top:0">General Terms &amp; Conditions</div>
  <div class="terms-body">
    ${DEFAULT_TERMS}
    ${customTerms}
  </div>
</div>

<!-- ══ SECTION 4: SIGNATURES (always starts on a new print page) ══ -->
<div class="break-before">
  ${miniHeader}
  <div class="sec-title" style="margin-top:0">${q.isAdminGenerated ? 'Execution &amp; Signatures' : 'Acceptance &amp; Signatures'}</div>

  <div class="sig-note">
    ${q.isAdminGenerated
      ? `Both parties confirm that they have read, understood, and agree to be bound by all terms and conditions in this Service Agreement. By affixing their signatures below, both parties give their unconditional consent to the terms herein. This agreement becomes legally binding upon receipt of the advance payment as described in Clause 1 of the Terms &amp; Conditions.`
      : `By signing below (or by digitally accepting through the Customer Portal), both parties confirm that they have read, understood, and agree to be bound by all terms and conditions of this Service Agreement. This agreement becomes legally binding upon receipt of the advance payment and mutual acceptance as described herein.`
    }
  </div>

  ${q.isAdminGenerated ? `
  <div class="acceptance-box no-break" style="border-color:#0F1B3C;background:#FFFDF7">
    <div class="acceptance-title" style="color:#0F1B3C">Agreement Summary</div>
    <div class="acceptance-row"><strong>Reference No.:</strong> ${q.quotationNumber}</div>
    <div class="acceptance-row"><strong>Client:</strong> ${q.customerName}${q.customerPhone ? ' · ' + q.customerPhone : ''}</div>
    <div class="acceptance-row"><strong>Event:</strong> ${q.eventType ?? '—'} on ${fmt(q.eventDate)}</div>
    <div class="acceptance-row"><strong>Venue:</strong> ${q.venue ?? '—'} · ${q.guestCount ?? '—'} guests</div>
    <div class="acceptance-row"><strong>Total Contract Value:</strong> <span style="font-weight:800;color:#B8860B">${inr(q.grandTotal)}</span></div>
    <div class="acceptance-row"><strong>Agreement Prepared:</strong> ${fmt(new Date().toISOString())}</div>
  </div>` : `
  <div class="acceptance-box no-break ${isAccepted ? 'done' : ''}">
    <div class="acceptance-title">${isAccepted ? '✓ Digital Acceptance Record' : '⏳ Pending Digital Acceptance'}</div>
    <div class="acceptance-row"><strong>Quotation Number:</strong> ${q.quotationNumber}</div>
    <div class="acceptance-row"><strong>Client Name:</strong> ${q.customerName}</div>
    <div class="acceptance-row"><strong>Event Date:</strong> ${fmt(q.eventDate)}</div>
    <div class="acceptance-row"><strong>Total Contract Value:</strong> ${inr(q.grandTotal)}</div>
    ${isAccepted
      ? `<div class="acceptance-row"><strong>Accepted On:</strong> ${fmtFull(q.agreementAcceptedAt)}</div>`
      : `<div class="acceptance-row"><strong>Status:</strong> Awaiting client acceptance via portal</div>`}
  </div>`}

  <div class="sig-grid no-break">
    <div class="sig-box">
      <div class="sig-name">${q.customerName}</div>
      <div class="sig-role">Client — Party A</div>
      <div class="sig-line" style="margin-top:40px"></div>
      <div class="sig-field-label">Signature</div>
      ${q.isAdminGenerated ? `
      <div class="sig-line" style="margin-top:28px"></div><div class="sig-field-label">Date</div>
      <div class="sig-line" style="margin-top:28px"></div><div class="sig-field-label">Witness Name &amp; Signature</div>
      ` : `
      <div class="sig-line" style="margin-top:32px"></div><div class="sig-field-label">Date &amp; Place</div>
      ${isAccepted ? `<div style="margin-top:6px;font-size:11px;color:#059669;font-weight:600">Digitally accepted: ${fmtShort(q.agreementAcceptedAt)}</div>` : ''}
      `}
    </div>
    <div class="sig-box">
      <div class="sig-name">${co}</div>
      <div class="sig-role">Service Provider — Party B</div>
      <div class="sig-line" style="margin-top:40px"></div>
      <div class="sig-field-label">Authorized Signatory</div>
      ${q.isAdminGenerated ? `
      <div class="sig-line" style="margin-top:28px"></div><div class="sig-field-label">Date</div>
      <div class="sig-line" style="margin-top:28px"></div><div class="sig-field-label">Witness Name &amp; Signature</div>
      ` : `
      <div class="sig-line" style="margin-top:32px"></div><div class="sig-field-label">Date &amp; Place</div>
      <div style="margin-top:6px;font-size:11px;color:#888">Kollam, Kerala</div>
      `}
    </div>
  </div>

  ${q.isAdminGenerated ? `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:16px">
    <div class="stamp-area">Company Seal / Stamp</div>
    <div class="stamp-area">Client Seal / Thumb Impression</div>
  </div>` : `<div class="stamp-area">Company Seal / Stamp Area</div>`}

  <div style="margin-top:18px;background:#FFFDF7;border:1px solid #EDE8DF;border-radius:8px;padding:12px 16px">
    <p style="font-size:10px;color:#888;text-align:center;line-height:1.8">
      This is a legally binding document between <strong style="color:#0F1B3C">${q.customerName}</strong> and <strong style="color:#0F1B3C">${co}</strong>.<br/>
      Document Reference: <strong>${q.quotationNumber}</strong> · Prepared: ${fmt(new Date().toISOString())}<br/>
      ${coPhone} · ${coEmail} · ${coAddr}
    </p>
  </div>
</div>

</div><!-- /.doc -->
</body>
</html>`;
}

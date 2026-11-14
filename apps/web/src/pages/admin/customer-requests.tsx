import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  PartyPopper,
  Phone,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Trash2,
  User,
  Users,
  UtensilsCrossed,
  X,
  XCircle,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageShell } from '@/layouts/page-shell';
import { openQuotePdf } from '@/utils/quote-pdf';
import { generateAgreementHtml, fetchImageBase64 } from '@/utils/agreement-pdf';
import { settingsService } from '@/features/settings/settings.service';
import { customerPortalService } from '@/features/customer-portal/customer-portal.service';
import { CategoryNode } from '@/features/categories/categories.service';
import { toMediaUrl } from '@/utils/media-url';
import { Input } from '@/components/ui/input';
import { selectAuth } from '@/features/auth/auth.selectors';
import { createWorkflowSocket } from '@/features/quotations/workflow-socket';
import {
  QuotationDetail,
  QuotationPayload,
  QuotationRow,
  quotationsService,
} from '@/features/quotations/quotations.service';
import { useAppSelector } from '@/hooks/store';
import { formatInr } from '@/utils/currency';
import {
  isTerminalRequestStatus,
  requestStatusLabel,
  toUiRequestStatus,
} from '@/utils/request-status';
import {
  ATOMIC_EVENT_SERVICES,
  AtomicEventService,
  SERVICE_DEPARTMENTS,
  ServiceDepartment,
  searchEventServices,
  isEventServiceItem,
  formatServiceLineTitle,
} from '@/features/quotations/event-services.catalog';

/* ─── Types ─────────────────────────────────────────────────── */
type UiStatus = 'REQUESTED' | 'UNDER_REVIEW' | 'QUOTED' | 'ACCEPTED' | 'DECLINED';

type CatalogItem = {
  id: string;
  name: string;
  unit?: string | null;
  basePrice: number;
  categoryName: string;
  imageUrl?: string | null;
};

type EditableLine = {
  itemId?: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  categoryName: string;
  imageUrl?: string | null;
};

type EditableServiceLine = {
  id?: string;
  serviceId?: string;
  name: string;
  department: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

/* ─── Currency & Words Helpers ───────────────────────────────── */
function inWords(amount: number): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
    'Seventeen ', 'Eighteen ', 'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(amount);
  if (n <= 0) return 'Zero Rupees only';

  const convertLessThousand = (val: number): string => {
    let str = '';
    if (val > 99) {
      str += a[Math.floor(val / 100)] + 'Hundred ';
      val %= 100;
    }
    if (val > 19) {
      str += b[Math.floor(val / 10)] + (val % 10 ? ' ' + a[val % 10] : ' ');
    } else if (val > 0) {
      str += a[val];
    }
    return str;
  };

  let str = '';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;

  if (crore > 0) str += convertLessThousand(crore) + 'Crore ';
  if (lakh > 0) str += convertLessThousand(lakh) + 'Lakh ';
  if (thousand > 0) str += convertLessThousand(thousand) + 'Thousand ';
  if (hundred > 0) str += convertLessThousand(hundred);

  return `${str.trim()} Rupees only`;
}

function flattenCatalog(nodes: CategoryNode[]): CatalogItem[] {
  const out: CatalogItem[] = [];
  for (const node of nodes) {
    for (const item of node.items) {
      out.push({
        id: item.id,
        name: item.name,
        unit: item.unit,
        basePrice: Number(item.basePrice ?? 0),
        categoryName: node.name,
        imageUrl: item.imageUrl,
      });
    }
    out.push(...flattenCatalog(node.children));
  }
  return out;
}

const sanitizeCurrency = (v: string) => {
  const s = v.replace(/[^\d.]/g, '');
  const [w, ...f] = s.split('.');
  return f.length ? `${w}.${f.join('').slice(0, 2)}` : w;
};
const parseCurrency = (v: string) => {
  const n = Number(sanitizeCurrency(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const sanitizePct = (v: string) => {
  const s = v.replace(/[^\d.]/g, '');
  const [w, ...f] = s.split('.');
  return f.length ? `${w.slice(0, 2)}.${f.join('').slice(0, 2)}` : w.slice(0, 2);
};
const parsePct = (v: string) => Math.min(Number(sanitizePct(v)) || 0, 100);
const fmtNum = (v: number) => (v > 0 ? v.toFixed(2).replace(/\.00$/, '') : '');
const ALLOWED_UNITS = ['plate', 'bowl', 'glass', 'piece', 'scoop', 'kg', 'unit', 'person'] as const;

const normalizeUnit = (u?: string | null) => {
  const r = (u ?? '').trim().toLowerCase();
  if (!r) return 'plate';
  if (r === 'pcs') return 'piece';
  if (ALLOWED_UNITS.includes(r as any)) return r;
  return 'plate';
};

function isPerPersonLine(line: any) {
  return (
    String(line?.unit ?? '').toLowerCase().trim() === 'person' ||
    String(line?.name ?? '').toLowerCase().trim() === 'per person quote'
  );
}

function derivePerPersonRate(detail: QuotationDetail, guests: number) {
  if (guests <= 0) return 0;
  const pp = (detail.items ?? []).find(
    (r) => String(r.unit ?? '').toLowerCase() === 'person' && Number(r.unitPrice || 0) > 0,
  );
  if (pp) return Number(pp.unitPrice || 0);
  const sub = (detail.items ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);
  if (sub > 0) return sub / guests;
  const gt = Number(detail.grandTotal ?? 0);
  if (gt <= 0) return 0;
  const pct = Number(detail.gstPercent ?? 0);
  return (pct > 0 ? gt / (1 + pct / 100) : gt) / guests;
}

type RejectionEntry = { date: string; reason: string };

function parseRejectionHistory(notes?: string | null): RejectionEntry[] {
  if (!notes) return [];
  return notes
    .split('\n')
    .filter((l) => l.includes('[CUSTOMER_DECLINE]'))
    .map((l) => {
      const m = l.match(/\[CUSTOMER_DECLINE\]\s+(\S+)\s*-\s*(.+)/);
      return m ? { date: m[1], reason: m[2].trim() } : null;
    })
    .filter((x): x is RejectionEntry => x !== null);
}

type GroupedLine = { category: string; entries: Array<{ item: EditableLine; index: number }> };
function groupEditable(items: EditableLine[]): GroupedLine[] {
  const map = new Map<string, Array<{ item: EditableLine; index: number }>>();
  for (const [i, item] of items.entries()) {
    const cat = item.categoryName || 'Dishes';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push({ item, index: i });
  }
  return Array.from(map.entries()).map(([category, entries]) => ({ category, entries }));
}

/* Status config */
const STATUS_FLOW: UiStatus[] = ['REQUESTED', 'UNDER_REVIEW', 'QUOTED', 'ACCEPTED'];
const STATUS_LABELS: Record<UiStatus, string> = {
  REQUESTED: 'New Request',
  UNDER_REVIEW: 'Under Review',
  QUOTED: 'Quoted',
  ACCEPTED: 'Agreement Signed',
  DECLINED: 'Declined',
};
const STATUS_BADGE: Record<UiStatus, string> = {
  REQUESTED: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  UNDER_REVIEW: 'border-sky-500/40 bg-sky-500/10 text-sky-400',
  QUOTED: 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#F3CA52]',
  ACCEPTED: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  DECLINED: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
};
const STATUS_DOT: Record<UiStatus, string> = {
  REQUESTED: 'bg-amber-400 animate-pulse',
  UNDER_REVIEW: 'bg-sky-400 animate-pulse',
  QUOTED: 'bg-[#D4AF37]',
  ACCEPTED: 'bg-emerald-400',
  DECLINED: 'bg-rose-400',
};

/* ─── Kerala Tax Invoice Modal ───────────────────────────────── */
function TaxInvoiceModal({
  isOpen,
  onClose,
  detail,
  foodItems,
  serviceItems,
  perPersonRate,
  quoteMode,
}: {
  isOpen: boolean;
  onClose: () => void;
  detail: QuotationDetail;
  foodItems: EditableLine[];
  serviceItems: EditableServiceLine[];
  perPersonRate: number;
  quoteMode: 'INDIVIDUAL' | 'PER_PERSON';
}) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  if (!isOpen) return null;

  const guests = Number(detail.guestCount || 1);
  const isPP = quoteMode === 'PER_PERSON';
  const foodTotal = isPP
    ? perPersonRate * guests
    : foodItems.reduce((acc, it) => acc + (it.quantity || 1) * (it.unitPrice || 0), 0);
  const servicesTotal = serviceItems.reduce(
    (acc, it) => acc + (it.quantity || 1) * (it.unitPrice || 0),
    0,
  );
  const subtotal = foodTotal + servicesTotal;
  const rawGstPct = detail.gstPercent !== undefined && detail.gstPercent !== null ? Number(detail.gstPercent) : 5;
  const isGstEnabled = rawGstPct > 0;
  const gstPctVal = isGstEnabled ? rawGstPct : 0;
  const cgstVal = isGstEnabled ? (subtotal * (gstPctVal / 2)) / 100 : 0;
  const sgstVal = isGstEnabled ? (subtotal * (gstPctVal / 2)) / 100 : 0;
  const totalTax = cgstVal + sgstVal;
  const grandTotal = Math.round(subtotal + totalTax);

  const invoiceNo = detail.quotationNumber?.replace('QUO-', 'INV-') || 'INV-76';
  const invoiceDate = new Date().toLocaleDateString('en-GB');

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current) return;
    try {
      setDownloadingPdf(true);
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: 6,
        filename: `${invoiceNo}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      };
      await html2pdf().set(opt).from(invoiceRef.current).save();
    } catch (e) {
      console.error('Invoice PDF export failed', e);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 text-slate-800">
        {/* Modal Controls Bar (hidden during physical print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 text-slate-900">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Receipt size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Official Kerala Tax Invoice Preview
              </h3>
              <p className="text-xs text-slate-500">
                Matches Thankam Catering &amp; Events Official Layout (Invoice #{invoiceNo})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-[#fc8019] hover:brightness-105 text-white font-bold text-xs rounded-xl shadow-2xs transition-all disabled:opacity-50"
            >
              {downloadingPdf ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Download size={14} />
              )}
              <span>{downloadingPdf ? 'Generating PDF...' : 'Download Invoice PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Page */}
        <div ref={invoiceRef} className="p-8 md:p-12 print:p-4 bg-white text-slate-900 font-sans">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border border-amber-400/40 bg-white p-1 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
                  <img
                    src="/assets/img/Thankam_Logo.png"
                    alt="Thankam Events Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-extrabold uppercase tracking-wide text-slate-950 leading-tight">
                    THANKAM catering &amp; event&apos;s
                  </h1>
                  <p className="text-xs font-semibold text-slate-600 mt-1 uppercase tracking-widest">
                    Premium Event Management &amp; Traditional Kerala Catering Services
                  </p>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    Uliyacovil, Kollam, Kerala &bull; Phone: <span className="font-mono text-sm">9745684766</span>
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 border border-slate-300 bg-slate-50 p-2.5 rounded-lg text-xs space-y-0.5">
                <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">GST Registration</div>
                <div className="font-mono font-bold text-slate-950 text-xs">GSTIN: 32AABCT8849C1Z3</div>
                <div className="text-[10px] text-slate-600 font-medium">State: Kerala (Code: 32)</div>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-200 flex items-center justify-between">
              <span className="bg-slate-950 text-white font-serif text-xs font-bold uppercase tracking-[0.2em] px-4 py-1 rounded">
                TAX INVOICE
              </span>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Original for Recipient
              </span>
            </div>
          </div>

          {/* Invoice Meta Grid */}
          <div className="grid grid-cols-2 gap-4 border border-slate-800 p-4 mb-6 text-xs">
            <div className="space-y-1.5">
              <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Bill To:</p>
              <p className="font-bold text-sm text-slate-950">{detail.customerName}</p>
              <p className="text-slate-700 font-mono">Ph: {detail.customerPhone || 'N/A'}</p>
              <p className="text-slate-700">Venue: <span className="font-semibold">{detail.venue || 'Client Venue'}</span></p>
            </div>
            <div className="space-y-1.5 text-right font-mono">
              <p>
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Invoice No:</span>{' '}
                <span className="font-bold text-sm text-slate-950">{invoiceNo}</span>
              </p>
              <p>
                <span className="text-slate-600">Date:</span> <span className="font-semibold">{invoiceDate}</span>
              </p>
              <p>
                <span className="text-slate-600">Event Date:</span>{' '}
                <span className="font-semibold">
                  {new Date(detail.eventDate).toLocaleDateString('en-GB')}
                </span>
              </p>
              <p>
                <span className="text-slate-600">Total Members / Guests:</span>{' '}
                <span className="font-bold text-slate-950 text-sm">{guests} Guests</span>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-xs border border-slate-800 mb-6 border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-800 text-slate-900 font-bold uppercase text-[10px]">
                <th className="border-r border-slate-800 p-2 text-center w-12">No.</th>
                <th className="border-r border-slate-800 p-2 text-left">Description of Goods / Services</th>
                <th className="border-r border-slate-800 p-2 text-right w-28">Rate (₹)</th>
                <th className="p-2 text-right w-32">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {/* Food Feast Package Row */}
              <tr className="border-b border-slate-800">
                <td className="border-r border-slate-800 p-2.5 text-center font-bold">1</td>
                <td className="border-r border-slate-800 p-2.5">
                  <p className="font-bold text-slate-950">
                    Food Menu ({foodItems.length} items)
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1 italic leading-relaxed">
                    {foodItems.map((f) => f.name).filter(Boolean).join(' • ')}
                  </p>
                </td>
                <td className="border-r border-slate-800 p-2.5 text-right font-mono">
                  {isPP ? formatInr(perPersonRate) : '—'}
                </td>
                <td className="p-2.5 text-right font-mono font-bold text-slate-950">
                  {formatInr(foodTotal)}
                </td>
              </tr>

              {/* Event Production / Rentals Rows */}
              {serviceItems.map((svc, idx) => {
                const rowTotal = (svc.quantity || 1) * (svc.unitPrice || 0);
                const parsed = formatServiceLineTitle(svc.name);
                return (
                  <tr key={idx} className="border-b border-slate-800">
                    <td className="border-r border-slate-800 p-2.5 text-center font-bold">{idx + 2}</td>
                    <td className="border-r border-slate-800 p-2.5">
                      <p className="font-bold text-slate-950">{parsed.title}</p>
                      {parsed.subtitle && (
                        <p className="text-[11px] text-slate-600 mt-0.5 italic leading-snug">
                          {parsed.subtitle}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{svc.department}</p>
                    </td>
                    <td className="border-r border-slate-800 p-2.5 text-right font-mono">
                      {formatInr(svc.unitPrice)}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-950">
                      {formatInr(rowTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals & Tax Calculation Breakdown */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="border border-slate-800 p-3 text-xs flex flex-col justify-between">
              <div>
                <p className="font-bold text-slate-500 uppercase text-[10px] tracking-wider mb-1">
                  Amount Chargeable (in words):
                </p>
                <p className="font-serif font-bold text-slate-900 text-sm leading-snug">
                  {inWords(grandTotal)}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-300 text-[10px] text-slate-600">
                <p className="font-bold text-slate-700">Bank &amp; Payment Details:</p>
                <p>Account: Thankam Catering &amp; Events</p>
                <p>UPI ID: 9745684766@upi &bull; GooglePay / PhonePe Accepted</p>
              </div>
            </div>

            <div className="border border-slate-800 text-xs font-mono">
              <div className="flex justify-between p-2 border-b border-slate-300">
                <span className="font-sans text-slate-600">Sub Total:</span>
                <span className="font-bold">{formatInr(subtotal)}</span>
              </div>
              {isGstEnabled ? (
                <>
                  <div className="flex justify-between p-2 border-b border-slate-300">
                    <span className="font-sans text-slate-600">CGST ({(gstPctVal / 2).toFixed(1)}%):</span>
                    <span>{formatInr(cgstVal)}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-slate-300">
                    <span className="font-sans text-slate-600">SGST ({(gstPctVal / 2).toFixed(1)}%):</span>
                    <span>{formatInr(sgstVal)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between p-2 border-b border-slate-300 text-slate-500">
                  <span className="font-sans">GST:</span>
                  <span>Not Applicable (0%)</span>
                </div>
              )}
              <div className="flex justify-between p-2.5 bg-slate-900 text-white font-bold text-sm">
                <span className="font-sans">Grand Total:</span>
                <span>{formatInr(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Signatory & Authorization */}
          <div className="grid grid-cols-2 gap-8 pt-8 mt-4 border-t border-slate-400 text-xs">
            <div className="text-[10px] text-slate-600 space-y-1">
              <p className="font-bold uppercase tracking-wider text-slate-900">Declaration:</p>
              <p>1. Certified that the particulars given above are true and correct.</p>
              <p>2. We declare that this invoice shows the actual price of services described.</p>
            </div>
            <div className="text-right flex flex-col justify-end items-end">
              <div className="h-16 w-32 border-b-2 border-dashed border-slate-400 mb-1" />
              <p className="font-bold text-slate-950 font-serif">For THANKAM catering &amp; event&apos;s</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT: CustomerRequestsPage
═══════════════════════════════════════════════════════════════ */
export function CustomerRequestsPage() {
  const auth = useAppSelector(selectAuth);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedIdFromUrl = searchParams.get('id');

  const [rows, setRows] = useState<QuotationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRow, setSelectedRow] = useState<QuotationRow | null>(null);
  const [detail, setDetail] = useState<QuotationDetail | null>(null);
  const detailRef = useRef(detail);
  detailRef.current = detail;
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'quote' | 'agreement'>('quote');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [taxInvoiceOpen, setTaxInvoiceOpen] = useState(false);
  const [company, setCompany] = useState<{ name: string; tagline: string; logoUrl?: string } | null>(null);

  /* quote fields */
  const [notifyCustomerEmail, setNotifyCustomerEmail] = useState('');
  const [quoteMode, setQuoteMode] = useState<'INDIVIDUAL' | 'PER_PERSON'>('PER_PERSON');
  const [reQuoteMode, setReQuoteMode] = useState(false);
  const [reviseMode, setReviseMode] = useState(false);
  const [perPersonAmt, setPerPersonAmt] = useState('');
  const [discountAmt, setDiscountAmt] = useState('');
  const [extraCharges, setExtraCharges] = useState('');
  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstPct, setGstPct] = useState('5');
  const [editItems, setEditItems] = useState<EditableLine[]>([]);
  const [editServices, setEditServices] = useState<EditableServiceLine[]>([]);
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [serviceDeptFilter, setServiceDeptFilter] = useState<ServiceDepartment | 'ALL'>('ALL');
  const [serviceSearch, setServiceSearch] = useState('');

  /* catalog browser */
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catSearch, setCatSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  /* agreement viewer */
  const [agHtml, setAgHtml] = useState('');
  const [agOpen, setAgOpen] = useState(false);
  const [agSent, setAgSent] = useState(false);
  const [agLoading, setAgLoading] = useState(false);
  const agIframeRef = useRef<HTMLIFrameElement>(null);

  /* ── data loading ── */
  const refresh = () =>
    void quotationsService
      .customerRequests(1, 100)
      .then((res) => {
        setRows(res.data);
        if (selectedIdFromUrl) {
          const match = res.data.find((r) => r.id === selectedIdFromUrl);
          if (match) setSelectedRow(match);
        }
      })
      .catch(() => toast.error('Failed to load requests'));

  useEffect(() => {
    refresh();
  }, []);

  // Synchronize URL param ?id=... with detail view
  useEffect(() => {
    if (selectedIdFromUrl) {
      void openDetail(selectedIdFromUrl);
    } else {
      setSelectedRow(null);
      setDetail(null);
    }
  }, [selectedIdFromUrl]);

  useEffect(() => {
    void settingsService
      .list()
      .then((rows) => {
        const co = (rows.find((r) => r.key === 'company')?.value ?? {}) as any;
        setCompany({
          name: String(co.name ?? 'Thankam Events'),
          tagline: String(co.tagline ?? 'Premier Catering & Event Management · Kollam, Kerala'),
          logoUrl: co.logoUrl ? toMediaUrl(String(co.logoUrl)) : undefined,
        });
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    void customerPortalService.catalog().then((tree) => setCatalog(flattenCatalog(tree)));
  }, []);

  useEffect(() => {
    if (!auth.accessToken) return;
    const socket = createWorkflowSocket({ token: auth.accessToken });
    const onEvent = () => {
      refresh();
      if (detailRef.current?.id) void openDetail(detailRef.current.id);
    };
    [
      'workflow:request.created',
      'workflow:request.updated',
      'workflow:request.status',
      'workflow:quotation.status',
      'workflow:agreement.initiated',
      'workflow:agreement.feedback',
      'workflow:customer.interested',
      'workflow:customer.otpVerified',
    ].forEach((e) => socket.on(e, onEvent));

    window.addEventListener('thankam:quotation-event', onEvent);

    const pollTimer = setInterval(() => {
      refresh();
    }, 8000);

    return () => {
      socket.disconnect();
      window.removeEventListener('thankam:quotation-event', onEvent);
      clearInterval(pollTimer);
    };
  }, [auth.accessToken]);

  const openDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const d = await quotationsService.getOne(id);
      setDetail(d);
      setSelectedRow((prev) => (prev?.id === id ? prev : (rows.find((r) => r.id === id) ?? null)));

      const emailFromNotes =
        d.notes?.match(/\[(?:Email|Customer Email|Mail):\s*([^\]\s]+)\]/i)?.[1] ||
        d.notes?.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)?.[1] ||
        d.customerAddress?.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)?.[1] ||
        '';
      setNotifyCustomerEmail(emailFromNotes);

      const guests = Number(d.guestCount ?? 0);

      const ppLine = (d.items ?? []).find((l: any) => isPerPersonLine(l));
      const ppRate = ppLine ? Number(ppLine.unitPrice || 0) : 0;
      const hasExplicitIndividualPrices = (d.items ?? []).some(
        (l: any) => !isPerPersonLine(l) && Number(l.unitPrice || 0) > 0,
      );

      if (hasExplicitIndividualPrices && !ppLine) {
        setQuoteMode('INDIVIDUAL');
        setPerPersonAmt(fmtNum(derivePerPersonRate(d, guests)));
      } else {
        setQuoteMode('PER_PERSON');
        setPerPersonAmt(fmtNum(ppRate > 0 ? ppRate : derivePerPersonRate(d, guests)));
      }

      setReQuoteMode(false);
      setReviseMode(false);
      setCatSearch('');
      setCatFilter('');
      const rawGst = d.gstPercent !== undefined && d.gstPercent !== null ? Number(d.gstPercent) : 5;
      const initialGst = (rawGst === 18 && (d.status === 'DRAFT' || d.requestStatus === 'NEW')) ? 5 : (rawGst || 5);
      setGstEnabled(initialGst > 0);
      setGstPct(fmtNum(initialGst) || '5');
      setDiscountAmt(fmtNum(Number(d.discountAmount ?? 0)));
      setExtraCharges(fmtNum(Number(d.extraChargesAmount ?? 0)));
      const catById = new Map(catalog.map((c) => [c.id, c]));
      const rawLines = d.items ?? [];
      const serviceLines: EditableServiceLine[] = [];
      const foodLines: EditableLine[] = [];

      for (const l of rawLines) {
        if (isPerPersonLine(l)) continue;
        if (isEventServiceItem(l) || (ppRate > 0 && Number(l.unitPrice || 0) > 0)) {
          serviceLines.push({
            id: l.id,
            name: l.name,
            department: l.item?.category?.name || 'Event Services',
            quantity: Math.max(Number(l.quantity || 1), 1),
            unit: l.unit || 'setup',
            unitPrice: Number(l.unitPrice || 0),
          });
        } else {
          foodLines.push({
            itemId: l.itemId ?? undefined,
            name: l.name,
            quantity: Number(l.quantity || 0),
            unit: normalizeUnit(l.unit),
            unitPrice: Number(l.unitPrice || 0),
            categoryName: String(l.item?.category?.name ?? '').trim() || 'Dishes',
            imageUrl: l.itemId ? catById.get(l.itemId)?.imageUrl ?? null : null,
          });
        }
      }

      setEditItems(foodLines);
      setEditServices(serviceLines);

      // Default tab depending on status
      const uiSt = toUiRequestStatus(d.requestStatus);
      if (uiSt === 'ACCEPTED') {
        setActiveTab('agreement');
      } else {
        setActiveTab('quote');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to load inquiry');
    } finally {
      setDetailLoading(false);
    }
  };

  const onSelectRow = (row: QuotationRow) => {
    setSelectedRow(row);
    setSearchParams({ id: row.id });
  };

  const onBackToList = () => {
    setSearchParams({});
    setSelectedRow(null);
    setDetail(null);
  };

  const onMoveStatus = async (id: string, next: string) => {
    try {
      await quotationsService.updateRequestStatus(id, next);
      toast.success(`Request status moved to ${STATUS_LABELS[next as UiStatus] || next}`);
      refresh();
      void openDetail(id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to update status');
    }
  };

  const buildPdfInput = () => {
    if (!detail) return null;
    const disc = parseCurrency(discountAmt);
    const extra = parseCurrency(extraCharges);
    const pct = parsePct(gstPct);
    const taxable = Math.max(subTotal - disc + extra, 0);
    const gstAmt = gstEnabled ? Number(((taxable * pct) / 100).toFixed(2)) : 0;
    return {
      quotationNumber: detail.quotationNumber,
      createdAt: detail.createdAt,
      customerName: detail.customerName,
      customerPhone: detail.customerPhone ?? undefined,
      customerEmail: detail.customerEmail ?? undefined,
      eventType: detail.eventType ?? undefined,
      eventDate: detail.eventDate,
      venue: detail.venue ?? undefined,
      guestCount: detail.guestCount,
      isPerPerson: quoteMode === 'PER_PERSON',
      perPersonRate: quoteMode === 'PER_PERSON' ? parseCurrency(perPersonAmt) : undefined,
      perPersonGuests: quoteMode === 'PER_PERSON' ? detail.guestCount : undefined,
      lines: [
        ...editItems.map((l) => {
          const raw = l.imageUrl ?? (l.itemId ? catalog.find((c) => c.id === l.itemId)?.imageUrl : null);
          return {
            name: l.name,
            category: l.categoryName,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: quoteMode !== 'PER_PERSON' ? l.unitPrice : null,
            amount: quoteMode !== 'PER_PERSON' ? Number((l.quantity * l.unitPrice).toFixed(2)) : null,
            imageUrl: raw ? toMediaUrl(raw) : null,
          };
        }),
        ...editServices.map((s) => ({
          name: s.name,
          category: s.department || 'Event Services',
          quantity: s.quantity,
          unit: s.unit,
          unitPrice: s.unitPrice,
          amount: Number((s.quantity * s.unitPrice).toFixed(2)),
          imageUrl: null,
        })),
      ],
      subTotal,
      discountAmount: disc || undefined,
      extraChargesAmount: extra || undefined,
      gstPercent: gstEnabled ? pct : 0,
      gstAmount: gstEnabled ? gstAmt : 0,
      grandTotal,
      rejectionHistory: rejectionHistory.length > 0 ? rejectionHistory : undefined,
      companyName: company?.name,
      companyTagline: company?.tagline,
      companyLogoUrl: company?.logoUrl,
    };
  };

  const onSaveQuote = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const guests = Number(detail.guestCount ?? 0);
      const items =
        quoteMode === 'PER_PERSON'
          ? [
              ...editItems.map((i) => ({
                itemId: i.itemId,
                name: i.name,
                quantity: i.quantity,
                unit: i.unit,
                unitPrice: 0,
              })),
              {
                name: 'Per Person Quote',
                quantity: guests,
                unit: 'person',
                unitPrice: Number(perPersonAmt || 0),
              },
              ...editServices.map((s) => ({
                itemId: undefined,
                name: s.name,
                quantity: Number(s.quantity || 1),
                unit: s.unit || 'setup',
                unitPrice: Number(s.unitPrice || 0),
              })),
            ]
          : [
              ...editItems.map((i) => ({
                itemId: i.itemId,
                name: i.name,
                quantity: i.quantity,
                unit: i.unit,
                unitPrice: i.unitPrice,
              })),
              ...editServices.map((s) => ({
                itemId: undefined,
                name: s.name,
                quantity: Number(s.quantity || 1),
                unit: s.unit || 'setup',
                unitPrice: Number(s.unitPrice || 0),
              })),
            ];

      let finalNotes = (detail.notes || '').trim();
      const targetEmail = notifyCustomerEmail.trim();
      if (targetEmail) {
        if (/\[(?:Email|Customer Email|Mail):/i.test(finalNotes)) {
          finalNotes = finalNotes.replace(
            /\[(?:Email|Customer Email|Mail):\s*[^\]\s]+\]/i,
            `[Email: ${targetEmail}]`,
          );
        } else {
          finalNotes = finalNotes ? `${finalNotes}\n[Email: ${targetEmail}]` : `[Email: ${targetEmail}]`;
        }
      }

      await quotationsService.update(detail.id, {
        customerName: detail.customerName,
        customerPhone: detail.customerPhone ?? '',
        customerEmail: targetEmail || detail.customerEmail || undefined,
        customerAddress: detail.customerAddress ?? undefined,
        eventDate: detail.eventDate,
        eventType: detail.eventType ?? '',
        venue: detail.venue ?? '',
        guestCount: guests,
        notes: finalNotes || undefined,
        terms: detail.terms ?? undefined,
        gstPercent: gstEnabled ? parsePct(gstPct) : 0,
        discountAmount: parseCurrency(discountAmt),
        extraChargesAmount: parseCurrency(extraCharges),
        items,
      } as Partial<QuotationPayload>);
      await quotationsService.updateRequestStatus(detail.id, 'QUOTED');
      toast.success(
        reQuoteMode ? `Re-quote sent (Attempt #${reQuoteCount + 1})` : 'Quotation saved & sent to customer',
      );
      setReQuoteMode(false);
      refresh();
      void openDetail(detail.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const onSaveRevision = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const guests = Number(detail.guestCount ?? 0);
      const items =
        quoteMode === 'PER_PERSON'
          ? [
              ...editItems.map((i) => ({
                itemId: i.itemId,
                name: i.name,
                quantity: i.quantity,
                unit: i.unit,
                unitPrice: 0,
              })),
              {
                name: 'Per Person Quote',
                quantity: guests,
                unit: 'person',
                unitPrice: Number(perPersonAmt || 0),
              },
            ]
          : editItems.map((i) => ({
              itemId: i.itemId,
              name: i.name,
              quantity: i.quantity,
              unit: i.unit,
              unitPrice: i.unitPrice,
            }));

      let finalNotes = (detail.notes || '').trim();
      const targetEmail = notifyCustomerEmail.trim();
      if (targetEmail) {
        if (/\[(?:Email|Customer Email|Mail):/i.test(finalNotes)) {
          finalNotes = finalNotes.replace(
            /\[(?:Email|Customer Email|Mail):\s*[^\]\s]+\]/i,
            `[Email: ${targetEmail}]`,
          );
        } else {
          finalNotes = finalNotes ? `${finalNotes}\n[Email: ${targetEmail}]` : `[Email: ${targetEmail}]`;
        }
      }

      await quotationsService.update(detail.id, {
        customerName: detail.customerName,
        customerPhone: detail.customerPhone ?? '',
        customerEmail: targetEmail || detail.customerEmail || undefined,
        customerAddress: detail.customerAddress ?? undefined,
        eventDate: detail.eventDate,
        eventType: detail.eventType ?? '',
        venue: detail.venue ?? '',
        guestCount: guests,
        notes: finalNotes || undefined,
        terms: detail.terms ?? undefined,
        gstPercent: gstEnabled ? parsePct(gstPct) : 0,
        discountAmount: parseCurrency(discountAmt),
        extraChargesAmount: parseCurrency(extraCharges),
        items,
      } as Partial<QuotationPayload>);
      toast.success('Changes saved — preview and re-send the agreement');
      setReviseMode(false);
      refresh();
      void openDetail(detail.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const onPreviewAgreement = async () => {
    if (!detail) return;
    setAgLoading(true);
    try {
      const logoBase64 = await fetchImageBase64(company?.logoUrl);
      const isPP = quoteMode === 'PER_PERSON';

      const catById = new Map(catalog.map((c) => [c.id, c]));
      const itemImageMap = new Map<string, string>();
      await Promise.allSettled(
        editItems
          .filter((l) => l.itemId)
          .map(async (l) => {
            const raw = l.imageUrl ?? catById.get(l.itemId!)?.imageUrl;
            if (!raw) return;
            const b64 = await fetchImageBase64(toMediaUrl(raw));
            if (b64 && l.itemId) itemImageMap.set(l.itemId, b64);
          }),
      );

      const html = generateAgreementHtml({
        quotationNumber: detail.quotationNumber,
        createdAt: detail.createdAt,
        eventDate: detail.eventDate,
        eventType: detail.eventType ?? undefined,
        venue: detail.venue ?? undefined,
        guestCount: detail.guestCount,
        customerName: detail.customerName,
        customerPhone: detail.customerPhone ?? undefined,
        customerEmail: detail.customerEmail ?? undefined,
        customerAddress: detail.customerAddress ?? undefined,
        items: editItems.map((l) => ({
          name: l.name,
          category: l.categoryName,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: !isPP ? l.unitPrice : null,
          amount: !isPP ? Number((l.quantity * l.unitPrice).toFixed(2)) : null,
          imageUrl:
            (l.itemId && itemImageMap.get(l.itemId)) || (l.imageUrl ? toMediaUrl(l.imageUrl) : null),
        })),
        isPerPerson: isPP,
        perPersonRate: isPP ? parseCurrency(perPersonAmt) : undefined,
        subTotal,
        discountAmount: parseCurrency(discountAmt) || undefined,
        extraChargesAmount: parseCurrency(extraCharges) || undefined,
        gstPercent: gstEnabled ? parsePct(gstPct) : 0,
        gstAmount: gstEnabled ? gst : 0,
        grandTotal,
        agreementStatus: detail.agreementStatus ?? undefined,
        agreementAcceptedAt: detail.agreementAcceptedAt ?? undefined,
        terms: detail.terms ?? undefined,
        notes: detail.notes ?? undefined,
        companyName: company?.name,
        companyTagline: company?.tagline,
        companyLogoUrl: logoBase64,
        companyPhone: '+91 9745684766',
        companyEmail: 'info@thankamevents.in',
        companyAddress: 'Uliyacovil, Kollam, Kerala',
        isAdminGenerated: true,
      });
      setAgHtml(html);
      setAgSent(false);
      setAgOpen(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to generate preview');
    } finally {
      setAgLoading(false);
    }
  };

  const onSendAgreement = async () => {
    if (!selectedRow) return;
    setAgLoading(true);
    try {
      await quotationsService.initiateAgreement(selectedRow.id);
      setAgSent(true);
      toast.success('Agreement sent to customer');
      refresh();
      void openDetail(selectedRow.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to send');
    } finally {
      setAgLoading(false);
    }
  };

  const onDownloadAgreement = async () => {
    if (!selectedRow) return;
    try {
      await quotationsService.downloadAgreementPdf(
        selectedRow.id,
        `Agreement-${selectedRow.quotationNumber}.pdf`,
      );
      toast.success('Official Agreement PDF downloaded');
      return;
    } catch (e) {
      console.warn('Backend agreement PDF download fallback to client generation', e);
    }

    if (!agHtml) return;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const el = document.createElement('div');
      el.innerHTML = agHtml;
      const opt = {
        margin: 6,
        filename: `Agreement-${selectedRow.quotationNumber}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      };
      await html2pdf().set(opt).from(el).save();
    } catch (err) {
      console.error('Failed to export agreement PDF', err);
      // Fallback
      const url = URL.createObjectURL(new Blob([agHtml], { type: 'text/html' }));
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `${selectedRow.quotationNumber}-agreement.html`,
      });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  };

  /* catalog derived */
  const catalogCategories = useMemo(
    () => Array.from(new Set(catalog.map((c) => c.categoryName))).sort(),
    [catalog],
  );

  const visibleCatalog = useMemo(() => {
    const q = catSearch.toLowerCase();
    return catalog.filter(
      (c) =>
        (!catFilter || c.categoryName === catFilter) &&
        (!q || c.name.toLowerCase().includes(q)),
    );
  }, [catalog, catSearch, catFilter]);

  const selectedEditItemIds = useMemo(
    () => new Set(editItems.map((l) => l.itemId).filter(Boolean)),
    [editItems],
  );

  const toggleCatalogItem = (c: CatalogItem) => {
    if (selectedEditItemIds.has(c.id)) {
      setEditItems((prev) => prev.filter((l) => l.itemId !== c.id));
    } else {
      setEditItems((prev) => [
        ...prev,
        {
          itemId: c.id,
          name: c.name,
          quantity: Number(detail?.guestCount ?? 1),
          unit: normalizeUnit(c.unit),
          unitPrice: 0,
          categoryName: c.categoryName,
          imageUrl: c.imageUrl ?? null,
        },
      ]);
    }
  };

  /* billing calculations */
  const culinarySubtotal = useMemo(() => {
    if (!detail) return 0;
    if (quoteMode === 'PER_PERSON')
      return Number(perPersonAmt || 0) * Number(detail.guestCount || 0);
    return editItems.reduce(
      (s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0),
      0,
    );
  }, [editItems, perPersonAmt, quoteMode, detail]);

  const servicesSubtotal = useMemo(() => {
    return editServices.reduce(
      (s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0),
      0,
    );
  }, [editServices]);

  const subTotal = culinarySubtotal + servicesSubtotal;

  const disc = parseCurrency(discountAmt);
  const extra = parseCurrency(extraCharges);
  const taxable = Math.max(subTotal - disc + extra, 0);
  const gst = gstEnabled ? Number(((taxable * parsePct(gstPct)) / 100).toFixed(2)) : 0;
  const grandTotal = Number((taxable + gst).toFixed(2));
  const guestsCount = Number(detail?.guestCount || 1);
  const perGuestEst = guestsCount > 0 ? grandTotal / guestsCount : 0;
  const grouped = useMemo(() => groupEditable(editItems), [editItems]);

  const st = toUiRequestStatus(detail?.requestStatus);
  const isDeclined = st === 'DECLINED';
  const isLocked = isTerminalRequestStatus(detail?.requestStatus) && !reQuoteMode && !reviseMode;
  const isAccepted = st === 'ACCEPTED';
  const rejectionHistory = parseRejectionHistory(detail?.notes);
  const reQuoteCount = rejectionHistory.length;
  const hasAgreement = Boolean(
    detail?.agreementStatus && detail.agreementStatus !== 'NOT_INITIATED',
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter) {
        const s = toUiRequestStatus(r.requestStatus);
        if (s !== statusFilter) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches =
          r.quotationNumber?.toLowerCase().includes(q) ||
          r.customerName?.toLowerCase().includes(q) ||
          r.customerPhone?.toLowerCase().includes(q) ||
          r.eventType?.toLowerCase().includes(q) ||
          r.venue?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [rows, statusFilter, search]);

  /* ─── Metrics Bar Calculations ─── */
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) {
      const s = toUiRequestStatus(r.requestStatus);
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  const pipelineValue = useMemo(() => {
    return rows.reduce((acc, r) => acc + Number(r.grandTotal || 0), 0);
  }, [rows]);

  /* ─── Sorting & Pagination for Data Table ─────────────────── */
  type SortField =
    | 'quotationNumber'
    | 'createdAt'
    | 'customerName'
    | 'eventType'
    | 'eventDate'
    | 'guestCount'
    | 'requestStatus'
    | 'grandTotal';

  type SortOrder = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'customerName' || field === 'eventType' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search, pageSize]);

  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    list.sort((a, b) => {
      const valA: any = a[sortField];
      const valB: any = b[sortField];

      if (sortField === 'eventDate' || sortField === 'createdAt') {
        const timeA = new Date(valA || 0).getTime();
        const timeB = new Date(valB || 0).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      if (sortField === 'guestCount' || sortField === 'grandTotal') {
        const numA = Number(valA || 0);
        const numB = Number(valB || 0);
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }

      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();
      if (strA < strB) return sortOrder === 'asc' ? -1 : 1;
      if (strA > strB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRows, sortField, sortOrder]);

  const totalItems = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedRows = useMemo(() => {
    return sortedRows.slice(startIndex, endIndex);
  }, [sortedRows, startIndex, endIndex]);

  const getPaginationItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items: (number | 'ellipsis')[] = [];
    if (safeCurrentPage <= 4) {
      items.push(1, 2, 3, 4, 5, 'ellipsis', totalPages);
    } else if (safeCurrentPage >= totalPages - 3) {
      items.push(1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      items.push(1, 'ellipsis', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, 'ellipsis', totalPages);
    }
    return items;
  };

  /* next action for current status */
  const nextAction: { label: string; status: string } | null = useMemo(() => {
    if (!detail || isLocked) return null;
    const idx = STATUS_FLOW.indexOf(st);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null;
    const nextStatus = STATUS_FLOW[idx + 1];
    return { label: STATUS_LABELS[nextStatus], status: nextStatus };
  }, [st, isLocked, detail]);

  /* ═══════════════════════════════════════════════════════════════
     VIEW 1: INQUIRIES PIPELINE TABLE (WHEN NO REQUEST IS SELECTED)
  ═══════════════════════════════════════════════════════════════ */
  if (!selectedIdFromUrl) {
    return (
      <PageShell
        title="Customer Requests & Inquiries"
        subtitle="Review customer requests, set pricing, and send quotations."
      >
        <div className="space-y-6">
          {/* Top Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              Manage incoming customer requests, customize catering menus, and finalize event quotes.
            </p>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
            >
              <RefreshCw size={13} className="text-slate-500" />
              <span>Sync Requests</span>
            </button>
          </div>

          {/* Executive Metrics Bar (Thankam Partner KPI Cards) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Inquiries</span>
                <span className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <FileText size={16} />
                </span>
              </div>
              <p className="mt-2.5 text-2xl font-black font-mono text-slate-900">{rows.length}</p>
              <p className="mt-1 text-[11px] text-slate-500">All portal and direct bookings</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Action Required</span>
                <span className="h-8 w-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                  <Clock size={16} />
                </span>
              </div>
              <p className="mt-2.5 text-2xl font-black font-mono text-orange-600">
                {(counts['REQUESTED'] ?? 0) + (counts['UNDER_REVIEW'] ?? 0)}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-orange-700">Pending review &amp; quote dispatch</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Quotes Delivered</span>
                <span className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <UtensilsCrossed size={16} />
                </span>
              </div>
              <p className="mt-2.5 text-2xl font-black font-mono text-slate-900">
                {counts['QUOTED'] ?? 0}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-amber-700">Awaiting customer confirmation</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Agreements Closed</span>
                <span className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 size={16} />
                </span>
              </div>
              <p className="mt-2.5 text-2xl font-black font-mono text-slate-900">
                {counts['ACCEPTED'] ?? 0}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-emerald-700">Signed &amp; catering confirmed</p>
            </div>
          </div>

          {/* Filter Tabs & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { value: '', label: 'All Requests', count: rows.length },
                { value: 'REQUESTED', label: 'New', count: counts['REQUESTED'] ?? 0 },
                { value: 'UNDER_REVIEW', label: 'Under Review', count: counts['UNDER_REVIEW'] ?? 0 },
                { value: 'QUOTED', label: 'Quoted', count: counts['QUOTED'] ?? 0 },
                { value: 'ACCEPTED', label: 'Accepted', count: counts['ACCEPTED'] ?? 0 },
                { value: 'DECLINED', label: 'Declined', count: counts['DECLINED'] ?? 0 },
              ].map((tab) => {
                const isActive = statusFilter === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-2xs font-bold'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[280px] flex-1 sm:max-w-md">
              <Search
                size={14}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer name, phone, event, venue..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Full-Width Requests Data Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            {totalItems === 0 ? (
              <div className="p-16 text-center">
                <FileText size={38} className="mx-auto mb-3 text-slate-400" />
                <p className="text-base font-bold text-slate-800">No customer requests found</p>
                <p className="mt-1 text-xs text-slate-500">
                  {search || statusFilter
                    ? 'Try clearing your search query or status filter.'
                    : 'Check back when new inquiries are submitted from the customer portal.'}
                </p>
                {(search || statusFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('');
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
                  >
                    <RefreshCw size={12} />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-xs text-left">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 select-none">
                      <tr>
                        <th
                          onClick={() => handleSort('quotationNumber')}
                          className="cursor-pointer px-5 py-3.5 transition-colors hover:text-slate-900"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Quotation #</span>
                            {sortField === 'quotationNumber' ? (
                              sortOrder === 'asc' ? <ChevronUp size={13} className="text-amber-600" /> : <ChevronDown size={13} className="text-amber-600" />
                            ) : (
                              <ArrowUpDown size={12} className="opacity-40" />
                            )}
                          </div>
                        </th>

                        <th
                          onClick={() => handleSort('customerName')}
                          className="cursor-pointer px-5 py-3.5 transition-colors hover:text-slate-900"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Customer / Client</span>
                            {sortField === 'customerName' ? (
                              sortOrder === 'asc' ? <ChevronUp size={13} className="text-amber-600" /> : <ChevronDown size={13} className="text-amber-600" />
                            ) : (
                              <ArrowUpDown size={12} className="opacity-40" />
                            )}
                          </div>
                        </th>

                        <th
                          onClick={() => handleSort('eventType')}
                          className="cursor-pointer px-5 py-3.5 transition-colors hover:text-slate-900"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Event &amp; Venue</span>
                            {sortField === 'eventType' ? (
                              sortOrder === 'asc' ? <ChevronUp size={13} className="text-amber-600" /> : <ChevronDown size={13} className="text-amber-600" />
                            ) : (
                              <ArrowUpDown size={12} className="opacity-40" />
                            )}
                          </div>
                        </th>

                        <th
                          onClick={() => handleSort('eventDate')}
                          className="cursor-pointer px-4 py-3.5 text-center transition-colors hover:text-slate-900"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Event Date</span>
                            {sortField === 'eventDate' ? (
                              sortOrder === 'asc' ? <ChevronUp size={13} className="text-amber-600" /> : <ChevronDown size={13} className="text-amber-600" />
                            ) : (
                              <ArrowUpDown size={12} className="opacity-40" />
                            )}
                          </div>
                        </th>

                        <th
                          onClick={() => handleSort('guestCount')}
                          className="cursor-pointer px-4 py-3.5 text-center transition-colors hover:text-slate-900"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Guests</span>
                            {sortField === 'guestCount' ? (
                              sortOrder === 'asc' ? <ChevronUp size={13} className="text-amber-600" /> : <ChevronDown size={13} className="text-amber-600" />
                            ) : (
                              <ArrowUpDown size={12} className="opacity-40" />
                            )}
                          </div>
                        </th>

                        <th
                          onClick={() => handleSort('requestStatus')}
                          className="cursor-pointer px-4 py-3.5 text-center transition-colors hover:text-slate-900"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Status</span>
                            {sortField === 'requestStatus' ? (
                              sortOrder === 'asc' ? <ChevronUp size={13} className="text-amber-600" /> : <ChevronDown size={13} className="text-amber-600" />
                            ) : (
                              <ArrowUpDown size={12} className="opacity-40" />
                            )}
                          </div>
                        </th>

                        <th
                          onClick={() => handleSort('grandTotal')}
                          className="cursor-pointer px-5 py-3.5 text-right transition-colors hover:text-slate-900"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Total Value</span>
                            {sortField === 'grandTotal' ? (
                              sortOrder === 'asc' ? <ChevronUp size={13} className="text-amber-600" /> : <ChevronDown size={13} className="text-amber-600" />
                            ) : (
                              <ArrowUpDown size={12} className="opacity-40" />
                            )}
                          </div>
                        </th>

                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedRows.map((row) => {
                        const uiSt = toUiRequestStatus(row.requestStatus);
                        const cleanPhone = (row.customerPhone ?? '').replace(/[^\d]/g, '');
                        const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                        const eventDateObj = new Date(row.eventDate);
                        const dateStr = Number.isNaN(eventDateObj.getTime())
                          ? 'Date TBD'
                          : eventDateObj.toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            });

                        return (
                          <tr
                            key={row.id}
                            className="group hover:bg-slate-50/80 transition-colors"
                          >
                            {/* Quotation Number */}
                            <td className="px-5 py-4 font-mono font-bold text-slate-900">
                              {row.quotationNumber}
                            </td>

                            {/* Customer Profile */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center font-bold text-amber-800">
                                  {row.customerName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-xs group-hover:text-amber-700 transition-colors">
                                    {row.customerName}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[11px] text-slate-500 font-mono">
                                      {row.customerPhone || '—'}
                                    </span>
                                    {row.customerPhone && (
                                      <div className="flex items-center gap-1.5 ml-1">
                                        <a
                                          href={`https://wa.me/${waPhone}?text=Hello%20${encodeURIComponent(row.customerName)},%20regarding%20your%20inquiry%20${row.quotationNumber}%20with%20Thankam%20Events...`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-emerald-600 hover:text-emerald-700 transition-colors"
                                          title="WhatsApp Chat"
                                        >
                                          <MessageCircle size={14} />
                                        </a>
                                        <a
                                          href={`tel:${row.customerPhone}`}
                                          className="text-sky-600 hover:text-sky-700 transition-colors"
                                          title="Call Phone"
                                        >
                                          <Phone size={13} />
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Event & Venue */}
                            <td className="px-5 py-4">
                              <div className="space-y-0.5">
                                <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                                  {row.eventType || 'Catering Event'}
                                </span>
                                <p className="text-[11px] text-slate-500 truncate max-w-[200px]" title={row.venue || 'Venue TBD'}>
                                  {row.venue || 'Venue TBD'}
                                </p>
                              </div>
                            </td>

                            {/* Event Date */}
                            <td className="px-4 py-4 text-center">
                              <div className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                                <CalendarDays size={13} className="text-amber-600" />
                                <span>{dateStr}</span>
                              </div>
                            </td>

                            {/* Guests */}
                            <td className="px-4 py-4 text-center">
                              <span className="inline-flex items-center gap-1 font-bold text-slate-800 text-xs bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                <Users size={12} className="text-slate-500" />
                                {row.guestCount}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold shadow-2xs ${STATUS_BADGE[uiSt]}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[uiSt]}`} />
                                {STATUS_LABELS[uiSt] || uiSt}
                              </span>
                            </td>

                            {/* Total Value */}
                            <td className="px-5 py-4 text-right">
                              {Number(row.grandTotal || 0) > 0 ? (
                                <span className="font-mono font-bold text-slate-900 text-xs">
                                  {formatInr(Number(row.grandTotal))}
                                </span>
                              ) : (
                                <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  Awaiting Quote
                                </span>
                              )}
                            </td>

                            {/* Action Button */}
                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => onSelectRow(row)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#fc8019] hover:brightness-105 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-all active:scale-95"
                              >
                                <span>Review &amp; Quote</span>
                                <ArrowRight size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span>
                      Showing <strong className="text-slate-900">{startIndex + 1}</strong> to{' '}
                      <strong className="text-slate-900">{endIndex}</strong> of{' '}
                      <strong className="text-slate-900">{totalItems}</strong> requests
                    </span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-amber-500"
                    >
                      {[10, 25, 50].map((s) => (
                        <option key={s} value={s}>
                          {s} per page
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(1)}
                      disabled={safeCurrentPage === 1}
                      className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronsLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage === 1}
                      className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    {getPaginationItems().map((it, idx) =>
                      it === 'ellipsis' ? (
                        <span key={`e-${idx}`} className="px-2 text-slate-400">
                          …
                        </span>
                      ) : (
                        <button
                          key={it}
                          type="button"
                          onClick={() => setCurrentPage(it)}
                          className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all ${
                            safeCurrentPage === it
                              ? 'bg-slate-900 text-white font-bold shadow-2xs'
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {it}
                        </button>
                      ),
                    )}

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage === totalPages}
                      className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={safeCurrentPage === totalPages}
                      className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronsRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </PageShell>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     VIEW 2: WORKSPACE & QUOTATION COMPOSER (WHEN ID IS SELECTED)
  ═══════════════════════════════════════════════════════════════ */
  const cleanPhone = (detail?.customerPhone ?? selectedRow?.customerPhone ?? '').replace(/[^\d]/g, '');
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  return (
    <PageShell
      title={`Inquiry #${detail?.quotationNumber || selectedRow?.quotationNumber}`}
      subtitle="Craft itemized or per-person catering proposals, configure event equipment, and generate contracts."
    >
      <div className="space-y-6 pb-16">
        {/* Top Navigation & Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToList}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>&larr; Back to Requests Pipeline</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tax Invoice Modal Trigger */}
            {detail && (
              <button
                type="button"
                onClick={() => setTaxInvoiceOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
              >
                <Receipt size={14} className="text-amber-600" />
                <span>Tax Invoice</span>
              </button>
            )}

            {/* PDF Preview Trigger */}
            <button
              type="button"
              onClick={() => {
                const p = buildPdfInput();
                if (p) openQuotePdf(p);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
            >
              <Download size={13} className="text-amber-600" />
              <span>PDF Proposal</span>
            </button>
          </div>
        </div>

        {/* Hero Card: Customer Presentation + Metadata + Stepper */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-5">
          {/* Main Title & Status Line */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-800 font-black text-lg shadow-2xs border border-amber-200">
                {(detail?.customerName || selectedRow?.customerName || 'C').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    {detail?.customerName || selectedRow?.customerName}
                  </h1>
                  <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-bold ${STATUS_BADGE[st]}`}>
                    <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[st]} align-middle`} />
                    {STATUS_LABELS[st] || requestStatusLabel(detail?.requestStatus || selectedRow?.requestStatus)}
                  </span>
                  {reQuoteMode && (
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                      Re-Quote Mode (Attempt #{reQuoteCount + 1})
                    </span>
                  )}
                  {reviseMode && (
                    <span className="rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[10px] font-extrabold text-sky-800">
                      Editing Revision
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Quotation <span className="font-mono font-bold text-slate-900">#{detail?.quotationNumber || selectedRow?.quotationNumber}</span>
                  {detail?.createdAt && (
                    <> &bull; Received {new Date(detail.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Advance / Action Button */}
            {!isLocked && nextAction && (
              <button
                type="button"
                onClick={() => void onMoveStatus(detail?.id || '', nextAction.status)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#fc8019] hover:brightness-105 px-4 py-2 text-xs font-bold text-white shadow-2xs transition-all active:scale-95"
              >
                <span>Advance to &ldquo;{nextAction.label}&rdquo;</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>

          {/* Event Key Details Grid */}
          {detail && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {/* Phone */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <Phone size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</p>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${detail.customerPhone}`}
                      className="truncate text-xs font-bold text-slate-900 hover:text-amber-700 hover:underline"
                    >
                      {detail.customerPhone || '—'}
                    </a>
                    {detail.customerPhone && (
                      <a
                        href={`https://wa.me/${waPhone}?text=Hello%20${encodeURIComponent(detail.customerName)},%20regarding%20your%20inquiry%20${detail.quotationNumber}%20with%20Thankam%20Events...`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700"
                        title="WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Email */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <Mail size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</p>
                  {detail.customerEmail ? (
                    <a
                      href={`mailto:${detail.customerEmail}`}
                      className="truncate text-xs font-bold text-slate-900 hover:text-amber-700 hover:underline block"
                      title={detail.customerEmail}
                    >
                      {detail.customerEmail}
                    </a>
                  ) : (
                    <p className="truncate text-xs font-bold text-slate-400">Not provided</p>
                  )}
                </div>
              </div>

              {/* Event Type */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <PartyPopper size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Event</p>
                  <p className="truncate text-xs font-bold text-slate-900" title={detail.eventType || 'Event'}>
                    {detail.eventType || 'Catering Event'}
                  </p>
                </div>
              </div>

              {/* Event Date */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <CalendarDays size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Event Date</p>
                  <p className="truncate text-xs font-bold text-slate-900">
                    {new Date(detail.eventDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Guests */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
                  <Users size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Guests</p>
                  <p className="truncate text-xs font-bold text-slate-900">
                    {detail.guestCount} Members
                  </p>
                </div>
              </div>

              {/* Venue */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 col-span-2 sm:col-span-1">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                  <MapPin size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Venue &amp; Address</p>
                  <p className="truncate text-xs font-bold text-slate-900" title={detail.customerAddress ? `${detail.venue || 'Venue'}: ${detail.customerAddress}` : (detail.venue || 'Venue TBD')}>
                    {detail.venue || 'Venue TBD'}
                    {detail.customerAddress && (
                      <span className="block text-[11px] font-normal text-slate-600 truncate mt-0.5">
                        {detail.customerAddress}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Customer Special Notes & Requests */}
          {detail?.notes && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <FileText size={13} className="text-amber-700" />
                <span>Special Instructions &amp; Dietary Requests</span>
              </div>
              <p className="mt-1 text-slate-700 whitespace-pre-wrap text-[11px] leading-relaxed">
                {detail.notes}
              </p>
            </div>
          )}

          {/* Customer Notification Email */}
          {detail && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 text-xs shadow-2xs">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-blue-950">
                  <Mail size={13} className="text-blue-600" />
                  <span>Customer Notification Email</span>
                </div>
                <span className="text-[10px] text-blue-700 font-medium">Auto-delivers official PDF &amp; updates</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="e.g. customer@gmail.com"
                  value={notifyCustomerEmail}
                  onChange={(e) => setNotifyCustomerEmail(e.target.value)}
                  className="h-8 text-xs bg-white border-blue-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Workflow Status / Stepper Strip */}
          {detail && (
            <div>
              {isDeclined && !reQuoteMode ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-rose-100 text-rose-600">
                      <XCircle size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-rose-800">
                        Quotation Declined by Client
                      </p>
                      {rejectionHistory.length > 0 ? (
                        <p className="text-[11px] text-rose-700">
                          Feedback: <span className="font-semibold italic">&ldquo;{rejectionHistory[rejectionHistory.length - 1].reason}&rdquo;</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-rose-700">
                          The client requested pricing adjustments or menu alterations.
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReQuoteMode(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors"
                  >
                    <RefreshCw size={12} />
                    <span>Create Re-quote</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    {STATUS_FLOW.map((sKey, idx) => {
                      const stepNum = idx + 1;
                      const isCurrent = st === sKey;
                      const isPassed = STATUS_FLOW.indexOf(st) > idx;

                      return (
                        <Fragment key={sKey}>
                          {idx > 0 && <span className="text-slate-300">──</span>}
                          <div
                            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all ${
                              isCurrent
                                ? 'bg-slate-900 text-white font-bold shadow-2xs'
                                : isPassed
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'text-slate-400'
                            }`}
                          >
                            <span
                              className={`grid h-4 w-4 place-items-center rounded-full text-[10px] font-black ${
                                isCurrent
                                  ? 'bg-amber-400 text-slate-950'
                                  : isPassed
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {isPassed ? '✓' : stepNum}
                            </span>
                            <span>{STATUS_LABELS[sKey]}</span>
                          </div>
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {detailLoading && !detail ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-16 text-center shadow-xs">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500" />
            <p className="mt-3 text-sm font-semibold text-slate-600">Retrieving inquiry details…</p>
          </div>
        ) : detail ? (
          <>
            {/* ── TABS (Only shown when Agreement is available) ── */}
            {isAccepted ? (
              <div className="flex items-center gap-2 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('quote')}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
                    activeTab === 'quote'
                      ? 'border-amber-600 text-amber-700 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UtensilsCrossed size={14} />
                  <span>Menu &amp; Quote Items</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {editItems.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('agreement')}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
                    activeTab === 'agreement'
                      ? 'border-emerald-600 text-emerald-700 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileCheck2 size={14} />
                  <span>Agreement &amp; Contract</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    Signed
                  </span>
                </button>
              </div>
            ) : null}

            {/* ── TAB 1: QUOTE BUILDER WORKSPACE ── */}
            {activeTab === 'quote' && (
              <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
                {/* LEFT COLUMN: Items Table & Catalog */}
                <div className="space-y-4">
                  {/* Mode Selector & Quick Add Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-700">Pricing Mode:</span>
                      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                        <button
                          type="button"
                          onClick={() => setQuoteMode('PER_PERSON')}
                          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                            quoteMode === 'PER_PERSON'
                              ? 'bg-slate-900 text-white shadow-2xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Per Person Package
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuoteMode('INDIVIDUAL')}
                          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                            quoteMode === 'INDIVIDUAL'
                              ? 'bg-slate-900 text-white shadow-2xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Per Item Pricing
                        </button>
                      </div>
                    </div>

                    {/* Catalog Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setCatalogOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <Plus size={14} />
                      <span>{catalogOpen ? 'Hide Catalog' : '+ Add Dishes from Catalog'}</span>
                      {catalogOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* If Per Person: Rate Banner */}
                  {quoteMode === 'PER_PERSON' && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
                      <div>
                        <p className="text-xs font-bold text-amber-900">Per Person Package Rate</p>
                        <p className="text-xs text-slate-600">
                          Individual dishes will be served without individual item rates. Total = {detail.guestCount} Guests &times; Rate.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">Rate / Guest:</span>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            ₹
                          </span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={perPersonAmt}
                            onChange={(e) => setPerPersonAmt(sanitizeCurrency(e.target.value))}
                            placeholder="0"
                            className="h-9 w-28 rounded-xl border-slate-200 bg-white pl-6 text-xs font-bold text-slate-900 focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expandable Catalog Browser */}
                  {catalogOpen && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs animate-in fade-in-50 duration-200">
                      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="relative min-w-[240px] flex-1">
                          <Search
                            size={14}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            value={catSearch}
                            onChange={(e) => setCatSearch(e.target.value)}
                            placeholder="Search dishes to add…"
                            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-amber-500"
                          />
                        </div>

                        <select
                          value={catFilter}
                          onChange={(e) => setCatFilter(e.target.value)}
                          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
                        >
                          <option value="">All Categories ({catalog.length} items)</option>
                          {catalogCategories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid max-h-60 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                        {visibleCatalog.map((c) => {
                          const added = selectedEditItemIds.has(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggleCatalogItem(c)}
                              className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs transition-all ${
                                added
                                  ? 'border border-amber-400 bg-amber-50/70 text-slate-900 font-bold'
                                  : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <span className="truncate pr-2">
                                <span>{c.name}</span>
                                <span className="ml-1.5 text-[10px] text-slate-400">
                                  ({c.categoryName})
                                </span>
                              </span>
                              <span
                                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                  added
                                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-amber-500 hover:text-slate-950'
                                }`}
                              >
                                {added ? <Check size={11} strokeWidth={3} /> : <Plus size={11} />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Main Quotation Items Table */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <UtensilsCrossed size={16} className="text-amber-700" />
                        <span className="text-xs font-bold text-slate-900">
                          Food Menu ({editItems.length} Dishes)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEditItems((prev) => [
                            ...prev,
                            {
                              itemId: undefined,
                              name: '',
                              quantity: 1,
                              unit: 'plate',
                              unitPrice: 0,
                              categoryName: 'Custom Course',
                            },
                          ])
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
                      >
                        <Plus size={13} /> Add Custom Dish
                      </button>
                    </div>

                    {editItems.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-400">
                        No dishes selected in quote. Click &ldquo;+ Add Dishes from Catalog&rdquo; to add food items.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className={`w-full text-xs ${quoteMode === 'INDIVIDUAL' ? 'min-w-[560px]' : 'min-w-full'}`}>
                          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="px-5 py-3 text-left">Dish Name</th>
                              {quoteMode === 'INDIVIDUAL' && (
                                <th className="w-36 px-4 py-3 text-right">Price (₹)</th>
                              )}
                              <th className="w-12 px-3 py-3 text-center" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {grouped.map(({ category, entries }) => (
                              <Fragment key={category}>
                                <tr className="bg-slate-50/70">
                                  <td
                                    colSpan={quoteMode === 'INDIVIDUAL' ? 3 : 2}
                                    className="px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-800"
                                  >
                                    {category} ({entries.length})
                                  </td>
                                </tr>
                                {entries.map(({ item, index }) => {
                                  return (
                                    <tr
                                      key={`item-${index}`}
                                      className="group hover:bg-slate-50/80 transition-colors"
                                    >
                                      <td className="px-5 py-2.5">
                                        {item.itemId ? (
                                          <span className="font-semibold text-slate-900">
                                            {item.name}
                                          </span>
                                        ) : (
                                          <input
                                            type="text"
                                            value={item.name}
                                            autoFocus={item.name === ''}
                                            onChange={(e) =>
                                              setEditItems((prev) =>
                                                prev.map((l, i) =>
                                                  i === index ? { ...l, name: e.target.value } : l,
                                                ),
                                              )
                                            }
                                            placeholder="Enter custom dish name…"
                                            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-amber-500"
                                          />
                                        )}
                                      </td>
                                      {quoteMode === 'INDIVIDUAL' && (
                                        <td className="px-4 py-2.5 text-right">
                                          <Input
                                            type="text"
                                            inputMode="decimal"
                                            value={fmtNum(item.unitPrice)}
                                            onChange={(e) =>
                                              setEditItems((prev) =>
                                                prev.map((l, i) =>
                                                  i === index
                                                    ? {
                                                        ...l,
                                                        unitPrice: parseCurrency(e.target.value),
                                                        amount: parseCurrency(e.target.value),
                                                      }
                                                    : l,
                                                ),
                                              )
                                            }
                                            className="h-8 w-28 text-right text-xs font-bold border-slate-200 bg-white text-slate-900 ml-auto"
                                            placeholder="0"
                                          />
                                        </td>
                                      )}
                                      <td className="px-3 py-2.5 text-center">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setEditItems((prev) =>
                                              prev.filter((_, i) => i !== index),
                                            )
                                          }
                                          className="grid h-6 w-6 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                                          title="Remove dish"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* ── Event Services & Production Rentals Manager ── */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                          <PartyPopper size={14} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                            Stage, Decor &amp; Production Services ({editServices.length})
                          </h4>
                          <p className="text-[10px] text-slate-500">
                            Stage decor, lighting, sound, generators, chairs, and service staff
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setServicePickerOpen((p) => !p)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
                        >
                          <Plus size={13} />
                          <span>{servicePickerOpen ? 'Hide Services' : '+ Add Services'}</span>
                          {servicePickerOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setEditServices((prev) => [
                              ...prev,
                              {
                                name: '',
                                department: 'Custom Rental',
                                quantity: 1,
                                unit: 'setup',
                                unitPrice: 0,
                              },
                            ])
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
                        >
                          <Plus size={13} />
                          <span>+ Custom Service</span>
                        </button>
                      </div>
                    </div>

                    {/* Service Catalog Picker */}
                    {servicePickerOpen && (
                      <div className="border-b border-slate-100 bg-slate-50/70 p-4 animate-in fade-in-50 duration-200">
                        {/* Category Pills & Search */}
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setServiceDeptFilter('ALL')}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                                serviceDeptFilter === 'ALL'
                                  ? 'bg-slate-900 text-white shadow-2xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              All Services
                            </button>
                            {(Object.keys(SERVICE_DEPARTMENTS) as ServiceDepartment[]).map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setServiceDeptFilter(d)}
                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                                  serviceDeptFilter === d
                                    ? 'bg-slate-900 text-white shadow-2xs'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <span>{SERVICE_DEPARTMENTS[d].icon}</span>
                                <span>{SERVICE_DEPARTMENTS[d].label}</span>
                              </button>
                            ))}
                          </div>

                          <div className="relative w-full sm:w-64">
                            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={serviceSearch}
                              onChange={(e) => setServiceSearch(e.target.value)}
                              placeholder="Type 'stage', 'lights', 'staff'…"
                              className="h-8 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        {/* Grid of Atomic Services */}
                        <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                          {searchEventServices(serviceSearch, serviceDeptFilter).map((svc) => (
                            <button
                              key={svc.id}
                              type="button"
                              onClick={() => {
                                setEditServices((prev) => [
                                  ...prev,
                                  {
                                    serviceId: svc.id,
                                    name: svc.name,
                                    department: svc.departmentLabel,
                                    quantity: 1,
                                    unit: svc.defaultUnit,
                                    unitPrice: svc.defaultPrice,
                                  },
                                ]);
                                toast.success(`Added ${svc.name}`);
                              }}
                              className="group flex items-start justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-all hover:border-amber-400 hover:bg-amber-50/20"
                            >
                              <div className="pr-2">
                                <p className="text-xs font-bold text-slate-800 group-hover:text-amber-800">
                                  {svc.name}
                                </p>
                                <p className="text-[10px] text-slate-500 line-clamp-1">{svc.description}</p>
                                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-700">
                                  <span>{formatInr(svc.defaultPrice)}</span>
                                </div>
                              </div>
                              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                                <Plus size={13} />
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Services Table */}
                    {editServices.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        No equipment or services added yet. Click &ldquo;+ Add Services&rdquo; to add stage, sound, lighting, or catering staff.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="px-5 py-2.5 text-left">Service / Item</th>
                              <th className="w-36 px-4 py-2.5 text-right">Price (₹)</th>
                              <th className="w-12 px-3 py-2.5 text-center" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {editServices.map((svc, sIdx) => {
                              return (
                                <tr key={sIdx} className="group hover:bg-slate-50/80 transition-colors">
                                  <td className="px-5 py-2.5">
                                    <input
                                      type="text"
                                      value={svc.name}
                                      onChange={(e) =>
                                        setEditServices((prev) =>
                                          prev.map((s, i) => (i === sIdx ? { ...s, name: e.target.value } : s)),
                                        )
                                      }
                                      placeholder="e.g. Stage Decor, Sound & Lights, Generator Diesel…"
                                      className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-amber-500"
                                    />
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={fmtNum(svc.unitPrice)}
                                      onChange={(e) =>
                                        setEditServices((prev) =>
                                          prev.map((s, i) =>
                                            i === sIdx
                                              ? {
                                                  ...s,
                                                  unitPrice: parseCurrency(e.target.value),
                                                  amount: parseCurrency(e.target.value),
                                                }
                                              : s,
                                          ),
                                        )
                                      }
                                      className="h-8 w-28 text-right text-xs font-bold border-slate-200 bg-white text-slate-900 ml-auto"
                                      placeholder="0"
                                    />
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setEditServices((prev) => prev.filter((_, i) => i !== sIdx))}
                                      className="grid h-6 w-6 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                                      title="Remove service"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Services Subtotal Footer */}
                    {editServices.length > 0 && (
                      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
                        <span className="text-xs font-bold text-slate-600">Services &amp; Equipment Total</span>
                        <span className="text-sm font-black font-mono text-slate-900">
                          {formatInr(servicesSubtotal)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: STICKY BILLING CALCULATOR & ACTIONS */}
                <div className="sticky top-6 space-y-4">
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Receipt size={16} className="text-amber-700" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          Billing Summary
                        </h4>
                      </div>
                      <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        {quoteMode === 'INDIVIDUAL' ? 'Per Item' : 'Per Person'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3.5 text-xs">
                      {/* Food Subtotal */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Food Subtotal</span>
                        <span className="font-bold text-slate-900 font-mono">{formatInr(culinarySubtotal)}</span>
                      </div>

                      {/* Services Subtotal */}
                      {servicesSubtotal > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Services Subtotal</span>
                          <span className="font-bold text-amber-800 font-mono">{formatInr(servicesSubtotal)}</span>
                        </div>
                      )}

                      {/* Combined Subtotal */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-slate-700 font-bold">Total Subtotal</span>
                        <span className="font-black text-slate-900 font-mono">{formatInr(subTotal)}</span>
                      </div>

                      {/* Discount Input */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 font-medium">Discount (₹)</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={discountAmt}
                          onChange={(e) => setDiscountAmt(sanitizeCurrency(e.target.value))}
                          placeholder="0"
                          className="h-8 w-24 text-right text-xs font-bold border-slate-200 bg-white text-slate-900"
                        />
                      </div>

                      {/* Extra Charges Input */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 font-medium">Extra Charges (₹)</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={extraCharges}
                          onChange={(e) => setExtraCharges(sanitizeCurrency(e.target.value))}
                          placeholder="0"
                          className="h-8 w-24 text-right text-xs font-bold border-slate-200 bg-white text-slate-900"
                        />
                      </div>

                      {/* GST Switch & % */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setGstEnabled((p) => !p)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                              gstEnabled
                                ? 'bg-slate-900 text-white font-bold shadow-2xs'
                                : 'border border-slate-200 bg-white text-slate-600'
                            }`}
                          >
                            GST {gstEnabled ? '5%' : 'OFF'}
                          </button>
                          {gstEnabled && (
                            <Input
                              type="text"
                              value={gstPct}
                              onChange={(e) => setGstPct(sanitizePct(e.target.value))}
                              className="h-7 w-12 text-center text-xs font-bold p-0 border-slate-200 bg-white text-slate-900"
                            />
                          )}
                        </div>
                        <span className="font-bold text-slate-900 font-mono">
                          {gstEnabled ? formatInr(gst) : '₹0'}
                        </span>
                      </div>

                      {/* Divider & Grand Total */}
                      <div className="border-t border-slate-200 pt-3.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold text-slate-700">Grand Total</span>
                          <span className="text-2xl font-black tracking-tight text-slate-900 font-mono">
                            {formatInr(grandTotal)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Cost / Guest ({guestsCount} guests)</span>
                          <span className="font-semibold text-slate-700 font-mono">
                            {formatInr(perGuestEst)} / guest
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 space-y-2.5">
                      <button
                        type="button"
                        onClick={() => void (reviseMode ? onSaveRevision() : onSaveQuote())}
                        disabled={saving}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#fc8019] py-3 text-xs font-bold text-white shadow-xs hover:brightness-105 disabled:opacity-60 transition-all active:scale-[0.99]"
                      >
                        {saving ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <Send size={14} />
                        )}
                        <span>
                          {saving
                            ? 'Saving…'
                            : reviseMode
                            ? 'Save Revision'
                            : reQuoteMode
                            ? `Re-quote & Send (#${reQuoteCount + 1})`
                            : 'Save & Send to Customer'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTaxInvoiceOpen(true)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
                      >
                        <Receipt size={14} className="text-amber-600" /> Official Kerala Tax Invoice
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (detail?.id) {
                            try {
                              await quotationsService.downloadPdf(
                                detail.id,
                                `Quotation-${detail.quotationNumber}.pdf`,
                              );
                              toast.success('Official PDF proposal downloaded');
                              return;
                            } catch (e) {
                              console.warn('Direct PDF download fallback to client generation', e);
                            }
                          }
                          const p = buildPdfInput();
                          if (p) openQuotePdf(p);
                        }}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
                      >
                        <Download size={13} className="text-amber-600" /> Export PDF Proposal
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── AGREEMENT & CONTRACT (WHEN ACCEPTED) ── */}
            {activeTab === 'agreement' && isAccepted && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-xs space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-emerald-900 font-serif">
                    Binding Agreement &amp; Contract Management
                  </h4>
                  <p className="text-xs text-emerald-700">
                    The client has formally accepted this quotation. Review signed credentials or re-transmit agreement copy.
                  </p>
                </div>

                {hasAgreement && (
                  <div className="rounded-xl border border-emerald-200 bg-white p-4 text-xs font-bold text-emerald-800 shadow-2xs">
                    {detail.agreementStatus === 'ACCEPTED'
                      ? '✓ Customer accepted the final binding agreement'
                      : 'Agreement initiated — awaiting customer verification'}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void onPreviewAgreement()}
                    disabled={agLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-2xs transition-colors"
                  >
                    {agLoading ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Eye size={14} />
                    )}
                    <span>Preview &amp; Send Agreement</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* ── AGREEMENT FULLSCREEN MODAL ── */}
        {agOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-sm">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3.5 shadow-md">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAgOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Agreement Preview
                  </p>
                  <p className="truncate text-sm font-bold text-slate-900 font-mono">
                    {selectedRow?.quotationNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => void onDownloadAgreement()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#fc8019] px-4 text-xs font-bold text-white shadow-2xs hover:brightness-105"
                >
                  <Download size={13} /> Download Agreement PDF
                </button>

                {agSent ? (
                  <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-bold text-emerald-700">
                    <FileCheck2 size={13} /> Sent
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onSendAgreement()}
                    disabled={agLoading}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 text-xs font-bold text-white shadow-2xs disabled:opacity-60"
                  >
                    {agLoading ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Send size={13} />
                    )}
                    Send to Customer
                  </button>
                )}
              </div>
            </div>

            <iframe
              ref={agIframeRef}
              className="flex-1 w-full border-0 bg-white"
              srcDoc={agHtml}
              title="Agreement"
              sandbox="allow-same-origin allow-scripts allow-popups"
            />
          </div>
        )}

        {/* ── TAX INVOICE MODAL ── */}
        {detail && (
          <TaxInvoiceModal
            isOpen={taxInvoiceOpen}
            onClose={() => setTaxInvoiceOpen(false)}
            detail={detail}
            foodItems={editItems}
            serviceItems={editServices}
            perPersonRate={parseCurrency(perPersonAmt)}
            quoteMode={quoteMode}
          />
        )}

        {agLoading && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center gap-4 bg-black/70 backdrop-blur-sm">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-amber-500/30 border-t-[#D4AF37]" />
          </div>
        )}
      </div>
    </PageShell>
  );
}

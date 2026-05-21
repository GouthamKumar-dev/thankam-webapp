import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileCheck2,
  FileText,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
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

/* ─── Helpers ────────────────────────────────────────────────── */
function key() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

function flattenCatalog(nodes: CategoryNode[]): CatalogItem[] {
  const out: CatalogItem[] = [];
  for (const node of nodes) {
    for (const item of node.items) {
      out.push({ id: item.id, name: item.name, unit: item.unit, basePrice: Number(item.basePrice ?? 0), categoryName: node.name, imageUrl: item.imageUrl });
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
const parseCurrency = (v: string) => { const n = Number(sanitizeCurrency(v)); return Number.isFinite(n) && n > 0 ? n : 0; };
const sanitizePct = (v: string) => { const s = v.replace(/[^\d.]/g, ''); const [w, ...f] = s.split('.'); return f.length ? `${w.slice(0, 2)}.${f.join('').slice(0, 2)}` : w.slice(0, 2); };
const parsePct = (v: string) => Math.min(Number(sanitizePct(v)) || 0, 100);
const fmtNum = (v: number) => v > 0 ? v.toFixed(2).replace(/\.00$/, '') : '';
const ALLOWED_UNITS = ['plate', 'bowl', 'glass', 'piece', 'scoop'] as const;

const normalizeUnit = (u?: string | null) => {
  const r = (u ?? '').trim().toLowerCase();
  if (!r) return 'plate';
  // Legacy mappings kept for old data
  if (r === 'pcs') return 'piece';
  if (ALLOWED_UNITS.includes(r as any)) return r;
  return 'plate';
};

function isPerPersonLine(line: any) {
  return String(line?.unit ?? '').toLowerCase().trim() === 'person' ||
    String(line?.name ?? '').toLowerCase().trim() === 'per person quote';
}

function derivePerPersonRate(detail: QuotationDetail, guests: number) {
  if (guests <= 0) return 0;
  const pp = (detail.items ?? []).find(r => String(r.unit ?? '').toLowerCase() === 'person' && Number(r.unitPrice || 0) > 0);
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
  return notes.split('\n')
    .filter(l => l.includes('[CUSTOMER_DECLINE]'))
    .map(l => {
      const m = l.match(/\[CUSTOMER_DECLINE\]\s+(\S+)\s*-\s*(.+)/);
      return m ? { date: m[1], reason: m[2].trim() } : null;
    })
    .filter((x): x is RejectionEntry => x !== null);
}

type GroupedLine = { category: string; entries: Array<{ item: EditableLine; index: number }> };
function groupEditable(items: EditableLine[]): GroupedLine[] {
  const map = new Map<string, Array<{ item: EditableLine; index: number }>>();
  for (const [i, item] of items.entries()) {
    const cat = item.categoryName || 'Items';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push({ item, index: i });
  }
  return Array.from(map.entries()).map(([category, entries]) => ({ category, entries }));
}

/* Status config */
const STATUS_FLOW: UiStatus[] = ['REQUESTED', 'UNDER_REVIEW', 'QUOTED', 'ACCEPTED'];
const STATUS_LABELS: Record<UiStatus, string> = {
  REQUESTED: 'New Request', UNDER_REVIEW: 'Under Review',
  QUOTED: 'Quoted', ACCEPTED: 'Accepted', DECLINED: 'Declined',
};
const STATUS_BADGE: Record<UiStatus, string> = {
  REQUESTED:    'border-blue-200 bg-blue-50 text-blue-700',
  UNDER_REVIEW: 'border-amber-200 bg-amber-50 text-amber-700',
  QUOTED:       'border-violet-200 bg-violet-50 text-violet-700',
  ACCEPTED:     'border-emerald-200 bg-emerald-50 text-emerald-700',
  DECLINED:     'border-rose-200 bg-rose-50 text-rose-700',
};
const STATUS_DOT: Record<UiStatus, string> = {
  REQUESTED: 'bg-blue-500', UNDER_REVIEW: 'bg-amber-400 animate-pulse',
  QUOTED: 'bg-violet-500', ACCEPTED: 'bg-emerald-500', DECLINED: 'bg-rose-500',
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════ */
export function CustomerRequestsPage() {
  const auth = useAppSelector(selectAuth);
  const [rows, setRows] = useState<QuotationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRow, setSelectedRow] = useState<QuotationRow | null>(null);
  const [detail, setDetail] = useState<QuotationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [company, setCompany] = useState<{ name: string; tagline: string; logoUrl?: string } | null>(null);

  /* quote */
  const [quoteMode,    setQuoteMode]    = useState<'INDIVIDUAL' | 'PER_PERSON'>('INDIVIDUAL');
  const [reQuoteMode,  setReQuoteMode]  = useState(false);
  const [reviseMode,   setReviseMode]   = useState(false);
  const [perPersonAmt, setPerPersonAmt] = useState('');
  const [discountAmt,  setDiscountAmt]  = useState('');
  const [extraCharges, setExtraCharges] = useState('');
  const [gstEnabled,   setGstEnabled]   = useState(true);
  const [gstPct,       setGstPct]       = useState('18');
  const [editItems,    setEditItems]    = useState<EditableLine[]>([]);

  /* catalog */
  const [catalog,   setCatalog]   = useState<CatalogItem[]>([]);
  const [catSearch, setCatSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  /* agreement viewer */
  const [agHtml,    setAgHtml]    = useState('');
  const [agOpen,    setAgOpen]    = useState(false);
  const [agSent,    setAgSent]    = useState(false);
  const [agLoading, setAgLoading] = useState(false);
  const agIframeRef = useRef<HTMLIFrameElement>(null);

  /* ── data ── */
  const refresh = () =>
    void quotationsService
      .customerRequests(1, 100, statusFilter || undefined, search.trim() || undefined)
      .then(res => {
        setRows(res.data);
        if (selectedRow) {
          const updated = res.data.find(r => r.id === selectedRow.id);
          if (updated) setSelectedRow(updated);
        }
      })
      .catch(() => toast.error('Failed to load requests'));

  useEffect(() => { refresh(); }, [statusFilter]);

  useEffect(() => {
    void settingsService.list()
      .then(rows => {
        const co = rows.find(r => r.key === 'company')?.value ?? {} as any;
        setCompany({
          name:    String(co.name    ?? 'Thankam Events'),
          tagline: String(co.tagline ?? 'Premier Catering & Event Management · Kollam, Kerala'),
          logoUrl: co.logoUrl ? toMediaUrl(String(co.logoUrl)) : undefined,
        });
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    void customerPortalService.catalog().then(tree => setCatalog(flattenCatalog(tree)));
  }, []);

  useEffect(() => {
    if (!auth.accessToken) return;
    const socket = createWorkflowSocket({ token: auth.accessToken });
    const onEvent = () => { refresh(); if (detail?.id) void openDetail(detail.id); };
    ['workflow:request.created', 'workflow:request.status', 'workflow:customer.interested',
      'workflow:customer.otpVerified', 'workflow:agreement.feedback'].forEach(e => socket.on(e, onEvent));
    return () => { socket.disconnect(); };
  }, [auth.accessToken, statusFilter, search, detail?.id]);

  const openDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const d = await quotationsService.getOne(id);
      setDetail(d);
      const guests = Number(d.guestCount ?? 0);

      // Detect if this quotation was saved in Per Person mode
      const ppLine = (d.items ?? []).find((l: any) => isPerPersonLine(l));
      const ppRate = ppLine ? Number(ppLine.unitPrice || 0) : 0;
      if (ppRate > 0) {
        setQuoteMode('PER_PERSON');
        setPerPersonAmt(fmtNum(ppRate));
      } else {
        setQuoteMode('INDIVIDUAL');
        setPerPersonAmt(fmtNum(derivePerPersonRate(d, guests)));
      }

      setReQuoteMode(false);
      setReviseMode(false);
      setCatSearch('');
      setCatFilter('');
      setGstEnabled(Number(d.gstPercent ?? 18) > 0);
      setGstPct(fmtNum(Number(d.gstPercent ?? 18) || 18) || '18');
      setDiscountAmt(fmtNum(Number(d.discountAmount ?? 0)));
      setExtraCharges(fmtNum(Number(d.extraChargesAmount ?? 0)));
      const catById = new Map(catalog.map(c => [c.id, c]));
      setEditItems((d.items ?? []).filter((l: any) => !isPerPersonLine(l)).map((l: any) => ({
        itemId: l.itemId ?? undefined,
        name: l.name,
        quantity: Number(l.quantity || 0),
        unit: normalizeUnit(l.unit),
        unitPrice: Number(l.unitPrice || 0),
        categoryName: String(l.item?.category?.name ?? '').trim() || 'Items',
        imageUrl: l.itemId ? (catById.get(l.itemId)?.imageUrl ?? null) : null,
      })));
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to load'); }
    finally { setDetailLoading(false); }
  };

  const onSelectRow = (row: QuotationRow) => {
    setSelectedRow(row);
    void openDetail(row.id);
    setMobileView('detail');
  };

  const onMoveStatus = async (id: string, next: string) => {
    try {
      await quotationsService.updateRequestStatus(id, next);
      toast.success('Status updated');
      refresh();
      void openDetail(id);
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed'); }
  };

  const buildPdfInput = () => {
    if (!detail) return null;
    const disc    = parseCurrency(discountAmt);
    const extra   = parseCurrency(extraCharges);
    const pct     = parsePct(gstPct);
    const taxable = Math.max(subTotal - disc + extra, 0);
    const gstAmt  = gstEnabled ? Number(((taxable * pct) / 100).toFixed(2)) : 0;
    return {
      quotationNumber: detail.quotationNumber,
      createdAt: detail.createdAt,
      customerName: detail.customerName,
      customerPhone: detail.customerPhone ?? undefined,
      eventType: detail.eventType ?? undefined,
      eventDate: detail.eventDate,
      venue: detail.venue ?? undefined,
      guestCount: detail.guestCount,
      isPerPerson: quoteMode === 'PER_PERSON',
      perPersonRate:   quoteMode === 'PER_PERSON' ? parseCurrency(perPersonAmt) : undefined,
      perPersonGuests: quoteMode === 'PER_PERSON' ? detail.guestCount : undefined,
      lines: editItems.map(l => {
        const raw = l.imageUrl ?? (l.itemId ? catalog.find(c => c.id === l.itemId)?.imageUrl : null);
        return {
          name: l.name,
          category: l.categoryName,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: quoteMode !== 'PER_PERSON' ? l.unitPrice : null,
          amount:    quoteMode !== 'PER_PERSON' ? Number((l.quantity * l.unitPrice).toFixed(2)) : null,
          imageUrl: raw ? toMediaUrl(raw) : null,
        };
      }),
      subTotal,
      discountAmount:     disc  || undefined,
      extraChargesAmount: extra || undefined,
      gstPercent: gstEnabled ? pct    : undefined,
      gstAmount:  gstEnabled ? gstAmt : undefined,
      grandTotal,
      rejectionHistory: rejectionHistory.length > 0 ? rejectionHistory : undefined,
      companyName:    company?.name,
      companyTagline: company?.tagline,
      companyLogoUrl: company?.logoUrl,
    };
  };

  const onSaveQuote = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const guests = Number(detail.guestCount ?? 0);
      const items = quoteMode === 'PER_PERSON'
        ? [
          ...editItems.map(i => ({ itemId: i.itemId, name: i.name, quantity: i.quantity, unit: i.unit, unitPrice: 0 })),
          { name: 'Per Person Quote', quantity: guests, unit: 'person', unitPrice: Number(perPersonAmt || 0) },
        ]
        : editItems.map(i => ({ itemId: i.itemId, name: i.name, quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice }));

      await quotationsService.update(detail.id, {
        customerName: detail.customerName, customerPhone: detail.customerPhone ?? '',
        customerAddress: detail.customerAddress ?? undefined,
        eventDate: detail.eventDate, eventType: detail.eventType ?? '',
        venue: detail.venue ?? '', guestCount: guests,
        notes: detail.notes ?? undefined, terms: detail.terms ?? undefined,
        gstPercent: gstEnabled ? parsePct(gstPct) : 0,
        discountAmount: parseCurrency(discountAmt),
        extraChargesAmount: parseCurrency(extraCharges),
        items,
      } as Partial<QuotationPayload>);
      await quotationsService.updateRequestStatus(detail.id, 'QUOTED');
      toast.success(reQuoteMode ? `Re-quote sent (Attempt #${reQuoteCount + 1})` : 'Quote saved & sent to customer');
      setReQuoteMode(false);
      refresh();
      void openDetail(detail.id);

      // Auto-open the PDF preview so admin and customer see the final quote
      const pdfInput = buildPdfInput();
      if (pdfInput) openQuotePdf(pdfInput);
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to save'); }
    finally { setSaving(false); }
  };

  const onSaveRevision = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const guests = Number(detail.guestCount ?? 0);
      const items = quoteMode === 'PER_PERSON'
        ? [
            ...editItems.map(i => ({ itemId: i.itemId, name: i.name, quantity: i.quantity, unit: i.unit, unitPrice: 0 })),
            { name: 'Per Person Quote', quantity: guests, unit: 'person', unitPrice: Number(perPersonAmt || 0) },
          ]
        : editItems.map(i => ({ itemId: i.itemId, name: i.name, quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice }));

      await quotationsService.update(detail.id, {
        customerName: detail.customerName, customerPhone: detail.customerPhone ?? '',
        customerAddress: detail.customerAddress ?? undefined,
        eventDate: detail.eventDate, eventType: detail.eventType ?? '',
        venue: detail.venue ?? '', guestCount: guests,
        notes: detail.notes ?? undefined, terms: detail.terms ?? undefined,
        gstPercent: gstEnabled ? parsePct(gstPct) : 0,
        discountAmount: parseCurrency(discountAmt),
        extraChargesAmount: parseCurrency(extraCharges),
        items,
      } as Partial<QuotationPayload>);
      toast.success('Changes saved — preview and re-send the agreement');
      setReviseMode(false);
      refresh();
      void openDetail(detail.id);
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to save'); }
    finally { setSaving(false); }
  };

  const onPreviewAgreement = async () => {
    if (!detail) return;
    setAgLoading(true);
    try {
      const logoBase64 = await fetchImageBase64(company?.logoUrl);
      const isPP = quoteMode === 'PER_PERSON';

      // Pre-fetch each item image as base64 so they embed reliably in the srcDoc iframe
      const catById = new Map(catalog.map(c => [c.id, c]));
      const itemImageMap = new Map<string, string>();
      await Promise.allSettled(
        editItems
          .filter(l => l.itemId)
          .map(async l => {
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
        customerAddress: detail.customerAddress ?? undefined,
        items: editItems.map(l => ({
          name: l.name, category: l.categoryName,
          quantity: l.quantity, unit: l.unit,
          unitPrice: !isPP ? l.unitPrice : null,
          amount: !isPP ? Number((l.quantity * l.unitPrice).toFixed(2)) : null,
          imageUrl: (l.itemId && itemImageMap.get(l.itemId))
            || (l.imageUrl ? toMediaUrl(l.imageUrl) : null),
        })),
        isPerPerson: isPP,
        perPersonRate: isPP ? parseCurrency(perPersonAmt) : undefined,
        subTotal,
        discountAmount: parseCurrency(discountAmt) || undefined,
        extraChargesAmount: parseCurrency(extraCharges) || undefined,
        gstPercent: gstEnabled ? parsePct(gstPct) : undefined,
        gstAmount: gstEnabled ? gst : undefined,
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
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to generate preview'); }
    finally { setAgLoading(false); }
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
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to send'); }
    finally { setAgLoading(false); }
  };

  const onDownloadAgreement = () => {
    if (!agHtml || !selectedRow) return;
    const url = URL.createObjectURL(new Blob([agHtml], { type: 'text/html' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${selectedRow.quotationNumber}-agreement.html` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  /* catalog derived */
  const catalogCategories = useMemo(() =>
    Array.from(new Set(catalog.map(c => c.categoryName))).sort(),
  [catalog]);

  const visibleCatalog = useMemo(() => {
    const q = catSearch.toLowerCase();
    return catalog.filter(c =>
      (!catFilter || c.categoryName === catFilter) &&
      (!q || c.name.toLowerCase().includes(q)),
    );
  }, [catalog, catSearch, catFilter]);

  const selectedEditItemIds = useMemo(() =>
    new Set(editItems.map(l => l.itemId).filter(Boolean)),
  [editItems]);

  const toggleCatalogItem = (c: CatalogItem) => {
    if (selectedEditItemIds.has(c.id)) {
      setEditItems(prev => prev.filter(l => l.itemId !== c.id));
    } else {
      setEditItems(prev => [...prev, {
        itemId: c.id, name: c.name,
        quantity: Number(detail?.guestCount ?? 1),
        unit: normalizeUnit(c.unit),
        unitPrice: c.basePrice,
        categoryName: c.categoryName,
        imageUrl: c.imageUrl ?? null,
      }]);
    }
  };

  /* billing */
  const subTotal = useMemo(() => {
    if (!detail) return 0;
    if (quoteMode === 'PER_PERSON') return Number(perPersonAmt || 0) * Number(detail.guestCount || 0);
    return editItems.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);
  }, [editItems, perPersonAmt, quoteMode, detail]);

  const disc = parseCurrency(discountAmt);
  const extra = parseCurrency(extraCharges);
  const taxable = Math.max(subTotal - disc + extra, 0);
  const gst = gstEnabled ? Number(((taxable * parsePct(gstPct)) / 100).toFixed(2)) : 0;
  const grandTotal = Number((taxable + gst).toFixed(2));
  const grouped = useMemo(() => groupEditable(editItems), [editItems]);

  const st = toUiRequestStatus(detail?.requestStatus);
  const isDeclined = st === 'DECLINED';
  const isLocked = isTerminalRequestStatus(detail?.requestStatus) && !reQuoteMode && !reviseMode;
  const isAccepted = st === 'ACCEPTED';
  const rejectionHistory = parseRejectionHistory(detail?.notes);
  const reQuoteCount = rejectionHistory.length;
  const hasAgreement = Boolean(detail?.agreementStatus && detail.agreementStatus !== 'NOT_INITIATED');

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(r =>
      r.quotationNumber?.toLowerCase().includes(q) ||
      r.customerName?.toLowerCase().includes(q) ||
      r.customerPhone?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) { const s = toUiRequestStatus(r.requestStatus); c[s] = (c[s] ?? 0) + 1; }
    return c;
  }, [rows]);

  /* next action for current status */
  const nextAction: { label: string; status: string } | null = useMemo(() => {
    if (!detail || isLocked) return null;
    const idx = STATUS_FLOW.indexOf(st);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null;
    const nextStatus = STATUS_FLOW[idx + 1];
    return { label: STATUS_LABELS[nextStatus], status: nextStatus };
  }, [st, isLocked, detail]);

  return (
    <div className="flex flex-col gap-3">

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: '', label: 'All', count: rows.length },
            { value: 'REQUESTED', label: 'New', count: counts['REQUESTED'] ?? 0 },
            { value: 'UNDER_REVIEW', label: 'Under Review', count: counts['UNDER_REVIEW'] ?? 0 },
            { value: 'QUOTED', label: 'Quoted', count: counts['QUOTED'] ?? 0 },
            { value: 'ACCEPTED', label: 'Accepted', count: counts['ACCEPTED'] ?? 0 },
            { value: 'DECLINED', label: 'Declined', count: counts['DECLINED'] ?? 0 },
          ].map(tab => (
            <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                statusFilter === tab.value
                  ? 'bg-[#0F1B3C] text-white'
                  : 'border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}>
              {tab.label}
              {tab.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${statusFilter === tab.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, number, phone…"
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#0F1B3C] focus:bg-white" />
          </div>
          <button onClick={refresh} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Mobile tab bar ── */}
      <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:hidden">
        <button onClick={() => setMobileView('list')}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold ${mobileView === 'list' ? 'bg-[#0F1B3C] text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
          <FileText size={15} /> All Requests
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${mobileView === 'list' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {filteredRows.length}
          </span>
        </button>
        <div className="w-px bg-slate-200" />
        <button disabled={!selectedRow} onClick={() => selectedRow && setMobileView('detail')}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold ${mobileView === 'detail' && selectedRow ? 'bg-[#0F1B3C] text-white' : selectedRow ? 'text-slate-500 hover:bg-slate-50' : 'cursor-not-allowed text-slate-300'}`}>
          <ChevronRight size={15} />
          {selectedRow ? selectedRow.quotationNumber : 'Select Request'}
        </button>
      </div>

      {/* ── Split panel ── */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">

        {/* LEFT: list */}
        <div className={`space-y-2 lg:max-h-[calc(100vh-230px)] lg:overflow-y-auto ${mobileView === 'detail' ? 'hidden lg:block' : 'block'}`}>
          {filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <FileText size={24} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-500">No requests found</p>
            </div>
          ) : filteredRows.map(row => {
            const s = toUiRequestStatus(row.requestStatus);
            return (
              <button key={row.id} onClick={() => onSelectRow(row)}
                className={`w-full rounded-2xl border p-3.5 text-left transition-all hover:shadow-sm ${selectedRow?.id === row.id ? 'border-[#0F1B3C] bg-[#0F1B3C] shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <p className={`text-sm font-black ${selectedRow?.id === row.id ? 'text-white' : 'text-[#0F1B3C]'}`}>
                    {row.quotationNumber}
                  </p>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[s]}`}>
                    <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]} align-middle`} />
                    {requestStatusLabel(row.requestStatus)}
                  </span>
                </div>
                <p className={`text-xs font-medium ${selectedRow?.id === row.id ? 'text-white/75' : 'text-slate-700'}`}>
                  {row.customerName} · {row.customerPhone}
                </p>
                <p className={`mt-0.5 text-xs ${selectedRow?.id === row.id ? 'text-white/50' : 'text-slate-400'}`}>
                  {row.eventType} · {new Date(row.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
                {(s === 'QUOTED' || s === 'ACCEPTED') && (
                  <p className={`mt-1 text-xs font-bold ${selectedRow?.id === row.id ? 'text-amber-300' : 'text-[#0F1B3C]'}`}>
                    {formatInr(row.grandTotal)}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* RIGHT: detail */}
        {!selectedRow ? (
          <div className={`items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white ${mobileView === 'detail' ? 'flex' : 'hidden lg:flex'}`}>
            <div className="p-8 text-center">
              <FileText size={36} className="mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-semibold text-slate-500">Select a request to manage it</p>
            </div>
          </div>
        ) : detailLoading || !detail ? (
          <div className={`items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 ${mobileView === 'detail' ? 'flex' : 'hidden lg:flex'}`}>
            <div className="text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-[#0F1B3C]" />
              <p className="mt-3 text-sm text-slate-400">Loading…</p>
            </div>
          </div>
        ) : (
          <div className={`space-y-3 lg:max-h-[calc(100vh-230px)] lg:overflow-y-auto lg:pr-1 ${mobileView === 'detail' ? 'block' : 'hidden lg:block'}`}>

            {/* ─ Header ─ */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 bg-[#0F1B3C] px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <button onClick={() => setMobileView('list')}
                    className="grid h-8 w-8 place-items-center rounded-xl border border-white/15 bg-white/10 text-white/70 hover:bg-white/20 lg:hidden">
                    <ArrowLeft size={14} />
                  </button>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Request</p>
                    <p className="text-base font-black text-white">{detail.quotationNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { const p = buildPdfInput(); if (p) openQuotePdf(p); }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 transition-all hover:bg-white/20 hover:text-white"
                    title="Preview / Download PDF"
                  >
                    <Download size={13} /> PDF
                  </button>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_BADGE[st]}`}>
                    {requestStatusLabel(detail.requestStatus)}
                  </span>
                </div>
              </div>
              {/* Info row */}
              <div className="grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
                {[
                  { icon: User,        val: detail.customerName },
                  { icon: Phone,       val: detail.customerPhone ?? '—' },
                  { icon: Sparkles,    val: detail.eventType ?? '—' },
                  { icon: CalendarDays,val: new Date(detail.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                ].map(it => (
                  <div key={it.val} className="flex items-center gap-2 px-4 py-3">
                    <it.icon size={13} className="shrink-0 text-slate-400" />
                    <span className="truncate text-xs font-semibold text-slate-700">{it.val}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 sm:grid-cols-2">
                <div className="flex items-center gap-2 px-4 py-2.5">
                  <MapPin size={13} className="shrink-0 text-slate-400" />
                  <span className="truncate text-xs font-semibold text-slate-700">{detail.venue ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5">
                  <Users size={13} className="shrink-0 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700">{detail.guestCount} guests</span>
                </div>
              </div>
            </div>

            {/* ─ Status action ─ */}
            {!isLocked ? (
              nextAction ? (
                <button
                  onClick={() => void onMoveStatus(detail.id, nextAction.status)}
                  className="flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 transition-all hover:bg-amber-100 active:scale-[0.99]"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Next Step</p>
                    <p className="text-sm font-bold text-amber-900">Move to "{nextAction.label}"</p>
                  </div>
                  <ArrowRight size={18} className="text-amber-500" />
                </button>
              ) : null
            ) : (
              <div className={`overflow-hidden rounded-2xl border ${isAccepted ? 'border-emerald-200' : 'border-rose-200'}`}>
                <div className={`flex items-center justify-between gap-3 px-5 py-3.5 ${isAccepted ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={18} className={isAccepted ? 'text-emerald-600' : 'text-rose-500'} />
                    <div>
                      <p className={`text-sm font-bold ${isAccepted ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {isAccepted ? 'Customer Accepted — ready for agreement' : `Customer Declined${reQuoteCount > 1 ? ` (${reQuoteCount}× declined)` : ''}`}
                      </p>
                      {!isAccepted && rejectionHistory.length > 0 && (
                        <p className="mt-0.5 text-xs text-rose-600">
                          Latest: "{rejectionHistory[rejectionHistory.length - 1].reason}"
                        </p>
                      )}
                    </div>
                  </div>
                  {isDeclined && !reQuoteMode && (
                    <button
                      onClick={() => setReQuoteMode(true)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition-all hover:bg-rose-100"
                    >
                      <RefreshCw size={12} /> Re-quote
                    </button>
                  )}
                </div>
                {/* Decline history */}
                {rejectionHistory.length > 0 && (
                  <div className="divide-y divide-rose-100 bg-white px-5 py-2">
                    {rejectionHistory.map((entry, i) => (
                      <div key={i} className="flex items-start gap-3 py-2.5">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rose-100 text-[10px] font-black text-rose-600">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500">
                            {new Date(entry.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-sm font-medium text-slate-800">{entry.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─ Customer note ─ */}
            {detail.notes?.includes('[CUSTOMER_INTERESTED]') && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3.5">
                <p className="text-sm font-bold text-blue-800">Customer wants to discuss before finalizing</p>
                <p className="text-xs text-blue-600 mt-0.5">Contact them before sending a quote.</p>
              </div>
            )}

            {/* ─ Quote editor ─ */}
            {!isLocked && (
              <div className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${reQuoteMode ? 'border-amber-300' : reviseMode ? 'border-blue-300' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {reQuoteMode ? `Re-quote${reQuoteCount > 0 ? ` (Attempt #${reQuoteCount + 1})` : ''}` : reviseMode ? 'Revise Agreement Details' : 'Quote'}
                    </p>
                    {reQuoteMode && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Revising after decline
                      </span>
                    )}
                    {reviseMode && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        Correcting per customer request
                      </span>
                    )}
                  </div>
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
                    {(['INDIVIDUAL', 'PER_PERSON'] as const).map(m => (
                      <button key={m} onClick={() => setQuoteMode(m)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${quoteMode === m ? 'bg-[#0F1B3C] text-white' : 'text-slate-500'}`}>
                        {m === 'INDIVIDUAL' ? 'Per Item' : 'Per Person'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* Adjustments */}
                  <div className="flex flex-wrap gap-3">
                    {quoteMode === 'PER_PERSON' && (
                      <div className="min-w-[120px] flex-1">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Rate / Person</label>
                        <Input type="text" inputMode="decimal" value={perPersonAmt}
                          onChange={e => setPerPersonAmt(sanitizeCurrency(e.target.value))}
                          placeholder="₹0" className="h-9 text-sm" />
                      </div>
                    )}
                    <div className="min-w-[80px] flex-1">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        GST {gstEnabled ? `(${parsePct(gstPct)}%)` : '(Off)'}
                      </label>
                      <div className="flex gap-1.5">
                        <button onClick={() => setGstEnabled(p => !p)}
                          className={`h-9 rounded-xl border px-3 text-xs font-bold ${gstEnabled ? 'border-[#0F1B3C] bg-[#0F1B3C] text-white' : 'border-slate-200 text-slate-500'}`}>
                          {gstEnabled ? 'ON' : 'OFF'}
                        </button>
                        {gstEnabled && (
                          <Input type="text" value={gstPct} onChange={e => setGstPct(sanitizePct(e.target.value))}
                            placeholder="18" className="h-9 w-16 text-center text-sm" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-[100px] flex-1">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Discount (₹)</label>
                      <Input type="text" inputMode="decimal" value={discountAmt}
                        onChange={e => setDiscountAmt(sanitizeCurrency(e.target.value))}
                        placeholder="0" className="h-9 text-sm" />
                    </div>
                    <div className="min-w-[100px] flex-1">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Extra (₹)</label>
                      <Input type="text" inputMode="decimal" value={extraCharges}
                        onChange={e => setExtraCharges(sanitizeCurrency(e.target.value))}
                        placeholder="0" className="h-9 text-sm" />
                    </div>
                  </div>

                  {/* Catalog browser — visible in both Per Item and Per Person modes */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2 border-b border-slate-200 p-2.5">
                      <div className="relative flex-1">
                        <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          value={catSearch}
                          onChange={e => setCatSearch(e.target.value)}
                          placeholder="Search catalog…"
                          className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none focus:border-[#0F1B3C]"
                        />
                      </div>
                      <select
                        value={catFilter}
                        onChange={e => setCatFilter(e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-[#0F1B3C]"
                      >
                        <option value="">All Categories</option>
                        {catalogCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="max-h-40 overflow-y-auto p-2">
                      {visibleCatalog.length === 0
                        ? <p className="py-3 text-center text-xs text-slate-400">No items match</p>
                        : <div className="space-y-0.5">
                            {visibleCatalog.map(c => {
                              const added = selectedEditItemIds.has(c.id);
                              return (
                                <button key={c.id} onClick={() => toggleCatalogItem(c)}
                                  className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${added ? 'bg-[#FDF3D0]' : 'hover:bg-white'}`}>
                                  <span>
                                    <span className={`font-medium ${added ? 'text-[#B8860B]' : 'text-slate-800'}`}>{c.name}</span>
                                    <span className="ml-2 text-[10px] text-slate-400">{c.categoryName}</span>
                                  </span>
                                  <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${added ? 'bg-[#B8860B] text-white' : 'bg-slate-200 text-slate-600 hover:bg-[#0F1B3C] hover:text-white'}`}>
                                    {added ? '✓' : '+'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                      }
                    </div>
                  </div>

                  {/* Items table */}
                  {editItems.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          <tr className="border-b border-slate-200">
                            <th className="px-3 py-2.5 text-left">{quoteMode === 'PER_PERSON' ? 'Included Item' : 'Item'}</th>
                            {quoteMode === 'INDIVIDUAL' && <>
                              <th className="px-2 py-2.5 text-center w-20">Qty</th>
                              <th className="px-2 py-2.5 text-center w-20">Unit</th>
                              <th className="px-3 py-2.5 text-right w-28">Price / Unit (₹)</th>
                              <th className="px-3 py-2.5 text-right w-24">Amount</th>
                            </>}
                            <th className="w-8 px-2 py-2.5" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {grouped.map(({ category, entries }) => (
                            <Fragment key={category}>
                              <tr className="bg-slate-50/80">
                                <td colSpan={quoteMode === 'INDIVIDUAL' ? 6 : 2} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{category}</td>
                              </tr>
                              {entries.map(({ item, index }) => {
                                const amt = Number(item.quantity || 0) * Number(item.unitPrice || 0);
                                return (
                                  <tr key={`item-${index}`} className="group hover:bg-slate-50/50">
                                    <td className="px-3 py-2">
                                      {item.itemId ? (
                                        <span className="font-medium text-slate-800">{item.name}</span>
                                      ) : (
                                        <input
                                          type="text"
                                          value={item.name}
                                          autoFocus={item.name === ''}
                                          onChange={e => setEditItems(prev => prev.map((l, i) =>
                                            i === index ? { ...l, name: e.target.value } : l))}
                                          placeholder="Enter item name…"
                                          className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none focus:border-[#0F1B3C] focus:bg-white"
                                        />
                                      )}
                                    </td>
                                    {quoteMode === 'INDIVIDUAL' && <>
                                      <td className="px-2 py-2 text-center">
                                        <input type="number" min={1} value={item.quantity}
                                          onChange={e => setEditItems(prev => prev.map((l, i) =>
                                            i === index ? { ...l, quantity: Number(e.target.value) || 1 } : l))}
                                          className="h-8 w-16 rounded-lg border border-slate-200 bg-slate-50 text-center text-sm outline-none focus:border-[#0F1B3C] focus:bg-white" />
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        <select value={item.unit}
                                          onChange={e => setEditItems(prev => prev.map((l, i) =>
                                            i === index ? { ...l, unit: e.target.value } : l))}
                                          className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-1.5 text-xs outline-none focus:border-[#0F1B3C] focus:bg-white">
                                          {ALLOWED_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <Input type="text" inputMode="decimal"
                                          value={fmtNum(item.unitPrice)}
                                          onChange={e => setEditItems(prev => prev.map((l, i) =>
                                            i === index ? { ...l, unitPrice: parseCurrency(e.target.value) } : l))}
                                          className="h-8 w-full text-right text-xs" placeholder="0" />
                                      </td>
                                      <td className="px-3 py-2 text-right text-xs font-semibold text-slate-700">
                                        {amt > 0 ? formatInr(amt) : '—'}
                                      </td>
                                    </>}
                                    <td className="px-2 py-2 text-center">
                                      <button
                                        onClick={() => setEditItems(prev => prev.filter((_, i) => i !== index))}
                                        className="grid h-6 w-6 place-items-center rounded-lg text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                                        title="Remove item">
                                        <X size={12} />
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

                  {/* Add custom item */}
                  <button
                    onClick={() => setEditItems(prev => [...prev, {
                      itemId: undefined, name: '', quantity: 1, unit: 'plate', unitPrice: 0, categoryName: 'Custom',
                    }])}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 transition-all hover:border-[#B8860B]/50 hover:text-[#B8860B]"
                  >
                    <Plus size={12} /> Add custom item
                  </button>

                  {/* Per-person summary */}
                  {quoteMode === 'PER_PERSON' && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {detail.guestCount} guests × {formatInr(Number(perPersonAmt || 0))} = <strong className="text-slate-900">{formatInr(subTotal)}</strong>
                    </div>
                  )}

                  {/* Grand total strip */}
                  <div className="flex items-center justify-between rounded-2xl bg-[#0F1B3C] px-5 py-3.5">
                    <span className="text-sm font-bold text-white/70">Grand Total</span>
                    <span className="text-lg font-black text-amber-400">{formatInr(grandTotal)}</span>
                  </div>

                  <button
                    onClick={() => void (reviseMode ? onSaveRevision() : onSaveQuote())}
                    disabled={saving}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60 active:scale-[0.99] ${reviseMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#0F1B3C] hover:bg-[#1a2d5a]'}`}>
                    {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send size={14} />}
                    {saving ? 'Saving…' : reviseMode ? 'Save Changes' : reQuoteMode ? `Re-quote & Send (Attempt #${reQuoteCount + 1})` : 'Save & Send Quote'}
                  </button>
                </div>
              </div>
            )}

            {/* ─ Agreement ─ */}
            {isAccepted && (
              <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Agreement</p>
                </div>
                <div className="p-4 space-y-3">
                  {/* Status badge */}
                  {hasAgreement && detail.agreementStatus !== 'REJECTED' && (
                    <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                      detail.agreementStatus === 'ACCEPTED' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' :
                        'border-blue-200 bg-blue-50 text-blue-800'
                    }`}>
                      {detail.agreementStatus === 'ACCEPTED' ? '✓ Customer accepted the agreement' : 'Agreement sent — awaiting customer review'}
                    </div>
                  )}

                  {/* Correction requested by customer */}
                  {detail.agreementStatus === 'REJECTED' && (
                    <div className="overflow-hidden rounded-xl border border-amber-200">
                      <div className="flex items-start gap-3 bg-amber-50 px-4 py-3">
                        <RefreshCw size={15} className="mt-0.5 shrink-0 text-amber-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-amber-800">Customer Requested Correction</p>
                          {detail.agreementRejectReason && (
                            <p className="mt-0.5 text-xs text-amber-700">"{detail.agreementRejectReason}"</p>
                          )}
                        </div>
                      </div>
                      {!reviseMode && (
                        <div className="border-t border-amber-100 bg-white px-4 py-2.5">
                          <button
                            onClick={() => setReviseMode(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition-all hover:bg-blue-100"
                          >
                            <Edit3 size={12} /> Revise Details
                          </button>
                          <p className="mt-1.5 text-[10px] text-slate-400">Edit the quotation items &amp; amounts, save, then re-send the agreement.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step indicators */}
                  <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-700">1</span>
                      <span className="text-xs font-semibold text-slate-600">Preview</span>
                    </div>
                    <div className="h-px flex-1 bg-slate-200" />
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${hasAgreement ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>2</span>
                      <span className={`text-xs font-semibold ${hasAgreement ? 'text-slate-600' : 'text-slate-400'}`}>Send to Customer</span>
                    </div>
                  </div>

                  <button onClick={() => void onPreviewAgreement()} disabled={agLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F1B3C] py-3.5 text-sm font-bold text-white hover:bg-[#1a2d5a] disabled:opacity-60 active:scale-[0.99]">
                    {agLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Eye size={15} />}
                    {agLoading ? 'Generating…' : hasAgreement ? 'Preview Agreement' : 'Preview Agreement'}
                  </button>
                  <p className="text-center text-[10px] text-slate-400">
                    {hasAgreement ? 'Preview then re-send if needed' : 'Review the agreement before sending to customer'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Inline Agreement Viewer ── */}
      {agOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-800 bg-[#0F1B3C] px-4 py-3 text-white">
            <button onClick={() => setAgOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-white/70 hover:bg-white/20">
              <X size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Step 1 · Preview Agreement</p>
              <p className="truncate text-sm font-black text-white">{selectedRow?.quotationNumber}</p>
            </div>
            <button onClick={() => agIframeRef.current?.contentWindow?.print()}
              className="hidden h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-bold text-white/80 hover:bg-white/20 sm:inline-flex">
              <Eye size={12} /> Print
            </button>
            <button onClick={onDownloadAgreement}
              className="h-9 inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-bold text-white/80 hover:bg-white/20">
              <Download size={12} /> Download
            </button>
            {/* Step 2 — Send to Customer */}
            {agSent ? (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 text-xs font-bold text-emerald-300">
                <FileCheck2 size={13} /> Sent
              </span>
            ) : (
              <button onClick={() => void onSendAgreement()} disabled={agLoading}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-xs font-bold text-white hover:bg-emerald-400 disabled:opacity-60">
                {agLoading
                  ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  : <Send size={13} />}
                Send to Customer
              </button>
            )}
          </div>
          <iframe ref={agIframeRef} className="flex-1 w-full border-0" srcDoc={agHtml}
            title="Agreement" sandbox="allow-same-origin allow-scripts allow-popups" />
        </div>
      )}
      {agLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center gap-4 bg-black/50 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-amber-400" />
        </div>
      )}
    </div>
  );
}

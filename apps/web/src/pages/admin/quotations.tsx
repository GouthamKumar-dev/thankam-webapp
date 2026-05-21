import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  Edit3,
  FileCheck2,
  FileText,
  Layers3,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectInput } from '@/components/ui/select-input';
import { Textarea } from '@/components/ui/textarea';
import { CategoryNode } from '@/features/categories/categories.service';
import { customerPortalService } from '@/features/customer-portal/customer-portal.service';
import { menusService, MenuRow } from '@/features/menus/menus.service';
import {
  QuotationDetail,
  QuotationPayload,
  QuotationRow,
  quotationsService,
} from '@/features/quotations/quotations.service';
import { settingsService } from '@/features/settings/settings.service';
import { useConfirmModal } from '@/hooks/use-confirm-modal';
import { formatInr } from '@/utils/currency';
import { toMediaUrl } from '@/utils/media-url';
import { generateAgreementHtml, fetchImageBase64 } from '@/utils/agreement-pdf';
import { openQuotePdf } from '@/utils/quote-pdf';

/* ─── Types ──────────────────────────────────────────────────── */
type QuoteMode = 'PER_ITEM' | 'PER_PERSON';

type LineItem = {
  key: string;
  itemId?: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  imageUrl?: string | null;
};

type QuoteForm = {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  eventDate: string;
  eventType: string;
  venue: string;
  guestCount: string;
  notes: string;
  terms: string;
  discountAmount: string;
  extraChargesAmount: string;
  gstEnabled: boolean;
  gstPercent: string;
};

type CatalogItem = {
  id: string;
  name: string;
  unit?: string | null;
  basePrice: number;
  categoryName: string;
  imageUrl?: string | null;
};

const EVENT_TYPES = ['Wedding','Engagement','Birthday','Corporate Event','House Warming','Reception','Other'];
const VENUES      = ['Home','Auditorium','Convention Center','Hotel','Temple','Open Ground','Other'];
const ALLOWED_UNITS = ['plate','bowl','glass','piece','scoop'];

/* ─── Helpers ────────────────────────────────────────────────── */
function key() { return `${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }
function num(v: string | number) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

function flattenCatalog(nodes: CategoryNode[], path: string[] = []): CatalogItem[] {
  const out: CatalogItem[] = [];
  for (const node of nodes) {
    const p = [...path, node.name];
    for (const item of node.items) {
      out.push({
        id: item.id, name: item.name, unit: item.unit,
        basePrice: Number(item.basePrice ?? 0),
        imageUrl: item.imageUrl,
        categoryName: node.name,
      });
    }
    out.push(...flattenCatalog(node.children, p));
  }
  return out;
}

function sanitizeUnit(u?: string | null): string {
  const r = (u ?? '').toLowerCase().trim();
  return ALLOWED_UNITS.includes(r) ? r : 'plate';
}

function computeTotals(lines: LineItem[], form: QuoteForm, mode: QuoteMode, ppRate: string) {
  const guests = num(form.guestCount);
  const subTotal = mode === 'PER_PERSON'
    ? num(ppRate) * guests
    : lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const disc    = num(form.discountAmount);
  const extra   = num(form.extraChargesAmount);
  const pct     = form.gstEnabled ? num(form.gstPercent) : 0;
  const taxable = Math.max(subTotal - disc + extra, 0);
  const gst     = Number(((taxable * pct) / 100).toFixed(2));
  return { subTotal, disc, extra, taxable, gst, grandTotal: taxable + gst };
}

function emptyForm(): QuoteForm {
  return {
    customerName:'', customerPhone:'', customerAddress:'',
    eventDate:'', eventType:'', venue:'',
    guestCount:'100', notes:'', terms:'',
    discountAmount:'0', extraChargesAmount:'0',
    gstEnabled: true, gstPercent:'18',
  };
}

function detailToForm(d: QuotationDetail): QuoteForm {
  const gst = num(String(d.gstPercent ?? 18));
  return {
    customerName: d.customerName ?? '',
    customerPhone: d.customerPhone ?? '',
    customerAddress: d.customerAddress ?? '',
    eventDate: d.eventDate?.slice(0,10) ?? '',
    eventType: d.eventType ?? '',
    venue: d.venue ?? '',
    guestCount: String(d.guestCount ?? 100),
    notes: d.notes ?? '',
    terms: d.terms ?? '',
    discountAmount: String(d.discountAmount ?? 0),
    extraChargesAmount: String(d.extraChargesAmount ?? 0),
    gstEnabled: gst > 0,
    gstPercent: String(gst > 0 ? gst : 18),
  };
}

function detailToLines(d: QuotationDetail, catalog: CatalogItem[]): LineItem[] {
  const byId = new Map(catalog.map(c => [c.id, c]));
  return (d.items ?? [])
    .filter(i => String(i.unit ?? '').toLowerCase() !== 'person' && String(i.name ?? '').toLowerCase() !== 'per person quote')
    .map(i => ({
      key: key(),
      itemId: i.itemId ?? undefined,
      name: i.name,
      category: byId.get(i.itemId ?? '')?.categoryName ?? i.item?.category?.name ?? '',
      quantity: num(i.quantity),
      unit: sanitizeUnit(i.unit),
      unitPrice: num(i.unitPrice),
      imageUrl: i.itemId ? (byId.get(i.itemId)?.imageUrl ?? null) : null,
    }));
}

function normalizePhone(p: string): string {
  return p.replace(/\D/g, '');
}

function parseDateVal(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDateVal(d: Date | null): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildPayload(form: QuoteForm, lines: LineItem[], mode: QuoteMode, ppRate: string): QuotationPayload {
  const guests = num(form.guestCount);
  const items = mode === 'PER_PERSON'
    ? [
        ...lines.map(l => ({ itemId: l.itemId, name: l.name, quantity: l.quantity, unit: l.unit, unitPrice: 0 })),
        { name: 'Per Person Quote', quantity: guests, unit: 'person', unitPrice: num(ppRate) },
      ]
    : lines.map(l => ({ itemId: l.itemId, name: l.name, quantity: l.quantity, unit: l.unit, unitPrice: l.unitPrice }));
  return {
    customerName: form.customerName, customerPhone: normalizePhone(form.customerPhone),
    customerAddress: form.customerAddress || undefined,
    eventDate: form.eventDate, eventType: form.eventType,
    venue: form.venue, guestCount: guests,
    items, notes: form.notes || undefined, terms: form.terms || undefined,
    discountAmount: num(form.discountAmount),
    extraChargesAmount: num(form.extraChargesAmount),
    gstPercent: form.gstEnabled ? num(form.gstPercent) : 0,
  };
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════ */
export function QuotationsPage() {
  const { confirm, confirmModal } = useConfirmModal();

  /* lists */
  const [rows,    setRows]    = useState<QuotationRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [menus,   setMenus]   = useState<MenuRow[]>([]);
  const [company, setCompany] = useState<any>(null);

  /* menu import */
  const [menuPickerOpen, setMenuPickerOpen] = useState(false);

  /* selection */
  const [selectedRow, setSelectedRow] = useState<QuotationRow | null>(null);
  const [isNew,       setIsNew]       = useState(false);

  /* form */
  const [form,    setForm]    = useState<QuoteForm>(emptyForm());
  const [lines,   setLines]   = useState<LineItem[]>([]);
  const [mode,    setMode]    = useState<QuoteMode>('PER_ITEM');
  const [ppRate,  setPpRate]  = useState('');
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(false);

  /* catalog search */
  const [catSearch, setCatSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  /* list search */
  const [listSearch, setListSearch] = useState('');

  /* agreement viewer */
  const [agOpen,    setAgOpen]    = useState(false);
  const [agHtml,    setAgHtml]    = useState('');
  const [agLoading, setAgLoading] = useState(false);
  const agIframeRef = useRef<HTMLIFrameElement>(null);

  /* ── Load ── */
  const refresh = () =>
    void quotationsService.list().then(r => setRows(r.data));

  useEffect(() => {
    refresh();
    void customerPortalService.catalog().then(tree => setCatalog(flattenCatalog(tree)));
    void menusService.list().then(setMenus);
    void settingsService.list()
      .then(rows => {
        const co = rows.find(r => r.key === 'company')?.value ?? {};
        setCompany({
          name:     String((co as any).name     ?? 'Thankam Events'),
          tagline:  String((co as any).tagline   ?? 'Premier Catering & Event Management · Kollam, Kerala'),
          logoUrl:  (co as any).logoUrl  ? toMediaUrl(String((co as any).logoUrl))  : undefined,
        });
      })
      .catch(() => null);
  }, []);

  /* ── Select quotation ── */
  const onSelectRow = async (row: QuotationRow) => {
    setSelectedRow(row);
    setIsNew(false);
    setCatSearch('');
    setCatFilter('');
    try {
      setLoading(true);
      const d = await quotationsService.getOne(row.id);
      setForm(detailToForm(d));
      const ls = detailToLines(d, catalog);
      setLines(ls);
      // detect per-person mode
      const ppLine = d.items?.find(i => String(i.unit ?? '').toLowerCase() === 'person');
      if (ppLine && num(ppLine.unitPrice) > 0) {
        setMode('PER_PERSON');
        setPpRate(String(ppLine.unitPrice));
      } else {
        setMode('PER_ITEM');
        setPpRate('');
      }
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to load'); }
    finally { setLoading(false); }
  };

  /* ── New quotation ── */
  const onNew = () => {
    setSelectedRow(null);
    setIsNew(true);
    setForm(emptyForm());
    setLines([]);
    setMode('PER_ITEM');
    setPpRate('');
    setCatSearch('');
    setCatFilter('');
  };

  /* ── Save ── */
  const onSave = async () => {
    if (!form.customerName || !form.eventDate || !form.eventType || !form.venue) {
      toast.error('Please fill customer name, event date, type and venue');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(form, lines, mode, ppRate);
      if (isNew) {
        const created = await quotationsService.create(payload);
        toast.success(`Created ${(created as any).quotationNumber}`);
        setIsNew(false);
        await refresh();
        const allRows = await quotationsService.list();
        setRows(allRows.data);
        const newRow = allRows.data.find((r: QuotationRow) => r.id === (created as any).id);
        if (newRow) setSelectedRow(newRow);
      } else if (selectedRow) {
        await quotationsService.update(selectedRow.id, payload);
        toast.success('Quotation saved');
        refresh();
      }
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to save'); }
    finally { setSaving(false); }
  };

  /* ── Delete ── */
  const onDelete = async () => {
    if (!selectedRow) return;
    const ok = await confirm({ title:'Delete Quotation', description:`Delete ${selectedRow.quotationNumber}?`, confirmLabel:'Delete', destructive:true });
    if (!ok) return;
    try {
      await quotationsService.remove(selectedRow.id);
      toast.success('Deleted');
      setSelectedRow(null);
      setIsNew(false);
      refresh();
    } catch { toast.error('Failed to delete'); }
  };

  /* ── PDF preview ── */
  const onPdf = async () => {
    const logoBase64 = await fetchImageBase64(company?.logoUrl);
    const totals = computeTotals(lines, form, mode, ppRate);
    const isPP = mode === 'PER_PERSON';
    openQuotePdf({
      quotationNumber: selectedRow?.quotationNumber ?? 'DRAFT',
      createdAt: selectedRow ? new Date().toISOString() : new Date().toISOString(),
      customerName: form.customerName, customerPhone: form.customerPhone,
      eventType: form.eventType, eventDate: form.eventDate,
      venue: form.venue, guestCount: num(form.guestCount),
      isPerPerson: isPP,
      perPersonRate: isPP ? num(ppRate) : undefined,
      perPersonGuests: isPP ? num(form.guestCount) : undefined,
      lines: lines.map(l => ({
        name: l.name, category: l.category,
        quantity: l.quantity, unit: l.unit,
        unitPrice: !isPP ? l.unitPrice : null,
        amount: !isPP ? Number((l.quantity * l.unitPrice).toFixed(2)) : null,
        imageUrl: l.imageUrl ? toMediaUrl(l.imageUrl) : null,
      })),
      subTotal: totals.subTotal,
      discountAmount: totals.disc || undefined,
      extraChargesAmount: totals.extra || undefined,
      gstPercent: form.gstEnabled ? num(form.gstPercent) : undefined,
      gstAmount:  form.gstEnabled ? totals.gst : undefined,
      grandTotal: totals.grandTotal,
      companyName:    company?.name,
      companyTagline: company?.tagline,
      companyLogoUrl: logoBase64,
    });
  };

  /* ── Generate Agreement ── */
  const onAgreement = async () => {
    if (!selectedRow) return;
    setAgLoading(true);
    try {
      const d = await quotationsService.getOne(selectedRow.id);
      const logoBase64 = await fetchImageBase64(company?.logoUrl);
      const totals = computeTotals(lines, form, mode, ppRate);
      const isPP = mode === 'PER_PERSON';

      // Pre-fetch item images as base64 for reliable rendering in srcDoc iframe
      const itemImageMap = new Map<string, string>();
      await Promise.allSettled(
        lines
          .filter(l => l.itemId && l.imageUrl)
          .map(async l => {
            const b64 = await fetchImageBase64(toMediaUrl(l.imageUrl!));
            if (b64 && l.itemId) itemImageMap.set(l.itemId, b64);
          }),
      );

      const html = generateAgreementHtml({
        quotationNumber: selectedRow.quotationNumber,
        createdAt: selectedRow ? new Date().toISOString() : undefined,
        eventDate: form.eventDate, eventType: form.eventType,
        venue: form.venue, guestCount: num(form.guestCount),
        customerName: form.customerName, customerPhone: form.customerPhone,
        customerAddress: form.customerAddress,
        items: lines.map(l => ({
          name: l.name, category: l.category,
          quantity: l.quantity, unit: l.unit,
          unitPrice: !isPP ? l.unitPrice : null,
          amount: !isPP ? Number((l.quantity * l.unitPrice).toFixed(2)) : null,
          imageUrl: (l.itemId && itemImageMap.get(l.itemId))
            || (l.imageUrl ? toMediaUrl(l.imageUrl) : null),
        })),
        isPerPerson: isPP,
        perPersonRate: isPP ? num(ppRate) : undefined,
        subTotal: totals.subTotal,
        discountAmount: totals.disc || undefined,
        extraChargesAmount: totals.extra || undefined,
        gstPercent: form.gstEnabled ? num(form.gstPercent) : undefined,
        gstAmount:  form.gstEnabled ? totals.gst : undefined,
        grandTotal: totals.grandTotal,
        agreementStatus: d.agreementStatus,
        agreementAcceptedAt: d.agreementAcceptedAt ?? undefined,
        terms: form.terms,
        notes: form.notes,
        companyName:    company?.name,
        companyTagline: company?.tagline,
        companyLogoUrl: logoBase64,
        companyPhone: '+91 9745684766',
        companyEmail: 'info@thankamevents.in',
        companyAddress: 'Uliyacovil, Kollam, Kerala',
        isAdminGenerated: true,
      });
      setAgHtml(html);
      setAgOpen(true);
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed'); }
    finally { setAgLoading(false); }
  };

  /* ── Catalog helpers ── */
  const catalogCategories = useMemo(() =>
    Array.from(new Set(catalog.map(c => c.categoryName))).sort(),
  [catalog]);

  const visibleCatalog = useMemo(() => {
    const q = catSearch.toLowerCase();
    return catalog.filter(c =>
      (!catFilter || c.categoryName === catFilter) &&
      (!q || c.name.toLowerCase().includes(q))
    );
  }, [catalog, catSearch, catFilter]);

  const selectedIds = useMemo(() => new Set(lines.map(l => l.itemId).filter(Boolean)), [lines]);

  const toggleItem = (c: CatalogItem) => {
    if (selectedIds.has(c.id)) {
      setLines(prev => prev.filter(l => l.itemId !== c.id));
    } else {
      setLines(prev => [...prev, {
        key: key(), itemId: c.id, name: c.name,
        category: c.categoryName, quantity: num(form.guestCount) || 1,
        unit: sanitizeUnit(c.unit), unitPrice: c.basePrice,
        imageUrl: c.imageUrl ?? null,
      }]);
    }
  };

  const importMenu = (menu: MenuRow) => {
    const existing = new Set(lines.map(l => l.itemId).filter(Boolean));
    const newLines = menu.menuItems
      .filter(mi => !existing.has(mi.item.id))
      .map(mi => {
        const cat = catalog.find(c => c.id === mi.item.id);
        return {
          key: key(), itemId: mi.item.id, name: mi.item.name,
          category: cat?.categoryName ?? 'Menu Items',
          quantity: num(form.guestCount) || 1,
          unit: sanitizeUnit(mi.item.unit),
          unitPrice: Number(mi.item.basePrice ?? 0),
        };
      });
    setLines(prev => [...prev, ...newLines]);
    setMenuPickerOpen(false);
    toast.success(`Imported ${newLines.length} item${newLines.length !== 1 ? 's' : ''} from "${menu.name}"`);
  };

  /* ── Filtered rows — admin-created only (CUSTOMER_PORTAL requests handled separately) ── */
  const filteredRows = useMemo(() => {
    const adminOnly = rows.filter(r => r.source !== 'CUSTOMER_PORTAL');
    const q = listSearch.toLowerCase();
    if (!q) return adminOnly;
    return adminOnly.filter(r =>
      r.quotationNumber?.toLowerCase().includes(q) ||
      r.customerName?.toLowerCase().includes(q) ||
      r.customerPhone?.toLowerCase().includes(q)
    );
  }, [rows, listSearch]);

  const totals = useMemo(() => computeTotals(lines, form, mode, ppRate), [lines, form, mode, ppRate]);

  /* Group lines by category — catalog items use l.category; custom items fall under "Custom Items" */
  const groupedLines = useMemo(() => {
    const map = new Map<string, LineItem[]>();
    for (const l of lines) {
      const cat = l.category?.trim() || 'Custom Items';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(l);
    }
    return Array.from(map.entries());
  }, [lines]);
  const hasDetail = selectedRow || isNew;

  /* ────────────────────────────────────── RENDER ────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-3">
      {confirmModal}

      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-0 flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={listSearch} onChange={e => setListSearch(e.target.value)}
            placeholder="Search quotations…"
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#0F1B3C] focus:bg-white"
          />
        </div>
        <button onClick={refresh}
          className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300">
          <RefreshCw size={14} />
        </button>
        <button onClick={onNew}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#0F1B3C] px-4 text-sm font-bold text-white transition-all hover:bg-[#1a2d5a]">
          <Plus size={15} /> New Quotation
        </button>
      </div>

      {/* ── Split panel ── */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">

        {/* LEFT: List */}
        <div className="space-y-2 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto">
          {filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <FileText size={24} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-500">No quotations yet</p>
            </div>
          ) : filteredRows.map(row => {
            const active = selectedRow?.id === row.id && !isNew;
            return (
              <button key={row.id} onClick={() => void onSelectRow(row)}
                className={`w-full rounded-2xl border p-3.5 text-left transition-all hover:shadow-sm ${
                  active ? 'border-[#0F1B3C] bg-[#0F1B3C] shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}>
                <div className="mb-1">
                  <p className={`text-sm font-black ${active ? 'text-white' : 'text-[#0F1B3C]'}`}>
                    {row.quotationNumber}
                  </p>
                </div>
                <p className={`text-xs font-medium ${active ? 'text-white/75' : 'text-slate-700'}`}>
                  {row.customerName}
                  {row.customerPhone ? ` · ${row.customerPhone}` : ''}
                </p>
                <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs ${active ? 'text-white/55' : 'text-slate-400'}`}>
                  {row.eventType && <span className="flex items-center gap-1"><Sparkles size={10}/>{row.eventType}</span>}
                  {row.eventDate && <span className="flex items-center gap-1"><CalendarDays size={10}/>{new Date(row.eventDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>}
                </div>
                {num(row.grandTotal) > 0 && (
                  <p className={`mt-1.5 text-sm font-black ${active ? 'text-amber-300' : 'text-[#0F1B3C]'}`}>
                    {formatInr(row.grandTotal)}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* RIGHT: Editor / Empty */}
        {!hasDetail ? (
          <div className="hidden items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white lg:flex">
            <div className="p-10 text-center">
              <FileText size={40} className="mx-auto mb-3 text-slate-200" />
              <p className="font-semibold text-slate-500">Select a quotation to edit</p>
              <p className="mt-1 text-sm text-slate-400">or create a new one with the button above.</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
            <div className="text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-[#0F1B3C]" />
              <p className="mt-3 text-sm text-slate-400">Loading…</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto lg:pr-1">

            {/* ─ Editor header ─ */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {isNew ? 'New Quotation' : 'Quotation'}
                </p>
                <p className="text-base font-black text-[#0F1B3C]">
                  {isNew ? 'Create Quotation' : selectedRow?.quotationNumber}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isNew && (
                  <>
                    <button onClick={onPdf}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-all hover:border-[#B8860B]/40 hover:text-[#B8860B]"
                      title="Preview / Download Quote PDF">
                      <Download size={13}/> PDF
                    </button>
                    <button onClick={() => void onAgreement()} disabled={agLoading}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-all hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50"
                      title="Generate Agreement">
                      {agLoading
                        ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500"/>
                        : <FileCheck2 size={13}/>} Agreement
                    </button>
                    <button onClick={() => void onDelete()}
                      className="grid h-8 w-8 place-items-center rounded-xl border border-rose-200 bg-rose-50 text-rose-500 transition-all hover:bg-rose-100">
                      <Trash2 size={13}/>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ─ Customer & Event Details ─ */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer &amp; Event Details</p>
              </div>
              <div className="space-y-3 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Customer Name *">
                    <Input value={form.customerName}
                      onChange={e => setForm(s => ({...s, customerName: e.target.value}))}
                      placeholder="Full name" />
                  </FormField>
                  <FormField label="Phone Number *">
                    <Input value={form.customerPhone}
                      onChange={e => setForm(s => ({...s, customerPhone: e.target.value}))}
                      placeholder="10-digit number" inputMode="numeric" />
                  </FormField>
                </div>
                <FormField label="Address">
                  <Textarea value={form.customerAddress} rows={2}
                    onChange={e => setForm(s => ({...s, customerAddress: e.target.value}))}
                    placeholder="Customer address" />
                </FormField>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField label="Event Date *">
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        value={parseDateVal(form.eventDate)}
                        onChange={val => setForm(s => ({...s, eventDate: formatDateVal(val)}))}
                        format="dd/MM/yyyy"
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                            sx: {
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '0.75rem',
                                height: '44px',
                                backgroundColor: '#f8fafc',
                                border: '1.5px solid #e2e8f0',
                                '& fieldset': { border: 'none' },
                                '&:hover': { backgroundColor: '#f1f5f9', borderColor: '#0F1B3C' },
                                '&.Mui-focused': { backgroundColor: '#fff', border: '1.5px solid #0F1B3C' },
                              },
                              '& .MuiInputLabel-root': { display: 'none' },
                              '& .MuiInputBase-input': { fontSize: '0.875rem', fontWeight: 500 },
                            },
                          },
                        }}
                      />
                    </LocalizationProvider>
                  </FormField>
                  <FormField label="Event Type *">
                    <SelectInput value={form.eventType}
                      onChange={e => setForm(s => ({...s, eventType: e.target.value}))}>
                      <option value="">— Select —</option>
                      {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </SelectInput>
                  </FormField>
                  <FormField label="Venue *">
                    <SelectInput value={form.venue}
                      onChange={e => setForm(s => ({...s, venue: e.target.value}))}>
                      <option value="">— Select —</option>
                      {VENUES.map(v => <option key={v} value={v}>{v}</option>)}
                    </SelectInput>
                  </FormField>
                  <FormField label="Guest Count *">
                    <Input type="number" min={1} value={form.guestCount}
                      onChange={e => setForm(s => ({...s, guestCount: e.target.value}))} />
                  </FormField>
                </div>
              </div>
            </div>

            {/* ─ Quote (Items + Pricing combined) ─ */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* Section header: title left, Per Item / Per Person toggle right */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Quote &nbsp;<span className="font-normal text-slate-400">({lines.length} items)</span>
                </p>
                <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
                  {(['PER_ITEM','PER_PERSON'] as QuoteMode[]).map(m => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${mode === m ? 'bg-[#0F1B3C] text-white' : 'text-slate-500'}`}>
                      {m === 'PER_ITEM' ? 'Per Item' : 'Per Person'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 space-y-3">

                {/* ── Per Person rate row (shown only in Per Person mode) ── */}
                {mode === 'PER_PERSON' && (
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[130px] flex-1 max-w-xs">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Rate / Person (₹)</label>
                      <Input type="number" min={0} value={ppRate}
                        onChange={e => setPpRate(e.target.value)}
                        placeholder="e.g. 250" className="h-9 text-sm" />
                    </div>
                    {num(ppRate) > 0 && (
                      <div className="flex-1 rounded-xl border border-[#EDE8DF] bg-[#FFFDF7] px-4 py-2.5 text-sm text-slate-600">
                        {form.guestCount} guests × {formatInr(num(ppRate))} = <strong className="text-slate-900">{formatInr(num(ppRate) * num(form.guestCount))}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Import Menu ── */}
                {menus.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setMenuPickerOpen(p => !p)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#0F1B3C]/20 bg-[#0F1B3C]/5 px-3 py-1.5 text-xs font-bold text-[#0F1B3C] transition-all hover:bg-[#0F1B3C]/10"
                    >
                      <Layers3 size={13} /> Import Menu
                    </button>
                    {menuPickerOpen && (
                      <div className="absolute left-0 top-[calc(100%+6px)] z-30 min-w-[240px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                        <div className="border-b border-slate-100 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select a menu to import</p>
                        </div>
                        <div className="max-h-52 overflow-y-auto p-1">
                          {menus.map(m => (
                            <button key={m.id} onClick={() => importMenu(m)}
                              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50">
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                                {m.description && <p className="text-[10px] text-slate-400">{m.description}</p>}
                              </div>
                              <span className="ml-3 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                {m.menuItems.length} items
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Catalog browser ── */}
                <div className="rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 border-b border-slate-200 p-2.5">
                    <div className="relative flex-1">
                      <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={catSearch} onChange={e => setCatSearch(e.target.value)}
                        placeholder="Search catalog…"
                        className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none focus:border-[#0F1B3C]" />
                    </div>
                    <SelectInput value={catFilter} onChange={e => setCatFilter(e.target.value)} className="h-8 text-xs">
                      <option value="">All Categories</option>
                      {catalogCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </SelectInput>
                  </div>
                  <div className="max-h-44 overflow-y-auto p-2">
                    {visibleCatalog.length === 0
                      ? <p className="py-3 text-center text-xs text-slate-400">No items match</p>
                      : <div className="space-y-0.5">
                          {visibleCatalog.map(c => {
                            const added = selectedIds.has(c.id);
                            return (
                              <button key={c.id} onClick={() => toggleItem(c)}
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

                {/* ── Selected items table (grouped by category) ── */}
                {lines.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {mode === 'PER_PERSON' ? 'Included Item' : 'Item'}
                          </th>
                          {mode === 'PER_ITEM' && <>
                            <th className="w-20 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">Qty</th>
                            <th className="w-16 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">Unit</th>
                            <th className="w-28 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">Price (₹) ✏</th>
                            <th className="w-24 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">Amount</th>
                          </>}
                          <th className="w-8 px-2 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {groupedLines.map(([category, catLines]) => (
                          <>
                            {/* Category header row */}
                            <tr key={`cat-${category}`}>
                              <td
                                colSpan={mode === 'PER_ITEM' ? 6 : 2}
                                className="bg-slate-50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100"
                              >
                                {category}
                              </td>
                            </tr>
                            {catLines.map(l => {
                              const isNew = !l.itemId || l.name === '';
                              return (
                                <tr key={l.key} className="group align-middle border-b border-slate-100 last:border-0">
                                  {/* Item name */}
                                  <td className="px-3 py-2">
                                    {isNew ? (
                                      <input
                                        type="text"
                                        value={l.name}
                                        autoFocus={l.name === ''}
                                        onChange={e => setLines(prev => prev.map(x => x.key === l.key ? {...x, name: e.target.value} : x))}
                                        placeholder="Enter item name…"
                                        className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none focus:border-[#0F1B3C] focus:bg-white"
                                      />
                                    ) : (
                                      <p className="font-medium text-slate-900 leading-snug">{l.name}</p>
                                    )}
                                  </td>
                                  {mode === 'PER_ITEM' && <>
                                    {/* Qty */}
                                    <td className="px-2 py-2 text-center">
                                      <input type="number" min={1} value={l.quantity}
                                        onChange={e => setLines(prev => prev.map(x => x.key === l.key ? {...x, quantity: num(e.target.value) || 1} : x))}
                                        className="h-8 w-16 rounded-lg border border-slate-200 bg-slate-50 text-center text-sm font-medium outline-none focus:border-[#0F1B3C] focus:bg-white" />
                                    </td>
                                    {/* Unit — always a dropdown */}
                                    <td className="px-2 py-2 text-center">
                                      <select value={l.unit}
                                        onChange={e => setLines(prev => prev.map(x => x.key === l.key ? {...x, unit: e.target.value} : x))}
                                        className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-1.5 text-xs font-medium outline-none focus:border-[#0F1B3C] focus:bg-white">
                                        {ALLOWED_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                      </select>
                                    </td>
                                    {/* Unit price — only editable column */}
                                    <td className="px-2 py-2">
                                      <input type="number" min={0} step="0.01" value={l.unitPrice || ''}
                                        onChange={e => setLines(prev => prev.map(x => x.key === l.key ? {...x, unitPrice: num(e.target.value)} : x))}
                                        className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 text-right text-sm font-medium outline-none focus:border-[#B8860B] focus:bg-white" />
                                    </td>
                                    {/* Amount */}
                                    <td className="px-2 py-2 text-right text-sm font-bold text-slate-800">
                                      {l.unitPrice > 0 ? formatInr(l.quantity * l.unitPrice) : '—'}
                                    </td>
                                  </>}
                                  {/* Remove */}
                                  <td className="px-2 py-2 text-center">
                                    <button onClick={() => setLines(prev => prev.filter(x => x.key !== l.key))}
                                      className="grid h-6 w-6 place-items-center rounded-lg text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100">
                                      <X size={12}/>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add custom item */}
                <button onClick={() => setLines(prev => [...prev, { key: key(), name:'', category:'', quantity: 1, unit:'plate', unitPrice:0 }])}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 transition-all hover:border-[#B8860B]/50 hover:text-[#B8860B]">
                  <Plus size={12}/> Add custom item

                </button>

                {/* ── Adjustments row ── */}
                <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-3">
                  <div className="min-w-[100px] flex-1">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      GST {form.gstEnabled ? `(${form.gstPercent}%)` : '(Off)'}
                    </label>
                    <div className="flex gap-1.5">
                      <button onClick={() => setForm(s => ({...s, gstEnabled: !s.gstEnabled}))}
                        className={`h-9 rounded-xl border px-3 text-xs font-bold ${form.gstEnabled ? 'border-[#0F1B3C] bg-[#0F1B3C] text-white' : 'border-slate-200 text-slate-500'}`}>
                        {form.gstEnabled ? 'ON' : 'OFF'}
                      </button>
                      {form.gstEnabled && (
                        <Input type="number" value={form.gstPercent}
                          onChange={e => setForm(s => ({...s, gstPercent: e.target.value}))}
                          className="h-9 w-16 text-center text-sm" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-[110px] flex-1">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Discount (₹)</label>
                    <Input type="number" min={0} value={form.discountAmount}
                      onChange={e => setForm(s => ({...s, discountAmount: e.target.value}))}
                      className="h-9 text-sm" />
                  </div>
                  <div className="min-w-[110px] flex-1">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Extra (₹)</label>
                    <Input type="number" min={0} value={form.extraChargesAmount}
                      onChange={e => setForm(s => ({...s, extraChargesAmount: e.target.value}))}
                      className="h-9 text-sm" />
                  </div>
                </div>

                {/* ── Per Item guest calculation summary (mirrors Per Person band) ── */}
                {mode === 'PER_ITEM' && totals.subTotal > 0 && num(form.guestCount) > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {form.guestCount} guests &times;{' '}
                    <strong className="text-slate-800">
                      {formatInr(totals.subTotal / num(form.guestCount))} per person
                    </strong>
                    {' '}= <strong className="text-slate-900">{formatInr(totals.subTotal)}</strong>
                  </div>
                )}

                {/* ── Totals breakdown + Grand Total bar ── */}
                <div className="space-y-1.5">
                  {totals.subTotal > 0 && (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Sub Total</span><span>{formatInr(totals.subTotal)}</span>
                    </div>
                  )}
                  {totals.disc > 0 && (
                    <div className="flex justify-between text-sm text-rose-500">
                      <span>Discount (−)</span><span>−{formatInr(totals.disc)}</span>
                    </div>
                  )}
                  {totals.extra > 0 && (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Extra Charges (+)</span><span>+{formatInr(totals.extra)}</span>
                    </div>
                  )}
                  {form.gstEnabled && totals.gst > 0 && (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>GST ({form.gstPercent}%)</span><span>{formatInr(totals.gst)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-2xl bg-[#0F1B3C] px-5 py-3.5">
                    <span className="text-sm font-bold text-white/70">Grand Total</span>
                    <span className="text-lg font-black text-amber-400">{formatInr(totals.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─ Notes & Terms ─ */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notes</p>
                </div>
                <div className="p-4">
                  <Textarea value={form.notes} rows={3}
                    onChange={e => setForm(s => ({...s, notes: e.target.value}))}
                    placeholder="Additional notes for this quotation…" />
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Special Terms</p>
                </div>
                <div className="p-4">
                  <Textarea value={form.terms} rows={3}
                    onChange={e => setForm(s => ({...s, terms: e.target.value}))}
                    placeholder="Special terms or payment conditions…" />
                </div>
              </div>
            </div>

            {/* ─ Save ─ */}
            <button onClick={() => void onSave()} disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F1B3C] py-4 text-sm font-bold text-white transition-all hover:bg-[#1a2d5a] disabled:opacity-60 active:scale-[0.99]">
              {saving
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>
                : <Send size={15}/>}
              {saving ? 'Saving…' : isNew ? 'Create Quotation' : 'Save Changes'}
            </button>

          </div>
        )}
      </div>

      {/* ── Agreement Viewer ── */}
      {agOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-[#0F1B3C] px-5 py-3 text-white">
            <div className="flex items-center gap-3">
              <button onClick={() => setAgOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white">
                <ArrowLeft size={16}/>
              </button>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Agreement</p>
                <p className="text-sm font-black text-white">{selectedRow?.quotationNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const win = window.open('', '_blank', 'width=1000,height=750');
                  if (!win) { toast.error('Allow pop-ups to print'); return; }
                  win.document.write(agHtml);
                  win.document.close();
                  win.focus();
                  setTimeout(() => win.print(), 400);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-bold text-white/80 hover:bg-white/20">
                <Download size={13}/> Print / Save PDF
              </button>
              <button onClick={() => {
                  const blob = new Blob([agHtml], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = Object.assign(document.createElement('a'), { href: url, download: `${selectedRow?.quotationNumber}-agreement.html` });
                  document.body.appendChild(a); a.click(); a.remove();
                  setTimeout(() => URL.revokeObjectURL(url), 60000);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-bold text-[#0F1B3C] hover:bg-amber-300">
                <Download size={13}/> Download
              </button>
            </div>
          </div>
          <iframe ref={agIframeRef} className="flex-1 w-full border-0"
            srcDoc={agHtml} title={`Agreement — ${selectedRow?.quotationNumber}`}
            sandbox="allow-same-origin allow-scripts allow-popups" />
        </div>
      )}
    </div>
  );
}

/* ─── FormField ─────────────────────────────────────────────── */
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-slate-600">{label}</label>
      {children}
    </div>
  );
}

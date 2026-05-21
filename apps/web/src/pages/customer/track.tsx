import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  FileCheck2,
  FileText,
  Home,
  IndianRupee,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShoppingCart,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Users,
  XCircle,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { CategoryNode } from '@/features/categories/categories.service';
import { customerPortalService } from '@/features/customer-portal/customer-portal.service';
import { createWorkflowSocket } from '@/features/quotations/workflow-socket';
import { formatInr } from '@/utils/currency';
import { toMediaUrl } from '@/utils/media-url';
import { openQuotePdf } from '@/utils/quote-pdf';
import {
  getRequestStatusBadgeClass,
  requestStatusLabel,
  toUiRequestStatus,
} from '@/utils/request-status';

const TOKEN_KEY = 'customer_portal_token';
const CART_KEY  = 'customer_portal_cart';

type Quotation = {
  id: string;
  quotationNumber: string;
  customerName: string;
  customerPhone: string;
  eventDate: string;
  eventType: string;
  venue: string;
  guestCount: number;
  grandTotal: string;
  status?: string | null;
  requestStatus?: string | null;
  createdAt: string;
};

type ItemCategoryLookup = { byItemId: Record<string, string>; byName: Record<string, string> };

/* ─── Status helpers ─────────────────────────────────────────── */
type UiStatus = 'REQUESTED' | 'UNDER_REVIEW' | 'QUOTED' | 'ACCEPTED' | 'DECLINED';

function uiStatus(raw?: string | null): UiStatus {
  return toUiRequestStatus(raw);
}

function parseRejectionHistory(notes?: string | null): Array<{date: string; reason: string}> {
  if (!notes) return [];
  return notes.split('\n')
    .filter(l => l.includes('[CUSTOMER_DECLINE]'))
    .map(l => {
      const m = l.match(/\[CUSTOMER_DECLINE\]\s+(\S+)\s*-\s*(.+)/);
      return m ? { date: m[1], reason: m[2].trim() } : null;
    })
    .filter((x): x is {date: string; reason: string} => x !== null);
}

const STATUS_CONFIG: Record<UiStatus, { label: string; color: string; dot: string; bg: string }> = {
  REQUESTED:   { label: 'Requested',    color: 'text-blue-700',    dot: 'bg-blue-500',   bg: 'bg-blue-50 border-blue-200'   },
  UNDER_REVIEW:{ label: 'Under Review', color: 'text-orange-700',  dot: 'bg-orange-400 animate-pulse', bg: 'bg-orange-50 border-orange-200' },
  QUOTED:      { label: 'Quoted',       color: 'text-amber-700',   dot: 'bg-amber-400',  bg: 'bg-amber-50 border-amber-200'  },
  ACCEPTED:    { label: 'Accepted',     color: 'text-emerald-700', dot: 'bg-emerald-500',bg: 'bg-emerald-50 border-emerald-200'},
  DECLINED:    { label: 'Declined',     color: 'text-rose-700',    dot: 'bg-rose-500',   bg: 'bg-rose-50 border-rose-200'    },
};

/* ─── Billing ────────────────────────────────────────────────── */
function computeBilling(d: any) {
  const subRaw = Number(d?.subTotal ?? 0) ||
    (d?.items ?? []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0) ||
    Number(d?.grandTotal ?? 0);
  const disc  = Number(d?.discountAmount ?? 0);
  const extra = Number(d?.extraChargesAmount ?? 0);
  const gstPct = Number(d?.gstPercent ?? 0);
  const taxable = Math.max(subRaw - disc + extra, 0);
  const gst = Number(d?.gstAmount ?? 0) || Number(((taxable * gstPct) / 100).toFixed(2));
  const grand = Number(d?.grandTotal ?? 0) || Number((taxable + gst).toFixed(2));
  return { subTotal: subRaw, disc, extra, taxable, gstPct, gst, grand };
}

function isPerPerson(item: any) {
  const unit = String(item?.unit ?? '').toLowerCase();
  if (unit === 'person') return true;
  return String(item?.name ?? '').toLowerCase() === 'per person quote';
}

function splitItems(items: any[]) {
  const ppLine = items.find(isPerPerson);
  const regular = items.filter(i => !isPerPerson(i));
  const rate  = Number(ppLine?.unitPrice ?? 0);
  const guests = Number(ppLine?.quantity ?? 0);
  const totalAmt = Number(ppLine?.amount ?? 0);
  const total = totalAmt > 0 ? totalAmt : Number((rate * guests).toFixed(2));
  return { regular, perPerson: ppLine ? { rate, guests, total } : null, isPP: Boolean(ppLine && rate > 0) };
}

function buildLookup(nodes: CategoryNode[]): ItemCategoryLookup {
  const byItemId: Record<string, string> = {};
  const byName:   Record<string, string> = {};
  const visit = (ns: CategoryNode[], path: string[] = []) => {
    for (const n of ns) {
      const next = [...path, n.name];
      const cat  = next.length > 1 ? next[1] : next[next.length - 1] || 'Other';
      for (const item of n.items ?? []) {
        if (item.id)   byItemId[item.id] = cat;
        const nm = item.name?.trim().toLowerCase().replace(/\s+/g,' ');
        if (nm) byName[nm] = cat;
      }
      visit(n.children ?? [], next);
    }
  };
  visit(nodes);
  return { byItemId, byName };
}

function resolveCategory(item: any, lookup: ItemCategoryLookup) {
  const fromItem = String(item?.item?.category?.name ?? '').trim();
  if (fromItem) return fromItem;
  if (item?.itemId && lookup.byItemId[item.itemId]) return lookup.byItemId[item.itemId];
  const nm = String(item?.name ?? '').trim().toLowerCase().replace(/\s+/g,' ');
  if (nm && lookup.byName[nm]) return lookup.byName[nm];
  return 'Other Items';
}

function groupItems(items: any[], lookup: ItemCategoryLookup) {
  const map = new Map<string, any[]>();
  let s = 1;
  for (const item of items) {
    const cat = resolveCategory(item, lookup);
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push({ ...item, serial: s++ });
  }
  return Array.from(map.entries()).map(([cat, items]) => ({ cat, items }));
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════ */
export function CustomerTrackPage() {
  const navigate = useNavigate();
  const token    = localStorage.getItem(TOKEN_KEY);

  const [rows,     setRows]     = useState<Quotation[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [cartCount,setCartCount]= useState(0);
  const [lookup,   setLookup]   = useState<ItemCategoryLookup>({ byItemId: {}, byName: {} });
  const [company,  setCompany]  = useState<{ name: string; tagline?: string; logoUrl?: string } | null>(null);

  /* response dialog */
  const [respOpen,    setRespOpen]    = useState(false);
  const [respAction,  setRespAction]  = useState<'ACCEPT' | 'DECLINE' | 'INTERESTED'>('ACCEPT');
  const [respReason,  setRespReason]  = useState('');
  const [respLoading, setRespLoading] = useState(false);
  const [adminContact,setAdminContact]= useState<{ name?: string; phone?: string; email?: string } | null>(null);

  /* ── load ── */
  const load = async () => {
    if (!token) { navigate('/customer/login'); return; }
    try {
      setLoading(true);
      const data = await customerPortalService.myQuotations(token);
      setRows(data);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      navigate('/customer/login');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    void load();
    void customerPortalService.websiteContent()
      .then(res => {
        const c = res.company;
        if (c) setCompany({ name: c.name ?? 'Thankam Events', tagline: c.tagline, logoUrl: c.logoUrl ? toMediaUrl(c.logoUrl) : undefined });
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    void customerPortalService.catalog()
      .then(nodes => setLookup(buildLookup(nodes)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem(CART_KEY);
        if (!raw) { setCartCount(0); return; }
        const p = JSON.parse(raw) as Record<string, number>;
        setCartCount(Object.values(p).filter(q => Number(q) > 0).length);
      } catch { setCartCount(0); }
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('focus',   sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('focus', sync); };
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = createWorkflowSocket({ token });
    const onEvent = () => { void load(); if (selected?.id) void onOpen(selected.id); };
    socket.on('workflow:request.status',      onEvent);
    socket.on('workflow:quotation.status',     onEvent);
    socket.on('workflow:agreement.initiated',  onEvent);
    return () => { socket.disconnect(); };
  }, [token, selected?.id]);

  const onOpen = async (id: string) => {
    if (!token) return;
    try {
      const data = await customerPortalService.myQuotationById(token, id);
      setSelected(data);
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Unable to load details'); }
  };

  const onRespond = async () => {
    if (!token || !selected?.id) return;
    if (respAction === 'DECLINE' && !respReason.trim()) { toast.error('Reason is required when declining'); return; }
    try {
      setRespLoading(true);
      const res = await customerPortalService.respondToMyQuotation(
        token, selected.id, respAction, respReason.trim() || undefined,
      );
      toast.success(res.message);
      if (res.adminContact) setAdminContact(res.adminContact);
      setRespOpen(false);
      setRespReason('');
      await load();
      await onOpen(selected.id);
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to submit response'); }
    finally { setRespLoading(false); }
  };

  const billing = selected ? computeBilling(selected) : null;
  const items   = selected ? splitItems(selected.items ?? []) : { regular: [], perPerson: null, isPP: false };
  const grouped = useMemo(() => groupItems(items.regular, lookup), [items.regular, lookup]);

  const st = uiStatus(selected?.requestStatus);
  const isFinalized = selected?.status?.toUpperCase() === 'FINALIZED';
  const agreementStatus = selected?.agreementStatus?.toUpperCase();
  const rejectionHistory = parseRejectionHistory(selected?.notes);

  /* timeline steps */
  const STEPS = [
    { key: 'REQUESTED',    label: 'Submitted',   icon: Send },
    { key: 'UNDER_REVIEW', label: 'Under Review', icon: Clock },
    { key: 'QUOTED',       label: 'Quoted',       icon: IndianRupee },
    { key: 'ACCEPTED',     label: 'Accepted',     icon: CheckCircle2 },
  ];
  const stepsOrder: UiStatus[] = ['REQUESTED', 'UNDER_REVIEW', 'QUOTED', 'ACCEPTED'];
  const currentIdx = st === 'DECLINED' ? 3 : stepsOrder.indexOf(st);

  return (
    <div className="min-h-screen bg-[#f1f2f6] pb-20">

      {/* ── Header ── */}
      <div className="bg-[#0F1B3C] px-4 py-4 text-white shadow-lg md:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/customer/portal')}
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/8 text-white/70 transition-all hover:border-amber-400/40 hover:text-amber-300"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Customer Portal</p>
              <h1 className="text-lg font-black leading-tight tracking-tight text-white">My Quotations</h1>
            </div>
          </div>
          <button
            onClick={() => navigate('/customer/portal')}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-bold text-[#0F1B3C] transition-all hover:bg-amber-300"
          >
            <Sparkles size={13} /> New Request
          </button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="mx-auto max-w-5xl p-4 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">

          {/* ── Left: Quotation list ── */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Quotation Requests</p>

            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200" />)}
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <FileText size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No requests yet</p>
                <p className="mt-1 text-xs text-slate-400">Submit a quotation request from the portal.</p>
                <button
                  onClick={() => navigate('/customer/portal')}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#0F1B3C] px-4 py-2 text-xs font-bold text-white"
                >
                  <Sparkles size={12} /> Start Request
                </button>
              </div>
            ) : (
              rows.map((row) => {
                const s = uiStatus(row.requestStatus);
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={row.id}
                    onClick={() => void onOpen(row.id)}
                    className={`w-full rounded-2xl border p-3.5 text-left transition-all hover:shadow-md ${
                      selected?.id === row.id
                        ? 'border-[#0F1B3C] bg-[#0F1B3C] text-white shadow-lg'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className={`text-sm font-black ${selected?.id === row.id ? 'text-white' : 'text-[#0F1B3C]'}`}>
                        {row.quotationNumber}
                      </p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.color}`}>
                        <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${cfg.dot} align-middle`} />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                      <span className={`flex items-center gap-1 ${selected?.id === row.id ? 'text-white/70' : 'text-slate-500'}`}>
                        <Sparkles size={10} /> {row.eventType}
                      </span>
                      <span className={`flex items-center gap-1 ${selected?.id === row.id ? 'text-white/70' : 'text-slate-500'}`}>
                        <CalendarDays size={10} />
                        {new Date(row.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className={`mt-1 flex items-center gap-1 text-xs ${selected?.id === row.id ? 'text-white/55' : 'text-slate-400'}`}>
                      <MapPin size={10} /> {row.venue}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* ── Right: Detail ── */}
          {!selected ? (
            <div className="hidden items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white lg:flex">
              <div className="p-8 text-center">
                <FileText size={40} className="mx-auto mb-3 text-slate-300" />
                <p className="font-semibold text-slate-600">Select a quotation</p>
                <p className="mt-1 text-sm text-slate-400">Click a request to view its full details and status.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">

              {/* ─ Summary card ─ */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quotation</p>
                      <p className="text-base font-black text-[#0F1B3C]">{selected.quotationNumber}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Download PDF — visible once the quote is priced */}
                      {billing && billing.grand > 0 && (() => {
                        const ppLine = (selected.items ?? []).find((i: any) => isPerPerson(i));
                        const isPP   = Boolean(ppLine && Number(ppLine?.unitPrice || 0) > 0);
                        return (
                          <button
                            onClick={() => openQuotePdf({
                              quotationNumber: selected.quotationNumber,
                              createdAt: selected.createdAt,
                              customerName: selected.customerName,
                              customerPhone: selected.customerPhone,
                              eventType: selected.eventType,
                              eventDate: selected.eventDate,
                              venue: selected.venue,
                              guestCount: selected.guestCount,
                              isPerPerson: isPP,
                              perPersonRate:   isPP ? Number(ppLine?.unitPrice) : undefined,
                              perPersonGuests: isPP ? selected.guestCount : undefined,
                              lines: items.regular.map((l: any) => ({
                                name: l.name,
                                category: lookup.byItemId[l.itemId] || lookup.byName[l.name] || undefined,
                                quantity: Number(l.quantity),
                                unit: l.unit,
                                unitPrice: !isPP && (Number(l.unitPrice ?? 0) || undefined),
                                amount:    !isPP && (Number(l.amount    ?? 0) || undefined),
                              })),
                              subTotal: billing.subTotal,
                              discountAmount:     billing.disc  || undefined,
                              extraChargesAmount: billing.extra || undefined,
                              gstPercent: billing.gstPct || undefined,
                              gstAmount:  billing.gst   || undefined,
                              grandTotal: billing.grand,
                              rejectionHistory: rejectionHistory.length > 0 ? rejectionHistory : undefined,
                              companyName:    company?.name,
                              companyTagline: company?.tagline,
                              companyLogoUrl: company?.logoUrl,
                            })}
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#EDE8DF] bg-[#FDF3D0] px-3 text-xs font-bold text-[#B8860B] hover:bg-[#F0E0A0]"
                            title="Preview / Download as PDF"
                          >
                            <Download size={12} /> View Quote PDF
                          </button>
                        );
                      })()}
                      {/* Edit button */}
                      {(uiStatus(selected.requestStatus) === 'REQUESTED') && (
                        <button
                          onClick={() => navigate(`/customer/portal?edit=${selected.id}`)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-700 hover:bg-amber-100"
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                      )}
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_CONFIG[st].bg} ${STATUS_CONFIG[st].color}`}>
                        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[st].dot} align-middle`} />
                        {STATUS_CONFIG[st].label}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Info grid */}
                <div className="grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
                  {[
                    { icon: Sparkles,    label: 'Event Type', val: selected.eventType },
                    { icon: CalendarDays,label: 'Event Date', val: new Date(selected.eventDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) },
                    { icon: MapPin,      label: 'Venue',      val: selected.venue },
                    { icon: Users,       label: 'Guests',     val: `${selected.guestCount}` },
                  ].map(it => (
                    <div key={it.label} className="px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{it.label}</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{it.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─ Status Timeline ─ */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Request Progress</p>
                {st === 'DECLINED' ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <XCircle size={20} className="shrink-0 text-rose-500" />
                    <div>
                      <p className="text-sm font-bold text-rose-800">Request Declined</p>
                      <p className="text-xs text-rose-600 mt-0.5">This quotation request was declined. You can submit a new request.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start">
                    {STEPS.map((step, idx) => {
                      const done   = idx <= currentIdx;
                      const active = idx === currentIdx;
                      return (
                        <div key={step.key} className="flex flex-1 flex-col items-center">
                          <div className="flex w-full items-center">
                            {idx > 0 && <div className={`h-0.5 flex-1 ${STEPS[idx-1] && idx-1 < currentIdx ? 'bg-[#0F1B3C]' : 'bg-slate-200'}`} />}
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                              done
                                ? 'border-[#0F1B3C] bg-[#0F1B3C] text-white'
                                : active
                                  ? 'border-amber-400 bg-amber-50 text-amber-600'
                                  : 'border-slate-200 bg-white text-slate-300'
                            }`}>
                              <step.icon size={15} />
                            </div>
                            {idx < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${done && idx < currentIdx ? 'bg-[#0F1B3C]' : 'bg-slate-200'}`} />}
                          </div>
                          <p className={`mt-2 text-center text-[10px] font-semibold leading-tight ${done ? 'text-[#0F1B3C]' : 'text-slate-400'}`}>
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ─ Billing Summary ─ */}
              {/* ─ Decline history (visible to customer) ─ */}
              {rejectionHistory.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-sm">
                  <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-rose-600">
                      Your Decline History
                    </p>
                    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                      {rejectionHistory.length} decline{rejectionHistory.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="divide-y divide-rose-50 px-5">
                    {rejectionHistory.map((entry, i) => (
                      <div key={i} className="flex items-start gap-3 py-3">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rose-100 text-[10px] font-black text-rose-600">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-[11px] text-slate-400">
                            {new Date(entry.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-sm font-medium text-slate-700">{entry.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {billing && billing.grand > 0 && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                      Billing Summary
                      {rejectionHistory.length > 0 && (
                        <span className="ml-2 font-normal normal-case text-slate-400">
                          (Quote Attempt #{rejectionHistory.length + 1})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {[
                      { label: 'Sub Total',      val: billing.subTotal,  muted: true },
                      { label: 'Discount',        val: -billing.disc,     muted: true, prefix: '−' },
                      { label: 'Extra Charges',   val: billing.extra,     muted: true, prefix: '+' },
                      { label: 'Taxable Amount',  val: billing.taxable,   muted: false },
                      { label: `GST (${billing.gstPct.toFixed(1)}%)`, val: billing.gst, muted: true },
                    ].filter(r => r.val !== 0).map(r => (
                      <div key={r.label} className="flex items-center justify-between px-5 py-2.5">
                        <span className="text-sm text-slate-500">{r.label}</span>
                        <span className={`text-sm font-semibold ${r.muted ? 'text-slate-600' : 'text-slate-800'}`}>
                          {r.prefix ?? ''}{formatInr(Math.abs(r.val))}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between bg-[#0F1B3C] px-5 py-3.5">
                      <span className="text-sm font-bold text-white">Grand Total</span>
                      <span className="text-lg font-black text-amber-400">{formatInr(billing.grand)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ─ Items Table ─ */}
              {selected.items?.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Selected Items</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {/* Always show the menu items table when there are regular items */}
                    {grouped.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white/90 backdrop-blur">
                          <tr className="border-b border-slate-100">
                            <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">#</th>
                            <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Item</th>
                            {!items.isPP ? (
                              <>
                                <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">Qty</th>
                                <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">Unit Price</th>
                                <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">Amount</th>
                              </>
                            ) : null}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {items.isPP ? (
                            <tr className="bg-slate-50/70">
                              <td colSpan={2} className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                Item-wise quantity/unit/price split is hidden for per-person pricing.
                              </td>
                            </tr>
                          ) : null}
                          {grouped.map(({ cat, items: catItems }) => (
                            <Fragment key={cat}>
                              <tr className="bg-slate-50/70">
                                <td colSpan={items.isPP ? 2 : 5} className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">{cat}</td>
                              </tr>
                              {catItems.map((item: any) => {
                                const qty = Number(item.quantity ?? 0);
                                const up  = Number(item.unitPrice ?? 0);
                                const amt = Number(item.amount ?? 0) || Number((qty * up).toFixed(2));
                                /* For per-person pricing the admin sets unit prices to 0;
                                   show qty + unit but hide price columns for those rows */
                                const isPPRow = items.isPP && up === 0;
                                return (
                                  <tr key={item.id ?? item.serial} className="hover:bg-slate-50/60">
                                    <td className="px-4 py-2.5 text-xs text-slate-400">{item.serial}</td>
                                    <td className="px-4 py-2.5 font-medium text-slate-800">{item.name}</td>
                                    {!items.isPP ? (
                                      <>
                                        <td className="px-4 py-2.5 text-right text-slate-600">
                                          {qty} <span className="text-xs text-slate-400">{item.unit || 'unit'}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-slate-600">
                                          {isPPRow ? <span className="text-[10px] text-slate-400 italic">per-person rate</span> : up > 0 ? formatInr(up) : '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                                          {isPPRow ? '—' : amt > 0 ? formatInr(amt) : '—'}
                                        </td>
                                      </>
                                    ) : null}
                                  </tr>
                                );
                              })}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="px-5 py-4 text-center text-xs text-slate-400">No individual items recorded.</div>
                    )}

                    {/* Per-person pricing summary strip */}
                    {items.perPerson && (
                      <div className="border-t-2 border-[#0F1B3C] bg-[#0F1B3C]/5 px-5 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#0F1B3C]">Per Person Quote</p>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {formatInr(items.perPerson.rate)} per guest × {items.perPerson.guests} guests
                            </p>
                          </div>
                          <p className="text-base font-black text-[#0F1B3C]">{formatInr(items.perPerson.total)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─ Agreement nudge ─ */}
              {isFinalized && agreementStatus && agreementStatus !== 'NOT_INITIATED' && (
                <button
                  onClick={() => navigate('/customer/agreement')}
                  className="flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-left transition-all hover:bg-emerald-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white">
                      <FileCheck2 size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-800">Agreement Available</p>
                      <p className="text-xs text-emerald-600">
                        Status: {agreementStatus === 'ACCEPTED' ? 'Accepted ✓' : agreementStatus === 'REJECTED' ? 'Correction Requested' : 'Pending your review'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700">View →</span>
                </button>
              )}

              {/* ─ Admin contact ─ */}
              {adminContact?.phone && (
                <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-800">Admin Contact</p>
                    <p className="text-sm text-blue-700">{adminContact.name || 'Admin Team'} · {adminContact.phone}</p>
                    {adminContact.email && <p className="text-xs text-blue-600 mt-0.5">{adminContact.email}</p>}
                  </div>
                </div>
              )}

              {/* ─ Customer response actions ─ */}
              {st === 'QUOTED' && (
                <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
                  <div className="border-b border-amber-200/70 bg-amber-100/50 px-5 py-3.5">
                    <p className="text-sm font-bold text-amber-800">
                      <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500 align-middle" />
                      Your response is needed
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">Admin has finalized the quotation. Please review and respond.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 p-4">
                    <button
                      onClick={() => { setRespAction('ACCEPT'); setRespReason(''); setRespOpen(true); }}
                      className="flex flex-col items-center gap-2 rounded-2xl bg-emerald-600 px-3 py-4 text-white transition-all hover:bg-emerald-700 active:scale-95"
                    >
                      <ThumbsUp size={20} />
                      <span className="text-xs font-bold">Accept</span>
                    </button>
                    <button
                      onClick={() => { setRespAction('DECLINE'); setRespReason(''); setRespOpen(true); }}
                      className="flex flex-col items-center gap-2 rounded-2xl bg-rose-500 px-3 py-4 text-white transition-all hover:bg-rose-600 active:scale-95"
                    >
                      <ThumbsDown size={20} />
                      <span className="text-xs font-bold">Decline</span>
                    </button>
                    <button
                      onClick={() => { setRespAction('INTERESTED'); setRespReason(''); setRespOpen(true); }}
                      className="flex flex-col items-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-3 py-4 text-slate-700 transition-all hover:border-slate-400 active:scale-95"
                    >
                      <MessageCircle size={20} />
                      <span className="text-xs font-bold text-center">Need to Talk</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ─ Declined note ─ */}
              {st === 'DECLINED' && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
                  <p className="text-sm font-bold text-rose-800">You declined this quotation</p>
                  <p className="mt-1 text-xs text-rose-600">If you'd like to proceed, please submit a new request.</p>
                  <button
                    onClick={() => navigate('/customer/portal')}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0F1B3C] px-4 py-2 text-xs font-bold text-white"
                  >
                    <Sparkles size={12} /> New Request
                  </button>
                </div>
              )}

              {/* ─ Accepted note ─ */}
              {st === 'ACCEPTED' && !isFinalized && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                  <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Quotation Accepted</p>
                    <p className="mt-1 text-xs text-emerald-600">Admin is finalizing and will send the agreement shortly. You'll be notified.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          RESPONSE DIALOG
      ══════════════════════════════════════ */}
      {respOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-sm rounded-t-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-2xl ${
                  respAction === 'ACCEPT' ? 'bg-emerald-100 text-emerald-600' :
                  respAction === 'DECLINE' ? 'bg-rose-100 text-rose-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {respAction === 'ACCEPT' ? <ThumbsUp size={18} /> :
                   respAction === 'DECLINE' ? <ThumbsDown size={18} /> :
                   <MessageCircle size={18} />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {respAction === 'ACCEPT' ? 'Accept Quotation' :
                     respAction === 'DECLINE' ? 'Decline Quotation' : 'Express Interest'}
                  </h3>
                  <p className="text-xs text-slate-400">{selected?.quotationNumber}</p>
                </div>
              </div>
              <button onClick={() => { setRespOpen(false); setRespReason(''); }} className="text-slate-400 hover:text-slate-600">
                <XCircle size={20} />
              </button>
            </div>

            <p className="mb-3 text-sm text-slate-500">
              {respAction === 'ACCEPT'
                ? 'By accepting, admin will finalize your quotation and send you the agreement.'
                : respAction === 'DECLINE'
                  ? 'Please provide a reason for declining this quotation.'
                  : 'Tell us what you\'d like to discuss. Admin will contact you.'}
            </p>

            <Textarea
              rows={3}
              value={respReason}
              onChange={e => setRespReason(e.target.value)}
              placeholder={
                respAction === 'DECLINE' ? 'Reason for declining (required)…' :
                respAction === 'ACCEPT'  ? 'Any final notes? (optional)' :
                'What would you like to discuss? (optional)'
              }
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => { setRespOpen(false); setRespReason(''); }}
                className="rounded-2xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >Cancel</button>
              <button
                onClick={() => void onRespond()}
                disabled={respLoading || (respAction === 'DECLINE' && !respReason.trim())}
                className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white disabled:opacity-60 ${
                  respAction === 'ACCEPT' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  respAction === 'DECLINE' ? 'bg-rose-500 hover:bg-rose-600' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {respLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
                {respLoading ? 'Submitting…' :
                 respAction === 'ACCEPT' ? 'Confirm Accept' :
                 respAction === 'DECLINE' ? 'Confirm Decline' : 'Send Interest'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Navigation ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid h-16 w-full max-w-5xl grid-cols-5 px-2">
          <button className="flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
            onClick={() => navigate('/customer/portal')}>
            <Home size={16} /> Home
          </button>
          <button className="flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-amber-500"
            onClick={() => navigate('/customer/track')}>
            <FileText size={16} /> Quotation
          </button>
          <button
            className="relative mx-auto flex h-12 w-12 flex-col items-center justify-center rounded-2xl bg-[#0F1B3C] text-white shadow-lg"
            onClick={() => navigate('/customer/portal?cart=1')}>
            <ShoppingCart size={17} />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-[#0F1B3C]">
                {cartCount}
              </span>
            )}
          </button>
          <button className="flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
            onClick={() => { window.location.href = 'tel:+919745684766'; }}>
            <Phone size={16} /> Call
          </button>
          <button className="flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
            onClick={() => navigate('/customer/agreement')}>
            <FileCheck2 size={16} /> Agreement
          </button>
        </div>
      </div>
    </div>
  );
}

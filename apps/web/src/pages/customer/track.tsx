import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Download,
  Edit3,
  FileCheck2,
  FileText,
  HelpCircle,
  Home,
  IndianRupee,
  MapPin,
  MessageCircle,
  PartyPopper,
  Phone,
  Plus,
  Send,
  Share2,
  ShieldCheck,
  ShoppingCart,
  ThumbsDown,
  ThumbsUp,
  User,
  Users,
  UtensilsCrossed,
  X,
  XCircle,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { CategoryNode } from '@/features/categories/categories.service';
import { customerPortalService } from '@/features/customer-portal/customer-portal.service';
import { createWorkflowSocket } from '@/features/quotations/workflow-socket';
import { formatInr } from '@/utils/currency';
import { toMediaUrl } from '@/utils/media-url';
import { openQuotePdf } from '@/utils/quote-pdf';
import { toUiRequestStatus } from '@/utils/request-status';
import { isVegDish } from '@/utils/dietary';
import {
  isEventServiceItem,
  getServiceDepartmentGroup,
  formatServiceLineTitle,
} from '@/features/quotations/event-services.catalog';

const TOKEN_KEY = 'customer_portal_token';
const CART_KEY = 'customer_portal_cart';
const WHATSAPP_PHONE = '919207606150';

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
  notes?: string | null;
  instructions?: string | null;
  agreementStatus?: string | null;
  items?: any[];
};

type ItemCategoryLookup = { byItemId: Record<string, string>; byName: Record<string, string> };

/* ─── Status helpers ─────────────────────────────────────────── */
type UiStatus = 'REQUESTED' | 'UNDER_REVIEW' | 'QUOTED' | 'ACCEPTED' | 'DECLINED';

function uiStatus(raw?: string | null): UiStatus {
  return toUiRequestStatus(raw);
}

function parseRejectionHistory(notes?: string | null): Array<{ date: string; reason: string }> {
  if (!notes) return [];
  return notes
    .split('\n')
    .filter((l) => l.includes('[CUSTOMER_DECLINE]'))
    .map((l) => {
      const m = l.match(/\[CUSTOMER_DECLINE\]\s+(\S+)\s*-\s*(.+)/);
      return m ? { date: m[1], reason: m[2].trim() } : null;
    })
    .filter((x): x is { date: string; reason: string } => x !== null);
}

const STATUS_CONFIG: Record<UiStatus, { label: string; color: string; dot: string; bg: string; border: string }> = {
  REQUESTED: {
    label: 'Submitted',
    color: 'text-amber-800',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    color: 'text-orange-800',
    dot: 'bg-orange-500 animate-pulse',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  QUOTED: {
    label: 'Quote Ready',
    color: 'text-emerald-800',
    dot: 'bg-emerald-600 animate-pulse',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  ACCEPTED: {
    label: 'Confirmed',
    color: 'text-emerald-800',
    dot: 'bg-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  DECLINED: {
    label: 'Declined',
    color: 'text-rose-800',
    dot: 'bg-rose-500',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
};

/* ─── Veg / Non-Veg Detection & Badge ────────────────────────── */

function VegNonVegIcon({ isVeg, size = 14 }: { isVeg: boolean; size?: number }) {
  if (isVeg) {
    return (
      <div
        className="inline-flex shrink-0 items-center justify-center rounded-[4px] border-[1.5px] border-emerald-600 p-[2px] bg-white shadow-2xs"
        style={{ width: size + 2, height: size + 2 }}
        title="Pure Vegetarian"
      >
        <span
          className="rounded-full bg-emerald-600 shrink-0"
          style={{ width: size - 6, height: size - 6 }}
        />
      </div>
    );
  }
  return (
    <div
      className="inline-flex shrink-0 items-center justify-center rounded-[4px] border-[1.5px] border-rose-600 p-[2px] bg-white shadow-2xs"
      style={{ width: size + 2, height: size + 2 }}
      title="Non-Vegetarian"
    >
      <span
        className="rounded-full bg-rose-600 shrink-0"
        style={{ width: size - 6, height: size - 6 }}
      />
    </div>
  );
}

/* ─── Billing Calculation ────────────────────────────────────── */
function computeBilling(d: any) {
  const subRaw =
    Number(d?.subTotal ?? 0) ||
    (d?.items ?? []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0) ||
    Number(d?.grandTotal ?? 0);
  const disc = Number(d?.discountAmount ?? 0);
  const extra = Number(d?.extraChargesAmount ?? 0);
  const rawGstPct = Number(d?.gstPercent ?? 0);
  const hasGst = rawGstPct > 0;
  const gstPct = hasGst ? rawGstPct : 0;
  const taxable = Math.max(subRaw - disc + extra, 0);
  const gst = hasGst
    ? (d?.gstAmount !== undefined && d?.gstAmount !== null
        ? Number(d.gstAmount)
        : Number(((taxable * gstPct) / 100).toFixed(2)))
    : 0;
  const grand = Number(d?.grandTotal ?? 0) || Number((taxable + gst).toFixed(2));
  return { subTotal: subRaw, disc, extra, taxable, gstPct, gst, grand };
}

function isPerPerson(item: any) {
  const n = (item.name || '').toLowerCase();
  return (
    n.includes('per person') ||
    n.includes('per head') ||
    n.includes('per pax') ||
    n.includes('per guest') ||
    n.includes('package') ||
    item.unit === 'person' ||
    item.unit === 'guest' ||
    item.unit === 'pax'
  );
}

function splitItems(rawItems: any[]) {
  const foodItems: any[] = [];
  const serviceItems: any[] = [];
  let perPerson: { rate: number; guests: number; total: number } | null = null;
  let isPP = false;

  for (const item of rawItems) {
    if (isPerPerson(item) && !perPerson) {
      isPP = true;
      const rate = Number(item.unitPrice ?? 0);
      const guests = Number(item.quantity ?? 1);
      const total = Number(item.amount ?? 0) || Number((rate * guests).toFixed(2));
      perPerson = { rate, guests, total };
    }
  }

  for (const item of rawItems) {
    if (isPerPerson(item)) continue;
    if (isPP) {
      if (isEventServiceItem(item) || Number(item.amount || 0) > 0 || Number(item.unitPrice || 0) > 0) {
        serviceItems.push(item);
      } else {
        foodItems.push(item);
      }
    } else {
      if (isEventServiceItem(item)) {
        serviceItems.push(item);
      } else {
        foodItems.push(item);
      }
    }
  }

  return { regular: foodItems, foodItems, serviceItems, perPerson, isPP };
}

function buildCategoryLookup(tree: CategoryNode[]): ItemCategoryLookup {
  const byItemId: Record<string, string> = {};
  const byName: Record<string, string> = {};

  const traverse = (node: CategoryNode) => {
    for (const item of node.items ?? []) {
      if (item?.id) byItemId[item.id] = node.name;
      if (item?.name) byName[item.name.toLowerCase().trim()] = node.name;
    }
    for (const child of node.children ?? []) {
      traverse(child);
    }
  };

  for (const root of tree) traverse(root);
  return { byItemId, byName };
}

function groupItems(regularItems: any[], lookup: ItemCategoryLookup) {
  const map = new Map<string, any[]>();
  let serial = 1;

  for (const item of regularItems) {
    const rawCat =
      item?.categoryName ||
      item?.category?.name ||
      lookup.byItemId[item.itemId] ||
      lookup.byName[(item.name || '').toLowerCase().trim()] ||
      'Dishes';

    const cat = String(rawCat).trim() || 'Dishes';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push({ ...item, serial: serial++ });
  }

  return Array.from(map.entries()).map(([cat, items]) => ({ cat, items }));
}

/* ─── Main Customer Track Page ───────────────────────────────── */
export function CustomerTrackPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem(TOKEN_KEY);

  const [rows, setRows] = useState<Quotation[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [company, setCompany] = useState<any>(null);
  const [lookup, setLookup] = useState<ItemCategoryLookup>({ byItemId: {}, byName: {} });

  /* Customer Response Modal */
  const [respOpen, setRespOpen] = useState(false);
  const [respAction, setRespAction] = useState<'ACCEPT' | 'DECLINE' | 'INTERESTED'>('ACCEPT');
  const [respReason, setRespReason] = useState('');
  const [respLoading, setRespLoading] = useState(false);
  const [adminContact, setAdminContact] = useState<{ name?: string; phone?: string; email?: string } | null>(null);

  /* Load Cart Count */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setCartCount(Array.isArray(parsed) ? parsed.length : 0);
      }
    } catch {}
  }, []);

  /* Load Company & Categories */
  useEffect(() => {
    void customerPortalService
      .websiteContent()
      .then((c) => setCompany(c?.company ?? null))
      .catch(() => null);

    void customerPortalService
      .catalog()
      .then((tree) => setLookup(buildCategoryLookup(tree)))
      .catch(() => null);
  }, []);

  /* Load Quotations */
  const load = async () => {
    if (!token) {
      navigate('/customer/portal');
      return;
    }
    try {
      setLoading(true);
      const data = await customerPortalService.myQuotations(token);
      setRows(data);
      if (data.length > 0) {
        const exists = selected && data.some((r: Quotation) => r.id === selected.id);
        if (!exists) {
          await onOpen(data[0].id);
        }
      } else {
        setSelected(null);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  /* Real-Time WebSocket updates & live sync */
  useEffect(() => {
    if (!token) return;
    const socket = createWorkflowSocket({ token });

    const onWorkflowEvent = (payload: any) => {
      // Re-fetch all quotations list to pick up any new quote or status change
      void customerPortalService
        .myQuotations(token)
        .then((data) => {
          setRows(data);
        })
        .catch(() => {});

      // If active quote is updated, re-fetch detail immediately
      const currentSelectedId = selectedRef.current?.id;
      const targetId = payload?.quotationId || currentSelectedId;
      if (currentSelectedId && targetId === currentSelectedId) {
        void customerPortalService
          .myQuotationById(token, currentSelectedId)
          .then((fresh) => {
            setSelected(fresh);
          })
          .catch(() => {});
      }
    };

    [
      'workflow:request.created',
      'workflow:request.updated',
      'workflow:request.status',
      'workflow:quotation.status',
      'workflow:agreement.initiated',
      'workflow:agreement.feedback',
    ].forEach((e) => socket.on(e, onWorkflowEvent));

    // Silent background polling (every 6s) to ensure zero stale UI states
    const pollTimer = setInterval(() => {
      if (!token) return;
      void customerPortalService
        .myQuotations(token)
        .then((data) => {
          setRows(data);
          if (selectedRef.current?.id) {
            void customerPortalService
              .myQuotationById(token, selectedRef.current.id)
              .then(setSelected)
              .catch(() => {});
          }
        })
        .catch(() => {});
    }, 6000);

    return () => {
      socket.disconnect();
      clearInterval(pollTimer);
    };
  }, [token]);

  /* Open Quotation Detail */
  const onOpen = async (id: string) => {
    if (!token) return;
    try {
      const detail = await customerPortalService.myQuotationById(token, id);
      setSelected(detail);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to load quotation detail');
    }
  };

  /* Customer Response Submit */
  const onRespond = async () => {
    if (!token || !selected) return;
    if (respAction === 'DECLINE' && !respReason.trim()) {
      toast.error('Please provide a reason for declining');
      return;
    }
    try {
      setRespLoading(true);
      const res = await customerPortalService.respondToMyQuotation(
        token,
        selected.id,
        respAction,
        respReason.trim() || undefined,
      );
      toast.success(res.message);
      if (res.adminContact) setAdminContact(res.adminContact);
      setRespOpen(false);
      setRespReason('');
      await load();
      await onOpen(selected.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to submit response');
    } finally {
      setRespLoading(false);
    }
  };

  const billing = selected ? computeBilling(selected) : null;
  const items = selected ? splitItems(selected.items ?? []) : { regular: [], foodItems: [], serviceItems: [], perPerson: null, isPP: false };
  const grouped = useMemo(() => groupItems(items.regular, lookup), [items.regular, lookup]);

  const st = uiStatus(selected?.requestStatus);
  const isFinalized = selected?.status?.toUpperCase() === 'FINALIZED';
  const hasQuotedPricing = isFinalized || st === 'QUOTED' || st === 'ACCEPTED' || st === 'DECLINED';
  const agreementStatus = selected?.agreementStatus?.toUpperCase();
  const rejectionHistory = parseRejectionHistory(selected?.notes);

  /* Timeline Steps */
  const STEPS = [
    { key: 'REQUESTED', label: 'Request Sent', sub: 'Received' },
    { key: 'UNDER_REVIEW', label: 'Under Review', sub: 'Kitchen team' },
    { key: 'QUOTED', label: 'Quote Ready', sub: 'Price approved' },
    { key: 'ACCEPTED', label: 'Confirmed', sub: 'Date locked' },
  ];
  const stepsOrder: UiStatus[] = ['REQUESTED', 'UNDER_REVIEW', 'QUOTED', 'ACCEPTED'];
  const currentIdx = st === 'DECLINED' ? 3 : stepsOrder.indexOf(st);

  /* Simple status explanations */
  const getStatusInfo = () => {
    switch (st) {
      case 'REQUESTED':
        return {
          title: 'Request Sent to Caterer',
          desc: 'We received your menu request. Our catering team is calculating your custom quote.',
          badge: 'Waiting for Admin',
          color: 'text-amber-800',
        };
      case 'UNDER_REVIEW':
        return {
          title: 'Quote Under Review',
          desc: `We are calculating ingredient and catering arrangements for your ${selected?.guestCount || 100} guests. You will receive the quote soon.`,
          badge: 'In Review',
          color: 'text-orange-800',
        };
      case 'QUOTED':
        return {
          title: 'Your Quotation is Ready',
          desc: 'Please review the total price and food menu below. Click Accept to confirm your booking date, or contact us for changes.',
          badge: 'Action Required',
          color: 'text-emerald-800',
        };
      case 'ACCEPTED':
        return {
          title: 'Booking Confirmed ✓',
          desc: 'Thank you! Your event date has been locked in our calendar. You can now view and sign your catering agreement.',
          badge: 'Confirmed',
          color: 'text-emerald-800',
        };
      case 'DECLINED':
        return {
          title: 'Quotation Closed',
          desc: 'This quotation was declined. You can submit a new menu or contact us anytime for help.',
          badge: 'Declined',
          color: 'text-rose-800',
        };
    }
  };

  const statusInfo = selected ? getStatusInfo() : null;

  /* WhatsApp Link */
  const whatsappUrl = selected
    ? `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
        `Hi Thankam Events, I am inquiring about my quotation ${selected.quotationNumber} for ${selected.eventType} on ${selected.eventDate}.`,
      )}`
    : `https://wa.me/${WHATSAPP_PHONE}`;

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#080C14] pb-28">
      {/* ── Top Header (Thankam Minimalist Style) ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Left: Back & Branding */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/customer/portal')}
              aria-label="Return to Food Portal"
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#B8860B] leading-none">
                THANKAM EVENTS
              </p>
              <h1 className="text-base font-bold text-slate-900 leading-tight mt-0.5">
                My Quotations
              </h1>
            </div>
          </div>

          {/* Center Tabs: Quotations vs Agreements */}
          <div className="hidden sm:flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold bg-white text-slate-900 shadow-xs border border-slate-200"
            >
              <FileText size={13} className="text-[#B8860B]" />
              <span>Quotations ({rows.length})</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/customer/agreement')}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <FileCheck2 size={13} />
              <span>Agreements</span>
            </button>
          </div>

          {/* Right Action: New Request */}
          <button
            type="button"
            onClick={() => navigate('/customer/portal')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-all shadow-2xs"
          >
            <Plus size={14} />
            <span>New Request</span>
          </button>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 space-y-4">
        {loading ? (
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-2xl bg-white border border-slate-200" />
            <div className="h-56 animate-pulse rounded-2xl bg-white border border-slate-200" />
            <div className="h-64 animate-pulse rounded-2xl bg-white border border-slate-200" />
          </div>
        ) : rows.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center">
            <div className="mx-auto max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-[#B8860B] border border-amber-200/60">
                <UtensilsCrossed size={26} />
              </div>
              <h2 className="text-base font-bold text-slate-900">No Quotations Found</h2>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                You haven&apos;t submitted any catering requests yet. Select your favorite dishes to request a quote.
              </p>
              <button
                type="button"
                onClick={() => navigate('/customer/portal')}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-xs"
              >
                <Plus size={14} />
                <span>Browse Menu</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── 1. Order Switcher (Thankam Horizontal Cards) ── */}
            {rows.length > 1 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-xs font-bold text-slate-700">Your Quotations</span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {rows.length} requests
                  </span>
                </div>

                <div
                  className="flex items-stretch gap-2.5 overflow-x-auto pb-1.5 pt-0.5"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {rows.map((row) => {
                    const s = uiStatus(row.requestStatus);
                    const cfg = STATUS_CONFIG[s];
                    const isSelected = selected?.id === row.id;

                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => void onOpen(row.id)}
                        className={`shrink-0 text-left w-64 rounded-2xl p-3 transition-all relative ${
                          isSelected
                            ? 'bg-white border-2 border-emerald-600 shadow-sm ring-2 ring-emerald-600/10'
                            : 'bg-white border border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {row.quotationNumber}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.border} ${cfg.color}`}
                          >
                            <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${cfg.dot} align-middle`} />
                            {cfg.label}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-800 line-clamp-1">
                          {row.eventType || 'Catering Event'}
                        </p>

                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                          <span className="flex items-center gap-1 font-medium">
                            <CalendarDays size={11} className="text-[#B8860B]" />
                            {row.eventDate
                              ? new Date(row.eventDate).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                })
                              : 'Date TBD'}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <Users size={11} className="text-slate-400" />
                            {row.guestCount || 100} Guests
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Active Quotation Details ── */}
            {selected && (
              <div className="space-y-4">
                {/* ── 2. Thankam LIVE ORDER TRACKER CARD ── */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  {/* Status Headline */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_CONFIG[st].bg} ${STATUS_CONFIG[st].border} ${STATUS_CONFIG[st].color}`}
                        >
                          <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[st].dot} align-middle`} />
                          {STATUS_CONFIG[st].label}
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-400">
                          {selected.quotationNumber}
                        </span>
                      </div>
                      <h2 className="mt-1 text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                        {statusInfo?.title}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                        {statusInfo?.desc}
                      </p>
                    </div>

                    <div className="hidden sm:block text-right shrink-0">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Requested On</p>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        {new Date(selected.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* 4-Step Visual Tracker (Thankam Delivery Progress) */}
                  {st !== 'DECLINED' && (
                    <div className="pt-5 pb-1">
                      <div className="flex items-center justify-between relative">
                        {/* Connecting Line */}
                        <div className="absolute left-6 right-6 top-4 h-1 bg-slate-100 -translate-y-1/2 z-0" />
                        <div
                          className="absolute left-6 top-4 h-1 bg-emerald-600 -translate-y-1/2 z-0 transition-all duration-500"
                          style={{
                            width:
                              currentIdx === 0
                                ? '0%'
                                : currentIdx === 1
                                  ? '33%'
                                  : currentIdx === 2
                                    ? '66%'
                                    : 'calc(100% - 3rem)',
                          }}
                        />

                        {/* Step Nodes */}
                        {STEPS.map((step, idx) => {
                          const isDone = idx < currentIdx;
                          const isActive = idx === currentIdx;

                          return (
                            <div key={step.key} className="flex flex-col items-center relative z-10 w-20 text-center">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                                  isDone
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : isActive
                                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-sm'
                                      : 'bg-white border-2 border-slate-200 text-slate-400'
                                }`}
                              >
                                {isDone ? (
                                  <Check size={14} className="stroke-[3]" />
                                ) : (
                                  <span>{idx + 1}</span>
                                )}
                              </div>
                              <p
                                className={`mt-2 text-[11px] font-bold leading-tight ${
                                  isActive || isDone ? 'text-slate-900' : 'text-slate-400'
                                }`}
                              >
                                {step.label}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 3. ACTION HERO BANNER (When QUOTED) ── */}
                {st === 'QUOTED' && billing && billing.grand > 0 && (
                  <div className="rounded-2xl border-2 border-emerald-500/80 bg-white p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={12} />
                          Official Quote Ready
                        </span>
                        <h3 className="mt-1.5 text-base sm:text-lg font-bold text-slate-900">
                          Pricing Approved for Your Event
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Please accept below to reserve your event date, or contact us if you need any adjustments.
                        </p>
                      </div>

                      {/* Thankam Style Total Price Box */}
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-left sm:text-right shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Total Price (5% GST Included)
                        </span>
                        <p className="text-2xl font-black font-mono text-emerald-700 mt-0.5">
                          {formatInr(billing.grand)}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          for {selected.guestCount || 100} Guests
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setRespAction('ACCEPT');
                          setRespReason('');
                          setRespOpen(true);
                        }}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-800 transition-all shadow-sm active:scale-[0.98]"
                      >
                        <ThumbsUp size={15} />
                        <span>Accept Quotation</span>
                      </button>

                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/80 px-4 py-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all shadow-2xs"
                      >
                        <MessageCircle size={15} className="text-emerald-600" />
                        <span>Discuss via WhatsApp</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setRespAction('DECLINE');
                          setRespReason('');
                          setRespOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all"
                      >
                        <ThumbsDown size={13} />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── 4. EVENT & VENUE DETAILS (Thankam Delivery Details Style) ── */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Event &amp; Venue Details
                    </h3>
                    <div className="flex items-center gap-2">
                      {hasQuotedPricing && billing && billing.grand > 0 && (() => {
                        const ppLine = (selected.items ?? []).find((i: any) => isPerPerson(i));
                        const isPP = Boolean(ppLine && Number(ppLine?.unitPrice || 0) > 0);

                        return (
                          <button
                            type="button"
                            onClick={() =>
                              openQuotePdf({
                                quotationNumber: selected.quotationNumber,
                                createdAt: selected.createdAt,
                                customerName: selected.customerName,
                                customerPhone: selected.customerPhone,
                                eventType: selected.eventType,
                                eventDate: selected.eventDate,
                                venue: selected.venue,
                                guestCount: selected.guestCount,
                                isPerPerson: isPP,
                                perPersonRate: isPP ? Number(ppLine?.unitPrice) : undefined,
                                perPersonGuests: isPP ? selected.guestCount : undefined,
                                lines: [
                                  ...items.regular.map((l: any) => ({
                                    name: l.name,
                                    category: lookup.byItemId[l.itemId] || lookup.byName[l.name] || undefined,
                                    quantity: Number(l.quantity || 1),
                                    unit: l.unit,
                                    unitPrice: !isPP ? Number(l.unitPrice ?? 0) || undefined : undefined,
                                    amount: !isPP ? Number(l.amount ?? 0) || undefined : undefined,
                                  })),
                                  ...items.serviceItems.map((s: any) => ({
                                    name: s.name,
                                    category: s.category || 'Decor, Production & Event Rentals',
                                    quantity: Number(s.quantity || 1),
                                    unit: s.unit || 'setup',
                                    unitPrice: Number(s.unitPrice ?? 0) || undefined,
                                    amount: Number(s.amount ?? 0) || Number((Number(s.unitPrice ?? 0) * Number(s.quantity || 1)).toFixed(2)) || undefined,
                                  })),
                                ],
                                subTotal: billing.subTotal,
                                discountAmount: billing.disc || undefined,
                                extraChargesAmount: billing.extra || undefined,
                                gstPercent: billing.gstPct > 0 ? billing.gstPct : 0,
                                gstAmount: billing.gst > 0 ? billing.gst : 0,
                                grandTotal: billing.grand,
                                rejectionHistory: rejectionHistory.length > 0 ? rejectionHistory : undefined,
                                companyName: company?.name,
                                companyTagline: company?.tagline,
                                companyLogoUrl: company?.logoUrl,
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                          >
                            <Download size={13} className="text-[#B8860B]" />
                            <span>Download PDF</span>
                          </button>
                        );
                      })()}

                      {st === 'REQUESTED' && (
                        <button
                          type="button"
                          onClick={() => navigate(`/customer/portal?edit=${selected.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                          <Edit3 size={13} />
                          <span>Modify Menu</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Clean Thankam Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-50 text-[#B8860B] border border-amber-200/60 mt-0.5">
                        <PartyPopper size={15} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Celebration Type
                        </span>
                        <p className="font-bold text-slate-900 mt-0.5 text-sm">
                          {selected.eventType || 'Grand Catering Feast'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-50 text-[#B8860B] border border-amber-200/60 mt-0.5">
                        <CalendarDays size={15} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Event Date
                        </span>
                        <p className="font-bold text-slate-900 mt-0.5 text-sm">
                          {selected.eventDate
                            ? new Date(selected.eventDate).toLocaleDateString('en-IN', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Date TBD'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 mt-0.5">
                        <Users size={15} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Expected Guests
                        </span>
                        <p className="font-bold text-slate-900 mt-0.5 text-sm">
                          {selected.guestCount || 100} Guests
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 mt-0.5">
                        <MapPin size={15} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Venue Location
                        </span>
                        <p className="font-bold text-slate-900 mt-0.5 text-sm break-words">
                          {selected.venue || 'Custom Venue'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Special Requests (if any) */}
                  {(selected.instructions || selected.notes) && (
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 space-y-1">
                      <span className="font-bold text-slate-700">Special Catering Requests:</span>
                      <p className="text-slate-600 leading-relaxed">
                        {selected.instructions ||
                          selected.notes?.split('\n').filter((l: string) => !l.startsWith('[CUSTOMER_DECLINE]')).join(', ')}
                      </p>
                    </div>
                  )}
                </div>

                {/* ── 5. FOOD MENU (Thankam Itemized Receipt Style) ── */}
                {selected.items?.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <UtensilsCrossed size={15} className="text-slate-700" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Food Menu
                        </h3>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {items.regular.length} Items Selected
                      </span>
                    </div>

                    {/* Notice when quote is in progress */}
                    {!hasQuotedPricing && (
                      <div className="rounded-xl bg-amber-50 border border-amber-200/60 p-3 text-xs text-amber-900 leading-relaxed">
                        <span className="font-bold">Pricing Under Review:</span> You have selected these{' '}
                        <span className="font-bold">{items.regular.length} dishes</span> for your{' '}
                        <span className="font-bold">{selected.guestCount || 100} guests</span>. Our team is calculating your final per-plate quote. You will see the total price here once ready.
                      </div>
                    )}

                    {/* Clean Items List */}
                    <div className="divide-y divide-slate-100">
                      {grouped.map(({ cat, items: catItems }) => (
                        <div key={cat} className="py-2.5 first:pt-0 last:pb-0">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                            {cat} ({catItems.length})
                          </p>

                          <div className="space-y-2">
                            {catItems.map((item: any) => {
                              const isVeg = isVegDish(item.name, cat);
                              const up = Number(item.unitPrice ?? 0);
                              const qty = Number(item.quantity ?? 1);
                              const amt = Number(item.amount ?? 0) || Number((qty * up).toFixed(2));

                              return (
                                <div
                                  key={item.id ?? item.serial}
                                  className="flex items-center justify-between gap-3 text-xs py-1"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <VegNonVegIcon isVeg={isVeg} size={14} />
                                    <span className="font-medium text-slate-900 truncate">
                                      {item.name}
                                    </span>
                                  </div>

                                  {/* Right side: If quoted itemized, show rate; otherwise simple course pill */}
                                  {hasQuotedPricing && !items.isPP ? (
                                    <div className="text-right shrink-0 font-mono">
                                      {amt > 0 ? (
                                        <span className="font-bold text-slate-900">{formatInr(amt)}</span>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="shrink-0 rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-100">
                                      {cat}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── 5b. Decor, Production & Event Rentals ── */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <PartyPopper size={16} className="text-[#D4AF37]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Decor, Production &amp; Event Rentals
                      </h3>
                    </div>
                    {items.serviceItems && items.serviceItems.length > 0 && (
                      <span className="rounded-full bg-amber-50 text-[#B8860B] border border-amber-200 px-2.5 py-0.5 text-xs font-bold">
                        {items.serviceItems.length} Services Booked
                      </span>
                    )}
                  </div>

                  {items.serviceItems && items.serviceItems.length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(
                        items.serviceItems.reduce((acc: Record<string, { icon: string; badgeClass: string; items: any[] }>, svc: any) => {
                          const meta = getServiceDepartmentGroup(svc.name, svc.category);
                          if (!acc[meta.group]) {
                            acc[meta.group] = { icon: meta.icon, badgeClass: meta.badgeClass, items: [] };
                          }
                          acc[meta.group].items.push(svc);
                          return acc;
                        }, {})
                      ).map(([groupName, { icon, badgeClass, items: grpItems }]) => (
                        <div key={groupName} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                              <span>{icon}</span> {groupName}
                            </span>
                            <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase ${badgeClass}`}>
                              {grpItems.length} {grpItems.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>

                          <div className="divide-y divide-slate-200/60">
                            {grpItems.map((svc: any, idx: number) => {
                              const qty = Number(svc.quantity || 1);
                              const rate = Number(svc.unitPrice || 0);
                              const amt = Number(svc.amount || 0) || Number((qty * rate).toFixed(2));
                              const parsed = formatServiceLineTitle(svc.name);
                              return (
                                <div key={svc.id ?? idx} className="flex items-center justify-between py-1.5 text-xs">
                                  <div className="pr-3">
                                    <span className="font-semibold text-slate-900 block">{parsed.title}</span>
                                    {parsed.subtitle && (
                                      <span className="text-[11px] text-slate-600 font-normal italic block mt-0.5 leading-snug">
                                        {parsed.subtitle}
                                      </span>
                                    )}
                                  </div>
                                  {hasQuotedPricing ? (
                                    <span className="font-bold font-mono text-slate-900 shrink-0">
                                      {amt > 0 ? formatInr(amt) : '—'}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold shrink-0">
                                      Quotation Review
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-amber-200/80 bg-amber-50/30 p-3.5 text-center">
                      <p className="text-xs font-semibold text-slate-700">Looking to add Stage Floral Decor, Sound, Lighting, or Furniture?</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Thankam provides complete event decor, JBL line arrays, low-fog couple entry, and buffet counters.
                      </p>
                    </div>
                  )}
                </div>

                {/* ── 6. BILL DETAILS (Thankam Style Receipt Card) ── */}
                {hasQuotedPricing && billing && billing.grand > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2.5">
                      Bill Details
                    </h3>

                    {/* Per-Person rate strip if applicable */}
                    {items.isPP && items.perPerson && (
                      <div className="flex items-center justify-between text-xs py-1">
                        <span className="text-slate-600">
                          Price per Guest ({items.perPerson.guests} Guests &times; {formatInr(items.perPerson.rate)})
                        </span>
                        <span className="font-bold text-slate-900 font-mono">
                          {formatInr(items.perPerson.total)}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2 text-xs text-slate-600">
                      {[
                        { label: 'Item Total', val: billing.subTotal },
                        { label: 'Special Discount', val: -billing.disc, isGreen: true, prefix: '−' },
                        { label: 'Extra Services / Setup', val: billing.extra },
                        { label: `Taxes & GST (${billing.gstPct.toFixed(1)}%)`, val: billing.gst },
                      ]
                        .filter((r) => r.val !== 0)
                        .map((r) => (
                          <div key={r.label} className="flex items-center justify-between">
                            <span>{r.label}</span>
                            <span
                              className={`font-mono font-semibold ${
                                (r as any).isGreen ? 'text-emerald-700' : 'text-slate-800'
                              }`}
                            >
                              {(r as any).prefix ?? ''}
                              {formatInr(Math.abs(r.val))}
                            </span>
                          </div>
                        ))}
                    </div>

                    {/* Total To Pay (Thankam Receipt Divider) */}
                    <div className="border-t border-dashed border-slate-200 pt-3 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Total Amount
                        </span>
                        <p className="text-sm font-bold text-slate-900">To Pay</p>
                      </div>
                      <p className="text-xl font-black font-mono text-slate-900">
                        {formatInr(billing.grand)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-center text-[11px] text-slate-500 font-medium">
                      ✓ Final quote with 5% GST included. No hidden charges.
                    </div>
                  </div>
                )}

                {/* ── 7. FORMAL AGREEMENT NUDGE (When Available) ── */}
                {isFinalized && agreementStatus && agreementStatus !== 'NOT_INITIATED' && (
                  <button
                    type="button"
                    onClick={() => navigate('/customer/agreement')}
                    className="flex w-full items-center justify-between rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 p-4 sm:p-5 text-left transition-all hover:bg-emerald-50 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-700 text-white shadow-xs">
                        <FileCheck2 size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-950">
                          Catering Agreement Ready
                        </p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          {agreementStatus === 'ACCEPTED'
                            ? 'Accepted & Digitally Signed ✓'
                            : 'Ready for your digital review and signature'}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs">
                      <span>View Agreement</span>
                      <span>&rarr;</span>
                    </span>
                  </button>
                )}

                {/* ── 8. NEED HELP / CONCIERGE STRIP ── */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Need any changes or food tasting?
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      We can help adjust your dishes, spice levels, or guest count. Call or WhatsApp us anytime.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      <MessageCircle size={13} />
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href={`tel:+${WHATSAPP_PHONE}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white transition-colors"
                    >
                      <Phone size={13} />
                      <span>Call Us</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ═════════════════════════════════════════════════════════
          CUSTOMER RESPONSE DIALOG (Accept / Decline / Inquire)
      ══════════════════════════════════════════════════════════ */}
      {respOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-xl ${
                    respAction === 'ACCEPT'
                      ? 'bg-emerald-100 text-emerald-700'
                      : respAction === 'DECLINE'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {respAction === 'ACCEPT' ? (
                    <ThumbsUp size={18} />
                  ) : respAction === 'DECLINE' ? (
                    <ThumbsDown size={18} />
                  ) : (
                    <MessageCircle size={18} />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {respAction === 'ACCEPT'
                      ? 'Accept Quotation'
                      : respAction === 'DECLINE'
                        ? 'Decline Quotation'
                        : 'Request Adjustments'}
                  </h3>
                  <p className="text-xs font-mono text-slate-400">{selected?.quotationNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRespOpen(false);
                  setRespReason('');
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mb-3 text-xs text-slate-600 leading-relaxed">
              {respAction === 'ACCEPT'
                ? 'By accepting, we will prepare your event agreement with the final schedule and payment terms.'
                : respAction === 'DECLINE'
                  ? 'Please let us know why you are declining so our catering team can assist or offer alternatives.'
                  : 'Tell us what you would like to change (items, guest count, or price).'}
            </p>

            <Textarea
              rows={3}
              value={respReason}
              onChange={(e) => setRespReason(e.target.value)}
              placeholder={
                respAction === 'DECLINE'
                  ? 'Reason for declining (required)…'
                  : respAction === 'ACCEPT'
                    ? 'Any special requests or instructions? (optional)'
                    : 'What would you like adjusted or discussed? (optional)'
              }
              className="text-sm rounded-xl border-slate-200 bg-slate-50 focus:border-emerald-600 focus:bg-white"
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setRespOpen(false);
                  setRespReason('');
                }}
                className="rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onRespond()}
                disabled={respLoading || (respAction === 'DECLINE' && !respReason.trim())}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all disabled:opacity-50 ${
                  respAction === 'ACCEPT'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : respAction === 'DECLINE'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-slate-900 hover:bg-black text-white'
                }`}
              >
                {respLoading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                <span>
                  {respLoading
                    ? 'Submitting…'
                    : respAction === 'ACCEPT'
                      ? 'Confirm Accept'
                      : respAction === 'DECLINE'
                        ? 'Confirm Decline'
                        : 'Send Message'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fixed Bottom Navigation (Matches Portal) ── */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      >
        <div className="relative mx-auto grid h-16 w-full max-w-lg grid-cols-5 px-2">
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            onClick={() => navigate('/customer/portal')}
          >
            <Home size={18} />
            <span>Home</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-emerald-700 transition-colors"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <FileText size={18} />
            <span>Quotation</span>
          </button>

          {/* Elevated Center Cart Button */}
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              aria-label="View shopping cart"
              className="absolute -top-3.5 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-slate-900 text-amber-300 border border-[#B8860B]/40 shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-all hover:bg-black hover:scale-105 active:scale-95"
              onClick={() => navigate('/customer/portal?cart=1')}
            >
              <ShoppingCart size={22} />
            </button>
            {cartCount > 0 ? (
              <span className="absolute -top-2 left-[calc(50%+10px)] grid h-5 min-w-5 place-items-center rounded-full bg-[#B8860B] px-1 text-[10px] font-black text-white ring-2 ring-white shadow">
                {cartCount}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            onClick={() => {
              window.location.href = `tel:+${WHATSAPP_PHONE}`;
            }}
          >
            <Phone size={18} />
            <span>Call</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            onClick={() => navigate('/customer/agreement')}
          >
            <FileCheck2 size={18} />
            <span>Agreement</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

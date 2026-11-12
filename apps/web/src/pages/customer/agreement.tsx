import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Download,
  FileCheck2,
  FileText,
  Home,
  MapPin,
  MessageSquare,
  PartyPopper,
  Phone,
  Plus,
  RotateCcw,
  Share2,
  ShoppingCart,
  Sparkles,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { customerPortalService } from '@/features/customer-portal/customer-portal.service';
import { createWorkflowSocket } from '@/features/quotations/workflow-socket';
import { formatInr } from '@/utils/currency';
import { isVegDish } from '@/utils/dietary';
import { generateAgreementHtml } from '@/utils/agreement-pdf';
import { toMediaUrl } from '@/utils/media-url';
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
  grandTotal?: string;
  subTotal?: string;
  discountAmount?: string;
  extraChargesAmount?: string;
  gstPercent?: string;
  gstAmount?: string;
  status?: string | null;
  agreementStatus?: string | null;
  agreementRejectReason?: string | null;
  agreementAcceptedAt?: string | null;
  notes?: string | null;
  instructions?: string | null;
  items?: any[];
  createdAt: string;
};

type AgStep = 'not_initiated' | 'initiated' | 'rejected' | 'accepted';

function parseStep(s?: string | null): AgStep {
  switch ((s ?? '').toUpperCase()) {
    case 'INITIATED':
      return 'initiated';
    case 'REJECTED':
      return 'rejected';
    case 'ACCEPTED':
      return 'accepted';
    default:
      return 'not_initiated';
  }
}

const STEP_META: Record<
  AgStep,
  {
    label: string;
    shortLabel: string;
    border: string;
    bg: string;
    text: string;
    dot: string;
  }
> = {
  not_initiated: {
    label: 'Awaiting Admin',
    shortLabel: 'Pending',
    border: 'border-slate-200',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
  },
  initiated: {
    label: 'Pending Your Review',
    shortLabel: 'Review Now',
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    dot: 'bg-amber-600 animate-pulse',
  },
  rejected: {
    label: 'Correction Requested',
    shortLabel: 'Correction Sent',
    border: 'border-orange-200',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    dot: 'bg-orange-500',
  },
  accepted: {
    label: 'Agreement Signed ✓',
    shortLabel: 'Signed ✓',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    dot: 'bg-emerald-600',
  },
};

/* ── Veg / Non-Veg Indicator ── */

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

/* ── Billing Calculation Helper ── */
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
  const n = (item.name || item.item?.name || '').toLowerCase();
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

function groupItems(items: any[]) {
  const groups: Record<string, any[]> = {};
  for (const it of items) {
    const cat = it.item?.category?.name || it.category || 'Food Dishes';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(it);
  }
  return Object.entries(groups).map(([cat, items]) => ({ cat, items }));
}

export function CustomerAgreementPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem(TOKEN_KEY);

  const [rows, setRows] = useState<Quotation[]>([]);
  const [selected, setSelected] = useState<Quotation | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [company, setCompany] = useState<any>(null);

  /* Viewer */
  const [viewOpen, setViewOpen] = useState(false);
  const [viewHtml, setViewHtml] = useState('');
  const [viewLoading, setViewLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  /* Correction */
  const [corrOpen, setCorrOpen] = useState(false);
  const [corrReason, setCorrReason] = useState('');
  const [corrLoading, setCorrLoading] = useState(false);

  /* Accept */
  const [acptOpen, setAcptOpen] = useState(false);
  const [acptLoading, setAcptLoading] = useState(false);

  const finalized = useMemo(
    () => rows.filter((r) => r.status?.toUpperCase() === 'FINALIZED'),
    [rows],
  );

  /* Select quotation */
  const onSelect = async (id: string, list?: Quotation[]) => {
    const pool = list && list.length > 0 ? list : rows;
    const q = pool.find((r) => r.id === id) ?? null;
    if (q) {
      setSelected(q);
    }
    if (!token || !id) return;
    try {
      const detail = await customerPortalService.myQuotationById(token, id);
      setSelectedDetail(detail);
      setSelected((prev) => ({ ...(prev ?? {}), ...detail }));
    } catch (err) {
      console.error('Failed to load quotation detail', err);
    }
  };

  /* Load data */
  const load = async () => {
    if (!token) {
      navigate('/customer/portal');
      return;
    }
    try {
      setLoading(true);
      const data = await customerPortalService.myQuotations(token);
      setRows(data);
      const fin = data.filter((r: Quotation) => r.status?.toUpperCase() === 'FINALIZED');
      if (fin.length > 0) {
        const targetId = selected && fin.some((r: Quotation) => r.id === selected.id) ? selected.id : fin[0].id;
        await onSelect(targetId, data);
      } else {
        setSelected(null);
        setSelectedDetail(null);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to load agreements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  /* Ensure selected is always populated when finalized agreements exist */
  useEffect(() => {
    if (finalized.length > 0) {
      const exists = selected && finalized.some((f) => f.id === selected.id);
      if (!exists) {
        void onSelect(finalized[0].id, finalized);
      }
    }
  }, [finalized, selected?.id]);

  /* Load Company & Cart */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setCartCount(Array.isArray(parsed) ? parsed.length : 0);
      }
    } catch {}

    void customerPortalService
      .websiteContent()
      .then((c) => setCompany(c?.company ?? null))
      .catch(() => null);
  }, []);

  const selectedRef = useRef<Quotation | null>(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  /* Real-Time WebSocket updates + background sync */
  useEffect(() => {
    if (!token) return;
    const socket = createWorkflowSocket({ token });

    const handleUpdate = () => {
      void customerPortalService
        .myQuotations(token)
        .then((data) => {
          setRows(data);
          const curr = selectedRef.current;
          if (curr) {
            const updated = data.find((r: Quotation) => r.id === curr.id);
            if (updated) {
              void onSelect(curr.id, data);
            }
          }
        })
        .catch(() => null);
    };

    socket.on('workflow:agreement.initiated', handleUpdate);
    socket.on('workflow:agreement.feedback', handleUpdate);
    socket.on('workflow:quotation.status', handleUpdate);
    socket.on('workflow:request.status', handleUpdate);
    socket.on('workflow:request.updated', handleUpdate);
    socket.on('workflow:request.created', handleUpdate);
    socket.on('quotation:statusChanged', handleUpdate);

    // Silent background sync interval (7s)
    const syncTimer = setInterval(handleUpdate, 7000);

    return () => {
      clearInterval(syncTimer);
      socket.disconnect();
    };
  }, [token]);

  /* Build HTML */
  const buildAgreementHtml = (detail: any): string => {
    const ppLine = (detail.items ?? []).find(
      (l: any) =>
        l.unit === 'person' ||
        l.unit === 'pax' ||
        (l.item?.name || l.name || '').toLowerCase().includes('per person'),
    );
    const isPP = Boolean(ppLine && Number(ppLine.unitPrice || 0) > 0);

    return generateAgreementHtml({
      quotationNumber: detail.quotationNumber,
      createdAt: detail.createdAt,
      customerName: detail.customerName,
      customerPhone: detail.customerPhone,
      customerAddress: detail.customerAddress,
      eventType: detail.eventType,
      eventDate: detail.eventDate,
      venue: detail.venue,
      guestCount: Number(detail.guestCount),
      items: (detail.items ?? []).map((l: any) => {
        const isSvc = isEventServiceItem(l) || Number(l.amount || 0) > 0 || Number(l.unitPrice || 0) > 0;
        return {
          name: l.item?.name || l.name || '',
          category: l.item?.category?.name ?? (isSvc ? 'Decor & Event Services' : 'Food Menu'),
          quantity: Number(l.quantity || 1),
          unit: l.unit,
          unitPrice: (!isPP || isSvc) ? (Number(l.unitPrice ?? 0) || null) : null,
          amount: (!isPP || isSvc) ? (Number(l.amount ?? 0) || null) : null,
        };
      }),
      isPerPerson: isPP,
      perPersonRate: isPP ? Number(ppLine?.unitPrice) : undefined,
      subTotal: Number(detail.subTotal ?? 0) || undefined,
      discountAmount: Number(detail.discountAmount ?? 0) || undefined,
      extraChargesAmount: Number(detail.extraChargesAmount ?? 0) || undefined,
      gstPercent: Number(detail.gstPercent ?? 0) > 0 ? Number(detail.gstPercent) : 0,
      gstAmount: Number(detail.gstPercent ?? 0) > 0 ? Number(detail.gstAmount ?? 0) : 0,
      grandTotal: Number(detail.grandTotal ?? 0) || undefined,
      agreementStatus: detail.agreementStatus,
      agreementAcceptedAt: detail.agreementAcceptedAt,
      terms: detail.terms,
      notes: detail.notes,
      companyName: company?.name ?? 'Thankam Events',
      companyTagline: company?.tagline,
      companyLogoUrl: company?.logoUrl ? toMediaUrl(company.logoUrl) : undefined,
      companyPhone: '+91 9207606150',
      companyEmail: 'info@thankamevents.in',
      companyAddress: 'Kollam, Kerala',
    });
  };

  /* View (inline preview) */
  const onView = async () => {
    if (!token || !selected?.id) return;
    if (parseStep(selected.agreementStatus) === 'not_initiated') {
      toast.info('Agreement will be available once admin initiates it.');
      return;
    }
    try {
      setViewLoading(true);
      let detail = selectedDetail;
      if (!detail || detail.id !== selected.id) {
        detail = await customerPortalService.myQuotationById(token, selected.id);
        setSelectedDetail(detail);
      }
      const html = buildAgreementHtml(detail);
      setViewHtml(html);
      setViewOpen(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to open agreement');
    } finally {
      setViewLoading(false);
    }
  };

  /* Accept agreement */
  const onAccept = async () => {
    if (!token || !selected?.id) return;
    try {
      setAcptLoading(true);
      await customerPortalService.acceptAgreement(token, selected.id);
      toast.success('Agreement successfully accepted and recorded!');
      setAcptOpen(false);
      await load();
      await onSelect(selected.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to accept agreement');
    } finally {
      setAcptLoading(false);
    }
  };

  /* Request correction */
  const onCorrect = async () => {
    if (!token || !selected?.id) return;
    if (!corrReason.trim()) {
      toast.error('Please describe what needs correction');
      return;
    }
    try {
      setCorrLoading(true);
      await customerPortalService.rejectAgreement(token, selected.id, corrReason.trim());
      toast.success('Correction request submitted to admin');
      setCorrOpen(false);
      setCorrReason('');
      await load();
      await onSelect(selected.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to submit correction request');
    } finally {
      setCorrLoading(false);
    }
  };

  /* Download agreement */
  const onDownload = async () => {
    if (!token || !selected?.id) return;
    try {
      let detail = selectedDetail;
      if (!detail || detail.id !== selected.id) {
        detail = await customerPortalService.myQuotationById(token, selected.id);
        setSelectedDetail(detail);
      }
      const html = buildAgreementHtml(detail);
      const printWin = window.open('', '_blank');
      if (!printWin) {
        toast.error('Pop-up blocked. Please allow pop-ups to print/download agreement.');
        return;
      }
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
      setTimeout(() => {
        try {
          printWin.focus();
          printWin.print();
        } catch {}
      }, 500);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Download failed');
    }
  };

  /* Share agreement */
  const onShare = async () => {
    if (!token || !selected?.id) return;
    try {
      let detail = selectedDetail;
      if (!detail || detail.id !== selected.id) {
        detail = await customerPortalService.myQuotationById(token, selected.id);
        setSelectedDetail(detail);
      }
      const html = buildAgreementHtml(detail);
      const blob = new Blob([html], { type: 'text/html' });
      const file = new File([blob], `${selected.quotationNumber}-agreement.html`, {
        type: 'text/html',
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${selected.quotationNumber} Agreement`, files: [file] });
        return;
      }
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Share failed');
    }
  };

  const step = parseStep(selected?.agreementStatus);
  const meta = STEP_META[step];
  const canDl = step === 'accepted' || step === 'initiated' || step === 'rejected';

  /* Item & billing details */
  const activeDetail = selectedDetail?.id === selected?.id ? selectedDetail : selected;
  const billing = activeDetail ? computeBilling(activeDetail) : null;
  const items = activeDetail ? splitItems(activeDetail.items ?? []) : { regular: [], foodItems: [], serviceItems: [], perPerson: null, isPP: false };
  const grouped = useMemo(() => groupItems(items.regular), [items.regular]);

  /* Thankam Delivery Milestone Stepper */
  const TL = [
    { label: 'Finalized', sub: 'Admin Approved', done: true, active: false },
    { label: 'Sent to You', sub: 'Ready for Review', done: step !== 'not_initiated', active: false },
    {
      label: 'Under Review',
      sub: step === 'rejected' ? 'Changes Sent' : 'Awaiting Sign',
      done: step === 'accepted' || step === 'rejected',
      active: step === 'initiated',
    },
    {
      label: step === 'rejected' ? 'Revision Needed' : 'Confirmed & Signed',
      sub: step === 'accepted' ? 'Booking Locked' : step === 'rejected' ? 'Re-issuing' : 'Final Step',
      done: step === 'accepted',
      active: false,
    },
  ];

  /* WhatsApp Link */
  const whatsappUrl = selected
    ? `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
        `Hi Thankam Events, I am inquiring about my catering agreement for ${selected.quotationNumber} (${selected.eventType}) on ${selected.eventDate}.`,
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
              aria-label="Back to food menu"
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-[#B8860B] border border-amber-200/60 shadow-2xs">
                <Crown size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                  Thankam Events
                </p>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  My Agreements
                </h1>
              </div>
            </div>
          </div>

          {/* Center Tabs Switcher: Quotations vs Agreements */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <button
              type="button"
              onClick={() => navigate('/customer/track')}
              className="flex items-center gap-1.5 rounded-lg px-3 sm:px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all"
            >
              <FileText size={13} />
              <span>Quotations ({rows.length})</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 sm:px-4 py-1.5 text-xs font-bold text-slate-900 shadow-2xs border border-slate-200/60 transition-all"
            >
              <FileCheck2 size={13} className="text-emerald-600" />
              <span>Agreements ({finalized.length})</span>
            </button>
          </div>

          {/* Right Action: New Request */}
          <button
            type="button"
            onClick={() => navigate('/customer/portal')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-all shadow-2xs"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">New Request</span>
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
        ) : finalized.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center">
            <div className="mx-auto max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-[#B8860B] border border-amber-200/60">
                <FileCheck2 size={26} />
              </div>
              <h2 className="text-base font-bold text-slate-900">No Finalized Agreements Yet</h2>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Once Thankam Events finalizes your requested quotation, your official catering agreement with menu items and service schedule will appear here to sign.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/customer/track')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <FileText size={13} />
                  <span>View Quotations</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/customer/portal')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-2xs"
                >
                  <Plus size={13} />
                  <span>Browse Menu</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── 1. Agreement Switcher (Thankam Horizontal Order Cards) ── */}
            {finalized.length > 1 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-xs font-bold text-slate-700">Your Agreements</span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {finalized.length} contracts
                  </span>
                </div>

                <div
                  className="flex items-stretch gap-2.5 overflow-x-auto pb-1.5 pt-0.5"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {finalized.map((row) => {
                    const s = parseStep(row.agreementStatus);
                    const m = STEP_META[s];
                    const isSelected = selected?.id === row.id;

                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => void onSelect(row.id)}
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
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${m.bg} ${m.border} ${m.text}`}
                          >
                            <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${m.dot} align-middle`} />
                            {m.shortLabel}
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

            {/* ── 2. Active Agreement Overview Card ── */}
            {selected && (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                  {/* Top Bar */}
                  <div className="border-b border-slate-100 bg-[#FAF9F6] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          CATERING AGREEMENT
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.border} ${meta.bg} ${meta.text}`}
                        >
                          <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${meta.dot} align-middle`} />
                          {meta.label}
                        </span>
                      </div>
                      <h2 className="mt-1 text-2xl font-black font-mono tracking-tight text-slate-900">
                        {selected.quotationNumber}
                      </h2>
                    </div>

                    {/* Toolbar: PDF & Share */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void onDownload()}
                        disabled={!canDl}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-40 shadow-2xs"
                        title="Print or Save Agreement PDF"
                      >
                        <Download size={13} className="text-[#B8860B]" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void onShare()}
                        disabled={!canDl}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-40 shadow-2xs"
                        title="Share Agreement Document"
                      >
                        <Share2 size={13} className="text-[#B8860B]" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>

                  {/* 4-Tile Event Specifications (NO Truncation) */}
                  <div className="grid grid-cols-2 divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
                    {[
                      { icon: PartyPopper, label: 'Event Type', val: selected.eventType || 'Banquet' },
                      {
                        icon: CalendarDays,
                        label: 'Event Date',
                        val: selected.eventDate
                          ? new Date(selected.eventDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'TBD',
                      },
                      { icon: MapPin, label: 'Venue Location', val: selected.venue || 'Venue TBD' },
                      { icon: Users, label: 'Guest Count', val: `${selected.guestCount || 100} Guests` },
                    ].map((it, idx) => (
                      <div key={idx} className="p-4 sm:p-5">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <it.icon size={13} className="text-[#B8860B]" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {it.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs sm:text-sm font-bold text-slate-800 break-words leading-snug">
                          {it.val}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Agreed Total Strip (Thankam Receipt Style) */}
                  {selected.grandTotal && Number(selected.grandTotal) > 0 && (
                    <div className="flex items-center justify-between bg-emerald-50/70 px-4 sm:px-5 py-3 border-t border-emerald-100">
                      <span className="text-xs font-bold text-emerald-950">
                        Agreed Total (5% GST incl.)
                      </span>
                      <span className="text-lg font-black font-mono text-emerald-800">
                        {formatInr(selected.grandTotal)}
                      </span>
                    </div>
                  )}
                </div>

                {/* ── 3. ACTION REQUIRED HERO BANNER (When Initiated & Ready to Sign) ── */}
                {step === 'initiated' && (
                  <div className="rounded-2xl border-2 border-emerald-500 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                            Action Required • Official Agreement Ready
                          </span>
                        </div>
                        <h3 className="mt-1 text-base sm:text-lg font-bold text-slate-900">
                          Your Catering Agreement is Ready to Sign
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-600">
                          Review your event arrangements and officially sign below to lock your booking.
                        </p>
                      </div>

                      {selected.grandTotal && Number(selected.grandTotal) > 0 && (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-right shrink-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            Total Payable
                          </p>
                          <p className="text-xl font-black font-mono text-emerald-900">
                            {formatInr(selected.grandTotal)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setAcptOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-800 transition-all shadow-sm active:scale-[0.98]"
                      >
                        <CheckCircle2 size={15} />
                        <span>Sign Agreement</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void onView()}
                        disabled={viewLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs"
                      >
                        {viewLoading ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                        ) : (
                          <FileCheck2 size={15} className="text-[#B8860B]" />
                        )}
                        <span>Review Document</span>
                      </button>

                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/70 px-4 py-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all shadow-2xs"
                      >
                        <MessageSquare size={14} />
                        <span>Discuss Changes via WhatsApp</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* ── 4. Thankam Delivery Milestone Stepper ── */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Agreement Status Pipeline
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      Step {step === 'accepted' ? 4 : step === 'rejected' ? 3 : step === 'initiated' ? 3 : 2} of 4
                    </span>
                  </div>

                  <div className="flex items-start">
                    {TL.map((s, i, arr) => (
                      <div key={i} className="flex flex-1 flex-col items-center">
                        <div className="flex w-full items-center">
                          {i > 0 && (
                            <div
                              className={`h-1 flex-1 transition-colors ${
                                arr[i - 1].done ? 'bg-emerald-600' : 'bg-slate-200'
                              }`}
                            />
                          )}
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                              s.done
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                : s.active
                                  ? 'bg-white text-emerald-700 border-emerald-600 ring-4 ring-emerald-100 animate-pulse'
                                  : 'bg-white text-slate-300 border-slate-200'
                            }`}
                          >
                            {s.done ? (
                              <Check size={14} className="stroke-[3]" />
                            ) : (
                              <span className="text-xs font-bold">{i + 1}</span>
                            )}
                          </div>
                          {i < arr.length - 1 && (
                            <div
                              className={`h-1 flex-1 transition-colors ${
                                s.done ? 'bg-emerald-600' : 'bg-slate-200'
                              }`}
                            />
                          )}
                        </div>

                        <p
                          className={`mt-2 text-center text-xs font-bold leading-tight ${
                            s.done || s.active ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {s.label}
                        </p>
                        <p className="text-[10px] text-slate-400 text-center">{s.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── 5. Contextual Status Banners ── */}
                {step === 'not_initiated' && (
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
                    <Clock size={20} className="mt-0.5 shrink-0 text-[#B8860B]" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Drafting Agreement</h4>
                      <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                        Our administrative office is assembling your contract document. You will receive an instant notification here once it is ready for your digital signature.
                      </p>
                    </div>
                  </div>
                )}

                {step === 'rejected' && selected.agreementRejectReason && (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/70 p-4 sm:p-5 shadow-xs">
                    <MessageSquare size={18} className="mt-0.5 shrink-0 text-amber-700" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-900">Changes Requested</h4>
                      <p className="mt-1 rounded-xl bg-white border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed">
                        &ldquo;{selected.agreementRejectReason}&rdquo;
                      </p>
                      <p className="mt-1.5 text-xs text-amber-700">
                        Our team is modifying your agreement document based on your feedback. We will issue a revised version shortly.
                      </p>
                    </div>
                  </div>
                )}

                {step === 'accepted' && (
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 sm:p-5 shadow-xs">
                    <CheckCircle2 size={24} className="mt-0.5 shrink-0 text-emerald-700" />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-emerald-950">
                          Agreement Signed &amp; Confirmed ✓
                        </h4>
                        <button
                          type="button"
                          onClick={() => void onView()}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-all shadow-2xs"
                        >
                          <FileCheck2 size={13} />
                          <span>View Signed Copy</span>
                        </button>
                      </div>
                      {selected.agreementAcceptedAt && (
                        <p className="mt-0.5 text-xs text-emerald-800">
                          Accepted on{' '}
                          {new Date(selected.agreementAcceptedAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
                        Your event dates and catering fleet are reserved. You can view, download, or print your permanent agreement anytime.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── 6. BOOKED FOOD MENU (Itemized Receipt List) ── */}
                {items.regular.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <UtensilsCrossed size={15} className="text-slate-700" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Booked Food Menu
                        </h3>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {items.regular.length} Items Included
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {grouped.map(({ cat, items: catItems }) => (
                        <div key={cat} className="py-2.5 first:pt-0 last:pb-0">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                            {cat} ({catItems.length})
                          </p>

                          <div className="space-y-2">
                            {catItems.map((item: any) => {
                              const isVeg = isVegDish(item.name || item.item?.name, cat);
                              const up = Number(item.unitPrice ?? 0);
                              const qty = Number(item.quantity ?? 1);
                              const amt = Number(item.amount ?? 0) || Number((qty * up).toFixed(2));

                              return (
                                <div
                                  key={item.id ?? item.name}
                                  className="flex items-center justify-between gap-3 text-xs py-1"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <VegNonVegIcon isVeg={isVeg} size={14} />
                                    <span className="font-medium text-slate-900 break-words">
                                      {item.item?.name || item.name}
                                    </span>
                                  </div>

                                  {!items.isPP && amt > 0 ? (
                                    <div className="text-right shrink-0 font-mono">
                                      <span className="font-bold text-slate-900">{formatInr(amt)}</span>
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

                {/* ── 7. DECOR, PRODUCTION & EVENT RENTALS (If Booked) ── */}
                {items.serviceItems.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-[#D4AF37]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Decor, Production &amp; Event Rentals
                        </h3>
                      </div>
                      <span className="rounded-full bg-amber-50 text-[#B8860B] border border-amber-200 px-2.5 py-0.5 text-xs font-bold">
                        {items.serviceItems.length} Services Booked
                      </span>
                    </div>

                    <div className="space-y-3">
                      {Object.entries(
                        items.serviceItems.reduce((acc: Record<string, { icon: string; badgeClass: string; items: any[] }>, svc: any) => {
                          const meta = getServiceDepartmentGroup(svc.name || svc.item?.name, svc.category);
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
                              const parsed = formatServiceLineTitle(svc.name || svc.item?.name || '');
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
                                  <span className="font-bold font-mono text-slate-900 shrink-0">
                                    {amt > 0 ? formatInr(amt) : '—'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── 8. AGREED BILL DETAILS (Thankam Receipt Card) ── */}
                {billing && billing.grand > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2.5">
                      Agreed Bill Details
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
                              {(r as any).prefix || ''}
                              {formatInr(Math.abs(r.val))}
                            </span>
                          </div>
                        ))}

                      <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between text-sm font-bold text-slate-900">
                        <span>Total Agreement Amount</span>
                        <span className="text-base font-black font-mono text-emerald-800">
                          {formatInr(billing.grand)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── 9. Legal Agreement Document Preview Card ── */}
                {step !== 'initiated' && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Legal Agreement Document</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Access the complete contractual document with legal clauses, menus, and signature verification.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onView()}
                      disabled={viewLoading || step === 'not_initiated'}
                      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all shadow-xs ${
                        step === 'not_initiated'
                          ? 'cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200'
                          : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs'
                      }`}
                    >
                      {viewLoading ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <FileCheck2 size={15} />
                      )}
                      <span>{viewLoading ? 'Generating…' : 'Review Full Agreement'}</span>
                    </button>
                  </div>
                )}

                {/* ── 10. Reassurance & Concierge Strip ── */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-[#B8860B] border border-amber-200/60">
                      <Phone size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Need Custom Adjustments or Tasting Session?
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Our banquet coordinators in Kollam are on call to fine-tune your menu, spice levels, or guest counts.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/70 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                    >
                      <MessageSquare size={13} />
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href="tel:+919207606150"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <Phone size={13} />
                      <span>Call Concierge</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ═════════════════════════════════════════════════════════
          FULL-SCREEN INLINE AGREEMENT VIEWER MODAL
      ══════════════════════════════════════════════════════════ */}
      {viewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-fade-in">
          {/* Viewer Toolbar */}
          <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                <X size={16} />
              </button>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  AGREEMENT PREVIEW
                </p>
                <p className="text-sm font-bold font-mono text-slate-900">
                  {selected?.quotationNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => iframeRef.current?.contentWindow?.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
              >
                <Download size={13} className="text-[#B8860B]" />
                <span className="hidden sm:inline">Print / Save</span>
              </button>
              <button
                type="button"
                onClick={() => setViewOpen(false)}
                className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-black transition-all"
              >
                Close
              </button>
            </div>
          </header>

          {/* Iframe View */}
          <iframe
            ref={iframeRef}
            srcDoc={viewHtml}
            title="Agreement Document Preview"
            className="h-full w-full flex-1 border-0 bg-slate-50"
          />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          ACCEPT AGREEMENT CONFIRMATION MODAL
      ══════════════════════════════════════════════════════════ */}
      {acptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Accept Agreement</h3>
                  <p className="text-xs font-mono text-slate-400">{selected?.quotationNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAcptOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              By confirming, you accept the catering terms, menu, and event schedule for quotation{' '}
              <strong className="text-slate-900 font-mono">{selected?.quotationNumber}</strong>.
            </p>

            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Check size={14} className="stroke-[3]" /> Booking Confirmation
              </p>
              <p className="text-[11px] text-emerald-700 leading-normal">
                Thankam Events will reserve the date, kitchen team, and event arrangements for your celebration.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAcptOpen(false)}
                className="rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onAccept()}
                disabled={acptLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-800 transition-all disabled:opacity-50"
              >
                {acptLoading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                <span>{acptLoading ? 'Signing…' : 'Sign & Confirm'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          REQUEST CORRECTION MODAL
      ══════════════════════════════════════════════════════════ */}
      {corrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-800">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Request Agreement Revision</h3>
                  <p className="text-xs font-mono text-slate-400">{selected?.quotationNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCorrOpen(false);
                  setCorrReason('');
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mb-3 text-xs text-slate-600 leading-relaxed">
              Please specify what terms, timings, or items in the agreement need adjustment. Admin will revise and re-issue the contract.
            </p>

            <Textarea
              rows={4}
              value={corrReason}
              onChange={(e) => setCorrReason(e.target.value)}
              placeholder="Describe requested changes to schedule, guest count, menu items, or payment milestones…"
              className="text-sm rounded-xl border-[1.5px] border-slate-200 bg-[#FAF9F6] focus:border-[#B8860B] focus:bg-white focus:ring-2 focus:ring-[#B8860B]/20"
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCorrOpen(false);
                  setCorrReason('');
                }}
                className="rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onCorrect()}
                disabled={corrLoading || !corrReason.trim()}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-black transition-all disabled:opacity-50"
              >
                {corrLoading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                <span>{corrLoading ? 'Submitting…' : 'Submit Request'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fixed Bottom Navigation (Matches Portal & Track) ── */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
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
            className="flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            onClick={() => navigate('/customer/track')}
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
              window.location.href = 'tel:+919207606150';
            }}
          >
            <Phone size={18} />
            <span>Call</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-[#B8860B] transition-colors"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <FileCheck2 size={18} />
            <span>Agreement</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

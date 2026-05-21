import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileText,
  Home,
  IndianRupee,
  MapPin,
  MessageSquare,
  Phone,
  RotateCcw,
  Send,
  Share2,
  ShoppingCart,
  Sparkles,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { customerPortalService } from '@/features/customer-portal/customer-portal.service';
import { createWorkflowSocket } from '@/features/quotations/workflow-socket';
import { formatInr } from '@/utils/currency';
import { generateAgreementHtml } from '@/utils/agreement-pdf';
import { toMediaUrl } from '@/utils/media-url';

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
  grandTotal?: string;
  status?: string | null;
  agreementStatus?: string | null;
  agreementRejectReason?: string | null;
  agreementAcceptedAt?: string | null;
  createdAt: string;
};

type AgStep = 'not_initiated' | 'initiated' | 'rejected' | 'accepted';

function parseStep(s?: string | null): AgStep {
  switch ((s ?? '').toUpperCase()) {
    case 'INITIATED': return 'initiated';
    case 'REJECTED':  return 'rejected';
    case 'ACCEPTED':  return 'accepted';
    default:          return 'not_initiated';
  }
}

const STEP_META: Record<AgStep, {
  label: string; shortLabel: string;
  border: string; bg: string; text: string; dot: string;
}> = {
  not_initiated: {
    label: 'Awaiting Admin',   shortLabel: 'Pending',
    border: 'border-slate-200', bg: 'bg-slate-50',  text: 'text-slate-500',    dot: 'bg-slate-300',
  },
  initiated: {
    label: 'Pending Your Review', shortLabel: 'Review Now',
    border: 'border-blue-200',  bg: 'bg-blue-50',   text: 'text-blue-700',     dot: 'bg-blue-500 animate-pulse',
  },
  rejected: {
    label: 'Correction Requested', shortLabel: 'Correction Sent',
    border: 'border-amber-200', bg: 'bg-amber-50',  text: 'text-amber-700',    dot: 'bg-amber-500',
  },
  accepted: {
    label: 'Agreement Accepted', shortLabel: 'Accepted',
    border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500',
  },
};

export function CustomerAgreementPage() {
  const navigate = useNavigate();
  const token    = localStorage.getItem(TOKEN_KEY);

  const [rows,          setRows]          = useState<Quotation[]>([]);
  const [selected,      setSelected]      = useState<Quotation | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [cartCount,     setCartCount]     = useState(0);
  const [company,       setCompany]       = useState<any>(null);

  /* viewer */
  const [viewOpen,      setViewOpen]      = useState(false);
  const [viewHtml,      setViewHtml]      = useState('');
  const [viewLoading,   setViewLoading]   = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  /* correction */
  const [corrOpen,    setCorrOpen]    = useState(false);
  const [corrReason,  setCorrReason]  = useState('');
  const [corrLoading, setCorrLoading] = useState(false);

  /* accept */
  const [acptOpen,    setAcptOpen]    = useState(false);
  const [acptLoading, setAcptLoading] = useState(false);

  const finalized = useMemo(
    () => rows.filter(r => r.status?.toUpperCase() === 'FINALIZED'),
    [rows],
  );

  /* ── data ── */
  const load = async () => {
    if (!token) { navigate('/customer/login'); return; }
    try {
      setLoading(true);
      const data = await customerPortalService.myQuotations(token);
      setRows(data);
      if (selected) {
        const refreshed = data.find((r: Quotation) => r.id === selected.id);
        if (refreshed) setSelected(refreshed);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      navigate('/customer/login');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    void load();
    void customerPortalService.websiteContent()
      .then(res => setCompany(res.company))
      .catch(() => null);
  }, []);

  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem(CART_KEY);
        const p   = raw ? JSON.parse(raw) as Record<string, number> : {};
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
    const onEvent = () => { void load(); };
    socket.on('workflow:quotation.status',    onEvent);
    socket.on('workflow:agreement.initiated', onEvent);
    socket.on('workflow:request.status',      onEvent);
    return () => { socket.disconnect(); };
  }, [token]);

  /* ── select ── */
  const onSelect = async (id: string) => {
    if (!token) return;
    try {
      const data = await customerPortalService.myQuotationById(token, id);
      setSelected(data);
      setSelectedDetail(data);
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Unable to load details'); }
  };

  /* ── build agreement HTML from client-side data ── */
  const buildAgreementHtml = (detail: any) => {
    const ppLine = (detail.items ?? []).find((i: any) => {
      const unit = String(i?.unit ?? '').toLowerCase();
      return unit === 'person' || String(i?.name ?? '').toLowerCase() === 'per person quote';
    });
    const isPP = Boolean(ppLine && Number(ppLine?.unitPrice || 0) > 0);
    const regularItems = (detail.items ?? []).filter((i: any) => {
      const unit = String(i?.unit ?? '').toLowerCase();
      return unit !== 'person' && String(i?.name ?? '').toLowerCase() !== 'per person quote';
    });

    return generateAgreementHtml({
      quotationNumber: detail.quotationNumber,
      createdAt: detail.createdAt,
      eventDate: detail.eventDate,
      eventType: detail.eventType,
      venue: detail.venue,
      guestCount: detail.guestCount,
      customerName: detail.customerName,
      customerPhone: detail.customerPhone,
      customerAddress: detail.customerAddress,
      items: regularItems.map((l: any) => ({
        name: l.name,
        category: l.item?.category?.name ?? '',
        quantity: Number(l.quantity),
        unit: l.unit,
        unitPrice: !isPP ? Number(l.unitPrice ?? 0) || null : null,
        amount: !isPP ? Number(l.amount ?? 0) || null : null,
      })),
      isPerPerson: isPP,
      perPersonRate: isPP ? Number(ppLine?.unitPrice) : undefined,
      subTotal: Number(detail.subTotal ?? 0) || undefined,
      discountAmount: Number(detail.discountAmount ?? 0) || undefined,
      extraChargesAmount: Number(detail.extraChargesAmount ?? 0) || undefined,
      gstPercent: Number(detail.gstPercent ?? 0) || undefined,
      gstAmount: Number(detail.gstAmount ?? 0) || undefined,
      grandTotal: Number(detail.grandTotal ?? 0) || undefined,
      agreementStatus: detail.agreementStatus,
      agreementAcceptedAt: detail.agreementAcceptedAt,
      terms: detail.terms,
      notes: detail.notes,
      companyName: company?.name ?? 'Thankam Events',
      companyTagline: company?.tagline,
      companyLogoUrl: company?.logoUrl ? toMediaUrl(company.logoUrl) : undefined,
      companyPhone: '+91 9745684766',
      companyEmail: 'info@thankamevents.in',
      companyAddress: 'Uliyacovil, Kollam, Kerala',
    });
  };

  /* ── view (inline) ── */
  const onView = async () => {
    if (!token || !selected?.id) return;
    if (parseStep(selected.agreementStatus) === 'not_initiated') {
      toast.info('Agreement will be available once admin initiates it.');
      return;
    }
    try {
      setViewLoading(true);
      // Ensure we have full detail
      let detail = selectedDetail;
      if (!detail || detail.id !== selected.id) {
        detail = await customerPortalService.myQuotationById(token, selected.id);
        setSelectedDetail(detail);
      }
      setViewHtml(buildAgreementHtml(detail));
      setViewOpen(true);
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Unable to load agreement'); }
    finally { setViewLoading(false); }
  };

  /* ── accept ── */
  const onAccept = async () => {
    if (!token || !selected?.id) return;
    try {
      setAcptLoading(true);
      await customerPortalService.acceptAgreement(token, selected.id);
      toast.success('Agreement accepted!');
      setAcptOpen(false);
      setViewOpen(false);
      await load();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to accept'); }
    finally { setAcptLoading(false); }
  };

  /* ── correction ── */
  const onCorrection = async () => {
    if (!token || !selected?.id) return;
    if (!corrReason.trim()) { toast.error('Please describe the correction needed'); return; }
    try {
      setCorrLoading(true);
      await customerPortalService.rejectAgreement(token, selected.id, corrReason.trim());
      toast.success('Correction request sent to admin');
      setCorrOpen(false);
      setCorrReason('');
      setViewOpen(false);
      await load();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to send correction'); }
    finally { setCorrLoading(false); }
  };

  /* ── download (print dialog → save as PDF) ── */
  const onDownload = async () => {
    if (!token || !selected?.id) return;
    try {
      let detail = selectedDetail;
      if (!detail || detail.id !== selected.id) {
        detail = await customerPortalService.myQuotationById(token, selected.id);
        setSelectedDetail(detail);
      }
      const html = buildAgreementHtml(detail);
      const win = window.open('', '_blank', 'width=1000,height=750');
      if (!win) { toast.error('Allow pop-ups to download the agreement'); return; }
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Download failed'); }
  };

  /* ── share ── */
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
      const file = new File([blob], `${selected.quotationNumber}-agreement.html`, { type: 'text/html' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${selected.quotationNumber} Agreement`, files: [file] });
        return;
      }
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Share failed'); }
  };

  const step    = parseStep(selected?.agreementStatus);
  const meta    = STEP_META[step];
  const canAct  = step === 'initiated' || step === 'rejected';
  const canDl   = step === 'accepted';

  /* workflow timeline */
  const TL = [
    { icon: FileText,      label: 'Finalized',       done: true },
    { icon: Send,          label: 'Sent to You',      done: step !== 'not_initiated' },
    { icon: Clock,         label: 'Under Review',     done: step === 'initiated' || step === 'rejected' || step === 'accepted', active: step === 'initiated' },
    { icon: step === 'rejected' ? RotateCcw : CheckCircle2,
      label: step === 'rejected' ? 'Correction' : 'Accepted',
      done: step === 'accepted' || step === 'rejected', reject: step === 'rejected' },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF7] pb-20">

      {/* ── Header ── */}
      <div className="bg-[#0F1B3C] px-4 py-4 text-white shadow-xl md:px-6">
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
              <h1 className="text-lg font-black leading-tight text-white">My Agreements</h1>
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

      {/* ── Main layout ── */}
      <div className="mx-auto max-w-5xl p-4 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">

          {/* ── LEFT: Quotation list ── */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Finalized Quotations</p>

            {loading ? (
              <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-[76px] animate-pulse rounded-2xl bg-slate-200" />)}</div>
            ) : finalized.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <FileCheck2 size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No finalized quotations</p>
                <p className="mt-1 text-xs text-slate-400">Agreement becomes available once admin finalizes your quotation.</p>
              </div>
            ) : (
              finalized.map(row => {
                const s = parseStep(row.agreementStatus);
                const m = STEP_META[s];
                return (
                  <button
                    key={row.id}
                    onClick={() => void onSelect(row.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all hover:shadow-md ${
                      selected?.id === row.id
                        ? 'border-[#0F1B3C] bg-[#0F1B3C] shadow-lg'
                        : 'border-[#EDE8DF] bg-white hover:border-[#D4A017]/40'
                    }`}
                  >
                    {/* Row 1: Number + status */}
                    <div className="mb-2.5 flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-black ${selected?.id === row.id ? 'text-white' : 'text-[#0F1B3C]'}`}>
                          {row.quotationNumber}
                        </p>
                        <p className={`text-xs font-medium ${selected?.id === row.id ? 'text-white/55' : 'text-slate-400'}`}>
                          {row.customerName}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${selected?.id === row.id ? `${m.border} bg-white/15 text-white` : `${m.border} ${m.bg} ${m.text}`}`}>
                        <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${m.dot} align-middle`} />
                        {m.shortLabel}
                      </span>
                    </div>
                    {/* Row 2: Event details */}
                    <div className="grid grid-cols-2 gap-y-1 gap-x-2 mb-2">
                      <span className={`flex items-center gap-1.5 text-xs ${selected?.id === row.id ? 'text-white/65' : 'text-slate-500'}`}>
                        <Sparkles size={10} className="shrink-0" />{row.eventType}
                      </span>
                      <span className={`flex items-center gap-1.5 text-xs ${selected?.id === row.id ? 'text-white/65' : 'text-slate-500'}`}>
                        <CalendarDays size={10} className="shrink-0" />{new Date(row.eventDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                      </span>
                      <span className={`flex items-center gap-1.5 text-xs ${selected?.id === row.id ? 'text-white/65' : 'text-slate-500'}`}>
                        <MapPin size={10} className="shrink-0" />{row.venue}
                      </span>
                      <span className={`flex items-center gap-1.5 text-xs ${selected?.id === row.id ? 'text-white/65' : 'text-slate-500'}`}>
                        <Users size={10} className="shrink-0" />{row.guestCount} guests
                      </span>
                    </div>
                    {/* Row 3: Grand total */}
                    {row.grandTotal && Number(row.grandTotal) > 0 && (
                      <div className={`flex items-center justify-between rounded-xl px-3 py-1.5 ${selected?.id === row.id ? 'bg-white/10' : 'bg-[#FDF3D0]'}`}>
                        <span className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${selected?.id === row.id ? 'text-white/50' : 'text-[#B8860B]'}`}>
                          <IndianRupee size={9} />Total
                        </span>
                        <span className={`text-sm font-black ${selected?.id === row.id ? 'text-amber-300' : 'text-[#0F1B3C]'}`}>
                          {formatInr(row.grandTotal)}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* ── RIGHT: Detail panel ── */}
          {!selected ? (
            <div className="hidden items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white lg:flex">
              <div className="p-8 text-center">
                <FileCheck2 size={40} className="mx-auto mb-3 text-slate-300" />
                <p className="font-semibold text-slate-600">Select a quotation</p>
                <p className="mt-1 text-sm text-slate-400">Click a finalized quotation to manage its agreement.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">

              {/* ─ Quotation summary ─ */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quotation</p>
                    <p className="text-base font-black text-[#0F1B3C]">{selected.quotationNumber}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${meta.border} ${meta.bg} ${meta.text}`}>
                    <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${meta.dot} align-middle`} />
                    {meta.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
                  {[
                    { icon: Sparkles,     label: 'Event Type', val: selected.eventType },
                    { icon: CalendarDays, label: 'Event Date', val: new Date(selected.eventDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) },
                    { icon: MapPin,       label: 'Venue',      val: selected.venue },
                    { icon: Users,        label: 'Guests',     val: `${selected.guestCount}` },
                  ].map(it => (
                    <div key={it.label} className="px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{it.label}</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{it.val}</p>
                    </div>
                  ))}
                </div>
                {selected.grandTotal && Number(selected.grandTotal) > 0 ? (
                  <div className="flex items-center justify-between border-t border-slate-100 bg-[#0F1B3C]/3 px-5 py-2.5">
                    <p className="text-xs font-semibold text-slate-500">Grand Total</p>
                    <p className="text-base font-black text-[#0F1B3C]">{formatInr(selected.grandTotal)}</p>
                  </div>
                ) : null}
              </div>

              {/* ─ Workflow timeline ─ */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Agreement Progress</p>
                <div className="flex items-start">
                  {TL.map((s, i, arr) => (
                    <div key={i} className="flex flex-1 flex-col items-center">
                      <div className="flex w-full items-center">
                        {i > 0 && <div className={`h-0.5 flex-1 transition-colors ${arr[i-1].done ? 'bg-[#0F1B3C]' : 'bg-slate-200'}`} />}
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                          (s as any).reject
                            ? 'border-amber-400 bg-amber-50 text-amber-600'
                            : s.done
                              ? 'border-[#0F1B3C] bg-[#0F1B3C] text-white'
                              : (s as any).active
                                ? 'border-blue-400 bg-blue-50 text-blue-500'
                                : 'border-slate-200 bg-slate-50 text-slate-300'
                        }`}>
                          <s.icon size={15} />
                        </div>
                        {i < arr.length - 1 && <div className={`h-0.5 flex-1 transition-colors ${s.done ? 'bg-[#0F1B3C]' : 'bg-slate-200'}`} />}
                      </div>
                      <p className={`mt-2 text-center text-[10px] font-semibold leading-tight ${
                        (s as any).reject ? 'text-amber-600' : s.done || (s as any).active ? 'text-[#0F1B3C]' : 'text-slate-400'
                      }`}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─ Contextual banners ─ */}
              {step === 'not_initiated' && (
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <Clock size={18} className="mt-0.5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">Waiting for Admin</p>
                    <p className="mt-0.5 text-xs text-slate-500">Admin will review your quotation and send the agreement. You'll be notified.</p>
                  </div>
                </div>
              )}
              {step === 'initiated' && (
                <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="mt-0.5 h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                  <div>
                    <p className="text-sm font-bold text-blue-800">Action Required</p>
                    <p className="mt-0.5 text-xs text-blue-600">Admin has sent your agreement. Please review, then Accept or Request Correction.</p>
                  </div>
                </div>
              )}
              {step === 'rejected' && selected.agreementRejectReason && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <MessageSquare size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">Your correction request was sent</p>
                    <p className="mt-1 rounded-xl bg-amber-100 px-3 py-2 text-xs leading-relaxed text-amber-700">{selected.agreementRejectReason}</p>
                    <p className="mt-1.5 text-xs text-amber-600">Admin will revise and re-send. You can still view or accept the current version.</p>
                  </div>
                </div>
              )}
              {step === 'accepted' && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Agreement Accepted</p>
                    {selected.agreementAcceptedAt && (
                      <p className="mt-0.5 text-xs text-emerald-600">
                        Accepted on {new Date(selected.agreementAcceptedAt).toLocaleString('en-IN',{
                          day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit',
                        })}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-emerald-600">You can now download or share a copy of your agreement.</p>
                  </div>
                </div>
              )}

              {/* ─ Primary action: View Agreement ─ */}
              <button
                onClick={() => void onView()}
                disabled={viewLoading || step === 'not_initiated'}
                className={`flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-sm font-bold transition-all active:scale-[0.98] ${
                  step === 'not_initiated'
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                    : step === 'initiated'
                      ? 'bg-[#0F1B3C] text-white shadow-[0_8px_24px_rgba(15,27,60,0.3)] hover:bg-[#1a2d5a]'
                      : 'bg-[#0F1B3C] text-white hover:bg-[#1a2d5a]'
                }`}
              >
                {viewLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <FileCheck2 size={18} />
                )}
                {viewLoading ? 'Loading Agreement…' : 'View Agreement'}
                {step === 'initiated' && !viewLoading && (
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-[#0F1B3C]">Action Needed</span>
                )}
              </button>

              {/* ─ Secondary actions grid ─ */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAcptOpen(true)}
                  disabled={!canAct}
                  className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-all active:scale-[0.98] ${
                    canAct
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_4px_16px_rgba(5,150,105,0.3)]'
                      : 'cursor-not-allowed bg-slate-100 text-slate-400'
                  }`}
                >
                  <CheckCircle2 size={16} /> Accept
                </button>
                <button
                  onClick={() => setCorrOpen(true)}
                  disabled={!canAct}
                  className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3.5 text-sm font-bold transition-all active:scale-[0.98] ${
                    canAct
                      ? 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'cursor-not-allowed border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  <RotateCcw size={16} /> Request Correction
                </button>
                <button
                  onClick={() => void onDownload()}
                  disabled={!canDl}
                  className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3.5 text-sm font-bold transition-all active:scale-[0.98] ${
                    canDl
                      ? 'border-[#0F1B3C] bg-white text-[#0F1B3C] hover:bg-slate-50'
                      : 'cursor-not-allowed border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  <Download size={16} /> Download
                </button>
                <button
                  onClick={() => void onShare()}
                  disabled={!canDl}
                  className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3.5 text-sm font-bold transition-all active:scale-[0.98] ${
                    canDl
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'cursor-not-allowed border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  <Share2 size={16} /> Share
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ INLINE AGREEMENT VIEWER ══ */}
      {viewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          {/* Viewer toolbar */}
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-800 bg-[#0F1B3C] px-4 py-3 text-white">
            <button
              onClick={() => setViewOpen(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/8 text-white/70 hover:bg-white/15 hover:text-white"
            >
              <X size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Agreement</p>
              <p className="truncate text-sm font-black text-white">{selected?.quotationNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => iframeRef.current?.contentWindow?.print()}
                className="hidden h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 text-xs font-bold text-white/80 hover:bg-white/15 sm:inline-flex"
              >
                <Download size={12} /> Print / Save
              </button>
              {canAct && (
                <>
                  <button
                    onClick={() => { setViewOpen(false); setCorrOpen(true); }}
                    className="h-9 rounded-xl border border-amber-400/50 bg-amber-400/15 px-3 text-xs font-bold text-amber-300 hover:bg-amber-400/25"
                  >
                    Correction
                  </button>
                  <button
                    onClick={() => { setViewOpen(false); setAcptOpen(true); }}
                    className="h-9 rounded-xl bg-emerald-500 px-4 text-xs font-bold text-white hover:bg-emerald-600"
                  >
                    <CheckCircle2 size={12} className="mr-1.5 inline" /> Accept
                  </button>
                </>
              )}
              {canDl && (
                <button
                  onClick={() => void onDownload()}
                  className="h-9 rounded-xl bg-amber-400 px-4 text-xs font-bold text-[#0F1B3C] hover:bg-amber-300"
                >
                  <Download size={12} className="mr-1.5 inline" /> Download
                </button>
              )}
            </div>
          </div>
          {/* Agreement HTML */}
          <iframe
            ref={iframeRef}
            className="flex-1 w-full border-0"
            srcDoc={viewHtml}
            title={`Agreement — ${selected?.quotationNumber}`}
            sandbox="allow-same-origin allow-scripts allow-popups"
          />
          {/* Mobile action bar */}
          {canAct && (
            <div className="shrink-0 border-t border-slate-200 bg-white p-3 sm:hidden">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setViewOpen(false); setCorrOpen(true); }}
                  className="rounded-2xl border-2 border-amber-400 bg-amber-50 py-3 text-sm font-bold text-amber-700">
                  Correction
                </button>
                <button onClick={() => { setViewOpen(false); setAcptOpen(true); }}
                  className="rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white">
                  Accept
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ ACCEPT CONFIRM ══ */}
      {acptOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-emerald-600 px-6 py-5 text-center text-white">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-white/20">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-lg font-black">Accept Agreement?</h3>
              <p className="mt-1 text-sm text-white/75">{selected?.quotationNumber}</p>
            </div>
            <div className="p-6">
              <p className="text-center text-sm leading-relaxed text-slate-600">
                By accepting, you confirm you have read and agreed to all terms and conditions in the agreement.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button onClick={() => setAcptOpen(false)}
                  className="rounded-2xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={() => void onAccept()} disabled={acptLoading}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                  {acptLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <CheckCircle2 size={15} />}
                  {acptLoading ? 'Accepting…' : 'Yes, Accept'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ CORRECTION DIALOG ══ */}
      {corrOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-100 text-amber-600">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Request Correction</h3>
                  <p className="text-xs text-slate-400">{selected?.quotationNumber}</p>
                </div>
              </div>
              <button onClick={() => { setCorrOpen(false); setCorrReason(''); }} className="text-slate-400 hover:text-slate-600">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-500">Describe what needs to be corrected. Admin will revise and re-send the agreement.</p>
              <Textarea
                rows={4}
                value={corrReason}
                onChange={e => setCorrReason(e.target.value)}
                placeholder="e.g. Guest count is incorrect, venue name needs updating, add catering clause…"
              />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setCorrOpen(false); setCorrReason(''); }}
                  className="rounded-2xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={() => void onCorrection()} disabled={corrLoading || !corrReason.trim()}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-60">
                  {corrLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send size={14} />}
                  {corrLoading ? 'Sending…' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid h-16 w-full max-w-5xl grid-cols-5 px-2">
          <button className="flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800" onClick={() => navigate('/customer/portal')}>
            <Home size={16} /> Home
          </button>
          <button className="flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800" onClick={() => navigate('/customer/track')}>
            <FileText size={16} /> Quotation
          </button>
          <button className="relative mx-auto flex h-12 w-12 flex-col items-center justify-center rounded-2xl bg-[#0F1B3C] text-white shadow-lg" onClick={() => navigate('/customer/portal?cart=1')}>
            <ShoppingCart size={17} />
            {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-[#0F1B3C]">{cartCount}</span>}
          </button>
          <button className="flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800" onClick={() => { window.location.href = 'tel:+919745684766'; }}>
            <Phone size={16} /> Call
          </button>
          <button className="flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-amber-500" onClick={() => navigate('/customer/agreement')}>
            <FileCheck2 size={16} /> Agreement
          </button>
        </div>
      </div>
    </div>
  );
}

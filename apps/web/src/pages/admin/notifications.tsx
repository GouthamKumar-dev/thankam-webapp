import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Clock3,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  Inbox,
  MailPlus,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AdminNotificationItem,
  readAdminNotifications,
  writeAdminNotifications,
} from '@/features/notifications/admin-notifications';
import { playNotificationSound } from '@/features/notifications/notification-sound';
import { quotationsService } from '@/features/quotations/quotations.service';
import { useConfirmModal } from '@/hooks/use-confirm-modal';
import { PageShell } from '@/layouts/page-shell';
import { cn } from '@/utils/cn';
import { formatInr } from '@/utils/currency';

const NOTIFICATION_SOUND_MUTED_KEY = 'admin_notifications_sound_muted';

export function AdminNotificationsPage() {
  const { confirm, confirmModal } = useConfirmModal();
  const navigate = useNavigate();

  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<
    'ALL' | 'UNREAD' | 'AGREEMENT' | 'REQUEST' | 'RESPONSE'
  >('ALL');

  // Sound preference
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem(NOTIFICATION_SOUND_MUTED_KEY) === 'true';
  });

  const loadNotifications = async () => {
    const stored = readAdminNotifications();

    // If local storage has notifications, use them
    if (stored.length > 0) {
      setItems(stored);
      setLoading(false);
      return;
    }

    // Otherwise, generate initial workflow alerts from recent quotations so the page is never blank
    try {
      const res = await quotationsService.list(1, 15);
      const synth: AdminNotificationItem[] = [];

      for (const q of res.data) {
        if (q.agreementStatus === 'ACCEPTED') {
          synth.push({
            id: `seed-agree-${q.id}`,
            title: `Agreement Accepted: ${q.quotationNumber}`,
            subtitle: `${q.customerName} accepted and signed catering agreement for ${q.eventType || 'Event'} (Est. ${formatInr(Number(q.grandTotal))})`,
            quotationId: q.id,
            quotationNumber: q.quotationNumber,
            createdAt: q.createdAt || new Date().toISOString(),
            read: true,
          });
        } else if (q.requestStatus === 'NEW' || q.source === 'CUSTOMER_PORTAL') {
          synth.push({
            id: `seed-req-${q.id}`,
            title: `New Request: ${q.quotationNumber}`,
            subtitle: `${q.customerName} submitted an event request for ${q.eventType || 'Event'} at ${q.venue || 'Venue'} (${q.guestCount || 0} guests)`,
            quotationId: q.id,
            quotationNumber: q.quotationNumber,
            createdAt: q.createdAt || new Date().toISOString(),
            read: false,
          });
        } else if (q.status === 'FINALIZED') {
          synth.push({
            id: `seed-fin-${q.id}`,
            title: `Quotation Finalized: ${q.quotationNumber}`,
            subtitle: `Quotation for ${q.customerName} (${q.eventType || 'Event'}) is finalized and ready for review`,
            quotationId: q.id,
            quotationNumber: q.quotationNumber,
            createdAt: q.createdAt || new Date().toISOString(),
            read: true,
          });
        }
      }

      if (synth.length > 0) {
        setItems(synth);
        writeAdminNotifications(synth);
      } else {
        setItems([]);
      }
    } catch {
      setItems(stored);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();

    const sync = () => setItems(readAdminNotifications());
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem(NOTIFICATION_SOUND_MUTED_KEY, String(next));
    toast.info(next ? 'Sound alerts muted' : 'Sound alerts enabled');
  };

  const handleTestSound = () => {
    void playNotificationSound('admin');
    toast.success('Playing notification chime');
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = items.length;
    const unread = items.filter((i) => !i.read).length;
    const agreements = items.filter((i) =>
      i.title.toLowerCase().includes('agreement'),
    ).length;
    const requests = items.filter(
      (i) =>
        i.title.toLowerCase().includes('request') ||
        i.title.toLowerCase().includes('interested'),
    ).length;
    return { total, unread, agreements, requests };
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      const titleLower = item.title.toLowerCase();
      const subLower = item.subtitle.toLowerCase();

      // Filter category
      if (filterType === 'UNREAD' && item.read) return false;
      if (filterType === 'AGREEMENT' && !titleLower.includes('agreement')) return false;
      if (
        filterType === 'REQUEST' &&
        !titleLower.includes('request') &&
        !subLower.includes('request')
      )
        return false;
      if (
        filterType === 'RESPONSE' &&
        !titleLower.includes('response') &&
        !titleLower.includes('interested')
      )
        return false;

      // Search query
      if (!q) return true;
      const qNum = (item.quotationNumber ?? '').toLowerCase();
      return titleLower.includes(q) || subLower.includes(q) || qNum.includes(q);
    });
  }, [items, search, filterType]);

  const markAllRead = () => {
    const next = items.map((item) => ({ ...item, read: true }));
    setItems(next);
    writeAdminNotifications(next);
    toast.success('All notifications marked as read');
  };

  const toggleReadStatus = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = items.map((item) =>
      item.id === id ? { ...item, read: !item.read } : item,
    );
    setItems(next);
    writeAdminNotifications(next);
  };

  const removeOne = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    writeAdminNotifications(next);
    toast.success('Notification removed');
  };

  const clearAll = async () => {
    const accepted = await confirm({
      title: 'Clear Notifications',
      description: 'Are you sure you want to clear all notification history?',
      confirmLabel: 'Clear All',
      destructive: true,
    });
    if (!accepted) return;

    setItems([]);
    writeAdminNotifications([]);
    toast.success('All notifications cleared');
  };

  const handleNavigateToEvent = (item: AdminNotificationItem) => {
    toggleReadStatus(item.id);

    const t = item.title.toLowerCase();
    if (
      t.includes('request') ||
      t.includes('interested') ||
      t.includes('agreement') ||
      t.includes('customer response')
    ) {
      if (item.quotationNumber) {
        navigate(`/admin/customer-requests?search=${encodeURIComponent(item.quotationNumber)}`);
        return;
      }
      navigate('/admin/customer-requests');
      return;
    }

    if (item.quotationNumber) {
      navigate(`/admin/quotations?search=${encodeURIComponent(item.quotationNumber)}`);
      return;
    }

    navigate('/admin/quotations');
  };

  return (
    <PageShell
      title="Workflow Notifications & Activity Feed"
      subtitle="Live updates for customer quotation requests, digital agreements, and booking statuses."
    >
      {/* 1. Overview Metrics Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Alerts</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-[#B8860B]">
              <Bell size={14} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{metrics.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Workflow event history</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Unread Updates</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Sparkles size={14} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">{metrics.unread}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Pending admin review</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Agreements</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <ShieldCheck size={14} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{metrics.agreements}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Signed or reviewed</p>
        </div>

        <div className="rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#080C14] to-[#121927] p-4 text-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">Customer Inquiries</span>
            <MailPlus size={15} className="text-[#F3CA52]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#F3CA52]">{metrics.requests}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Portal submissions & leads</p>
        </div>
      </div>

      {/* 2. Search, Filter & Sound Preferences Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts by quote #, client, or event..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-xs outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Global Sound & Bulk Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Audio Chime Controls */}
          <button
            type="button"
            onClick={toggleMute}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all shadow-xs',
              isMuted
                ? 'border-slate-200 bg-slate-100 text-slate-500'
                : 'border-amber-200 bg-amber-50 text-[#B8860B] hover:bg-amber-100',
            )}
            title={isMuted ? 'Unmute sound alerts' : 'Mute sound alerts'}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>

          <button
            type="button"
            onClick={handleTestSound}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs"
            title="Test alert sound"
          >
            <BellRing size={13} className="text-[#B8860B]" />
            <span className="hidden sm:inline">Test Chime</span>
          </button>

          <Button
            variant="outline"
            className="h-9 rounded-xl px-3 text-xs"
            onClick={markAllRead}
            disabled={items.length === 0 || metrics.unread === 0}
          >
            <CheckCheck size={14} className="mr-1.5 text-emerald-600" />
            <span>Mark all read</span>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-xl px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            onClick={() => void clearAll()}
            disabled={items.length === 0}
          >
            <Trash2 size={14} className="mr-1.5" />
            <span>Clear</span>
          </Button>
        </div>
      </div>

      {/* 3. Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 no-scrollbar">
        <button
          type="button"
          onClick={() => setFilterType('ALL')}
          className={cn(
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
            filterType === 'ALL'
              ? 'bg-[#080C14] text-[#F3CA52] border border-[#D4AF37]/50 shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200',
          )}
        >
          All Alerts ({items.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('UNREAD')}
          className={cn(
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5',
            filterType === 'UNREAD'
              ? 'bg-[#080C14] text-[#F3CA52] border border-[#D4AF37]/50 shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200',
          )}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
          <span>Unread ({metrics.unread})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('AGREEMENT')}
          className={cn(
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
            filterType === 'AGREEMENT'
              ? 'bg-[#080C14] text-[#F3CA52] border border-[#D4AF37]/50 shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200',
          )}
        >
          Agreements ({metrics.agreements})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('REQUEST')}
          className={cn(
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
            filterType === 'REQUEST'
              ? 'bg-[#080C14] text-[#F3CA52] border border-[#D4AF37]/50 shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200',
          )}
        >
          Customer Requests ({metrics.requests})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('RESPONSE')}
          className={cn(
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
            filterType === 'RESPONSE'
              ? 'bg-[#080C14] text-[#F3CA52] border border-[#D4AF37]/50 shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200',
          )}
        >
          Responses & Interest
        </button>
      </div>

      {/* 4. Notification Items Feed */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-[#B8860B] mb-3">
            <Inbox size={28} />
          </div>
          <h3 className="text-base font-black text-slate-800">
            {search ? 'No matching alerts found' : 'All caught up!'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {search
              ? `No notifications matched "${search}". Check the quote number or keyword.`
              : 'You have no pending notifications. As clients submit requests or sign agreements, real-time alerts will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              onNavigate={() => handleNavigateToEvent(item)}
              onToggleRead={(e) => toggleReadStatus(item.id, e)}
              onRemove={(e) => removeOne(item.id, e)}
            />
          ))}
        </div>
      )}

      {confirmModal}
    </PageShell>
  );
}

/* ─────────────────────────────────────────────────────────────────
   NotificationCard — Luxury Obsidian & Kerala Gold Alert Component
───────────────────────────────────────────────────────────────── */
function NotificationCard({
  item,
  onNavigate,
  onToggleRead,
  onRemove,
}: {
  item: AdminNotificationItem;
  onNavigate: () => void;
  onToggleRead: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const isAgreement = item.title.toLowerCase().includes('agreement');
  const isRequest = item.title.toLowerCase().includes('request');
  const isInterest =
    item.title.toLowerCase().includes('interested') ||
    item.title.toLowerCase().includes('response');

  // Format time relative or date
  const timeFormatted = useMemo(() => {
    try {
      const date = new Date(item.createdAt);
      return date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return item.createdAt;
    }
  }, [item.createdAt]);

  return (
    <div
      onClick={onNavigate}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md select-none',
        !item.read
          ? 'border-[#D4AF37]/50 bg-gradient-to-r from-amber-50/60 to-white ring-1 ring-amber-200/50'
          : 'border-slate-200/90 bg-white hover:border-slate-300',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Icon & Title */}
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs',
              isAgreement
                ? 'bg-[#080C14] text-[#F3CA52] border-[#D4AF37]/40'
                : isRequest
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : isInterest
                    ? 'bg-amber-50 text-[#B8860B] border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200',
            )}
          >
            {isAgreement ? (
              <ShieldCheck size={18} />
            ) : isRequest ? (
              <MailPlus size={18} />
            ) : isInterest ? (
              <MessageSquare size={18} />
            ) : (
              <FileText size={18} />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4
                className={cn(
                  'text-sm font-bold leading-tight',
                  !item.read ? 'text-slate-900 font-black' : 'text-slate-800',
                )}
              >
                {item.title}
              </h4>

              {item.quotationNumber && (
                <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-full bg-[#080C14] text-[#F3CA52] border border-[#D4AF37]/40">
                  {item.quotationNumber}
                </span>
              )}

              {!item.read && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  New Update
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-600 leading-relaxed">{item.subtitle}</p>

            <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400 font-medium">
              <Clock size={12} className="text-slate-400" />
              <span>{timeFormatted}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            type="button"
            onClick={onToggleRead}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800 transition-colors shadow-2xs"
            title={item.read ? 'Mark as unread' : 'Mark as read'}
          >
            {item.read ? <Check size={13} /> : <CheckCheck size={13} className="text-emerald-600" />}
          </button>

          <button
            type="button"
            onClick={onRemove}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-2xs"
            title="Dismiss notification"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Footer link hint */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {isAgreement ? 'Digital Contract' : isRequest ? 'Customer Inquiry' : 'Event Update'}
        </span>

        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#B8860B] group-hover:text-[#080C14] transition-colors">
          <span>Open Details</span>
          <ExternalLink size={12} />
        </span>
      </div>
    </div>
  );
}

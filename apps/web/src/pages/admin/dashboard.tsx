import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Calendar as CalendarIcon,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FilePlus,
  FileText,
  Filter,
  IndianRupee,
  Layers,
  LayoutGrid,
  List,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  User,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/layouts/page-shell';
import { KpiGridSkeleton, CalendarSkeleton } from '@/components/common/skeleton';
import { dashboardService, DashboardStats } from '@/features/dashboard/dashboard.service';
import { quotationsService, QuotationRow } from '@/features/quotations/quotations.service';
import { formatInr } from '@/utils/currency';
import { cn } from '@/utils/cn';

/* ─── Types ──────────────────────────────────────────────────── */

type EventCalendarItem = {
  id: string;
  quotationNumber?: string;
  customerName: string;
  customerPhone?: string;
  eventDate: string; // YYYY-MM-DD
  eventType: string;
  venue?: string;
  guestCount: number;
  grandTotal: number;
  type: 'CONFIRMED' | 'QUOTED' | 'INQUIRY' | 'REMINDER';
  source?: 'ADMIN' | 'CUSTOMER_PORTAL';
  notes?: string;
};

type DateReminder = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  completed: boolean;
  createdAt: string;
};

const REMINDERS_STORAGE_KEY = 'thankam_admin_event_reminders';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ─── Helper: Format date to YYYY-MM-DD ───────────────────────── */
function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(str: string): Date {
  const parts = str.split('T')[0].split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date(str);
}

// ─── Main Admin Operations Dashboard Component ────────────────────

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [quotations, setQuotations] = useState<QuotationRow[]>([]);
  const [inquiries, setInquiries] = useState<QuotationRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Calendar & View State ── */
  const today = useMemo(() => new Date(), []);
  const [calYear, setCalYear] = useState<number>(today.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(today.getMonth()); // 0-11
  const [selectedDateKey, setSelectedDateKey] = useState<string>(toDateKey(today));
  const [calFilter, setCalFilter] = useState<'ALL' | 'CONFIRMED' | 'QUOTED' | 'INQUIRY' | 'REMINDERS'>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  /* ── Custom Reminders ── */
  const [reminders, setReminders] = useState<DateReminder[]>(() => {
    try {
      const saved = localStorage.getItem(REMINDERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newReminderText, setNewReminderText] = useState('');

  /* ── Revenue Graph Filters ── */
  const [graphYear, setGraphYear] = useState<number>(today.getFullYear());
  const [graphMonth, setGraphMonth] = useState<number | 'ALL'>('ALL'); // 'ALL' or 0-11
  const [graphMetric, setGraphMetric] = useState<'CONFIRMED' | 'ALL'>('CONFIRMED');
  const [hoveredPoint, setHoveredPoint] = useState<{ label: string; value: number; count: number } | null>(null);

  /* ── Load Data ── */
  const isFetchingRef = useRef(false);
  const loadData = async (showSkeleton = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (showSkeleton) setLoading(true);
    try {
      const [statsData, quotesRes, inqRes] = await Promise.allSettled([
        dashboardService.getStats(),
        quotationsService.list(1, 100),
        quotationsService.customerRequests(1, 100),
      ]);

      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (quotesRes.status === 'fulfilled') setQuotations(quotesRes.value.data ?? []);
      if (inqRes.status === 'fulfilled') setInquiries(inqRes.value.data ?? []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(true);

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleEvent = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void loadData(false);
      }, 300);
    };

    window.addEventListener('thankam:quotation-event', handleEvent);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('thankam:quotation-event', handleEvent);
    };
  }, []);

  /* Persist Reminders */
  useEffect(() => {
    try {
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
    } catch (err) {
      console.error('Failed to save reminders', err);
    }
  }, [reminders]);

  const addReminder = (customText?: string) => {
    const textToAdd = (customText ?? newReminderText).trim();
    if (!textToAdd) return;
    const item: DateReminder = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: selectedDateKey,
      title: textToAdd,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setReminders((prev) => [item, ...prev]);
    if (!customText) setNewReminderText('');
  };

  const toggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r)),
    );
  };

  const deleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  /* ── Unified Calendar Events Collection ── */
  const calendarEvents = useMemo(() => {
    const events: EventCalendarItem[] = [];
    const inquiryIdSet = new Set(inquiries.map((i) => i.id));

    // 1. Quotations
    for (const q of quotations) {
      if (!q.eventDate) continue;
      const dKey = toDateKey(parseDateKey(q.eventDate));
      const isConfirmed = q.agreementStatus === 'ACCEPTED';
      const isCustomerRequest =
        q.source === 'CUSTOMER_PORTAL' ||
        Boolean(q.requestStatus) ||
        inquiryIdSet.has(q.id);

      events.push({
        id: q.id,
        quotationNumber: q.quotationNumber,
        customerName: q.customerName || 'Client',
        customerPhone: q.customerPhone,
        eventDate: dKey,
        eventType: q.eventType || 'Catering Event',
        venue: q.venue,
        guestCount: Number(q.guestCount || 0),
        grandTotal: Number(q.grandTotal || 0),
        type: isConfirmed ? 'CONFIRMED' : isCustomerRequest ? 'INQUIRY' : 'QUOTED',
        source: isCustomerRequest ? 'CUSTOMER_PORTAL' : (q.source || 'ADMIN'),
      });
    }

    // 2. Incoming customer portal inquiries
    for (const inq of inquiries) {
      if (!inq.eventDate) continue;
      const dKey = toDateKey(parseDateKey(inq.eventDate));
      const existing = events.find((e) => e.id === inq.id);
      if (existing) {
        existing.source = 'CUSTOMER_PORTAL';
        if (existing.type !== 'CONFIRMED') {
          existing.type = 'INQUIRY';
        }
        continue;
      }
      const isConfirmed = inq.agreementStatus === 'ACCEPTED';
      events.push({
        id: inq.id,
        quotationNumber: inq.quotationNumber,
        customerName: inq.customerName || 'Inquiry Client',
        customerPhone: inq.customerPhone,
        eventDate: dKey,
        eventType: inq.eventType || 'Event Request',
        venue: inq.venue,
        guestCount: Number(inq.guestCount || 0),
        grandTotal: Number(inq.grandTotal || 0),
        type: isConfirmed ? 'CONFIRMED' : 'INQUIRY',
        source: 'CUSTOMER_PORTAL',
      });
    }

    // Sort chronologically
    events.sort((a, b) => a.eventDate.localeCompare(b.eventDate));

    return events;
  }, [quotations, inquiries]);

  // Group events by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventCalendarItem[]>();
    for (const evt of calendarEvents) {
      if (!map.has(evt.eventDate)) map.set(evt.eventDate, []);
      map.get(evt.eventDate)!.push(evt);
    }
    return map;
  }, [calendarEvents]);

  // Group reminders by YYYY-MM-DD
  const remindersByDate = useMemo(() => {
    const map = new Map<string, DateReminder[]>();
    for (const r of reminders) {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date)!.push(r);
    }
    return map;
  }, [reminders]);

  /* ── Calendar Navigation Handlers ── */
  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setCalYear(today.getFullYear());
    setCalMonth(today.getMonth());
    setSelectedDateKey(toDateKey(today));
  };

  /* ── Calendar Grid Days Generation ── */
  const monthDays = useMemo(() => {
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(calYear, calMonth, 0).getDate();

    const days: Array<{
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Preceding month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const m = calMonth === 0 ? 11 : calMonth - 1;
      const y = calMonth === 0 ? calYear - 1 : calYear;
      const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateKey,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateKey === toDateKey(today),
      });
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        dateKey,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateKey === toDateKey(today),
      });
    }

    // Trailing days of next month to complete rows (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const m = calMonth === 11 ? 0 : calMonth + 1;
      const y = calMonth === 11 ? calYear + 1 : calYear;
      const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        dateKey,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: dateKey === toDateKey(today),
      });
    }

    return days;
  }, [calYear, calMonth, today]);

  /* Filter items for a day */
  const getDayItems = (dateKey: string) => {
    const rawEvents = eventsByDate.get(dateKey) ?? [];
    const rawReminders = remindersByDate.get(dateKey) ?? [];

    let filteredEvents = rawEvents;
    if (calFilter === 'CONFIRMED') {
      filteredEvents = rawEvents.filter((e) => e.type === 'CONFIRMED');
    } else if (calFilter === 'QUOTED') {
      filteredEvents = rawEvents.filter((e) => e.source !== 'CUSTOMER_PORTAL' && e.type === 'QUOTED');
    } else if (calFilter === 'INQUIRY') {
      filteredEvents = rawEvents.filter((e) => e.source === 'CUSTOMER_PORTAL' || e.type === 'INQUIRY');
    } else if (calFilter === 'REMINDERS') {
      filteredEvents = [];
    }

    const showReminders = calFilter === 'ALL' || calFilter === 'REMINDERS';

    return {
      events: filteredEvents,
      reminders: showReminders ? rawReminders : [],
    };
  };

  /* Selected day events & reminders */
  const selectedDayItems = useMemo(() => {
    return getDayItems(selectedDateKey);
  }, [selectedDateKey, eventsByDate, remindersByDate, calFilter]);

  const selectedDateFormatted = useMemo(() => {
    const d = parseDateKey(selectedDateKey);
    return d.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDateKey]);

  /* Current Month Events (for list view and counters) */
  const currentMonthKey = useMemo(() => {
    return `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
  }, [calYear, calMonth]);

  const currentMonthEvents = useMemo(() => {
    let list = calendarEvents.filter((e) => e.eventDate.startsWith(currentMonthKey));
    if (calFilter === 'CONFIRMED') {
      list = list.filter((e) => e.type === 'CONFIRMED');
    } else if (calFilter === 'QUOTED') {
      list = list.filter((e) => e.source !== 'CUSTOMER_PORTAL' && e.type === 'QUOTED');
    } else if (calFilter === 'INQUIRY') {
      list = list.filter((e) => e.source === 'CUSTOMER_PORTAL' || e.type === 'INQUIRY');
    }
    return list;
  }, [calendarEvents, currentMonthKey, calFilter]);

  /* Counts for filter pills */
  const filterCounts = useMemo(() => {
    const monthEvts = calendarEvents.filter((e) => e.eventDate.startsWith(currentMonthKey));
    const confirmed = monthEvts.filter((e) => e.type === 'CONFIRMED').length;
    const quoted = monthEvts.filter((e) => e.source !== 'CUSTOMER_PORTAL' && e.type === 'QUOTED').length;
    const inquiriesCount = monthEvts.filter((e) => e.source === 'CUSTOMER_PORTAL' || e.type === 'INQUIRY').length;
    const remCount = reminders.filter((r) => r.date.startsWith(currentMonthKey)).length;

    return {
      all: monthEvts.length + remCount,
      confirmed,
      quoted,
      inquiry: inquiriesCount,
      reminders: remCount,
    };
  }, [calendarEvents, currentMonthKey, reminders]);

  /* ── Metric KPIs Calculation ── */
  const totalPipelineVal = useMemo(() => {
    return quotations.reduce((acc, q) => acc + Number(q.grandTotal || 0), 0);
  }, [quotations]);

  const confirmedVal = useMemo(() => {
    return quotations
      .filter((q) => q.agreementStatus === 'ACCEPTED')
      .reduce((acc, q) => acc + Number(q.grandTotal || 0), 0);
  }, [quotations]);

  const confirmedCount = useMemo(() => {
    return quotations.filter((q) => q.agreementStatus === 'ACCEPTED').length;
  }, [quotations]);

  const thisMonthEventsCount = useMemo(() => {
    const thisMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    return calendarEvents.filter((e) => e.eventDate.startsWith(thisMonthPrefix)).length;
  }, [calendarEvents, today]);

  const pendingInquiriesCount = useMemo(() => {
    return inquiries.filter((i) => i.requestStatus !== 'CONVERTED' && i.agreementStatus !== 'ACCEPTED').length;
  }, [inquiries]);

  /* ── Filterable Revenue Graph Calculation ── */
  const graphData = useMemo(() => {
    if (graphMonth === 'ALL') {
      const monthBuckets = Array.from({ length: 12 }, (_, idx) => {
        const monthPrefix = `${graphYear}-${String(idx + 1).padStart(2, '0')}`;
        const matching = calendarEvents.filter((e) => {
          if (!e.eventDate.startsWith(monthPrefix)) return false;
          if (graphMetric === 'CONFIRMED') return e.type === 'CONFIRMED';
          return true;
        });

        const totalRevenue = matching.reduce((sum, e) => sum + e.grandTotal, 0);
        return {
          label: SHORT_MONTH_NAMES[idx],
          fullName: `${MONTH_NAMES[idx]} ${graphYear}`,
          value: totalRevenue,
          count: matching.length,
        };
      });

      return {
        mode: 'YEAR' as const,
        points: monthBuckets,
      };
    } else {
      const daysInMonth = new Date(graphYear, graphMonth + 1, 0).getDate();
      const dayBuckets = Array.from({ length: daysInMonth }, (_, idx) => {
        const day = idx + 1;
        const dateStr = `${graphYear}-${String(graphMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const matching = calendarEvents.filter((e) => {
          if (e.eventDate !== dateStr) return false;
          if (graphMetric === 'CONFIRMED') return e.type === 'CONFIRMED';
          return true;
        });

        const totalRevenue = matching.reduce((sum, e) => sum + e.grandTotal, 0);
        return {
          label: `${day}`,
          fullName: `${day} ${MONTH_NAMES[graphMonth]} ${graphYear}`,
          value: totalRevenue,
          count: matching.length,
        };
      });

      return {
        mode: 'MONTH' as const,
        points: dayBuckets,
      };
    }
  }, [graphYear, graphMonth, graphMetric, calendarEvents]);

  // Graph Totals & Peaks
  const graphTotalRevenue = useMemo(() => {
    return graphData.points.reduce((acc, p) => acc + p.value, 0);
  }, [graphData]);

  const graphTotalEvents = useMemo(() => {
    return graphData.points.reduce((acc, p) => acc + p.count, 0);
  }, [graphData]);

  const graphPeak = useMemo(() => {
    return graphData.points.reduce(
      (max, p) => (p.value > max.value ? p : max),
      { label: '—', fullName: '—', value: 0, count: 0 },
    );
  }, [graphData]);

  return (
    <PageShell
      title="Operations Dashboard"
      subtitle="Master catering calendar, event schedule reminders, and filterable revenue analytics."
    >
      <div className="space-y-6 pb-12">
        {/* ── TOP UNIFIED HERO ACTION BAR ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-2xs" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Live Kitchen &amp; Catering Operations
                </h2>
                <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-full">
                  Kollam Central Base
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Thankam Events Management &bull; Real-time event synchronization active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => void loadData(true)}
              title="Sync Live Records"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-2xs"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-amber-600' : 'text-slate-500'} />
              <span>Sync Data</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/quotations')}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-slate-800 transition-all shadow-xs border border-slate-800"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New Quotation</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <KpiGridSkeleton count={4} />
            <CalendarSkeleton />
          </div>
        ) : (
          <>
            {/* ── ROW 1: 4 EXECUTIVE METRIC CARDS ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* 1. Confirmed Bookings Revenue */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Confirmed Revenue
                  </span>
                  <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
                    <CheckCircle2 size={16} />
                  </span>
                </div>
                <p className="mt-2 text-base sm:text-xl lg:text-2xl font-black font-mono text-slate-900 tracking-tight truncate">
                  {formatInr(confirmedVal, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <p className="text-[11px] font-semibold text-emerald-700 truncate">
                    {confirmedCount} {confirmedCount === 1 ? 'agreement' : 'agreements'} locked
                  </p>
                </div>
              </div>

              {/* 2. Quotation Pipeline */}
              <div
                onClick={() => navigate('/admin/quotations')}
                role="button"
                tabIndex={0}
                className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-amber-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Quotation Pipeline
                  </span>
                  <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0">
                    <FileText size={16} />
                  </span>
                </div>
                <p className="mt-2 text-base sm:text-xl lg:text-2xl font-black font-mono text-slate-900 tracking-tight truncate">
                  {formatInr(totalPipelineVal, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  <p className="text-[11px] font-semibold text-amber-800 truncate">
                    {quotations.length} {quotations.length === 1 ? 'active proposal' : 'active proposals'}
                  </p>
                </div>
              </div>

              {/* 3. Upcoming Events This Month */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Events This Month
                  </span>
                  <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-sky-700 shrink-0">
                    <CalendarDays size={16} />
                  </span>
                </div>
                <p className="mt-2 text-base sm:text-xl lg:text-2xl font-black font-mono text-slate-900 tracking-tight truncate">
                  {thisMonthEventsCount} {thisMonthEventsCount === 1 ? 'Event' : 'Events'}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                  <p className="text-[11px] font-semibold text-sky-700 truncate">
                    Scheduled in {MONTH_NAMES[today.getMonth()]}
                  </p>
                </div>
              </div>

              {/* 4. Action Required / Pending Requests */}
              <div
                onClick={() => navigate('/admin/customer-requests')}
                role="button"
                tabIndex={0}
                className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-orange-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Action Required
                  </span>
                  <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-700 shrink-0">
                    <Clock size={16} />
                  </span>
                </div>
                <p className="mt-2 text-base sm:text-xl lg:text-2xl font-black font-mono text-orange-600 tracking-tight truncate">
                  {pendingInquiriesCount} {pendingInquiriesCount === 1 ? 'Request' : 'Requests'}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                  <p className="text-[11px] font-semibold text-orange-800 truncate">
                    Inquiries awaiting quotes
                  </p>
                </div>
              </div>
            </div>

            {/* ── ROW 2: CATERING EVENT CALENDAR & AGENDA WORKSPACE ── */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-6">
              {/* Calendar Header Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 border border-amber-200 text-amber-700 shrink-0">
                    <CalendarIcon size={18} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <span>{MONTH_NAMES[calMonth]} {calYear}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {currentMonthEvents.length} Bookings
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Track catering events, banquet deliverables, and kitchen setup reminders
                    </p>
                  </div>
                </div>

                {/* Navigation, Filter Pills & View Mode */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5 w-full lg:w-auto">
                  {/* View Mode Toggle: Grid vs List */}
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode('GRID')}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                        viewMode === 'GRID'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900',
                      )}
                    >
                      <LayoutGrid size={13} />
                      <span>Calendar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('LIST')}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                        viewMode === 'LIST'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900',
                      )}
                    >
                      <List size={13} />
                      <span>Agenda List</span>
                    </button>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs overflow-x-auto max-w-full no-scrollbar">
                    {(
                      [
                        { key: 'ALL', label: 'All', count: filterCounts.all },
                        { key: 'CONFIRMED', label: 'Confirmed', count: filterCounts.confirmed },
                        { key: 'QUOTED', label: 'Quotes', count: filterCounts.quoted },
                        { key: 'INQUIRY', label: 'Requests', count: filterCounts.inquiry },
                        { key: 'REMINDERS', label: 'Reminders', count: filterCounts.reminders },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setCalFilter(f.key)}
                        className={cn(
                          'rounded-lg px-2.5 py-1 font-bold text-[11px] whitespace-nowrap transition-all flex items-center gap-1.5',
                          calFilter === f.key
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900',
                        )}
                      >
                        <span>{f.label}</span>
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                            calFilter === f.key
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200/80 text-slate-600',
                          )}
                        >
                          {f.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Month Prev / Today / Next Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={prevMonth}
                      className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-center transition-colors shadow-2xs"
                      title="Previous Month"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={goToToday}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-center transition-colors shadow-2xs"
                      title="Next Month"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── VIEW 1: MONTH CALENDAR GRID + DAY AGENDA INSPECTOR ── */}
              {viewMode === 'GRID' && (
                <div className="grid gap-6 lg:grid-cols-[1fr_380px] items-start">
                  {/* LEFT: FULL-SIZE MONTH CALENDAR GRID */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
                    {/* Day of Week Headers */}
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/90 text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 py-2.5">
                      {WEEKDAY_NAMES.map((d, idx) => (
                        <div key={d} className={idx === 0 || idx === 6 ? 'text-amber-800' : ''}>
                          <span className="hidden sm:inline">{d}</span>
                          <span className="sm:hidden">{d[0]}</span>
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days Matrix */}
                    <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
                      {monthDays.map((day) => {
                        const { events, reminders: dayRems } = getDayItems(day.dateKey);
                        const isSelected = selectedDateKey === day.dateKey;
                        const totalItems = events.length + dayRems.length;

                        return (
                          <div
                            key={day.dateKey}
                            onClick={() => setSelectedDateKey(day.dateKey)}
                            className={cn(
                              'min-h-[72px] sm:min-h-[100px] lg:min-h-[112px] p-1.5 sm:p-2 cursor-pointer transition-all flex flex-col justify-between group',
                              !day.isCurrentMonth
                                ? 'bg-slate-50/40 opacity-40'
                                : isSelected
                                ? 'bg-amber-50/30 ring-2 ring-inset ring-amber-500'
                                : 'bg-white hover:bg-slate-50/80',
                            )}
                          >
                            {/* Top Row: Date Number & Indicators */}
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  'grid h-5 w-5 sm:h-6 sm:w-6 place-items-center rounded-lg text-[10px] sm:text-xs font-mono font-bold transition-colors',
                                  day.isToday
                                    ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                                    : isSelected
                                    ? 'bg-slate-900 text-white font-bold'
                                    : 'text-slate-700 group-hover:text-slate-900',
                                )}
                              >
                                {day.dayNumber}
                              </span>

                              {totalItems > 0 && (
                                <span className="flex items-center gap-1">
                                  {dayRems.length > 0 && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500" title={`${dayRems.length} Reminders`} />
                                  )}
                                  {events.some((e) => e.type === 'CONFIRMED') && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Confirmed Event" />
                                  )}
                                  {events.some((e) => e.type === 'QUOTED') && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Quoted Proposal" />
                                  )}
                                  {events.some((e) => e.type === 'INQUIRY') && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" title="Inquiry" />
                                  )}
                                </span>
                              )}
                            </div>

                            {/* Event Badges Strip */}
                            <div className="mt-1 space-y-1">
                              {/* Mobile: compact dots */}
                              <div className="flex sm:hidden flex-wrap items-center gap-1">
                                {events.slice(0, 3).map((evt) => (
                                  <span
                                    key={evt.id}
                                    className={cn(
                                      'h-1.5 w-1.5 rounded-full',
                                      evt.type === 'CONFIRMED'
                                        ? 'bg-emerald-500'
                                        : evt.type === 'QUOTED'
                                        ? 'bg-amber-500'
                                        : 'bg-orange-500',
                                    )}
                                  />
                                ))}
                              </div>

                              {/* Tablet / Desktop: rich pills */}
                              <div className="hidden sm:block space-y-1">
                                {events.slice(0, 2).map((evt) => (
                                  <div
                                    key={evt.id}
                                    className={cn(
                                      'truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold border transition-colors flex items-center justify-between gap-1',
                                      evt.type === 'CONFIRMED'
                                        ? 'bg-emerald-50 border-emerald-200/80 text-emerald-800'
                                        : evt.type === 'QUOTED'
                                        ? 'bg-amber-50 border-amber-200/80 text-amber-900'
                                        : 'bg-orange-50 border-orange-200/80 text-orange-900',
                                    )}
                                    title={`${evt.customerName} - ${evt.eventType} (${evt.guestCount} guests)`}
                                  >
                                    <span className="font-bold truncate">{evt.customerName}</span>
                                    {evt.guestCount > 0 && (
                                      <span className="text-[9px] opacity-75 font-mono shrink-0">
                                        {evt.guestCount}g
                                      </span>
                                    )}
                                  </div>
                                ))}

                                {/* Reminder Pill */}
                                {dayRems.slice(0, 1).map((r) => (
                                  <div
                                    key={r.id}
                                    className="truncate rounded-md bg-purple-50 border border-purple-200/80 px-1.5 py-0.5 text-[9px] font-medium text-purple-800 flex items-center gap-1"
                                    title={r.title}
                                  >
                                    <span className="h-1 w-1 rounded-full bg-purple-500 shrink-0" />
                                    <span className="truncate">{r.title}</span>
                                  </div>
                                ))}

                                {totalItems > 2 && (
                                  <p className="text-[9px] text-slate-500 font-bold pl-0.5">
                                    +{totalItems - 2} more
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* RIGHT: SELECTED DATE AGENDA & REMINDERS INSPECTOR */}
                  <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 sm:p-5 shadow-2xs space-y-5">
                    {/* Inspector Header Card */}
                    <div className="border-b border-slate-200/80 pb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                          <Sparkles size={11} className="text-amber-600" />
                          <span>Day Schedule &amp; Agenda</span>
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200/80">
                          {selectedDateKey}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mt-1.5 flex items-center gap-2">
                        <span>{selectedDateFormatted}</span>
                        {selectedDateKey === toDateKey(today) && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.2 rounded-full">
                            Today
                          </span>
                        )}
                      </h4>
                    </div>

                    {/* Day Events Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Events Scheduled ({selectedDayItems.events.length})
                        </span>
                        {selectedDayItems.events.length > 0 && (
                          <span className="text-xs font-mono font-bold text-slate-900">
                            {formatInr(selectedDayItems.events.reduce((s, e) => s + e.grandTotal, 0))}
                          </span>
                        )}
                      </div>

                      {selectedDayItems.events.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center space-y-2.5">
                          <p className="text-xs text-slate-400">
                            No event bookings scheduled on this date.
                          </p>
                          <button
                            type="button"
                            onClick={() => navigate('/admin/quotations')}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-900 hover:underline"
                          >
                            <Plus size={13} />
                            <span>Create Quote for this Date</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                          {selectedDayItems.events.map((evt) => {
                            const cleanPhone = (evt.customerPhone ?? '').replace(/[^\d]/g, '');
                            const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

                            return (
                              <div
                                key={evt.id}
                                className="rounded-xl border border-slate-200/90 bg-white p-3.5 text-xs space-y-2 shadow-2xs hover:border-amber-300 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p
                                      onClick={() => {
                                        if (evt.source === 'CUSTOMER_PORTAL') {
                                          navigate(`/admin/customer-requests?id=${evt.id}`);
                                        } else {
                                          navigate(`/admin/quotations?id=${evt.id}`);
                                        }
                                      }}
                                      className="font-bold text-slate-900 text-sm hover:text-amber-700 cursor-pointer transition-colors"
                                    >
                                      {evt.customerName}
                                    </p>
                                    <p className="text-xs text-amber-800 font-semibold">{evt.eventType}</p>
                                  </div>
                                  <span
                                    className={cn(
                                      'rounded-full px-2 py-0.5 text-[9px] font-bold border',
                                      evt.type === 'CONFIRMED'
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                        : evt.source === 'CUSTOMER_PORTAL'
                                        ? 'bg-orange-50 border-orange-200 text-orange-900'
                                        : 'bg-amber-50 border-amber-200 text-amber-900',
                                    )}
                                  >
                                    {evt.type === 'CONFIRMED'
                                      ? 'Confirmed'
                                      : evt.source === 'CUSTOMER_PORTAL'
                                      ? 'Customer Request'
                                      : 'Quoted'}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  {evt.venue && (
                                    <span className="flex items-center gap-1">
                                      <MapPin size={11} className="text-amber-600" />
                                      <span className="truncate max-w-[150px]">{evt.venue}</span>
                                    </span>
                                  )}
                                  <span>&bull;</span>
                                  <span className="flex items-center gap-1">
                                    <Users size={11} /> {evt.guestCount} guests
                                  </span>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                                  <span className="font-mono font-bold text-slate-900 text-xs">
                                    {formatInr(evt.grandTotal)}
                                  </span>

                                  <div className="flex items-center gap-2.5">
                                    {evt.customerPhone && (
                                      <>
                                        <a
                                          href={`https://wa.me/${waPhone}?text=Hello%20${encodeURIComponent(evt.customerName)},%20regarding%20your%20event%20on%20${evt.eventDate}...`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-emerald-600 hover:text-emerald-700"
                                          title="WhatsApp Client"
                                        >
                                          <MessageCircle size={15} />
                                        </a>
                                        <a
                                          href={`tel:${evt.customerPhone}`}
                                          className="text-sky-600 hover:text-sky-700"
                                          title="Call Client"
                                        >
                                          <Phone size={14} />
                                        </a>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (evt.source === 'CUSTOMER_PORTAL') {
                                          navigate(`/admin/customer-requests?id=${evt.id}`);
                                        } else {
                                          navigate(`/admin/quotations?id=${evt.id}`);
                                        }
                                      }}
                                      className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline"
                                    >
                                      View &rarr;
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Date Reminders & Operational Tasks */}
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <Bell size={13} className="text-purple-600" />
                          <span>Tasks &amp; Reminders ({selectedDayItems.reminders.length})</span>
                        </span>
                      </div>

                      {/* Add new reminder input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newReminderText}
                          onChange={(e) => setNewReminderText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addReminder()}
                          placeholder="Add task (e.g. Call client for final guest count)..."
                          className="h-9 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => addReminder()}
                          className="h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs shadow-2xs transition-colors"
                        >
                          <Plus size={14} strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* Reminders List */}
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {selectedDayItems.reminders.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-2xs"
                          >
                            <button
                              type="button"
                              onClick={() => toggleReminder(r.id)}
                              className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                            >
                              <span
                                className={cn(
                                  'grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors',
                                  r.completed
                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                    : 'border-slate-300 bg-white',
                                )}
                              >
                                {r.completed && <Check size={11} strokeWidth={3} />}
                              </span>
                              <span
                                className={cn(
                                  'truncate text-xs',
                                  r.completed ? 'line-through text-slate-400 font-medium' : 'text-slate-800 font-semibold',
                                )}
                              >
                                {r.title}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteReminder(r.id)}
                              className="text-slate-400 hover:text-rose-500 transition-colors"
                              title="Remove Reminder"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}

                        {selectedDayItems.reminders.length === 0 && (
                          <div className="space-y-2 py-1">
                            <p className="text-xs text-slate-400 italic">
                              No tasks for this date. Quick add suggestion:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => addReminder('Confirm final guest count')}
                                className="text-[10px] bg-white border border-slate-200 hover:border-amber-300 rounded-lg px-2 py-1 text-slate-600 font-medium"
                              >
                                + Lock guest count
                              </button>
                              <button
                                type="button"
                                onClick={() => addReminder('Brief catering & transport team')}
                                className="text-[10px] bg-white border border-slate-200 hover:border-amber-300 rounded-lg px-2 py-1 text-slate-600 font-medium"
                              >
                                + Transport brief
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW 2: CHRONOLOGICAL AGENDA LIST VIEW ── */}
              {viewMode === 'LIST' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      All Events for {MONTH_NAMES[calMonth]} {calYear} ({currentMonthEvents.length})
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900">
                      Total: {formatInr(currentMonthEvents.reduce((s, e) => s + e.grandTotal, 0))}
                    </span>
                  </div>

                  {currentMonthEvents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-3">
                      <CalendarDays size={28} className="mx-auto text-slate-400" />
                      <div>
                        <p className="text-sm font-bold text-slate-700">No events found for this filter in {MONTH_NAMES[calMonth]}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Switch filters or draft a new quotation proposal.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/admin/quotations')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-slate-800"
                      >
                        <Plus size={14} />
                        <span>Create Quotation</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {currentMonthEvents.map((evt) => {
                        const cleanPhone = (evt.customerPhone ?? '').replace(/[^\d]/g, '');
                        const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                        const eventDateObj = parseDateKey(evt.eventDate);
                        const dateFormatted = eventDateObj.toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        });

                        return (
                          <div
                            key={evt.id}
                            className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3 hover:border-amber-300 hover:shadow-xs transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                  <CalendarIcon size={12} className="text-amber-600" />
                                  <span>{dateFormatted}</span>
                                </span>

                                <span
                                  className={cn(
                                    'rounded-full px-2 py-0.5 text-[10px] font-bold border',
                                    evt.type === 'CONFIRMED'
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                      : evt.source === 'CUSTOMER_PORTAL'
                                      ? 'bg-orange-50 border-orange-200 text-orange-900'
                                      : 'bg-amber-50 border-amber-200 text-amber-900',
                                  )}
                                >
                                  {evt.type === 'CONFIRMED'
                                    ? 'Confirmed'
                                    : evt.source === 'CUSTOMER_PORTAL'
                                    ? 'Request'
                                    : 'Quoted'}
                                </span>
                              </div>

                              <div>
                                <h4
                                  onClick={() => {
                                    if (evt.source === 'CUSTOMER_PORTAL') {
                                      navigate(`/admin/customer-requests?id=${evt.id}`);
                                    } else {
                                      navigate(`/admin/quotations?id=${evt.id}`);
                                    }
                                  }}
                                  className="font-bold text-slate-900 text-sm hover:text-amber-700 cursor-pointer transition-colors truncate"
                                >
                                  {evt.customerName}
                                </h4>
                                <p className="text-xs text-amber-800 font-semibold truncate">{evt.eventType}</p>
                              </div>

                              <div className="space-y-1 text-xs text-slate-500 pt-1 border-t border-slate-100">
                                {evt.venue && (
                                  <p className="flex items-center gap-1.5 truncate">
                                    <MapPin size={12} className="text-amber-600 shrink-0" />
                                    <span className="truncate">{evt.venue}</span>
                                  </p>
                                )}
                                <p className="flex items-center gap-1.5">
                                  <Users size={12} className="shrink-0" />
                                  <span>{evt.guestCount} guests attending</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                              <span className="font-mono font-black text-slate-900 text-sm">
                                {formatInr(evt.grandTotal)}
                              </span>

                              <div className="flex items-center gap-2">
                                {evt.customerPhone && (
                                  <>
                                    <a
                                      href={`https://wa.me/${waPhone}?text=Hello%20${encodeURIComponent(evt.customerName)},%20regarding%20your%20event%20on%20${evt.eventDate}...`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-emerald-600"
                                      title="WhatsApp"
                                    >
                                      <MessageCircle size={14} />
                                    </a>
                                    <a
                                      href={`tel:${evt.customerPhone}`}
                                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sky-600"
                                      title="Call"
                                    >
                                      <Phone size={14} />
                                    </a>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (evt.source === 'CUSTOMER_PORTAL') {
                                      navigate(`/admin/customer-requests?id=${evt.id}`);
                                    } else {
                                      navigate(`/admin/quotations?id=${evt.id}`);
                                    }
                                  }}
                                  className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-slate-800 transition-colors"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── ROW 3: REVENUE TRAJECTORY GRAPH & ANALYTICS ── */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
              {/* Header & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 border border-amber-200 text-amber-700 shrink-0">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Revenue Trajectory &amp; Booking Volume
                    </h3>
                    <p className="text-xs text-slate-500">
                      Filterable analytics tracking monthly &amp; daily event turnover
                    </p>
                  </div>
                </div>

                {/* Filter Selectors (Year, Month, Metric) */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Metric Toggle */}
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setGraphMetric('CONFIRMED')}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
                        graphMetric === 'CONFIRMED'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900',
                      )}
                    >
                      Confirmed
                    </button>
                    <button
                      type="button"
                      onClick={() => setGraphMetric('ALL')}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
                        graphMetric === 'ALL'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900',
                      )}
                    >
                      All Proposals
                    </button>
                  </div>

                  {/* Month Selector */}
                  <select
                    value={graphMonth === 'ALL' ? 'ALL' : String(graphMonth)}
                    onChange={(e) =>
                      setGraphMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
                    }
                    className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 shadow-2xs"
                  >
                    <option value="ALL">All 12 Months</option>
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>

                  {/* Year Selector */}
                  <select
                    value={graphYear}
                    onChange={(e) => setGraphYear(Number(e.target.value))}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 shadow-2xs"
                  >
                    {[2027, 2026, 2025, 2024].map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Metric Summary Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs">
                  <span className="text-slate-500 font-medium">Selected Period Turnover</span>
                  <p className="mt-1 text-base sm:text-lg font-black font-mono text-slate-900 truncate">
                    {formatInr(graphTotalRevenue)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs">
                  <span className="text-slate-500 font-medium">Event Bookings Count</span>
                  <p className="mt-1 text-base sm:text-lg font-black font-mono text-amber-800">
                    {graphTotalEvents} {graphTotalEvents === 1 ? 'Event' : 'Events'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs">
                  <span className="text-slate-500 font-medium">Peak Performance Period</span>
                  <p className="mt-1 text-sm sm:text-base font-black font-mono text-emerald-700 truncate">
                    {graphPeak.value > 0 ? `${graphPeak.label} (${formatInr(graphPeak.value)})` : '—'}
                  </p>
                </div>
              </div>

              {/* SVG Line Graph */}
              <div className="relative mt-2 h-56 w-full">
                <svg
                  className="h-full w-full overflow-visible"
                  viewBox="0 0 700 200"
                  preserveAspectRatio="none"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="rev-graph-area" x1="0" y1="0" x2="0" y2="180" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#F59E0B" stopOpacity="0.22" />
                      <stop offset="1" stopColor="#F59E0B" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="rev-curve-line" x1="0" y1="0" x2="700" y2="0" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#B8860B" />
                      <stop offset="1" stopColor="#F59E0B" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  <line x1="30" y1="40" x2="680" y2="40" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="30" y1="90" x2="680" y2="90" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="30" y1="140" x2="680" y2="140" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="30" y1="180" x2="680" y2="180" stroke="#E2E8F0" strokeWidth="1" />

                  {/* Dynamic Path Calculation */}
                  {(() => {
                    const count = graphData.points.length;
                    if (count < 2) return null;

                    const maxVal = Math.max(...graphData.points.map((p) => p.value), 100000);
                    const stepX = (680 - 30) / (count - 1);

                    const coords = graphData.points.map((p, idx) => {
                      const x = 30 + idx * stepX;
                      const ratio = p.value / maxVal;
                      const y = 175 - ratio * 135;
                      return { x, y, ...p };
                    });

                    // Generate smooth SVG curve
                    let pathStr = `M ${coords[0].x},${coords[0].y}`;
                    for (let i = 0; i < coords.length - 1; i++) {
                      const curr = coords[i];
                      const next = coords[i + 1];
                      const midX = (curr.x + next.x) / 2;
                      pathStr += ` C ${midX},${curr.y} ${midX},${next.y} ${next.x},${next.y}`;
                    }

                    const areaStr = `${pathStr} L ${coords[coords.length - 1].x},180 L ${coords[0].x},180 Z`;

                    return (
                      <>
                        <path d={areaStr} fill="url(#rev-graph-area)" />
                        <path
                          d={pathStr}
                          stroke="url(#rev-curve-line)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Data Points */}
                        {coords.map((pt, i) => (
                          <g
                            key={i}
                            className="cursor-pointer"
                            onMouseEnter={() =>
                              setHoveredPoint({ label: pt.fullName, value: pt.value, count: pt.count })
                            }
                            onMouseLeave={() => setHoveredPoint(null)}
                          >
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={hoveredPoint?.label === pt.fullName ? 6 : 4}
                              fill="#F59E0B"
                              stroke="#ffffff"
                              strokeWidth="2.5"
                              className="transition-all"
                            />
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>

                {/* Hover Tooltip Popup */}
                {hoveredPoint && (
                  <div className="absolute top-2 right-4 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-md text-right animate-in fade-in-50 duration-150">
                    <p className="text-[10px] uppercase font-bold text-amber-800">{hoveredPoint.label}</p>
                    <p className="font-mono font-bold text-slate-900 text-sm">{formatInr(hoveredPoint.value)}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">{hoveredPoint.count} Events Scheduled</p>
                  </div>
                )}
              </div>

              {/* X-Axis Labels */}
              <div className="flex justify-between px-2 pt-1 text-[11px] font-mono font-bold text-slate-500">
                {graphData.mode === 'YEAR' ? (
                  SHORT_MONTH_NAMES.map((m) => <span key={m}>{m}</span>)
                ) : (
                  [1, 5, 10, 15, 20, 25, graphData.points.length].map((d) => (
                    <span key={d}>Day {d}</span>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* ── ROW 4: QUICK OPERATIONS SHORTCUTS ── */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => navigate('/admin/quotations')}
            className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-amber-400 hover:shadow-xs text-left group"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200 group-hover:bg-slate-900 group-hover:text-amber-300 transition-colors">
              <FilePlus size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Create Quotation</p>
              <p className="text-[11px] text-slate-500">Catering &amp; tax invoice generator</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/customer-requests')}
            className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-emerald-400 hover:shadow-xs text-left group"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Inbound Inquiries</p>
              <p className="text-[11px] text-slate-500">Review portal customer bookings</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/menus')}
            className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-amber-400 hover:shadow-xs text-left group"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200 group-hover:bg-slate-900 group-hover:text-amber-300 transition-colors">
              <Layers size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Food Packages</p>
              <p className="text-[11px] text-slate-500">Manage Sadhyas &amp; catering menus</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/categories')}
            className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-purple-400 hover:shadow-xs text-left group"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-700 border border-purple-200 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <UtensilsCrossed size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Dishes Catalog</p>
              <p className="text-[11px] text-slate-500">Categories &amp; pricing hierarchy</p>
            </div>
          </button>
        </div>
      </div>
    </PageShell>
  );
}

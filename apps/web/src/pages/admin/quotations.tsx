import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Layers3,
  MapPin,
  PartyPopper,
  Percent,
  Phone,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Users,
  Utensils,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectInput } from '@/components/ui/select-input';
import { Textarea } from '@/components/ui/textarea';
import { categoriesService, CategoryNode } from '@/features/categories/categories.service';
import { customerPortalService } from '@/features/customer-portal/customer-portal.service';
import { itemsService } from '@/features/items/items.service';
import { menusService, MenuRow } from '@/features/menus/menus.service';
import {
  QuotationDetail,
  QuotationPayload,
  QuotationRow,
  quotationsService,
} from '@/features/quotations/quotations.service';
import { settingsService } from '@/features/settings/settings.service';
import { useConfirmModal } from '@/hooks/use-confirm-modal';
import { PageShell } from '@/layouts/page-shell';
import { cn } from '@/utils/cn';
import { formatInr } from '@/utils/currency';
import { toMediaUrl } from '@/utils/media-url';
import { generateAgreementHtml, fetchImageBase64 } from '@/utils/agreement-pdf';
import { openQuotePdf } from '@/utils/quote-pdf';
import {
  isEventServiceItem,
  ATOMIC_EVENT_SERVICES,
  SERVICE_DEPARTMENTS,
  ServiceDepartment,
  searchEventServices,
  formatServiceLineTitle,
} from '@/features/quotations/event-services.catalog';

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

type ServiceLineItem = {
  key: string;
  name: string;
  department: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  description?: string;
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

const EVENT_TYPES = [
  'Wedding',
  'Engagement',
  'Birthday',
  'Corporate Event',
  'House Warming',
  'Reception',
  'Other',
];

const VENUES = [
  'Home',
  'Auditorium',
  'Convention Center',
  'Hotel',
  'Temple',
  'Open Ground',
  'Other',
];

const ALLOWED_UNITS = ['plate', 'bowl', 'glass', 'piece', 'scoop', 'kg', 'unit', 'person'];

/* ─── Helpers ────────────────────────────────────────────────── */
function key() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function num(v: string | number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

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

function flattenCatalog(nodes: CategoryNode[], path: string[] = []): CatalogItem[] {
  const out: CatalogItem[] = [];
  for (const node of nodes) {
    const p = [...path, node.name];
    for (const item of node.items) {
      out.push({
        id: item.id,
        name: item.name,
        unit: item.unit,
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

function computeTotals(
  lines: LineItem[],
  services: ServiceLineItem[],
  form: QuoteForm,
  mode: QuoteMode,
  ppRate: string,
) {
  const guests = num(form.guestCount);
  const isPP = mode === 'PER_PERSON';
  const foodSub = isPP
    ? num(ppRate) * guests
    : lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const servicesSub = services.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const subTotal = foodSub + servicesSub;
  const disc = num(form.discountAmount);
  const extra = num(form.extraChargesAmount);
  const pct = form.gstEnabled ? num(form.gstPercent) : 0;
  const taxable = Math.max(subTotal - disc + extra, 0);
  const gst = form.gstEnabled && pct > 0 ? Number(((taxable * pct) / 100).toFixed(2)) : 0;
  return {
    foodSub,
    servicesSub,
    subTotal,
    disc,
    extra,
    taxable,
    pct,
    gst,
    grandTotal: taxable + gst,
  };
}

function emptyForm(): QuoteForm {
  return {
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    eventDate: '',
    eventType: '',
    venue: '',
    guestCount: '100',
    notes: '',
    terms: '50% advance on booking, 40% on event date morning, 10% upon event completion.',
    discountAmount: '0',
    extraChargesAmount: '0',
    gstEnabled: true,
    gstPercent: '5',
  };
}

function detailToForm(d: QuotationDetail): QuoteForm {
  const gst = num(String(d.gstPercent ?? 5));
  return {
    customerName: d.customerName ?? '',
    customerPhone: d.customerPhone ?? '',
    customerAddress: d.customerAddress ?? '',
    eventDate: d.eventDate?.slice(0, 10) ?? '',
    eventType: d.eventType ?? '',
    venue: d.venue ?? '',
    guestCount: String(d.guestCount ?? 100),
    notes: d.notes ?? '',
    terms: d.terms ?? '',
    discountAmount: String(d.discountAmount ?? 0),
    extraChargesAmount: String(d.extraChargesAmount ?? 0),
    gstEnabled: gst > 0,
    gstPercent: String(gst > 0 ? gst : 5),
  };
}

export function sanitizeServiceName(rawName: string): string {
  if (!rawName) return '';
  let cleaned = rawName;
  const typoMap: Record<string, string> = {
    'tea, cofy, sulaimani,, Horlicks, boost': 'Tea Shop Live — Tea, Coffee, Sulaimani, Horlicks, Boost',
    'Tea shop Live --- tea, cofy, sulaimani,, Horlicks, boost': 'Tea Shop Live — Tea, Coffee, Sulaimani, Horlicks, Boost',
    'Juice Counter live -- pineapple, watermelon, greppu, mojitto, mint lime': 'Juice Counter Live — Pineapple, Watermelon, Grape, Mojito, Mint Lime',
    'Snacks -- pazham pori, badji 2 types, veg naguts, parippu vada': 'Snacks Live — Pazham Pori, Bajji (2 Types), Veg Nuggets, Parippu Vada',
    'Stage decoration, photo frame 2 nomber, Entrence, pathe way': 'Stage Decor — Stage Decoration, Photo Frame (2 Nos), Entrance Decor, Pathway Decor',
    'Stage Decor -- Stage decoration, photo frame 2 nomber, Entrence, pathe way': 'Stage Decor — Stage Decoration, Photo Frame (2 Nos), Entrance Decor, Pathway Decor',
    'Pooja item, mala sweekarana mala, boquet, nirapara nilavilakku, cordinator': 'Pooja Essentials, Sweekarana Mala, Bouquets, Nirapara, Nilavilakku, Coordinator',
    'Nadhaswaram 2 artist': 'Nadaswaram Instrumental Ensemble (2 Artists with Thavil)',
  };

  for (const [wrong, right] of Object.entries(typoMap)) {
    if (cleaned.toLowerCase() === wrong.toLowerCase() || cleaned.toLowerCase().includes(wrong.toLowerCase())) {
      return right;
    }
  }

  return cleaned
    .replace(/\bcofy\b/gi, 'Coffee')
    .replace(/\bgreppu\b/gi, 'Grape')
    .replace(/\bbadji\b/gi, 'Bajji')
    .replace(/\bnaguts\b/gi, 'Nuggets')
    .replace(/\bnomber\b/gi, 'Nos')
    .replace(/\bpathe way\b/gi, 'Pathway')
    .replace(/\bEntrence\b/gi, 'Entrance')
    .replace(/\bmojitto\b/gi, 'Mojito')
    .replace(/\bcordinator\b/gi, 'Coordinator');
}

function detailToLinesAndServices(
  d: QuotationDetail,
  catalog: CatalogItem[],
): { lines: LineItem[]; services: ServiceLineItem[] } {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const lines: LineItem[] = [];
  const services: ServiceLineItem[] = [];

  const rawItems = (d.items ?? []).filter(
    (i) =>
      String(i.unit ?? '').toLowerCase() !== 'person' &&
      String(i.name ?? '').toLowerCase() !== 'per person quote',
  );

  const hasPp = (d.items ?? []).some(
    (i) =>
      String(i.unit ?? '').toLowerCase() === 'person' ||
      String(i.name ?? '').toLowerCase() === 'per person quote',
  );

  for (const item of rawItems) {
    if (isEventServiceItem(item) || (hasPp && num(item.unitPrice) > 0)) {
      services.push({
        key: key(),
        name: sanitizeServiceName(item.name),
        department: 'Event Services',
        quantity: num(item.quantity) || 1,
        unit: item.unit || 'unit',
        unitPrice: num(item.unitPrice),
      });
    } else {
      lines.push({
        key: key(),
        itemId: item.itemId ?? undefined,
        name: item.name,
        category: byId.get(item.itemId ?? '')?.categoryName ?? item.item?.category?.name ?? '',
        quantity: num(item.quantity),
        unit: sanitizeUnit(item.unit),
        unitPrice: num(item.unitPrice),
        imageUrl: item.itemId ? byId.get(item.itemId)?.imageUrl ?? null : null,
      });
    }
  }

  return { lines, services };
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

function buildPayload(
  form: QuoteForm,
  lines: LineItem[],
  services: ServiceLineItem[],
  mode: QuoteMode,
  ppRate: string,
): QuotationPayload {
  const guests = num(form.guestCount);
  const isPP = mode === 'PER_PERSON';
  const items = [
    ...(isPP
      ? [
          ...lines.map((l) => ({
            itemId: l.itemId,
            name: l.name,
            quantity: guests,
            unit: 'plate',
            unitPrice: 0,
          })),
          ...(num(ppRate) > 0
            ? [
                {
                  name: 'Per Person Quote',
                  quantity: guests,
                  unit: 'person',
                  unitPrice: num(ppRate),
                },
              ]
            : []),
        ]
      : lines.map((l) => ({
          itemId: l.itemId,
          name: l.name,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
        }))),
    ...services.map((s) => ({
      name: s.name,
      quantity: s.quantity,
      unit: s.unit,
      unitPrice: s.unitPrice,
    })),
  ];
  return {
    customerName: form.customerName,
    customerPhone: normalizePhone(form.customerPhone),
    customerAddress: form.customerAddress || undefined,
    eventDate: form.eventDate,
    eventType: form.eventType,
    venue: form.venue,
    guestCount: guests,
    items,
    notes: form.notes || undefined,
    terms: form.terms || undefined,
    discountAmount: num(form.discountAmount),
    extraChargesAmount: num(form.extraChargesAmount),
    gstPercent: form.gstEnabled ? num(form.gstPercent) : 0,
  };
}

/* ══════════════════════════════════════════════════════════════════
   MAIN QUOTATIONS & TAX INVOICE PAGE
   ══════════════════════════════════════════════════════════════════ */
export function QuotationsPage() {
  const { confirm, confirmModal } = useConfirmModal();

  /* lists */
  const [rows, setRows] = useState<QuotationRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [company, setCompany] = useState<any>(null);

  /* menu import */
  const [menuPickerOpen, setMenuPickerOpen] = useState(false);

  /* selection */
  const [selectedRow, setSelectedRow] = useState<QuotationRow | null>(null);
  const [isNew, setIsNew] = useState(false);

  /* wizard navigation */
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [showDishesEditor, setShowDishesEditor] = useState(false);

  /* form */
  const [form, setForm] = useState<QuoteForm>(emptyForm());
  const [lines, setLines] = useState<LineItem[]>([]);
  const [services, setServices] = useState<ServiceLineItem[]>([]);
  const [svcPickerOpen, setSvcPickerOpen] = useState(false);
  const [svcDeptFilter, setSvcDeptFilter] = useState<ServiceDepartment | 'ALL'>('ALL');
  const [svcSearch, setSvcSearch] = useState('');
  const [mode, setMode] = useState<QuoteMode>('PER_PERSON');
  const [ppRate, setPpRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  /* catalog search */
  const [catSearch, setCatSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [backendItems, setBackendItems] = useState<CatalogItem[] | null>(null);
  const [catSearching, setCatSearching] = useState(false);

  /* list search & filter */
  const [listSearch, setListSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FINALIZED' | 'DRAFT' | 'ACCEPTED'>('ALL');

  /* agreement viewer modal */
  const [agOpen, setAgOpen] = useState(false);
  const [agHtml, setAgHtml] = useState('');
  const [agLoading, setAgLoading] = useState(false);
  const agIframeRef = useRef<HTMLIFrameElement>(null);

  /* tax invoice modal */
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  /* ── Load ── */
  const refresh = useCallback(() => {
    return quotationsService.list(1, 100).then((r) => setRows(r.data));
  }, []);

  useEffect(() => {
    refresh();
    void categoriesService
      .list()
      .then((tree) => {
        const flat = flattenCatalog(tree);
        if (flat.length > 0) {
          setCatalog(flat);
        } else {
          void itemsService.list(1, 500).then((res) => {
            setCatalog(
              res.data.map((item) => ({
                id: item.id,
                name: item.name,
                unit: item.unit,
                basePrice: Number(item.basePrice ?? 0),
                imageUrl: (item as any).imageUrl,
                categoryName: item.category?.name ?? 'Dishes',
              })),
            );
          });
        }
      })
      .catch(() => {
        void itemsService.list(1, 500).then((res) => {
          setCatalog(
            res.data.map((item) => ({
              id: item.id,
              name: item.name,
              unit: item.unit,
              basePrice: Number(item.basePrice ?? 0),
              imageUrl: (item as any).imageUrl,
              categoryName: item.category?.name ?? 'Dishes',
            })),
          );
        });
      });
    void menusService.list().then(setMenus);
    void settingsService
      .list()
      .then((rows) => {
        const co = rows.find((r) => r.key === 'company')?.value ?? {};
        setCompany({
          name: String((co as any).name ?? "THANKAM catering&event's"),
          tagline: String(
            (co as any).tagline ??
              'Premier Catering & Event Management · Kollam, Kerala',
          ),
          logoUrl: (co as any).logoUrl
            ? toMediaUrl(String((co as any).logoUrl))
            : undefined,
          phone: String((co as any).contact ?? '9745684766'),
          address: String((co as any).address ?? 'Kollam, Kerala'),
        });
      })
      .catch(() => null);

    // Real-Time WebSocket updates via dashboard layout broadcast
    const handleWorkflowEvent = () => {
      void refresh();
    };
    window.addEventListener('thankam:quotation-event', handleWorkflowEvent);

    // Silent background polling (every 8s) to guarantee zero UI stale states
    const pollTimer = setInterval(() => {
      void refresh();
    }, 8000);

    return () => {
      window.removeEventListener('thankam:quotation-event', handleWorkflowEvent);
      clearInterval(pollTimer);
    };
  }, [refresh]);

  /* ── Executive Metrics ── */
  const metrics = useMemo(() => {
    const adminOnly = rows.filter((r) => r.source !== 'CUSTOMER_PORTAL');
    const total = adminOnly.length;
    let totalPipeline = 0;
    let finalizedCount = 0;
    let acceptedCount = 0;

    for (const r of adminOnly) {
      totalPipeline += Number(r.grandTotal || 0);
      if (r.status === 'FINALIZED') finalizedCount += 1;
      if (r.agreementStatus === 'ACCEPTED') acceptedCount += 1;
    }

    const avgValue = total > 0 ? Math.round(totalPipeline / total) : 0;

    return { total, totalPipeline, finalizedCount, acceptedCount, avgValue };
  }, [rows]);

  /* ── Select quotation ── */
  const onSelectRow = async (row: QuotationRow) => {
    setSelectedRow(row);
    setIsNew(false);
    setActiveStep(4);
    setShowDishesEditor(false);
    setCatSearch('');
    setCatFilter('');
    setBackendItems(null);
    setCatSearching(false);
    setSvcSearch('');
    setSvcDeptFilter('ALL');
    try {
      setLoading(true);
      const d = await quotationsService.getOne(row.id);
      setForm(detailToForm(d));
      const { lines: ls, services: svs } = detailToLinesAndServices(d, catalog);
      setLines(ls);
      setServices(svs);
      // detect per-person mode (default to PER_PERSON)
      const ppLine = d.items?.find((i) => String(i.unit ?? '').toLowerCase() === 'person');
      const hasExplicitItemPrices = d.items?.some(
        (i) => String(i.unit ?? '').toLowerCase() !== 'person' && num(i.unitPrice) > 0,
      );
      if (hasExplicitItemPrices && !ppLine) {
        setMode('PER_ITEM');
        setPpRate('');
      } else {
        setMode('PER_PERSON');
        setPpRate(ppLine && num(ppLine.unitPrice) > 0 ? String(ppLine.unitPrice) : '');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  /* ── New quotation ── */
  const onNew = () => {
    setSelectedRow(null);
    setIsNew(true);
    setActiveStep(1);
    setShowDishesEditor(false);
    setForm(emptyForm());
    setLines([]);
    setServices([]);
    setMode('PER_PERSON');
    setPpRate('');
    setCatSearch('');
    setCatFilter('');
    setBackendItems(null);
    setCatSearching(false);
    setSvcSearch('');
    setSvcDeptFilter('ALL');
  };

  /* ── Save ── */
  const onSave = async () => {
    if (!form.customerName || !form.eventDate || !form.eventType || !form.venue) {
      toast.error('Please fill customer name, event date, event type, and venue');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(form, lines, services, mode, ppRate);
      if (isNew) {
        const created = await quotationsService.create(payload);
        toast.success(`Created quotation ${(created as any).quotationNumber}`);
        setIsNew(false);
        await refresh();
        const allRows = await quotationsService.list(1, 100);
        setRows(allRows.data);
        const newRow = allRows.data.find((r: QuotationRow) => r.id === (created as any).id);
        if (newRow) setSelectedRow(newRow);
      } else if (selectedRow) {
        await quotationsService.update(selectedRow.id, payload);
        toast.success('Quotation saved successfully');
        refresh();
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to save quotation');
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const onDelete = async () => {
    if (!selectedRow) return;
    const ok = await confirm({
      title: 'Delete Quotation',
      description: `Are you sure you want to delete ${selectedRow.quotationNumber}?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await quotationsService.remove(selectedRow.id);
      toast.success('Quotation deleted');
      setSelectedRow(null);
      setIsNew(false);
      refresh();
    } catch {
      toast.error('Failed to delete quotation');
    }
  };

  /* ── PDF preview ── */
  const onPdf = async () => {
    const logoBase64 = await fetchImageBase64(company?.logoUrl);
    const totals = computeTotals(lines, services, form, mode, ppRate);
    const isPP = mode === 'PER_PERSON';
    openQuotePdf({
      quotationNumber: selectedRow?.quotationNumber ?? 'DRAFT',
      createdAt: selectedRow ? new Date().toISOString() : new Date().toISOString(),
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      eventType: form.eventType,
      eventDate: form.eventDate,
      venue: form.venue,
      guestCount: num(form.guestCount),
      isPerPerson: isPP,
      perPersonRate: isPP ? num(ppRate) : undefined,
      perPersonGuests: isPP ? num(form.guestCount) : undefined,
      lines: [
        ...lines.map((l) => ({
          name: l.name,
          category: l.category,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: !isPP ? l.unitPrice : null,
          amount: !isPP ? Number((l.quantity * l.unitPrice).toFixed(2)) : null,
          imageUrl: l.imageUrl ? toMediaUrl(l.imageUrl) : null,
        })),
        ...services.map((s) => ({
          name: s.name,
          category: s.department || 'Event Services',
          quantity: s.quantity,
          unit: s.unit,
          unitPrice: s.unitPrice,
          amount: Number((s.quantity * s.unitPrice).toFixed(2)),
          imageUrl: null,
        })),
      ],
      subTotal: totals.subTotal,
      discountAmount: totals.disc || undefined,
      extraChargesAmount: totals.extra || undefined,
      gstPercent: form.gstEnabled ? num(form.gstPercent) : 0,
      gstAmount: form.gstEnabled ? totals.gst : 0,
      grandTotal: totals.grandTotal,
      companyName: company?.name,
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
      const totals = computeTotals(lines, services, form, mode, ppRate);
      const isPP = mode === 'PER_PERSON';

      // Pre-fetch item images as base64 for reliable rendering in srcDoc iframe
      const itemImageMap = new Map<string, string>();
      await Promise.allSettled(
        lines
          .filter((l) => l.itemId && l.imageUrl)
          .map(async (l) => {
            const b64 = await fetchImageBase64(toMediaUrl(l.imageUrl!));
            if (b64 && l.itemId) itemImageMap.set(l.itemId, b64);
          }),
      );

      const html = generateAgreementHtml({
        quotationNumber: selectedRow.quotationNumber,
        createdAt: selectedRow ? new Date().toISOString() : undefined,
        eventDate: form.eventDate,
        eventType: form.eventType,
        venue: form.venue,
        guestCount: num(form.guestCount),
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerAddress: form.customerAddress,
        items: [
          ...lines.map((l) => ({
            name: l.name,
            category: l.category,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: !isPP ? l.unitPrice : null,
            amount: !isPP ? Number((l.quantity * l.unitPrice).toFixed(2)) : null,
            imageUrl:
              (l.itemId && itemImageMap.get(l.itemId)) ||
              (l.imageUrl ? toMediaUrl(l.imageUrl) : null),
          })),
          ...services.map((s) => ({
            name: s.name,
            category: s.department || 'Event Services',
            quantity: s.quantity,
            unit: s.unit,
            unitPrice: s.unitPrice,
            amount: Number((s.quantity * s.unitPrice).toFixed(2)),
            imageUrl: null,
          })),
        ],
        isPerPerson: isPP,
        perPersonRate: isPP ? num(ppRate) : undefined,
        subTotal: totals.subTotal,
        discountAmount: totals.disc || undefined,
        extraChargesAmount: totals.extra || undefined,
        gstPercent: form.gstEnabled ? num(form.gstPercent) : 0,
        gstAmount: form.gstEnabled ? totals.gst : 0,
        grandTotal: totals.grandTotal,
        agreementStatus: d.agreementStatus,
        agreementAcceptedAt: d.agreementAcceptedAt ?? undefined,
        terms: form.terms,
        notes: form.notes,
        companyName: company?.name,
        companyTagline: company?.tagline,
        companyLogoUrl: logoBase64,
        companyPhone: '+91 9745684766',
        companyEmail: 'info@thankamevents.in',
        companyAddress: 'Uliyacovil, Kollam, Kerala',
        isAdminGenerated: true,
      });
      setAgHtml(html);
      setAgOpen(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to generate agreement');
    } finally {
      setAgLoading(false);
    }
  };

  /* ── Catalog helpers ── */
  const catalogCategories = useMemo(
    () => Array.from(new Set(catalog.map((c) => c.categoryName))).sort(),
    [catalog],
  );

  /* ── Live Backend Catalog Search ── */
  useEffect(() => {
    const q = catSearch.trim();
    if (!q) {
      setBackendItems(null);
      setCatSearching(false);
      return;
    }

    setCatSearching(true);
    const timer = setTimeout(() => {
      itemsService
        .list(1, 100, q, catFilter || undefined)
        .then((res) => {
          const items: CatalogItem[] = res.data.map((item) => ({
            id: item.id,
            name: item.name,
            unit: item.unit,
            basePrice: Number(item.basePrice ?? 0),
            imageUrl: (item as any).imageUrl,
            categoryName: item.category?.name ?? 'Dishes',
          }));
          setBackendItems(items);
        })
        .catch((err) => {
          console.error('Failed to search items from backend:', err);
          setBackendItems(null);
        })
        .finally(() => {
          setCatSearching(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [catSearch, catFilter]);

  const visibleCatalog = useMemo(() => {
    let list: CatalogItem[];
    if (backendItems !== null) {
      list = backendItems;
    } else {
      const q = catSearch.toLowerCase().trim();
      list = catalog.filter(
        (c) =>
          (!catFilter || c.categoryName === catFilter) &&
          (!q || c.name.toLowerCase().includes(q)),
      );
    }

    // Smart De-duplication: Collapse identical dish names across redundant categories
    const map = new Map<string, CatalogItem>();
    for (const item of list) {
      const norm = item.name.trim().toLowerCase();
      if (!map.has(norm)) {
        map.set(norm, { ...item });
      } else {
        const existing = map.get(norm)!;
        if (!existing.categoryName.toLowerCase().includes(item.categoryName.toLowerCase())) {
          existing.categoryName = `${existing.categoryName} / ${item.categoryName}`;
        }
      }
    }
    return Array.from(map.values());
  }, [catalog, backendItems, catSearch, catFilter]);

  const selectedIds = useMemo(
    () => new Set(lines.map((l) => l.itemId).filter(Boolean)),
    [lines],
  );

  const selectedNames = useMemo(
    () => new Set(lines.map((l) => l.name.trim().toLowerCase())),
    [lines],
  );

  const toggleItem = (c: CatalogItem) => {
    const norm = c.name.trim().toLowerCase();
    const existingIndex = lines.findIndex(
      (l) => l.itemId === c.id || l.name.trim().toLowerCase() === norm,
    );
    if (existingIndex >= 0) {
      setLines((prev) => prev.filter((_, idx) => idx !== existingIndex));
    } else {
      setLines((prev) => [
        ...prev,
        {
          key: key(),
          itemId: c.id,
          name: c.name,
          category: c.categoryName,
          quantity: num(form.guestCount) || 1,
          unit: sanitizeUnit(c.unit),
          unitPrice: 0,
          imageUrl: c.imageUrl ?? null,
        },
      ]);
    }
  };

  const importMenu = (menu: MenuRow) => {
    const existing = new Set(lines.map((l) => l.itemId).filter(Boolean));
    const newLines = menu.menuItems
      .filter((mi) => !existing.has(mi.item.id))
      .map((mi) => {
        const cat = catalog.find((c) => c.id === mi.item.id);
        return {
          key: key(),
          itemId: mi.item.id,
          name: mi.item.name,
          category: cat?.categoryName ?? 'Menu Items',
          quantity: num(form.guestCount) || 1,
          unit: sanitizeUnit(mi.item.unit),
          unitPrice: 0,
        };
      });
    setLines((prev) => [...prev, ...newLines]);
    setMenuPickerOpen(false);
    toast.success(
      `Imported ${newLines.length} item${newLines.length !== 1 ? 's' : ''} from "${menu.name}"`,
    );
  };

  /* ── Filtered rows ── */
  const filteredRows = useMemo(() => {
    const adminOnly = rows.filter((r) => r.source !== 'CUSTOMER_PORTAL');
    const q = listSearch.trim().toLowerCase();

    return adminOnly.filter((r) => {
      if (statusFilter === 'FINALIZED' && r.status !== 'FINALIZED') return false;
      if (statusFilter === 'DRAFT' && r.status !== 'DRAFT') return false;
      if (statusFilter === 'ACCEPTED' && r.agreementStatus !== 'ACCEPTED') return false;

      if (!q) return true;
      return (
        r.quotationNumber?.toLowerCase().includes(q) ||
        r.customerName?.toLowerCase().includes(q) ||
        r.customerPhone?.toLowerCase().includes(q) ||
        r.eventType?.toLowerCase().includes(q)
      );
    });
  }, [rows, listSearch, statusFilter]);

  const totals = useMemo(
    () => computeTotals(lines, services, form, mode, ppRate),
    [lines, services, form, mode, ppRate],
  );

  /* ── Event Services helpers ── */
  const visibleServices = useMemo(() => {
    return searchEventServices(svcSearch, svcDeptFilter);
  }, [svcSearch, svcDeptFilter]);

  const addServiceItem = (item: (typeof ATOMIC_EVENT_SERVICES)[number]) => {
    setServices((prev) => [
      ...prev,
      {
        key: key(),
        name: item.name,
        department: item.department,
        quantity: 1,
        unit: item.defaultUnit,
        unitPrice: item.defaultPrice,
      },
    ]);
    toast.success(`Added ${item.name}`);
  };

  const addCustomService = () => {
    setServices((prev) => [
      ...prev,
      {
        key: key(),
        name: '',
        department: 'Event Services',
        quantity: 1,
        unit: 'unit',
        unitPrice: 0,
      },
    ]);
  };

  /* ── 1-Click Event Presets (Owner Express Mode) ── */
  const applyWeddingSadhyaPreset = () => {
    setMode('PER_PERSON');
    if (!ppRate || num(ppRate) === 0) {
      setPpRate('230');
    }

    const sadhyaKeywords = [
      'Pachadi',
      'Kichadi',
      'Madhura Pachadi',
      'Aviyal',
      'Thoran',
      'Inchi',
      'Manga',
      'Naranga',
      'Theeyal',
      'Koottu Curry',
      'Pavakka Kondattam',
      'Kappa Mulak',
      'Parippu Vada',
      'Ada Pradhaman',
      'Semiya Payasam',
      'Kadala Payasam',
      'Parippu Neyyu',
      'Sambar',
      'Pulisheri',
      'Rasam',
      'Pacha Moru',
      'Sharakkaraperatty',
      'Chips',
      'Pappadam',
      'Pazham',
      'Vazha Ela',
    ];

    const currentNames = new Set(lines.map((l) => l.name.trim().toLowerCase()));
    const newItems: LineItem[] = [];

    for (const kw of sadhyaKeywords) {
      const lowerKw = kw.toLowerCase();
      const matched = catalog.find((c) => {
        const cLower = c.name.toLowerCase();
        return cLower.includes(lowerKw);
      });

      const itemName = matched ? matched.name : kw;
      if (currentNames.has(itemName.toLowerCase())) continue;
      currentNames.add(itemName.toLowerCase());

      newItems.push({
        key: key(),
        itemId: matched?.id || `preset-${key()}`,
        name: itemName,
        category: matched?.categoryName || 'SADYA',
        quantity: num(form.guestCount) || 1,
        unit: sanitizeUnit(matched?.unit),
        unitPrice: 0,
        imageUrl: matched?.imageUrl ?? null,
      });
    }

    if (newItems.length > 0) {
      setLines((prev) => [...prev, ...newItems]);
      toast.success(`Loaded ${newItems.length} Wedding Sadhya items @ ₹230/guest`);
    } else {
      toast.info('All Wedding Sadhya items are already added.');
    }
  };

  const applyBiriyaniPreset = () => {
    setMode('PER_PERSON');
    setPpRate('220');

    const keywords = ['Chicken Dum Biriyani', 'Raita', 'Pickle', 'Sulaimani', 'Payasam'];
    const currentNames = new Set(lines.map((l) => l.name.trim().toLowerCase()));
    const newItems: LineItem[] = [];

    for (const kw of keywords) {
      const lowerKw = kw.toLowerCase();
      const matched = catalog.find((c) => c.name.toLowerCase().includes(lowerKw));
      const itemName = matched ? matched.name : kw;
      if (currentNames.has(itemName.toLowerCase())) continue;
      currentNames.add(itemName.toLowerCase());

      newItems.push({
        key: key(),
        itemId: matched?.id || `preset-${key()}`,
        name: itemName,
        category: matched?.categoryName || 'Dum Biriyani',
        quantity: num(form.guestCount) || 1,
        unit: sanitizeUnit(matched?.unit),
        unitPrice: 0,
        imageUrl: matched?.imageUrl ?? null,
      });
    }

    setLines(newItems);
    toast.success('Loaded Malabar Dum Biriyani Feast @ ₹220/guest');
  };

  const applyBuffetPreset = () => {
    setMode('PER_PERSON');
    setPpRate('280');

    const keywords = ['Appam', 'Porotta', 'Chicken', 'Beef', 'Rice', 'Salad', 'Payasam'];
    const currentNames = new Set(lines.map((l) => l.name.trim().toLowerCase()));
    const newItems: LineItem[] = [];

    for (const kw of keywords) {
      const lowerKw = kw.toLowerCase();
      const matched = catalog.find((c) => c.name.toLowerCase().includes(lowerKw));
      const itemName = matched ? matched.name : kw;
      if (currentNames.has(itemName.toLowerCase())) continue;
      currentNames.add(itemName.toLowerCase());

      newItems.push({
        key: key(),
        itemId: matched?.id || `preset-${key()}`,
        name: itemName,
        category: matched?.categoryName || 'Buffet Dishes',
        quantity: num(form.guestCount) || 1,
        unit: sanitizeUnit(matched?.unit),
        unitPrice: 0,
        imageUrl: matched?.imageUrl ?? null,
      });
    }

    setLines(newItems);
    toast.success('Loaded Kerala Grand Buffet Dinner @ ₹280/guest');
  };

  const applyLiveCountersPreset = () => {
    const guests = num(form.guestCount) || 500;
    const existingNames = new Set(services.map((s) => s.name.trim().toLowerCase()));
    const itemsToAdd: ServiceLineItem[] = [];

    const stall1 = 'Tea Shop Live — Tea, Coffee, Sulaimani, Horlicks, Boost';
    if (!existingNames.has(stall1.toLowerCase())) {
      itemsToAdd.push({
        key: key(),
        name: stall1,
        department: 'LIVE_STALLS',
        quantity: 1,
        unit: 'setup',
        unitPrice: 0,
        description: 'Live traditional Kerala chaya thattukada with hot tea, filter coffee, sulaimani, horlicks & boost',
      });
    }

    const stall2 = 'Juice Counter Live — Pineapple, Watermelon, Grape, Mojito, Mint Lime';
    if (!existingNames.has(stall2.toLowerCase())) {
      itemsToAdd.push({
        key: key(),
        name: stall2,
        department: 'LIVE_STALLS',
        quantity: guests,
        unit: 'person',
        unitPrice: 30,
        description: 'Live fresh seasonal fruit juice & mocktail counter for guests',
      });
    }

    const stall3 = 'Snacks Live — Pazham Pori, Bajji (2 Types), Veg Nuggets, Parippu Vada';
    if (!existingNames.has(stall3.toLowerCase())) {
      itemsToAdd.push({
        key: key(),
        name: stall3,
        department: 'LIVE_STALLS',
        quantity: guests,
        unit: 'person',
        unitPrice: 25,
        description: 'Hot fresh evening live snack counter with pazham pori, 2 varieties of fresh bajji, veg nuggets & parippu vada',
      });
    }

    if (itemsToAdd.length > 0) {
      setServices((prev) => [...prev, ...itemsToAdd]);
      toast.success('Added Live Counters (Tea Shop, Juice Counter & Snack Counter)');
    } else {
      toast.info('Live Counters are already added.');
    }
  };

  const applyStageDecorPreset = () => {
    const title = 'Stage Decor — Stage Decoration, Photo Frame (2), Entrance Decor, Pathway Decor';
    const exists = services.some(
      (s) =>
        s.name.trim().toLowerCase() === title.toLowerCase() ||
        s.name.trim().toLowerCase().includes('stage decor'),
    );
    if (exists) {
      toast.info('Stage & Decor Package is already added.');
      return;
    }

    setServices((prev) => [
      ...prev,
      {
        key: key(),
        name: title,
        department: 'DECOR',
        quantity: 1,
        unit: 'setup',
        unitPrice: 120000,
        description: 'Grand wedding stage floral decor, couple seating backdrop, 2 selfie photo frames, entrance arch & pathway decor',
      },
    ]);
    toast.success('Added Stage & Venue Decor Package (₹1,20,000)');
  };

  const applyCeremonialPreset = () => {
    const existing = new Set(services.map((s) => s.name.trim().toLowerCase()));
    const itemsToAdd: ServiceLineItem[] = [];

    const item1 = 'Pooja Essentials, Sweekarana Mala, Bouquets, Nirapara & Nilavilakku';
    if (!existing.has(item1.toLowerCase())) {
      itemsToAdd.push({
        key: key(),
        name: item1,
        department: 'CEREMONIAL',
        quantity: 1,
        unit: 'setup',
        unitPrice: 0,
        description: 'Traditional pooja essentials kit, welcoming garlands (Sweekarana Mala), stage floral bouquets, nirapara with paddy & bronze nilavilakku',
      });
    }

    const item2 = 'Traditional Royal Manchal & Olakkuda Entry';
    if (!existing.has(item2.toLowerCase())) {
      itemsToAdd.push({
        key: key(),
        name: item2,
        department: 'CEREMONIAL',
        quantity: 1,
        unit: 'setup',
        unitPrice: 0,
        description: 'Ceremonial wedding palanquin (Manchal) & traditional royal palm leaf umbrella (Olakkuda) with bearers',
      });
    }

    const item3 = 'Dedicated Event Coordinator';
    if (!existing.has(item3.toLowerCase())) {
      itemsToAdd.push({
        key: key(),
        name: item3,
        department: 'STAFF',
        quantity: 1,
        unit: 'staff',
        unitPrice: 0,
        description: 'Dedicated on-site Thankam event coordinator managing ceremony flow and logistics',
      });
    }

    if (itemsToAdd.length > 0) {
      setServices((prev) => [...prev, ...itemsToAdd]);
      toast.success('Added Traditional Ceremonial, Pooja & Coordinator Kit');
    } else {
      toast.info('Ceremonial items are already added.');
    }
  };

  const applyNadaswaramPreset = () => {
    const title = 'Nadaswaram Instrumental Ensemble (2 Artists with Thavil)';
    const exists = services.some(
      (s) =>
        s.name.trim().toLowerCase().includes('nadhaswaram') ||
        s.name.trim().toLowerCase().includes('nadaswaram'),
    );
    if (exists) {
      toast.info('Nadaswaram is already added.');
      return;
    }

    setServices((prev) => [
      ...prev,
      {
        key: key(),
        name: title,
        department: 'PRODUCTION',
        quantity: 1,
        unit: 'artist pair',
        unitPrice: 7000,
        description: 'Traditional auspicious temple nadaswaram instrumental artist pair with thavil accompaniment',
      },
    ]);
    toast.success('Added Nadaswaram Ensemble (2 Artists) @ ₹7,000');
  };

  /* Group lines by category */
  const groupedLines = useMemo(() => {
    const map = new Map<string, LineItem[]>();
    for (const l of lines) {
      const cat = l.category?.trim() || 'Food Feast Dishes';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(l);
    }
    return Array.from(map.entries());
  }, [lines]);

  const hasDetail = selectedRow || isNew;

  return (
    <PageShell
      title="Quotations & Tax Invoicing Hub"
      subtitle="Craft professional wedding banquets, event service packages, digital contracts, and GST tax invoices."
    >
      {confirmModal}

      {/* 1. Executive Metrics Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Quotes</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-[#B8860B]">
              <FileText size={14} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{metrics.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Admin-crafted proposals</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Signed Agreements</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{metrics.acceptedCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Legally confirmed bookings</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Deal Value</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <TrendingUp size={14} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{formatInr(metrics.avgValue)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Per catering contract</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Pipeline</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Crown size={14} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-slate-900">
            {formatInr(metrics.totalPipeline)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Combined quotation value</p>
        </div>
      </div>

      {/* 2. Top Control & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs mb-5">
        <div className="relative min-w-0 flex-1 max-w-md">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder="Search quotations by #, customer, phone, or event..."
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-amber-500 focus:bg-white transition-all"
          />
          {listSearch && (
            <button
              onClick={() => setListSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={cn(
              'px-2.5 py-1 text-xs font-bold rounded-lg transition-all',
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100',
            )}
          >
            All ({rows.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('FINALIZED')}
            className={cn(
              'px-2.5 py-1 text-xs font-bold rounded-lg transition-all',
              statusFilter === 'FINALIZED'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100',
            )}
          >
            Finalized
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACCEPTED')}
            className={cn(
              'px-2.5 py-1 text-xs font-bold rounded-lg transition-all',
              statusFilter === 'ACCEPTED'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100',
            )}
          >
            Agreement Signed
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300 transition-colors"
            title="Refresh list"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={onNew}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#fc8019] px-4 text-xs font-bold text-white shadow-2xs hover:brightness-105 transition-all"
          >
            <Plus size={15} />
            <span>New Quotation</span>
          </button>
        </div>
      </div>

      {/* 3. Split Panel: Left List vs Right Workspace */}
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* LEFT: Quotation Cards Directory */}
        <div
          className={`space-y-2.5 lg:max-h-[calc(100vh-230px)] lg:overflow-y-auto pr-1 ${
            hasDetail ? 'hidden lg:block' : 'block'
          }`}
        >
          {filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <FileText size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-700">No quotations found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click &ldquo;New Quotation&rdquo; to build one.</p>
            </div>
          ) : (
            filteredRows.map((row) => {
              const active = selectedRow?.id === row.id && !isNew;
              const isAccepted = row.agreementStatus === 'ACCEPTED';
              const isFinalized = row.status === 'FINALIZED';

              return (
                <button
                  key={row.id}
                  onClick={() => void onSelectRow(row)}
                  className={cn(
                    'w-full rounded-2xl border p-3.5 text-left transition-all duration-150 select-none shadow-2xs',
                    active
                      ? 'border-amber-400 bg-amber-50/40 text-slate-900 ring-2 ring-inset ring-amber-500'
                      : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/80',
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        'font-mono text-xs font-black px-2 py-0.5 rounded-md border',
                        active
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-slate-100 text-slate-800 border-slate-200',
                      )}
                    >
                      {row.quotationNumber}
                    </span>

                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.2 rounded-full border',
                        isAccepted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isFinalized
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200',
                      )}
                    >
                      {isAccepted ? 'Agreement Signed' : isFinalized ? 'Finalized' : row.status}
                    </span>
                  </div>

                  <p className="text-xs font-bold truncate mt-1 text-slate-900">
                    {row.customerName}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                    {row.eventType && (
                      <span className="flex items-center gap-1 font-medium">
                        <PartyPopper size={11} className="text-amber-700" />
                        {row.eventType}
                      </span>
                    )}
                    {row.eventDate && (
                      <span className="flex items-center gap-1 font-mono">
                        <CalendarDays size={11} />
                        {new Date(row.eventDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Total Quote
                    </span>
                    <span className="text-xs font-mono font-black text-slate-900">
                      {formatInr(row.grandTotal)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* RIGHT: Active Quotation Workspace & Editor */}
        {!hasDetail ? (
          <div className="hidden items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white lg:flex min-h-[460px]">
            <div className="p-10 text-center">
              <FileText size={44} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-700 text-sm">Select a quotation from the list</p>
              <p className="mt-1 text-xs text-slate-400">
                or click &ldquo;New Quotation&rdquo; above to assemble an event feast and services proposal.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#D4AF37]" />
              <p className="mt-3 text-xs font-bold text-slate-500">Loading quotation details...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 lg:max-h-[calc(100vh-230px)] lg:overflow-y-auto lg:pr-1">
            {/* Editor Action Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRow(null);
                    setIsNew(false);
                  }}
                  className="lg:hidden inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700"
                >
                  <ArrowLeft size={13} />
                  <span>List</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                    <Utensils size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {isNew ? 'Create New Proposal' : 'Quotation & Invoice Record'}
                    </span>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      {isNew ? 'New Event Quotation' : selectedRow?.quotationNumber}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                {!isNew && (
                  <>
                    {/* Tax Invoice Modal Button */}
                    <button
                      type="button"
                      onClick={() => setInvoiceOpen(true)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#D4AF37]/60 bg-amber-50/60 px-3 text-xs font-bold text-[#B8860B] transition-all hover:bg-amber-100 shadow-2xs"
                      title="View printable tax invoice (GST)"
                    >
                      <Receipt size={13} />
                      <span>Tax Invoice</span>
                    </button>

                    {/* PDF Quote Button */}
                    <button
                      type="button"
                      onClick={onPdf}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 transition-colors shadow-2xs"
                      title="Download quotation PDF"
                    >
                      <Download size={13} />
                      <span>Quote PDF</span>
                    </button>

                    {/* Digital Agreement Button */}
                    <button
                      type="button"
                      onClick={() => void onAgreement()}
                      disabled={agLoading}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                      title="Review digital agreement"
                    >
                      {agLoading ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
                      ) : (
                        <FileCheck2 size={13} />
                      )}
                      <span>Agreement</span>
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => void onDelete()}
                      className="grid h-8 w-8 place-items-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                      title="Delete quotation"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ── 4-STEP WIZARD PROGRESS TRACKER ── */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {/* Step 1 Pill */}
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl p-2.5 text-left transition-all',
                    activeStep === 1
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700',
                  )}
                >
                  <div
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black transition-colors',
                      activeStep === 1
                        ? 'bg-[#D4AF37] text-slate-950 font-black'
                        : form.customerName
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-white border border-slate-200 text-slate-500',
                    )}
                  >
                    {activeStep !== 1 && form.customerName ? <Check size={13} className="stroke-[3]" /> : '1'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider truncate">
                      1. Client &amp; Event
                    </p>
                    <p className={cn('text-[10px] truncate', activeStep === 1 ? 'text-slate-300' : 'text-slate-500')}>
                      {form.customerName || 'Name, Date, Guests'}
                    </p>
                  </div>
                </button>

                {/* Step 2 Pill */}
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl p-2.5 text-left transition-all',
                    activeStep === 2
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700',
                  )}
                >
                  <div
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black transition-colors',
                      activeStep === 2
                        ? 'bg-[#D4AF37] text-slate-950 font-black'
                        : lines.length > 0
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-white border border-slate-200 text-slate-500',
                    )}
                  >
                    {activeStep !== 2 && lines.length > 0 ? <Check size={13} className="stroke-[3]" /> : '2'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider truncate">
                      2. Food Feast
                    </p>
                    <p className={cn('text-[10px] truncate', activeStep === 2 ? 'text-slate-300' : 'text-slate-500')}>
                      {lines.length > 0 ? `${lines.length} Items · ${ppRate ? `₹${ppRate}/pp` : 'Custom'}` : 'Sadhya / Biriyani'}
                    </p>
                  </div>
                </button>

                {/* Step 3 Pill */}
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl p-2.5 text-left transition-all',
                    activeStep === 3
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700',
                  )}
                >
                  <div
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black transition-colors',
                      activeStep === 3
                        ? 'bg-[#D4AF37] text-slate-950 font-black'
                        : services.length > 0
                        ? 'bg-purple-100 text-purple-900 border border-purple-200'
                        : 'bg-white border border-slate-200 text-slate-500',
                    )}
                  >
                    {activeStep !== 3 && services.length > 0 ? <Check size={13} className="stroke-[3]" /> : '3'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider truncate">
                      3. Decor &amp; Services
                    </p>
                    <p className={cn('text-[10px] truncate', activeStep === 3 ? 'text-slate-300' : 'text-slate-500')}>
                      {services.length > 0 ? `${services.length} Added (${formatInr(totals.servicesSub)})` : 'Stage, Pooja, Audio'}
                    </p>
                  </div>
                </button>

                {/* Step 4 Pill */}
                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl p-2.5 text-left transition-all',
                    activeStep === 4
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700',
                  )}
                >
                  <div
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black transition-colors',
                      activeStep === 4
                        ? 'bg-[#D4AF37] text-slate-950 font-black'
                        : 'bg-white border border-slate-200 text-slate-500',
                    )}
                  >
                    4
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider truncate">
                      4. Review &amp; Bill
                    </p>
                    <p className={cn('text-[10px] font-mono font-bold truncate', activeStep === 4 ? 'text-amber-400' : 'text-[#B8860B]')}>
                      {formatInr(totals.grandTotal)}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* ── STEP 1: CLIENT & EVENT SPECIFICATIONS ─────────────────── */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeStep === 1 && (
              <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden animate-in fade-in-50 duration-200">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <User size={14} className="text-[#B8860B]" /> Step 1 of 4: Client &amp; Event Specifications
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Enter client contact, wedding/event venue, and estimated guests.
                    </p>
                  </div>
                  {form.customerPhone && (
                    <a
                      href={`https://wa.me/91${form.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hello ${form.customerName}, regarding quotation ${selectedRow?.quotationNumber || ''} for ${form.eventType}...`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl hover:bg-emerald-100 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>WhatsApp Client</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                <div className="p-6 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Customer Name" required>
                      <Input
                        value={form.customerName}
                        onChange={(e) => setForm((s) => ({ ...s, customerName: e.target.value }))}
                        placeholder="e.g. Mr. Sivaprasad R"
                        className="text-xs font-semibold h-10"
                      />
                    </FormField>

                    <FormField label="Contact Phone" required>
                      <Input
                        value={form.customerPhone}
                        onChange={(e) => setForm((s) => ({ ...s, customerPhone: e.target.value }))}
                        placeholder="e.g. 9745684766"
                        inputMode="numeric"
                        className="text-xs font-mono h-10"
                      />
                    </FormField>
                  </div>

                  <FormField label="Customer Address &amp; Delivery Location">
                    <Textarea
                      value={form.customerAddress}
                      rows={2}
                      onChange={(e) => setForm((s) => ({ ...s, customerAddress: e.target.value }))}
                      placeholder="e.g. Uliyacovil, Kollam, Kerala"
                      className="text-xs"
                    />
                  </FormField>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField label="Event Date" required>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                          value={parseDateVal(form.eventDate)}
                          onChange={(val) => setForm((s) => ({ ...s, eventDate: formatDateVal(val) }))}
                          format="dd/MM/yyyy"
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              size: 'small',
                              sx: {
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: '0.75rem',
                                  height: '40px',
                                  backgroundColor: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  '& fieldset': { border: 'none' },
                                  '&:hover': { backgroundColor: '#fff', borderColor: '#D4AF37' },
                                  '&.Mui-focused': { backgroundColor: '#fff', border: '1px solid #D4AF37' },
                                },
                                '& .MuiInputLabel-root': { display: 'none' },
                                '& .MuiInputBase-input': { fontSize: '0.75rem', fontWeight: 600 },
                              },
                            },
                          }}
                        />
                      </LocalizationProvider>
                    </FormField>

                    <FormField label="Event Type" required>
                      <SelectInput
                        value={form.eventType}
                        onChange={(e) => setForm((s) => ({ ...s, eventType: e.target.value }))}
                        className="h-10 text-xs font-semibold"
                      >
                        <option value="">— Select Type —</option>
                        {EVENT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </SelectInput>
                    </FormField>

                    <FormField label="Venue Location" required>
                      <SelectInput
                        value={form.venue}
                        onChange={(e) => setForm((s) => ({ ...s, venue: e.target.value }))}
                        className="h-10 text-xs font-semibold"
                      >
                        <option value="">— Select Venue —</option>
                        {VENUES.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </SelectInput>
                    </FormField>

                    <FormField label="Estimated Guests" required>
                      <Input
                        type="number"
                        min={1}
                        value={form.guestCount}
                        onChange={(e) => setForm((s) => ({ ...s, guestCount: e.target.value }))}
                        placeholder="e.g. 500"
                        className="h-10 text-xs font-mono font-bold"
                      />
                    </FormField>
                  </div>

                  {/* Step 1 Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400">
                      💡 Tip: Setting accurate guest count auto-calculates total feast pricing.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (!form.customerName.trim()) {
                          toast.error('Please enter Customer Name to proceed');
                          return;
                        }
                        setActiveStep(2);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-[#F3CA52] hover:bg-slate-800 transition-all shadow-md"
                    >
                      <span>Next: Food Feast &amp; Catering (Step 2)</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* ── STEP 2: FOOD FEAST & LIVE COUNTERS ─────────────────────── */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeStep === 2 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                {/* 1-Tap Kerala Feast Packages */}
                <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-amber-50/90 p-5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-amber-200/60">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#080C14] text-[#F3CA52] shadow-2xs">
                        <UtensilsCrossed size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                          1-Tap Kerala Feast Selection (Instant Menu Packages)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Tap any feast below to instantly load all authentic dishes and rates without manual searching.
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-amber-100/90 border border-amber-300 px-3 py-1 text-[11px] font-bold text-amber-900 shadow-2xs">
                      ⚡ 1-Click Menu Setup
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3.5">
                    {/* Sadhya Feast Card */}
                    <button
                      type="button"
                      onClick={applyWeddingSadhyaPreset}
                      className={cn(
                        'flex flex-col justify-between rounded-2xl border p-4 text-left transition-all group bg-white',
                        lines.length >= 20
                          ? 'border-[#B8860B] ring-2 ring-[#B8860B]/20 shadow-md'
                          : 'border-amber-200/80 hover:border-[#D4AF37] hover:shadow-xs',
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-800">
                            Traditional Veg
                          </span>
                          <span className="font-mono text-xs font-black text-[#B8860B]">
                            ₹230 / guest
                          </span>
                        </div>
                        <p className="text-sm font-black text-slate-900 group-hover:text-[#B8860B] flex items-center gap-1.5">
                          <span>🍛</span>
                          <span>Wedding Sadhya (24 Items)</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          13 Thodukari, 3 Payasams (Ada, Semiya, Kadala), 5 Ozhippu (Sambar, Rasam, Pulisheri...) &amp; Staples.
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-[#B8860B]">
                          {lines.length >= 20 ? '✓ Sadhya Loaded' : 'Load Sadhya Feast →'}
                        </span>
                        <span className="text-slate-400 font-mono">24 Dishes</span>
                      </div>
                    </button>

                    {/* Dum Biriyani Feast Card */}
                    <button
                      type="button"
                      onClick={applyBiriyaniPreset}
                      className="flex flex-col justify-between rounded-2xl border border-amber-200/80 bg-white p-4 text-left hover:border-[#D4AF37] hover:shadow-xs transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-black uppercase text-amber-800">
                            Non-Veg Special
                          </span>
                          <span className="font-mono text-xs font-black text-[#B8860B]">
                            ₹220 / guest
                          </span>
                        </div>
                        <p className="text-sm font-black text-slate-900 group-hover:text-[#B8860B] flex items-center gap-1.5">
                          <span>🍗</span>
                          <span>Malabar Dum Biriyani</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          Chicken Dum Biriyani, Onion Raita, Date Pickle, Hot Sulaimani &amp; Rich Payasam.
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-[#B8860B]">Load Biriyani Feast →</span>
                        <span className="text-slate-400 font-mono">5 Items</span>
                      </div>
                    </button>

                    {/* Buffet Dinner Card */}
                    <button
                      type="button"
                      onClick={applyBuffetPreset}
                      className="flex flex-col justify-between rounded-2xl border border-amber-200/80 bg-white p-4 text-left hover:border-[#D4AF37] hover:shadow-xs transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[9px] font-black uppercase text-purple-800">
                            Grand Buffet
                          </span>
                          <span className="font-mono text-xs font-black text-[#B8860B]">
                            ₹280 / guest
                          </span>
                        </div>
                        <p className="text-sm font-black text-slate-900 group-hover:text-[#B8860B] flex items-center gap-1.5">
                          <span>🍽️</span>
                          <span>Kerala Grand Buffet</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          Appam, Porotta, Chicken/Beef Roast, Jeera Rice, Fresh Salad &amp; Payasam.
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-[#B8860B]">Load Buffet Feast →</span>
                        <span className="text-slate-400 font-mono">7 Items</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Pricing & Rate / Guest Config */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Catering Pricing Structure
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Select whether billing is based on a flat per-guest plate rate or individual item pricing.
                      </p>
                    </div>

                    {/* Mode Toggle */}
                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                      <button
                        type="button"
                        onClick={() => setMode('PER_PERSON')}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                          mode === 'PER_PERSON'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900',
                        )}
                      >
                        Per Guest Rate (Default)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('PER_ITEM')}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                          mode === 'PER_ITEM'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900',
                        )}
                      >
                        Item-wise Pricing
                      </button>
                    </div>
                  </div>

                  {mode === 'PER_PERSON' ? (
                    <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="w-full sm:w-64">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Rate per Guest (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">
                            ₹
                          </span>
                          <Input
                            type="number"
                            min={0}
                            value={ppRate}
                            onChange={(e) => setPpRate(e.target.value)}
                            placeholder="e.g. 230"
                            className="h-11 pl-8 text-sm font-mono font-bold bg-slate-50 border-slate-200 focus:border-[#D4AF37]"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-5 py-3 text-right">
                        <span className="text-[10px] uppercase font-bold text-amber-900 block">
                          Total Food Subtotal ({form.guestCount || 0} Guests)
                        </span>
                        <span className="text-lg font-mono font-black text-slate-900">
                          {formatInr(totals.foodSub)}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {form.guestCount || 0} guests × {formatInr(num(ppRate))}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-4 text-xs text-slate-500">
                      Item-wise mode enabled: Enter individual dish prices in the customizer table below.
                    </div>
                  )}
                </div>

                {/* Collapsible Dishes Customizer */}
                <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Utensils size={14} className="text-[#B8860B]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Selected Dishes Menu ({lines.length} items)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDishesEditor((p) => !p)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      {showDishesEditor ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      <span>{showDishesEditor ? 'Collapse Dishes List' : 'View & Customize Dishes'}</span>
                    </button>
                  </div>

                  {showDishesEditor && (
                    <div className="p-5 space-y-4 border-b border-slate-100">
                      {/* Search Bar with Live Backend Search */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              value={catSearch}
                              onChange={(e) => setCatSearch(e.target.value)}
                              placeholder="Search 500+ dish catalog (e.g. Thoran, Aviyal, Chicken Biriyani)..."
                              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-7 text-xs outline-none focus:border-[#D4AF37]"
                            />
                            {catSearch && (
                              <button
                                type="button"
                                onClick={() => setCatSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                title="Clear search"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                          <SelectInput
                            value={catFilter}
                            onChange={(e) => setCatFilter(e.target.value)}
                            className="h-9 text-xs font-medium max-w-[160px]"
                          >
                            <option value="">All Categories</option>
                            {catalogCategories.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </SelectInput>
                        </div>

                        {/* Search Results list */}
                        <div className="max-h-44 overflow-y-auto p-1 space-y-0.5">
                          {catSearching ? (
                            <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-slate-500">
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-[#B8860B]" />
                              <span>Searching database for "{catSearch}"...</span>
                            </div>
                          ) : visibleCatalog.length === 0 ? (
                            <p className="py-3 text-center text-xs text-slate-400">
                              No dishes match {catSearch ? `"${catSearch}"` : ''}
                            </p>
                          ) : (
                            visibleCatalog.map((c) => {
                              const added = selectedIds.has(c.id) || selectedNames.has(c.name.trim().toLowerCase());
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => toggleItem(c)}
                                  className={cn(
                                    'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors',
                                    added ? 'bg-amber-100/70' : 'hover:bg-white',
                                  )}
                                >
                                  <span className="truncate">
                                    <span className={cn('font-semibold', added ? 'text-amber-950 font-bold' : 'text-slate-800')}>
                                      {c.name}
                                    </span>
                                    <span className="ml-2 text-[10px] text-slate-400 font-normal">
                                      {c.categoryName}
                                    </span>
                                  </span>
                                  <span
                                    className={cn(
                                      'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                      added
                                        ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                                        : 'bg-slate-200 text-slate-600 hover:bg-amber-500 hover:text-slate-950',
                                    )}
                                  >
                                    {added ? '✓' : '+'}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Selected Dishes Table */}
                      {lines.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <th className="px-3 py-2 text-left">Dish Menu Item</th>
                                {mode === 'PER_ITEM' && (
                                  <th className="w-32 px-2 py-2 text-right">Price (₹)</th>
                                )}
                                <th className="w-8 px-2 py-2" />
                              </tr>
                            </thead>
                            <tbody>
                              {groupedLines.map(([category, catLines]) => (
                                <tbody key={`cat-${category}`}>
                                  <tr className="bg-slate-50/70 border-b border-slate-100">
                                    <td
                                      colSpan={mode === 'PER_ITEM' ? 3 : 2}
                                      className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#B8860B]"
                                    >
                                      {category} ({catLines.length})
                                    </td>
                                  </tr>
                                  {catLines.map((l) => (
                                    <tr
                                      key={l.key}
                                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                                    >
                                      <td className="px-3 py-2 font-medium text-slate-900">
                                        {l.name}
                                      </td>
                                      {mode === 'PER_ITEM' && (
                                        <td className="px-2 py-2 text-right">
                                          <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={l.unitPrice || ''}
                                            onChange={(e) =>
                                              setLines((prev) =>
                                                prev.map((x) =>
                                                  x.key === l.key
                                                    ? { ...x, unitPrice: num(e.target.value) }
                                                    : x,
                                                ),
                                              )
                                            }
                                            className="h-7 w-24 rounded border border-slate-200 bg-white px-1.5 text-right text-xs font-mono font-bold ml-auto"
                                          />
                                        </td>
                                      )}
                                      <td className="px-2 py-2 text-center">
                                        <button
                                          type="button"
                                          onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                                          className="text-slate-300 hover:text-rose-600 transition-colors"
                                          title="Remove dish"
                                        >
                                          <X size={13} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary row when collapsed */}
                  {!showDishesEditor && (
                    <div className="p-4 bg-slate-50/60 flex items-center justify-between text-xs">
                      <span className="text-slate-600">
                        {lines.length > 0 ? (
                          <>
                            <strong>{lines.length} dishes</strong> currently added in this feast proposal.
                          </>
                        ) : (
                          'No dishes added yet. Choose a feast package above.'
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowDishesEditor(true)}
                        className="text-xs font-bold text-[#B8860B] hover:underline"
                      >
                        Customize Dishes →
                      </button>
                    </div>
                  )}
                </div>

                {/* Step 2 Footer */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <ArrowLeft size={13} />
                    <span>Back: Client Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-[#F3CA52] hover:bg-slate-800 transition-all shadow-md"
                  >
                    <span>Next: Decor &amp; Services (Step 3)</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* ── STEP 3: DECOR, PRODUCTION & EVENT SERVICES ─────────────── */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeStep === 3 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                {/* 1-Tap Major Service Packages */}
                <div className="rounded-2xl border border-purple-200/90 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-purple-50/70 p-5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-purple-200/60">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#080C14] text-[#F3CA52] shadow-2xs">
                        <Crown size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                          1-Tap Event Production &amp; Decor Packages
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Add stage decor, traditional rituals, live counters, and musical ensembles with single tap.
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-purple-100/90 border border-purple-300 px-3 py-1 text-[11px] font-bold text-purple-900 shadow-2xs">
                      ✨ Thankam Signature Services
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3.5">
                    {/* Stage & Venue Decor */}
                    <button
                      type="button"
                      onClick={applyStageDecorPreset}
                      className="flex flex-col justify-between rounded-2xl border border-purple-200/90 bg-white p-3.5 text-left hover:border-purple-400 hover:shadow-xs transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase text-purple-700">Stage Styling</span>
                          <span className="font-mono text-xs font-black text-purple-900">₹1,20,000</span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700 flex items-center gap-1">
                          <span>🌸</span>
                          <span>Stage &amp; Venue Decor</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                          Stage decor, couple backdrop, 2 selfie photo frames, entrance &amp; pathway.
                        </p>
                      </div>
                      <span className="mt-2.5 text-[10px] font-bold text-purple-700">
                        + Add Stage Package
                      </span>
                    </button>

                    {/* Live Stalls */}
                    <button
                      type="button"
                      onClick={applyLiveCountersPreset}
                      className="flex flex-col justify-between rounded-2xl border border-emerald-200/90 bg-white p-3.5 text-left hover:border-emerald-400 hover:shadow-xs transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase text-emerald-700">Live Stalls</span>
                          <span className="font-mono text-xs font-black text-emerald-800">+3 Stalls</span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 flex items-center gap-1">
                          <span>🍹</span>
                          <span>Live Counters Bundle</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                          Tea shop live, fresh juice counter (₹30) &amp; hot evening snacks (₹25).
                        </p>
                      </div>
                      <span className="mt-2.5 text-[10px] font-bold text-emerald-700">
                        + Add Live Counters
                      </span>
                    </button>

                    {/* Traditional Rituals */}
                    <button
                      type="button"
                      onClick={applyCeremonialPreset}
                      className="flex flex-col justify-between rounded-2xl border border-blue-200/90 bg-white p-3.5 text-left hover:border-blue-400 hover:shadow-xs transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase text-blue-700">Rituals</span>
                          <span className="font-mono text-xs font-black text-blue-900">Included</span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 flex items-center gap-1">
                          <span>🪔</span>
                          <span>Pooja &amp; Mala Suite</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                          Pooja kit, sweekarana mala, bouquets, nirapara, nilavilakku &amp; coordinator.
                        </p>
                      </div>
                      <span className="mt-2.5 text-[10px] font-bold text-blue-700">
                        + Add Ceremonial Kit
                      </span>
                    </button>

                    {/* Nadaswaram */}
                    <button
                      type="button"
                      onClick={applyNadaswaramPreset}
                      className="flex flex-col justify-between rounded-2xl border border-amber-200/90 bg-white p-3.5 text-left hover:border-[#D4AF37] hover:shadow-xs transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase text-[#B8860B]">Music Ensemble</span>
                          <span className="font-mono text-xs font-black text-[#B8860B]">₹7,000</span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-[#B8860B] flex items-center gap-1">
                          <span>🎺</span>
                          <span>Nadaswaram Ensemble</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                          Traditional auspicious 2-artist live nadaswaram pair with thavil.
                        </p>
                      </div>
                      <span className="mt-2.5 text-[10px] font-bold text-[#B8860B]">
                        + Add Nadaswaram
                      </span>
                    </button>
                  </div>
                </div>

                {/* Services Table Card */}
                <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-[#FAF9F6] px-5 py-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Added Services &amp; Event Rentals ({services.length})
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSvcSearch('');
                          setSvcDeptFilter('ALL');
                          setSvcPickerOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#D4AF37]/50 bg-amber-50/60 px-3 py-1.5 text-xs font-bold text-[#B8860B] hover:bg-amber-100 transition-colors shadow-2xs"
                      >
                        <Sparkles size={12} />
                        <span>Catalog</span>
                      </button>

                      <button
                        type="button"
                        onClick={addCustomService}
                        className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-slate-400"
                      >
                        <Plus size={12} />
                        <span>+ Custom Service</span>
                      </button>
                    </div>
                  </div>

                  {services.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                      <p className="font-semibold text-slate-700">No decor or rental services added yet.</p>
                      <p className="text-[11px] text-slate-400">
                        Click any signature package above or "+ Custom Service" to add items to this contract.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="border-b border-slate-100 bg-[#FAF9F6] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="px-4 py-2.5 text-left w-10">#</th>
                            <th className="px-4 py-2.5 text-left">Service Description</th>
                            <th className="px-4 py-2.5 text-right w-36">Price (₹)</th>
                            <th className="w-10 px-2 py-2.5" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {services.map((svc, sIdx) => (
                            <tr key={svc.key} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-4 py-2.5 text-slate-400 font-mono text-[11px]">{sIdx + 1}</td>
                              <td className="px-4 py-2.5">
                                <input
                                  type="text"
                                  value={svc.name}
                                  onChange={(e) =>
                                    setServices((prev) =>
                                      prev.map((s, i) => (i === sIdx ? { ...s, name: sanitizeServiceName(e.target.value) } : s)),
                                    )
                                  }
                                  placeholder="Service item title..."
                                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#D4AF37]"
                                />
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  value={svc.unitPrice}
                                  onChange={(e) =>
                                    setServices((prev) =>
                                      prev.map((s, i) =>
                                        i === sIdx ? { ...s, unitPrice: Number(e.target.value) || 0 } : s,
                                      ),
                                    )
                                  }
                                  className="h-8 w-32 text-right rounded-lg border border-slate-200 bg-white px-2 text-xs font-mono font-bold text-slate-900 focus:border-[#D4AF37] ml-auto"
                                />
                              </td>
                              <td className="px-2 py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => setServices((prev) => prev.filter((_, i) => i !== sIdx))}
                                  className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                                  title="Delete service"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="flex items-center justify-between border-t border-slate-100 bg-[#FAF9F6] px-5 py-3">
                        <span className="text-xs font-bold text-slate-600">Services &amp; Rentals Subtotal:</span>
                        <span className="text-sm font-mono font-black text-slate-900">
                          {formatInr(totals.servicesSub)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3 Footer */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <ArrowLeft size={13} />
                    <span>Back: Food Feast</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(4)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-[#F3CA52] hover:bg-slate-800 transition-all shadow-md"
                  >
                    <span>Next: Review &amp; Master Bill (Step 4)</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* ── STEP 4: REVIEW, PRICING & MASTER BILL ─────────────────── */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeStep === 4 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                {/* Executive Client & Event Brief Card */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-[#B8860B] border border-amber-200 shadow-2xs">
                        <Receipt size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                          Quotation Master Bill Overview
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Proposal for {form.customerName || 'Client'} · {form.eventType || 'Event'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveStep(1)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#B8860B] hover:underline"
                    >
                      <Edit3 size={12} />
                      <span>Edit Client Info</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
                      <span className="font-semibold text-slate-900">{form.customerName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                      <span className="font-mono font-semibold text-slate-900">{form.customerPhone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Date &amp; Venue</span>
                      <span className="font-semibold text-slate-900">
                        {form.eventDate ? new Date(form.eventDate).toLocaleDateString('en-IN') : '—'} · {form.venue || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Estimated Guests</span>
                      <span className="font-mono font-bold text-[#B8860B]">
                        {form.guestCount ? `${form.guestCount} Guests` : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Itemized Master Bill (Mirrors Owner Invoice #77) */}
                <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
                  <div className="border-b border-slate-100 bg-[#FAF9F6] px-5 py-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Itemized Master Bill
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      REF: {selectedRow?.quotationNumber || 'NEW DRAFT'}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {/* Section 1: Food & Catering */}
                    <div className="p-4 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 border border-amber-200">
                            CATERING FEAST
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {form.guestCount || 0} Guests × {formatInr(num(ppRate))}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {lines.length} items included in this feast menu.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono font-black text-slate-900">
                          {formatInr(totals.foodSub)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveStep(2)}
                          className="text-[11px] font-bold text-[#B8860B] hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    {/* Section 2: Services */}
                    {services.length > 0 && (
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Decor, Production &amp; Stalls ({services.length} items)
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveStep(3)}
                            className="text-[11px] font-bold text-[#B8860B] hover:underline"
                          >
                            Edit Services
                          </button>
                        </div>
                        {services.map((svc, i) => (
                          <div key={svc.key} className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-800 font-medium flex items-center gap-2">
                              <span className="text-slate-400 font-mono text-[10px]">{i + 1}.</span>
                              <span>{svc.name}</span>
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {formatInr(svc.unitPrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Commercial Settlement & Totals Box */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
                  <div className="grid gap-3.5 sm:grid-cols-3 border-b border-slate-100 pb-4">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        GST Tax {form.gstEnabled ? `(${form.gstPercent}%)` : '(Disabled)'}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setForm((s) => ({ ...s, gstEnabled: !s.gstEnabled }))}
                          className={cn(
                            'h-9 rounded-xl border px-3 text-xs font-bold transition-all',
                            form.gstEnabled
                              ? 'border-[#080C14] bg-[#080C14] text-[#F3CA52]'
                              : 'border-slate-200 text-slate-500',
                          )}
                        >
                          {form.gstEnabled ? 'ON' : 'OFF'}
                        </button>
                        {form.gstEnabled && (
                          <Input
                            type="number"
                            value={form.gstPercent}
                            onChange={(e) => setForm((s) => ({ ...s, gstPercent: e.target.value }))}
                            className="h-9 w-20 text-center font-mono text-xs font-bold"
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Discount Amount (₹)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={form.discountAmount}
                        onChange={(e) => setForm((s) => ({ ...s, discountAmount: e.target.value }))}
                        className="h-9 font-mono text-xs font-bold text-rose-600"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Extra Charges (₹)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={form.extraChargesAmount}
                        onChange={(e) => setForm((s) => ({ ...s, extraChargesAmount: e.target.value }))}
                        className="h-9 font-mono text-xs font-bold"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Totals Breakdown */}
                  <div className="space-y-2 text-xs">
                    {totals.foodSub > 0 && (
                      <div className="flex justify-between text-slate-500 font-medium">
                        <span>Catering Food Subtotal:</span>
                        <span className="font-mono">{formatInr(totals.foodSub)}</span>
                      </div>
                    )}
                    {totals.servicesSub > 0 && (
                      <div className="flex justify-between text-slate-500 font-medium">
                        <span>Event Services &amp; Rentals:</span>
                        <span className="font-mono">{formatInr(totals.servicesSub)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-800 font-bold border-t border-slate-100 pt-2">
                      <span>Gross Subtotal:</span>
                      <span className="font-mono">{formatInr(totals.subTotal)}</span>
                    </div>
                    {totals.disc > 0 && (
                      <div className="flex justify-between text-rose-600 font-medium">
                        <span>Discount (−):</span>
                        <span className="font-mono">−{formatInr(totals.disc)}</span>
                      </div>
                    )}
                    {form.gstEnabled && totals.gst > 0 && (
                      <div className="flex justify-between text-slate-600 font-medium">
                        <span>GST ({form.gstPercent}%):</span>
                        <span className="font-mono">+{formatInr(totals.gst)}</span>
                      </div>
                    )}

                    {/* Grand Total Bar */}
                    <div className="flex items-center justify-between rounded-2xl bg-amber-50/70 px-5 py-4 text-slate-900 border border-amber-200 shadow-2xs mt-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                          Contract Grand Total
                        </span>
                        <span className="text-xs text-slate-500">
                          {inWords(totals.grandTotal)}
                        </span>
                      </div>
                      <span className="text-xl font-black font-mono text-slate-900">
                        {formatInr(totals.grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Terms & Agreement Notes */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
                  <FormField label="Payment Conditions &amp; Agreement Terms">
                    <Textarea
                      value={form.terms}
                      rows={2}
                      onChange={(e) => setForm((s) => ({ ...s, terms: e.target.value }))}
                      placeholder="e.g. 50% advance on confirmation, remaining on event day..."
                      className="text-xs"
                    />
                  </FormField>

                  {/* Primary Save Action */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => void onSave()}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#fc8019] py-3.5 text-xs font-bold text-white shadow-md hover:brightness-105 disabled:opacity-50 transition-all"
                    >
                      {saving ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Send size={14} />
                      )}
                      <span>{saving ? 'Saving Proposal...' : isNew ? 'Create & Finalize Quotation' : 'Save Changes'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInvoiceOpen(true)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-900 py-3.5 text-xs font-bold text-[#F3CA52] hover:bg-slate-800 transition-all shadow-md"
                    >
                      <Receipt size={14} />
                      <span>Print Official Tax Invoice (GST)</span>
                    </button>
                  </div>
                </div>

                {/* Step 4 Footer */}
                <div className="flex items-center justify-start pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <ArrowLeft size={13} />
                    <span>Back: Decor &amp; Services</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Official Tax Invoice Modal (Format matches Owner's Invoice #76) ── */}
      {invoiceOpen && (
        <TaxInvoiceModal
          quotationNumber={selectedRow?.quotationNumber || '76'}
          customerName={form.customerName}
          customerPhone={form.customerPhone}
          customerAddress={form.customerAddress}
          eventType={form.eventType}
          eventDate={form.eventDate}
          venue={form.venue}
          guestCount={num(form.guestCount)}
          lines={lines}
          services={services}
          totals={totals}
          mode={mode}
          ppRate={ppRate}
          company={company}
          onClose={() => setInvoiceOpen(false)}
        />
      )}

      {/* ── Agreement Viewer Modal ── */}
      {agOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 text-slate-900 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAgOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Catering Agreement
                </p>
                <p className="text-sm font-bold text-slate-900">{selectedRow?.quotationNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const win = window.open('', '_blank', 'width=1000,height=750');
                  if (!win) {
                    toast.error('Allow pop-ups to print');
                    return;
                  }
                  win.document.write(agHtml);
                  win.document.close();
                  win.focus();
                  setTimeout(() => win.print(), 400);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Printer size={13} /> Print / Save PDF
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([agHtml], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = Object.assign(document.createElement('a'), {
                    href: url,
                    download: `${selectedRow?.quotationNumber}-agreement.html`,
                  });
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  setTimeout(() => URL.revokeObjectURL(url), 60000);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#fc8019] px-4 text-xs font-bold text-white shadow-2xs hover:brightness-105"
              >
                <Download size={13} /> Download
              </button>
            </div>
          </div>
          <iframe
            ref={agIframeRef}
            className="flex-1 w-full border-0"
            srcDoc={agHtml}
            title={`Agreement — ${selectedRow?.quotationNumber}`}
            sandbox="allow-same-origin allow-scripts allow-popups"
          />
        </div>
      )}

      {/* ── Services Catalog Picker Modal ── */}
      {svcPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-[#FAF9F6] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                  <Crown size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    Event Services &amp; Rentals Catalog
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Stage, lighting, generator, chairs, and staff
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSvcPickerOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-200/60 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="border-b border-slate-100 p-4 space-y-3 bg-white">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={svcSearch}
                  onChange={(e) => setSvcSearch(e.target.value)}
                  placeholder="Search services (e.g. stage, generator, edison, chairs, buffet)..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-medium text-slate-800 outline-none focus:border-[#D4AF37] focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSvcDeptFilter('ALL')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
                    svcDeptFilter === 'ALL'
                      ? 'bg-[#080C14] text-[#F3CA52] shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  All ({ATOMIC_EVENT_SERVICES.length})
                </button>
                {(Object.keys(SERVICE_DEPARTMENTS) as ServiceDepartment[]).map((dept) => {
                  const count = ATOMIC_EVENT_SERVICES.filter((s) => s.department === dept).length;
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setSvcDeptFilter(dept)}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
                        svcDeptFilter === dept
                          ? 'bg-[#080C14] text-[#F3CA52] shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                      )}
                    >
                      {SERVICE_DEPARTMENTS[dept as ServiceDepartment]?.icon}{' '}
                      {SERVICE_DEPARTMENTS[dept as ServiceDepartment]?.label || dept} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
              {visibleServices.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No services found matching your search.
                </div>
              ) : (
                visibleServices.map((svc) => {
                  const isAdded = services.some(
                    (s) => s.name.toLowerCase() === svc.name.toLowerCase(),
                  );
                  return (
                    <div
                      key={svc.id}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-amber-50/40 transition-colors"
                    >
                      <div className="pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{svc.name}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                            {svc.department}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400">{svc.description}</p>
                        <p className="mt-0.5 text-[10px] font-semibold text-[#B8860B]">
                          Default: {formatInr(svc.defaultPrice)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => addServiceItem(svc)}
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-2xs',
                          isAdded
                            ? 'border border-[#D4AF37] bg-amber-50 text-[#B8860B]'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-[#D4AF37] hover:text-[#B8860B]',
                        )}
                      >
                        {isAdded ? <CheckCircle2 size={13} /> : <Plus size={13} />}
                        <span>{isAdded ? 'Add More' : 'Add'}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 bg-[#FAF9F6] px-6 py-3.5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                {services.length} services currently added
              </span>
              <button
                type="button"
                onClick={() => setSvcPickerOpen(false)}
                className="rounded-xl bg-[#080C14] px-4 py-2 text-xs font-bold text-[#F3CA52] hover:bg-slate-800 transition-colors shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TaxInvoiceModal — Professional Tax Invoice Matching Owner's Form
───────────────────────────────────────────────────────────────── */
function TaxInvoiceModal({
  quotationNumber,
  customerName,
  customerPhone,
  customerAddress,
  eventType,
  eventDate,
  venue,
  guestCount,
  lines,
  services,
  totals,
  mode,
  ppRate,
  company,
  onClose,
}: {
  quotationNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  eventType: string;
  eventDate: string;
  venue: string;
  guestCount: number;
  lines: LineItem[];
  services: ServiceLineItem[];
  totals: ReturnType<typeof computeTotals>;
  mode: QuoteMode;
  ppRate: string;
  company: any;
  onClose: () => void;
}) {
  const isPP = mode === 'PER_PERSON';
  const foodRate = num(ppRate);

  const handlePrint = () => {
    window.print();
  };

  const invoiceNo = quotationNumber.startsWith('Q-')
    ? quotationNumber.replace('Q-', 'INV-')
    : `INV-${quotationNumber.replace(/\D/g, '') || '0076'}`;

  const formattedEventDate = eventDate
    ? new Date(eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
  const invoiceDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:z-auto print:overflow-visible">
      <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden print:max-h-none print:w-full print:max-w-none print:shadow-none print:border-none print:rounded-none">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="print:hidden flex shrink-0 items-center justify-between border-b border-slate-200 bg-[#080C14] px-6 py-3.5 text-white">
          <div className="flex items-center gap-2.5">
            <Receipt size={16} className="text-[#F3CA52]" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Official Tax Invoice (GST Registered)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F3CA52] px-4 py-2 text-xs font-bold text-[#080C14] hover:bg-amber-300 transition-colors shadow-2xs"
            >
              <Printer size={14} />
              <span>Print Invoice / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div className="w-full max-w-3xl bg-white p-6 sm:p-10 shadow-sm border border-slate-300 font-sans text-slate-900 rounded-lg print:border-none print:shadow-none print:p-0 print:max-w-none space-y-5">
            {/* 1. Header with Company Logo & GST Details */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border border-amber-400/40 bg-white p-1 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
                    <img
                      src={company?.logoUrl || '/assets/img/Thankam_Logo.png'}
                      alt="Thankam Events"
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/assets/img/Thankam_Logo.png';
                      }}
                    />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-950 tracking-tight leading-tight font-serif">
                      {company?.name || "THANKAM CATERING & EVENT'S"}
                    </h2>
                    <p className="text-[11px] font-bold text-amber-800 uppercase tracking-widest mt-0.5 font-sans">
                      {company?.tagline || 'Premier Catering & Event Management · Kollam, Kerala'}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      {company?.address || 'Uliyacovil, Kollam, Kerala — 691019'}
                    </p>
                    <p className="text-xs text-slate-800 font-medium mt-0.5 flex flex-wrap gap-x-3">
                      <span>Phone: <strong className="font-mono">{company?.phone || '+91 9745684766'}</strong></span>
                      <span>•</span>
                      <span>Email: <strong className="font-mono">{company?.email || 'info@thankamevents.in'}</strong></span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 border border-slate-300 bg-slate-50 p-2.5 rounded-lg text-xs space-y-0.5">
                  <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">GST Registration</div>
                  <div className="font-mono font-bold text-slate-950 text-xs">{company?.gstNumber || '32AABCT8849C1Z3'}</div>
                  <div className="text-[10px] text-slate-600 font-medium">State: Kerala (Code: 32)</div>
                </div>
              </div>

              {/* Tax Invoice Banner */}
              <div className="mt-4 pt-2.5 border-t border-slate-200 flex items-center justify-between">
                <span className="bg-slate-950 text-white font-serif text-xs font-bold uppercase tracking-[0.2em] px-4 py-1 rounded">
                  TAX INVOICE
                </span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Original for Recipient
                </span>
              </div>
            </div>

            {/* 2. Bill To & Invoice Details Grid (Two Balanced Columns with Border Separators) */}
            <div className="grid grid-cols-2 border border-slate-900 text-xs">
              <div className="p-3.5 border-r border-slate-900 space-y-1.5">
                <div className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                  Billed To / Customer Details:
                </div>
                <p className="font-bold text-sm text-slate-950">{customerName || 'Valued Customer'}</p>
                <div className="grid grid-cols-[65px_1fr] gap-1 text-slate-700">
                  <span className="font-medium text-slate-500">Phone:</span>
                  <span className="font-mono font-bold text-slate-900">{customerPhone || '—'}</span>
                  <span className="font-medium text-slate-500">Address:</span>
                  <span>{customerAddress || 'Kollam, Kerala'}</span>
                  <span className="font-medium text-slate-500">Venue:</span>
                  <span className="font-semibold text-slate-900">{venue || 'Client Venue'}</span>
                </div>
              </div>

              <div className="p-3.5 space-y-1.5">
                <div className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                  Invoice &amp; Event Reference:
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-1 text-slate-700">
                  <span className="font-medium text-slate-500">Invoice No:</span>
                  <span className="font-mono font-bold text-sm text-slate-950">{invoiceNo}</span>
                  <span className="font-medium text-slate-500">Invoice Date:</span>
                  <span className="font-mono font-bold text-slate-900">{invoiceDate}</span>
                  <span className="font-medium text-slate-500">Event Date:</span>
                  <span className="font-mono font-bold text-slate-900">{formattedEventDate}</span>
                  <span className="font-medium text-slate-500">Event Type:</span>
                  <span className="font-bold text-slate-900">{eventType || 'Special Event'}</span>
                  <span className="font-medium text-slate-500">Total Guests:</span>
                  <span className="font-mono font-bold text-slate-900">{guestCount} Pax</span>
                  <span className="font-medium text-slate-500">Place of Supply:</span>
                  <span className="font-medium text-slate-900">Kerala (32)</span>
                </div>
              </div>
            </div>

            {/* 3. Itemized Tax Invoice Table (Aligned Columns with Strict Cell Widths) */}
            <div className="border border-slate-900 overflow-hidden">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900 text-[10px] font-black uppercase text-slate-900">
                    <th className="border-r border-slate-900 p-2 text-center w-10">#</th>
                    <th className="border-r border-slate-900 p-2 text-left">Description of Goods / Services</th>
                    <th className="border-r border-slate-900 p-2 text-center w-20">HSN/SAC</th>
                    <th className="border-r border-slate-900 p-2 text-center w-14">Qty</th>
                    <th className="border-r border-slate-900 p-2 text-center w-14">Unit</th>
                    <th className="border-r border-slate-900 p-2 text-right w-24">Rate (₹)</th>
                    <th className="p-2 text-right w-28">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {/* Food Feast Package Row */}
                  <tr className="border-b border-slate-900">
                    <td className="border-r border-slate-900 p-2.5 text-center font-mono font-bold text-slate-900">1</td>
                    <td className="border-r border-slate-900 p-2.5">
                      <div className="font-bold text-slate-950 text-xs">
                        Catering Feast Banquet ({lines.length} items)
                      </div>
                      {lines.length > 0 && (
                        <div className="text-[10px] text-slate-500 italic mt-0.5 leading-relaxed">
                          {lines.map((l) => l.name).filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </td>
                    <td className="border-r border-slate-900 p-2.5 text-center font-mono text-slate-500">996331</td>
                    <td className="border-r border-slate-900 p-2.5 text-center font-mono font-semibold">{guestCount}</td>
                    <td className="border-r border-slate-900 p-2.5 text-center text-slate-600 font-medium">Pax</td>
                    <td className="border-r border-slate-900 p-2.5 text-right font-mono font-medium">
                      {isPP ? (foodRate > 0 ? foodRate.toFixed(2) : '—') : '—'}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-950">
                      {totals.foodSub.toFixed(2)}
                    </td>
                  </tr>

                  {/* Event Services Rows */}
                  {services.map((svc, idx) => {
                    const rowAmt = (svc.quantity || 1) * (svc.unitPrice || 0);
                    const parsed = formatServiceLineTitle(svc.name);
                    return (
                      <tr key={svc.key} className="border-b border-slate-900 last:border-b-0">
                        <td className="border-r border-slate-900 p-2.5 text-center font-mono font-bold text-slate-900">
                          {idx + 2}
                        </td>
                        <td className="border-r border-slate-900 p-2.5">
                          <div className="font-bold text-slate-950 text-xs">{parsed.title}</div>
                          {parsed.subtitle && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5 leading-relaxed">
                              {parsed.subtitle}
                            </div>
                          )}
                        </td>
                        <td className="border-r border-slate-900 p-2.5 text-center font-mono text-slate-500">998599</td>
                        <td className="border-r border-slate-900 p-2.5 text-center font-mono font-semibold">
                          {svc.quantity || 1}
                        </td>
                        <td className="border-r border-slate-900 p-2.5 text-center text-slate-600 font-medium">
                          {svc.unit || 'setup'}
                        </td>
                        <td className="border-r border-slate-900 p-2.5 text-right font-mono font-medium">
                          {Number(svc.unitPrice || 0).toFixed(2)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-950">
                          {rowAmt.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* 4. Structured Totals Footer Aligned with Amount Columns */}
              <div className="grid grid-cols-12 border-t-2 border-slate-900 text-xs bg-white">
                {/* Left 7 Columns: Amount in Words & Bank Details */}
                <div className="col-span-7 p-3.5 border-r border-slate-900 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="font-bold uppercase text-[10px] text-slate-500 block">
                      Amount Chargeable (in words):
                    </span>
                    <p className="font-bold text-slate-950 mt-0.5 font-serif text-sm">
                      {inWords(totals.grandTotal)}
                    </p>
                  </div>

                  <div className="border border-slate-200 bg-slate-50 p-2.5 rounded text-[11px] space-y-1">
                    <span className="font-bold uppercase text-[9px] text-slate-500 block">
                      Bank Details for Payment (NEFT / RTGS / UPI):
                    </span>
                    <div className="grid grid-cols-[90px_1fr] gap-0.5 text-slate-700">
                      <span>Bank Name:</span>
                      <strong className="text-slate-900">State Bank of India</strong>
                      <span>Account Name:</span>
                      <strong className="text-slate-900">{company?.name || "THANKAM CATERING & EVENT'S"}</strong>
                      <span>Account No:</span>
                      <strong className="font-mono text-slate-900">38947291048</strong>
                      <span>IFSC Code:</span>
                      <strong className="font-mono text-slate-900">SBIN0070051 (Kollam Main)</strong>
                      <span>UPI ID:</span>
                      <strong className="font-mono text-slate-900">9745684766@upi</strong>
                    </div>
                  </div>
                </div>

                {/* Right 5 Columns: Exact Totals Calculations Aligned Under Amounts */}
                <div className="col-span-5 p-3.5 space-y-1.5 divide-y divide-slate-200">
                  <div className="flex justify-between items-center text-slate-700 pb-1">
                    <span className="font-medium">Sub Total (Taxable):</span>
                    <span className="font-mono font-semibold text-slate-900">{formatInr(totals.subTotal)}</span>
                  </div>
                  {totals.disc > 0 && (
                    <div className="flex justify-between items-center text-rose-600 pt-1">
                      <span className="font-medium">Discount (−):</span>
                      <span className="font-mono font-semibold">−{formatInr(totals.disc)}</span>
                    </div>
                  )}
                  {totals.gst > 0 && totals.pct > 0 ? (
                    <>
                      <div className="flex justify-between items-center text-slate-700 pt-1">
                        <span className="font-medium">CGST ({(totals.pct / 2).toFixed(1)}%):</span>
                        <span className="font-mono font-semibold text-slate-900">+{formatInr(totals.gst / 2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700 pt-1">
                        <span className="font-medium">SGST ({(totals.pct / 2).toFixed(1)}%):</span>
                        <span className="font-mono font-semibold text-slate-900">+{formatInr(totals.gst / 2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center text-slate-500 pt-1">
                      <span className="font-medium">GST Tax:</span>
                      <span>Exempt / Nil (0%)</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t-2 border-slate-900 pt-2 text-sm font-black text-slate-950">
                    <span className="uppercase">Invoice Total:</span>
                    <span className="font-mono text-base">{formatInr(totals.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Terms & Signatures */}
            <div className="pt-2 flex justify-between items-end text-xs">
              <div className="text-[10px] text-slate-500 space-y-0.5 max-w-sm">
                <p className="font-semibold text-slate-700">Terms &amp; Conditions:</p>
                <p>1. Certified that all details in this tax invoice are true and correct.</p>
                <p>2. Subject to Kollam Jurisdiction.</p>
                <p>3. This is an official computer generated commercial tax invoice.</p>
              </div>

              <div className="text-right border border-slate-800 p-3.5 rounded min-w-[220px]">
                <p className="text-[10px] font-bold uppercase text-slate-700">
                  For {company?.name || "THANKAM CATERING & EVENT'S"}:
                </p>
                <div className="my-3 flex justify-center">
                  <div className="border-b border-dashed border-slate-400 w-36 text-center text-[10px] text-slate-400 italic py-1">
                    Authorized Signatory
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── FormField ─────────────────────────────────────────────── */
function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

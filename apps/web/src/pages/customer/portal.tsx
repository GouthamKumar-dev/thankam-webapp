import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  Armchair,
  ArrowLeft,
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  Circle,
  Clock,
  FileCheck2,
  FileText,
  Handshake,
  Home,
  IndianRupee,
  Layers3,
  MapPin,
  Package,
  Salad,
  Phone,
  Radio,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  TriangleAlert,
  UserRound,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FormDialog, FormDialogFooter } from "@/components/common/form-dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectInput } from "@/components/ui/select-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CategoryNode } from "@/features/categories/categories.service";
import { QuotationPayload } from "@/features/quotations/quotations.service";
import {
  createWorkflowSocket,
  type WorkflowEventPayload,
} from "@/features/quotations/workflow-socket";
import { customerPortalService } from "@/features/customer-portal/customer-portal.service";
import { playNotificationSound } from "@/features/notifications/notification-sound";
import { formatInr } from "@/utils/currency";
import { toMediaUrl } from "@/utils/media-url";
import { getRequestStatusTone, requestStatusLabel } from "@/utils/request-status";

type CustomerForm = {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  eventDate: string;
  eventType: string;
  venue: string;
  guestCount: string;
  notes: string;
};

type CatalogItem = {
  id: string;
  name: string;
  unit?: string;
  basePrice: number;
  imageUrl?: string;
  topCategory: string;
  subCategory: string;
  leafCategory: string;
  categoryPath: string;
};

const DEFAULT_GST = 18;
const CUSTOMER_PORTAL_TOKEN_KEY = "customer_portal_token";
const CUSTOMER_PORTAL_PROFILE_KEY = "customer_portal_profile";
const CUSTOMER_PORTAL_CART_KEY = "customer_portal_cart";
const CUSTOMER_PORTAL_NOTIFICATIONS_KEY = "customer_portal_notifications";
const EVENT_TYPE_OPTIONS = [
  "Wedding",
  "Engagement",
  "Birthday",
  "Corporate Event",
  "House Warming",
  "Reception",
  "Other",
];
const VENUE_OPTIONS = [
  "Home",
  "Auditorium",
  "Convention Center",
  "Hotel",
  "Temple",
  "Open Ground",
  "Other",
];
const TOP_CATEGORY_ICONS = {
  Food: UtensilsCrossed,
  Catering: UtensilsCrossed,
  Sadya: Salad,
  Packages: Package,
  "Stage Decoration": Sparkles,
  "Seating & Furniture": Armchair,
  "Audio & Visual": Radio,
  "Hospitality & Service": Handshake,
  "Photography & Media": Camera,
  default: Layers3,
};

type NotificationItem = {
  id: string;
  title: string;
  subtitle: string;
  quotationNumber?: string;
  status?: string;
  requestStatus?: string;
  eventType?: string;
  eventDate?: string;
  venue?: string;
  guestCount?: number;
  grandTotal?: number;
  agreementStatus?: string;
  createdAt?: string;
  isSocketEvent?: boolean;
  read?: boolean;
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    unit?: string;
    unitPrice?: number;
    amount?: number;
  }>;
};

export function CustomerPortalPage() {
  const navigate = useNavigate();
  const [catalogTree, setCatalogTree] = useState<CategoryNode[]>([]);
  const [companyLogo, setCompanyLogo] = useState("");
  const [companyName, setCompanyName] = useState("Thankam Events");
  const [companyTagline, setCompanyTagline] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>(
    () => readPersistedCart(),
  );
  const [activeTopCategory, setActiveTopCategory] = useState("");
  const [activeSubCategory, setActiveSubCategory] = useState("");
  const [activeLeafCategory, setActiveLeafCategory] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showStickyFilters, setShowStickyFilters] = useState(true);
  const [authRedirectTarget, setAuthRedirectTarget] = useState<
    "quotation" | "agreement" | "cart"
  >("quotation");
  const [authLoading, setAuthLoading] = useState(false);
  const [authPhone, setAuthPhone] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authOtpRequested, setAuthOtpRequested] = useState(false);
  const [authExistingCustomer, setAuthExistingCustomer] = useState(true);
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
  const [socketStatus, setSocketStatus] = useState<
    "idle" | "connecting" | "connected" | "disconnected"
  >("idle");
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const lastScrollYRef = useRef(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [form, setForm] = useState<CustomerForm>({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    eventDate: "",
    eventType: "",
    venue: "",
    guestCount: "100",
    notes: "",
  });

  useEffect(() => {
    document.body.style.overflow = showCart ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showCart]);

  useEffect(() => {
    setLoading(true);
    void customerPortalService
      .catalog()
      .then(setCatalogTree)
      .catch(() => toast.error("Unable to load catalog"))
      .finally(() => setLoading(false));

    void customerPortalService
      .websiteContent()
      .then((res) => {
        const c = res.company;
        if (c?.logoUrl)  setCompanyLogo(toMediaUrl(c.logoUrl));
        if (c?.name)     setCompanyName(c.name);
        if (c?.tagline)  setCompanyTagline(c.tagline);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "1") {
      setAuthModalOpen(true);
    }
    if (params.get("cart") === "1") {
      const token = localStorage.getItem(CUSTOMER_PORTAL_TOKEN_KEY);
      if (token) {
        setShowCart(true);
      } else {
        setAuthRedirectTarget("cart");
        setAuthModalOpen(true);
      }
    }
    const editId = params.get("edit");
    if (editId) {
      const token = localStorage.getItem(CUSTOMER_PORTAL_TOKEN_KEY);
      if (token) {
        void customerPortalService.myQuotationById(token, editId).then((q) => {
          setEditingQuotationId(editId);
          setForm({
            customerName: q.customerName ?? "",
            customerPhone: q.customerPhone ?? "",
            customerAddress: q.customerAddress ?? "",
            eventDate: q.eventDate ? q.eventDate.split("T")[0] : "",
            eventType: q.eventType ?? "",
            venue: q.venue ?? "",
            guestCount: String(q.guestCount ?? "100"),
            notes: q.notes ?? "",
          });
          const preCart: Record<string, number> = {};
          for (const item of q.items ?? []) {
            if (item.itemId) preCart[item.itemId] = Number(item.quantity);
          }
          setSelectedQty(preCart);
          setShowCart(true);
        });
      } else {
        setAuthRedirectTarget("quotation");
        setAuthModalOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(CUSTOMER_PORTAL_CART_KEY, JSON.stringify(selectedQty));
  }, [selectedQty]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(CUSTOMER_PORTAL_PROFILE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        name?: string;
        email?: string;
        phone?: string;
      };
      setProfileName(parsed.name ?? "");
      setProfileEmail(parsed.email ?? "");
      setProfilePhone(parsed.phone ?? "");
    } catch {
      // ignore invalid local profile
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = readPersistedNotifications();
    if (persisted.length > 0) {
      setNotificationItems(persisted);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      CUSTOMER_PORTAL_NOTIFICATIONS_KEY,
      JSON.stringify(notificationItems),
    );
  }, [notificationItems]);

  const allItems = useMemo(
    () => flattenCatalogItems(catalogTree),
    [catalogTree],
  );

  const topCategories = useMemo(() => {
    const categories = Array.from(
      new Set(allItems.map((item) => item.topCategory)),
    );
    const preferredOrder = [
      "Food",
      "Stage Decoration",
      "Seating & Furniture",
      "Audio & Visual",
      "Hospitality & Service",
      "Photography & Media",
      "Catering",
      "Sadya",
      "Packages",
    ];
    const preferred = preferredOrder.filter((name) =>
      categories.includes(name),
    );
    const remaining = categories.filter((name) => !preferred.includes(name));
    return [...preferred, ...remaining];
  }, [allItems]);

  useEffect(() => {
    if (topCategories.length === 0) return;
    if (!topCategories.includes(activeTopCategory)) {
      setActiveTopCategory(topCategories[0]);
      setActiveSubCategory("");
      setActiveLeafCategory("");
    }
  }, [topCategories, activeTopCategory]);

  const subCategories = useMemo(() => {
    if (!activeTopCategory) return [];
    return Array.from(
      new Set(
        allItems
          .filter((item) => item.topCategory === activeTopCategory)
          .map((item) => item.subCategory),
      ),
    );
  }, [allItems, activeTopCategory]);

  useEffect(() => {
    if (subCategories.length === 0) {
      if (activeSubCategory) {
        setActiveSubCategory("");
        setActiveLeafCategory("");
      }
      return;
    }

    if (!subCategories.includes(activeSubCategory)) {
      const preferred = ["GENERAL", "General", "Catering"].find((name) =>
        subCategories.includes(name),
      );
      setActiveSubCategory(preferred ?? subCategories[0]);
      setActiveLeafCategory("");
    }
  }, [subCategories, activeSubCategory]);

  const leafSubCategories = useMemo(() => {
    if (!activeTopCategory || !activeSubCategory) return [];
    return Array.from(
      new Set(
        allItems
          .filter(
            (item) =>
              item.topCategory === activeTopCategory &&
              item.subCategory === activeSubCategory,
          )
          .map((item) => item.leafCategory),
      ),
    ).filter((leaf) => leaf !== activeSubCategory);
  }, [allItems, activeTopCategory, activeSubCategory]);

  const topCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allItems) {
      counts[item.topCategory] = (counts[item.topCategory] ?? 0) + 1;
    }
    return counts;
  }, [allItems]);

  const subCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allItems) {
      if (item.topCategory !== activeTopCategory) continue;
      counts[item.subCategory] = (counts[item.subCategory] ?? 0) + 1;
    }
    return counts;
  }, [allItems, activeTopCategory]);

  const leafCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allItems) {
      if (item.topCategory !== activeTopCategory) continue;
      if (item.subCategory !== activeSubCategory) continue;
      counts[item.leafCategory] = (counts[item.leafCategory] ?? 0) + 1;
    }
    return counts;
  }, [allItems, activeTopCategory, activeSubCategory]);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let scoped = allItems;

    if (activeTopCategory) {
      scoped = scoped.filter((item) => item.topCategory === activeTopCategory);
    }

    if (activeSubCategory) {
      scoped = scoped.filter((item) => item.subCategory === activeSubCategory);
    }

    if (activeLeafCategory) {
      scoped = scoped.filter(
        (item) => item.leafCategory === activeLeafCategory,
      );
    }

    if (!needle) return scoped;
    return scoped.filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        item.categoryPath.toLowerCase().includes(needle) ||
        item.subCategory.toLowerCase().includes(needle) ||
        item.leafCategory.toLowerCase().includes(needle),
    );
  }, [
    allItems,
    search,
    activeTopCategory,
    activeSubCategory,
    activeLeafCategory,
  ]);

  const selectedItems = useMemo(
    () =>
      allItems
        .filter((item) => selectedQty[item.id] > 0)
        .map((item) => ({ ...item, quantity: selectedQty[item.id] })),
    [allItems, selectedQty],
  );

  const unreadNotificationCount = useMemo(
    () => notificationItems.filter((item) => !item.read).length,
    [notificationItems],
  );

  const onToggleItem = (item: CatalogItem) => {
    setSelectedQty((prev) => {
      if (prev[item.id]) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      return { ...prev, [item.id]: 1 };
    });
  };

  const onQuantityChange = (itemId: string, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    setSelectedQty((prev) => ({ ...prev, [itemId]: Math.max(parsed, 1) }));
  };

  const isAuthenticated =
    typeof window !== "undefined" &&
    Boolean(localStorage.getItem(CUSTOMER_PORTAL_TOKEN_KEY));
  const authenticatedPhone = useMemo(() => {
    if (typeof window === "undefined") return "";
    const token = localStorage.getItem(CUSTOMER_PORTAL_TOKEN_KEY);
    const tokenPhone = token ? extractPhoneFromPortalToken(token) : "";
    return tokenPhone || profilePhone || "";
  }, [profilePhone]);

  const fieldErrors = useMemo(() => {
    if (!submitAttempted) return {} as Record<string, string>;
    const errs: Record<string, string> = {};
    if (!sanitizeNameInput(form.customerName).trim()) errs.customerName = 'Full name is required';
    const phone = sanitizePhoneInput(authenticatedPhone || form.customerPhone);
    if (!/^\d{10}$/.test(phone)) errs.customerPhone = 'Enter a valid 10-digit number';
    if (!form.eventDate) errs.eventDate = 'Event date is required';
    if (!form.eventType) errs.eventType = 'Please select an event type';
    if (!form.venue) errs.venue = 'Please select a venue';
    const gc = Number.parseInt(form.guestCount, 10);
    if (!Number.isInteger(gc) || gc < 1) errs.guestCount = 'Enter a valid guest count';
    return errs;
  }, [submitAttempted, form, authenticatedPhone]);

  useEffect(() => {
    if (!authenticatedPhone) return;
    setForm((prev) => ({
      ...prev,
      customerPhone: sanitizePhoneInput(authenticatedPhone),
    }));
  }, [authenticatedPhone]);

  useEffect(() => {
    if (!profileName) return;
    setForm((prev) => ({
      ...prev,
      customerName: prev.customerName || sanitizeNameInput(profileName),
    }));
  }, [profileName]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onScroll = () => {
      const currentY = window.scrollY;
      const lastY = lastScrollYRef.current;
      const delta = currentY - lastY;

      if (currentY < 140) {
        setShowStickyFilters(true);
        lastScrollYRef.current = currentY;
        return;
      }

      if (delta > 8 && currentY > 220) {
        setShowStickyFilters(false);
      } else if (delta < -8) {
        setShowStickyFilters(true);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const loadTopbarData = async (accessToken?: string) => {
    const token =
      accessToken ??
      (typeof window !== "undefined"
        ? localStorage.getItem(CUSTOMER_PORTAL_TOKEN_KEY)
        : null);
    if (!token) {
      setNotificationItems([]);
      return;
    }
    try {
      const rows = await customerPortalService.myQuotations(token);
      setProfilePhone((prev) => prev || rows[0]?.customerPhone || "");
      setNotificationItems((prev) => {
        const readById = new Map(prev.map((item) => [item.id, Boolean(item.read)]));
        const mappedRows: NotificationItem[] = rows.slice(0, 20).map((row: any) => ({
          id: row.id,
          title: `${row.quotationNumber} - ${mapRequestStatus(row.requestStatus, row.status)}`,
          subtitle: `${row.eventType} - ${new Date(row.createdAt).toLocaleDateString()}`,
          quotationNumber: row.quotationNumber,
          status: row.status,
          requestStatus: row.requestStatus,
          eventType: row.eventType,
          eventDate: row.eventDate,
          venue: row.venue,
          guestCount: row.guestCount,
          grandTotal: row.grandTotal ? Number(row.grandTotal) : undefined,
          agreementStatus: row.agreementStatus,
          createdAt: row.createdAt,
          isSocketEvent: false,
          read: readById.get(row.id) ?? false,
          items: (row.items ?? []).map((i: any) => ({
            id: i.id,
            name: i.name,
            quantity: Number(i.quantity),
            unit: i.unit,
            unitPrice: Number(i.unitPrice ?? 0),
            amount: Number(i.amount ?? 0),
          })),
        }));

        const mappedIds = new Set(mappedRows.map((item) => item.id));
        const carryOver = prev
          .filter((item) => !mappedIds.has(item.id))
          .slice(0, 30);
        return [...mappedRows, ...carryOver].slice(0, 50);
      });
    } catch {
      // keep existing notifications if refresh fails
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem(CUSTOMER_PORTAL_TOKEN_KEY);
    if (!token) return;

    setSocketStatus("connecting");
    const socket = createWorkflowSocket({ token });

    const pushNotification = (
      title: string,
      subtitle: string,
      id?: string,
      extra?: Partial<NotificationItem>,
    ) => {
      setNotificationItems((prev) => {
        const nextId = id ?? `${Date.now()}-${Math.random()}`;
        const nextItem: NotificationItem = {
          id: nextId,
          title,
          subtitle,
          isSocketEvent: true,
          read: false,
          createdAt: new Date().toISOString(),
          ...extra,
        };
        const remaining = prev.filter((item) => item.id !== nextId);
        return [nextItem, ...remaining].slice(0, 50);
      });
      void playNotificationSound("customer");
    };

    const withTime = (message: string) =>
      `${message} - ${new Date().toLocaleTimeString()}`;

    socket.on("connect", () => setSocketStatus("connected"));
    socket.on("disconnect", () => setSocketStatus("disconnected"));

    socket.on("workflow:request.status", (payload: WorkflowEventPayload) => {
      pushNotification(
        `Request Updated: ${payload.quotationNumber}`,
        withTime(
          `Status: ${mapRequestStatus(payload.requestStatus, payload.status)}`,
        ),
        payload.quotationId,
        {
          quotationNumber: payload.quotationNumber,
          status: payload.status,
          requestStatus: payload.requestStatus,
          eventType: payload.eventType,
          eventDate: payload.eventDate,
          venue: payload.venue,
          guestCount: payload.guestCount,
          grandTotal: payload.grandTotal ? Number(payload.grandTotal) : undefined,
        },
      );
    });

    socket.on("workflow:quotation.status", (payload: WorkflowEventPayload) => {
      pushNotification(
        `Quotation Updated: ${payload.quotationNumber}`,
        withTime(payload.status === "FINALIZED" ? "Finalized" : "Reviewing"),
        payload.quotationId,
        {
          quotationNumber: payload.quotationNumber,
          status: payload.status,
          requestStatus: payload.requestStatus,
          eventType: payload.eventType,
          eventDate: payload.eventDate,
          venue: payload.venue,
          guestCount: payload.guestCount,
          grandTotal: payload.grandTotal ? Number(payload.grandTotal) : undefined,
        },
      );
    });

    socket.on(
      "workflow:agreement.initiated",
      (payload: WorkflowEventPayload) => {
        pushNotification(
          `Agreement Ready: ${payload.quotationNumber}`,
          withTime("Admin initiated your agreement"),
          payload.quotationId,
          {
            quotationNumber: payload.quotationNumber,
            status: payload.status,
            requestStatus: payload.requestStatus,
            eventType: payload.eventType,
            eventDate: payload.eventDate,
            venue: payload.venue,
            guestCount: payload.guestCount,
            grandTotal: payload.grandTotal ? Number(payload.grandTotal) : undefined,
            agreementStatus: "INITIATED",
          },
        );
      },
    );

    return () => {
      socket.disconnect();
      setSocketStatus("disconnected");
    };
  }, [isAuthenticated]);

  const onOpenNotifications = () => {
    if (!isAuthenticated) {
      setAuthRedirectTarget("quotation");
      setAuthModalOpen(true);
      return;
    }
    void loadTopbarData();
    setNotificationsOpen(true);
  };

  const markNotificationRead = (id: string) => {
    setNotificationItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  };

  const markAllNotificationsRead = () => {
    setNotificationItems((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const clearNotifications = () => {
    setNotificationItems([]);
  };

  const onOpenProfile = () => {
    if (!isAuthenticated) {
      setAuthRedirectTarget("quotation");
      setAuthModalOpen(true);
      return;
    }
    void loadTopbarData();
    setProfileOpen(true);
  };

  const onLogout = () => {
    localStorage.removeItem(CUSTOMER_PORTAL_TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_PORTAL_PROFILE_KEY);
    localStorage.removeItem(CUSTOMER_PORTAL_NOTIFICATIONS_KEY);
    setProfileOpen(false);
    setProfileName("");
    setProfileEmail("");
    setProfilePhone("");
    setNotificationItems([]);
    toast.success("Logged out");
  };

  const onSubmit = async () => {
    setSubmitAttempted(true);

    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem(CUSTOMER_PORTAL_TOKEN_KEY)
        : null;

    if (!accessToken) {
      toast.error("Please login to submit quotation request");
      setAuthRedirectTarget("quotation");
      setAuthModalOpen(true);
      return;
    }

    const customerName = sanitizeNameInput(form.customerName).trim();
    const submitPhone = sanitizePhoneInput(
      authenticatedPhone || form.customerPhone,
    );
    const customerAddress = form.customerAddress.trim();
    const notes = form.notes.trim();
    const guestCount = Number.parseInt(form.guestCount, 10);

    if (
      !customerName ||
      !submitPhone ||
      !form.eventDate ||
      !form.eventType ||
      !form.venue
    ) {
      toast.error("Please fill all required customer and event fields");
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(customerName)) {
      toast.error("Customer name should contain alphabets only");
      return;
    }
    if (!/^\d{10}$/.test(submitPhone)) {
      toast.error("Phone number should be exactly 10 digits");
      return;
    }
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      toast.error("Guest count should be a valid number greater than 0");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    const payload: QuotationPayload = {
      customerName,
      customerPhone: submitPhone,
      customerAddress: customerAddress || undefined,
      eventDate: form.eventDate,
      eventType: form.eventType.trim(),
      venue: form.venue.trim(),
      guestCount,
      notes: notes || undefined,
      gstPercent: DEFAULT_GST,
      items: selectedItems.map((item) => ({
        itemId: item.id,
        name: item.name,
        quantity: guestCount,
        unit: item.unit,
        unitPrice: item.basePrice,
      })),
    };

    try {
      setSubmitting(true);
      let response;
      if (editingQuotationId) {
        response = await customerPortalService.updateMyQuotation(
          accessToken,
          editingQuotationId,
          payload,
        );
        toast.success(`Request updated: ${response.quotationNumber}`);
        setEditingQuotationId(null);
        navigate("/customer/track");
      } else {
        response = await customerPortalService.submitQuotationRequest(
          accessToken,
          payload,
        );
        toast.success(`Request submitted: ${response.quotationNumber}`);
      }
      setSelectedQty({});
      if (typeof window !== "undefined") {
        localStorage.removeItem(CUSTOMER_PORTAL_CART_KEY);
      }
      setShowCheckout(false);
      setShowCart(false);
      setSubmitAttempted(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const openCustomerWorkflow = (target: "quotation" | "agreement") => {
    const token = localStorage.getItem(CUSTOMER_PORTAL_TOKEN_KEY);
    if (token) {
      navigate(
        target === "agreement" ? "/customer/agreement" : "/customer/track",
      );
      return;
    }
    setAuthRedirectTarget(target);
    setAuthModalOpen(true);
  };

  const openTrackRequests = () => {
    openCustomerWorkflow("quotation");
  };

  const openAgreementRequests = () => {
    openCustomerWorkflow("agreement");
  };

  const handleOtpDigit = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length > 1) {
      const newOtp = authOtp.padEnd(6, " ").split("");
      for (let i = 0; i < digits.length && index + i < 6; i++) {
        newOtp[index + i] = digits[i];
      }
      const joined = newOtp.slice(0, 6).join("").replace(/ /g, "");
      setAuthOtp(joined);
      const focusIdx = Math.min(index + digits.length, 5);
      otpInputRefs.current[focusIdx]?.focus();
      return;
    }
    const digit = digits.slice(0, 1);
    const newOtp = authOtp.padEnd(6, " ").split("");
    newOtp[index] = digit;
    setAuthOtp(newOtp.join("").trimEnd());
    if (digit && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const cur = authOtp[index];
      const newOtp = authOtp.padEnd(6, " ").split("");
      if (cur && cur !== " ") {
        newOtp[index] = " ";
        setAuthOtp(newOtp.join("").trimEnd());
      } else if (index > 0) {
        newOtp[index - 1] = " ";
        setAuthOtp(newOtp.join("").trimEnd());
        otpInputRefs.current[index - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const openCartWithLoginGuard = () => {
    if (!isAuthenticated) {
      setAuthRedirectTarget("cart");
      setAuthModalOpen(true);
      return;
    }
    setShowCart(true);
  };

  const onRequestAuthOtp = async () => {
    const sanitizedPhone = sanitizePhoneInput(authPhone);
    if (!sanitizedPhone) {
      toast.error("Enter your phone number");
      return;
    }
    if (!/^\d{10}$/.test(sanitizedPhone)) {
      toast.error("Phone number should be exactly 10 digits");
      return;
    }
    try {
      setAuthLoading(true);
      const response = await customerPortalService.requestOtp(sanitizedPhone);
      setAuthOtpRequested(true);
      setAuthExistingCustomer(response.existingCustomer);
      setAuthPhone(sanitizedPhone);
      if (response.otp) {
        toast.success(`Dev OTP: ${response.otp}`);
      } else {
        toast.success("OTP sent to your phone");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Failed to send OTP");
    } finally {
      setAuthLoading(false);
    }
  };

  const onVerifyAuthOtp = async () => {
    const sanitizedOtp = authOtp.replace(/\D/g, "").slice(0, 6);
    const sanitizedPhone = sanitizePhoneInput(authPhone);
    const sanitizedName = sanitizeNameInput(authName).trim();

    if (!sanitizedOtp) {
      toast.error("Enter OTP");
      return;
    }
    if (!authExistingCustomer && !sanitizedName) {
      toast.error("Enter your name");
      return;
    }
    if (!authExistingCustomer && !/^[A-Za-z\s]+$/.test(sanitizedName)) {
      toast.error("Name should contain alphabets only");
      return;
    }
    try {
      setAuthLoading(true);
      const response = await customerPortalService.verifyOtp(
        sanitizedPhone,
        sanitizedOtp,
        authExistingCustomer ? undefined : sanitizedName,
        authExistingCustomer ? undefined : authEmail,
      );
      localStorage.setItem(CUSTOMER_PORTAL_TOKEN_KEY, response.accessToken);
      const storedProfile = {
        name: response.customerName ?? sanitizedName,
        email: response.customerEmail ?? authEmail,
        phone: sanitizePhoneInput(response.phone ?? sanitizedPhone),
      };
      localStorage.setItem(
        CUSTOMER_PORTAL_PROFILE_KEY,
        JSON.stringify(storedProfile),
      );
      setProfileName(storedProfile.name ?? "");
      setProfileEmail(storedProfile.email ?? "");
      setProfilePhone(storedProfile.phone ?? "");
      void loadTopbarData(response.accessToken);
      toast.success("Login successful");
      setAuthModalOpen(false);
      setForm((prev) => ({
        ...prev,
        customerName:
          prev.customerName || sanitizeNameInput(storedProfile.name ?? ""),
        customerPhone: sanitizePhoneInput(storedProfile.phone ?? ""),
      }));
      if (authRedirectTarget === "cart") {
        setShowCart(true);
        setShowCheckout(false);
        return;
      }
      navigate(
        authRedirectTarget === "agreement"
          ? "/customer/agreement"
          : "/customer/track",
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Invalid OTP");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF7] pb-24">
      <div className="mx-auto w-full max-w-5xl space-y-4 pb-6">
        {/* ── Portal Header ── */}
        <section className="overflow-hidden rounded-b-[2rem] bg-[#0F1B3C] px-4 pb-6 pt-4 text-white shadow-[0_20px_50px_-20px_rgba(15,27,60,0.7)] md:px-6">

          {/* ── Row 1: Back · Logo · Actions ── */}
          <div className="flex items-center justify-between gap-3">

            {/* Left: Back button + Logo */}
            <div className="flex items-center gap-3">
              {/* Back to home */}
              <button
                type="button"
                aria-label="Back to home"
                onClick={() => navigate("/")}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/8 text-white/70 transition-all hover:border-amber-400/40 hover:bg-amber-400/12 hover:text-amber-300"
              >
                <ArrowLeft size={17} />
              </button>

              {/* Divider */}
              <div className="h-8 w-px bg-white/10" />

              {/* Company logo + name */}
              <div className="flex items-center gap-2.5">
                {/* Logo pill — white background so any logo is visible on dark header */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl p-1 shadow-[0_2px_10px_rgba(0,0,0,0.25)]">
                  {companyLogo ? (
                    <img
                      src={companyLogo}
                      alt={companyName}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Sparkles size={16} className="text-amber-500" />
                  )}
                </div>

                {/* Company name + tagline */}
                <div className="block">
                  <p className="text-sm font-black leading-tight tracking-tight text-white">
                    {companyName}
                  </p>
                  {companyTagline ? (
                    <p className="text-[10px] font-medium leading-none text-white/45 mt-0.5">
                      {companyTagline}
                    </p>
                  ) : (
                    <p className="text-[10px] font-medium leading-none text-white/40 mt-0.5">
                      Event Planning Portal
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Notification + Profile / Login */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* Notification */}
                <button
                  type="button"
                  className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/8 text-white/75 transition-all hover:bg-white/15 hover:text-white"
                  onClick={onOpenNotifications}
                  aria-label="Notifications"
                >
                  <Bell size={17} />
                  {unreadNotificationCount > 0 ? (
                    <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-[#0F1B3C]">
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </span>
                  ) : null}
                  <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-[#0F1B3C] ${socketStatus === "connected" ? "bg-emerald-400" : "bg-slate-500"}`} />
                </button>
                {/* Profile */}
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 text-sm font-semibold text-white/75 transition-all hover:bg-white/15 hover:text-white"
                  onClick={onOpenProfile}
                >
                  <UserRound size={15} />
                  <span className="hidden sm:inline">
                    {profileName ? profileName.split(" ")[0] : "Profile"}
                  </span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-[#0F1B3C] shadow-[0_4px_16px_rgba(251,191,36,0.4)] transition-all hover:bg-amber-300"
                onClick={() => { setAuthRedirectTarget("quotation"); setAuthModalOpen(true); }}
              >
                <UserRound size={15} /> Login
              </button>
            )}
          </div>

          {/* ── Row 2: Welcome strip (when logged in) ── */}
          {isAuthenticated && profileName ? (
            <div className="mt-3.5 flex items-center gap-2.5 rounded-2xl border border-white/8 bg-white/5 px-4 py-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500">
                <Sparkles size={13} className="text-[#0F1B3C]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45 leading-none">Welcome back</p>
                <p className="truncate text-sm font-black leading-snug text-white">{profileName}</p>
              </div>
              {profilePhone ? (
                <p className="ml-auto shrink-0 text-[11px] text-white/40">{profilePhone}</p>
              ) : null}
            </div>
          ) : null}

          {/* ── Row 3: Category pills ── */}
          <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {topCategories.map((category) => {
              const active = category === activeTopCategory;
              const Icon = TOP_CATEGORY_ICONS[category as keyof typeof TOP_CATEGORY_ICONS] ?? TOP_CATEGORY_ICONS.default;
              return (
                <button
                  key={category}
                  type="button"
                  className={`group shrink-0 rounded-2xl border px-4 py-2.5 text-left transition-all ${
                    active
                      ? "border-[#D4A017]/50 bg-white shadow-[0_4px_20px_rgba(184,134,11,0.18)]"
                      : "border-white/15 bg-white/12 hover:bg-white/22 hover:border-white/25"
                  }`}
                  onClick={() => { setActiveTopCategory(category); setActiveSubCategory(""); setActiveLeafCategory(""); }}
                >
                  <div className={`mb-1.5 grid h-7 w-7 place-items-center rounded-full transition-colors ${active ? "bg-[#FDF3D0]" : "bg-white/12 group-hover:bg-white/20"}`}>
                    <Icon size={14} className={active ? "text-[#B8860B]" : "text-white/70"} />
                  </div>
                  <p className={`text-xs font-bold leading-tight ${active ? "text-[#0F1B3C]" : "text-white/75"}`}>{category}</p>
                  <p className={`mt-0.5 text-[10px] ${active ? "text-[#B8860B]" : "text-white/40"}`}>
                    {topCategoryCounts[category] ?? 0} items
                  </p>
                </button>
              );
            })}
          </div>

          {/* ── Row 4: Search bar ── */}
          <div className="relative mt-4">
            <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-12 rounded-2xl border-none bg-white pl-11 text-sm font-medium text-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.2)] placeholder:text-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for food, décor, services…"
            />
          </div>
        </section>

        <div
          className={`sticky top-0 z-30 px-4 pb-2 pt-2 backdrop-blur-sm transition-transform duration-300 md:px-6 ${
            showStickyFilters
              ? "translate-y-0"
              : "-translate-y-[120%] pointer-events-none"
          }`}
        >
          <div className="rounded-2xl bg-white/96 p-2 shadow-[0_10px_24px_-16px_rgba(15,27,60,0.12)] border border-[#EDE8DF]">
            {subCategories.length > 0 ? (
              <div className="rounded-full bg-[#FDF3D0] p-1.5">
                <div className="flex gap-1.5 overflow-auto">
                  {subCategories.map((subcategory) => {
                    const active = subcategory === activeSubCategory;
                    return (
                      <button
                        key={subcategory}
                        type="button"
                        className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                          active ? "bg-white text-[#B8860B]" : "text-slate-700"
                        }`}
                        onClick={() => {
                          setActiveSubCategory(subcategory);
                          setActiveLeafCategory("");
                        }}
                      >
                        {subcategory}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {activeSubCategory && leafSubCategories.length > 0 ? (
              <div className="mt-3 flex gap-2 overflow-auto pb-1">
                <button
                  type="button"
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                    !activeLeafCategory
                      ? "bg-[#0F1B3C] text-white"
                      : "bg-white text-slate-600"
                  }`}
                  onClick={() => setActiveLeafCategory("")}
                >
                  All
                </button>
                {leafSubCategories.map((leaf) => {
                  const active = leaf === activeLeafCategory;
                  return (
                    <button
                      key={leaf}
                      type="button"
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                        active
                          ? "bg-[#0F1B3C] text-white"
                          : "bg-white text-slate-600"
                      }`}
                      onClick={() => setActiveLeafCategory(leaf)}
                    >
                      {leaf} ({leafCategoryCounts[leaf] ?? 0})
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <Card className="mx-4 border-0 bg-transparent p-0 shadow-none md:mx-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black uppercase text-slate-800">
                {activeLeafCategory ||
                  activeSubCategory ||
                  activeTopCategory ||
                  "Catalog"}
              </h2>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                {filteredItems.length}
              </span>
            </div>
            {isAuthenticated ? (
              <button
                type="button"
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                onClick={openTrackRequests}
              >
                My Quotations
              </button>
            ) : null}
          </div>

          {loading ? (
            <p className="rounded-2xl bg-white py-8 text-center text-sm text-slate-500 border border-[#EDE8DF]">
              Loading catalog...
            </p>
          ) : filteredItems.length === 0 ? (
            <p className="rounded-2xl bg-white py-8 text-center text-sm text-slate-500 border border-[#EDE8DF]">
              No items found.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => {
                const selected = selectedQty[item.id] > 0;
                return (
                  <article
                    key={item.id}
                    className="group overflow-hidden rounded-3xl bg-white p-2 shadow-[0_4px_20px_rgba(15,27,60,0.08)] border border-[#EDE8DF] hover:shadow-[0_8px_28px_rgba(15,27,60,0.13)] hover:border-[#D4A017]/40 transition-all duration-200"
                  >
                    <div className="relative h-32 w-full overflow-hidden rounded-2xl bg-[#FDF3D0] md:h-36">
                      {item.imageUrl ? (
                        <img
                          src={toMediaUrl(item.imageUrl)}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          <ShoppingCart size={18} />
                        </div>
                      )}
                      <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-[#B8860B]">
                        {item.leafCategory}
                      </span>
                    </div>
                    <div className="space-y-1 px-1 pb-2 pt-2">
                      <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">
                        {item.name}
                      </p>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          variant={selected ? "outline" : "primary"}
                          className={`h-8 rounded-full px-3 text-xs ${
                            selected
                              ? "border-[#B8860B]/40 bg-[#FDF3D0] text-[#B8860B]"
                              : ""
                          }`}
                          onClick={() => onToggleItem(item)}
                        >
                          {selected ? "Added" : "Add"}
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {selectedItems.length > 0 && !showCart ? (
        <div className="fixed inset-x-0 bottom-16 z-30 px-3 md:px-6">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-2xl bg-[#0F1B3C] px-4 py-3 text-white shadow-2xl border border-white/10">
            <div>
              <p className="text-xs text-white/75">
                {selectedItems.length} items selected
              </p>
              <p className="text-sm font-bold">Ready to request quotation</p>
            </div>
            <Button
              className="h-9 rounded-full px-4"
              onClick={openCartWithLoginGuard}
            >
              View Cart
            </Button>
          </div>
        </div>
      ) : null}

      {showCart ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm md:items-center md:p-4"
          onClick={() => setShowCart(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl md:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Modal Header ── */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-[#0F1B3C] px-5 py-4">
              <div className="flex items-center gap-3">
                {showCheckout && (
                  <button
                    type="button"
                    onClick={() => setShowCheckout(false)}
                    className="grid h-8 w-8 place-items-center rounded-xl border border-white/15 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                  >
                    <ArrowLeft size={15} />
                  </button>
                )}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                    {showCheckout ? "Step 2 of 2" : "Step 1 of 2"}
                  </p>
                  <h3 className="text-base font-black text-white">
                    {showCheckout ? "Event Details" : "Your Cart"}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowCart(false); setShowCheckout(false); }}
                className="grid h-8 w-8 place-items-center rounded-xl border border-white/15 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            {/* ── Step indicator ── */}
            <div className="border-b border-slate-100 px-8 py-3">
              <div className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black transition-colors ${
                    !showCheckout ? "bg-[#0F1B3C] text-white ring-2 ring-[#0F1B3C]/20" : "bg-emerald-500 text-white"
                  }`}>
                    {showCheckout ? "✓" : "1"}
                  </span>
                  <span className={`text-[10px] font-bold transition-colors ${!showCheckout ? "text-[#0F1B3C]" : "text-emerald-600"}`}>
                    Cart
                  </span>
                </div>
                <div className="relative mx-3 h-0.5 flex-1 rounded-full bg-slate-200">
                  <div className={`absolute inset-y-0 left-0 rounded-full bg-emerald-400 transition-all duration-300 ${showCheckout ? "w-full" : "w-0"}`} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black transition-colors ${
                    showCheckout ? "bg-[#0F1B3C] text-white ring-2 ring-[#0F1B3C]/20" : "bg-slate-100 text-slate-400"
                  }`}>
                    2
                  </span>
                  <span className={`text-[10px] font-bold transition-colors ${showCheckout ? "text-[#0F1B3C]" : "text-slate-400"}`}>
                    Event Details
                  </span>
                </div>
              </div>
            </div>

            <div className="flex max-h-[70vh] flex-col overflow-hidden">
              {/* ══ CART VIEW ══ */}
              {!showCheckout ? (
                <>
                  {selectedItems.length > 0 && (
                    <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2.5">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#B8860B]">
                        {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""} selected
                      </p>
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-[#0F1B3C] text-[10px] font-black text-white">
                        {selectedItems.length}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto p-4">
                    {selectedItems.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#D4A017]/40 bg-[#FFFDF7] p-8 text-center">
                        <ShoppingCart size={28} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-600">Your cart is empty</p>
                        <p className="mt-1 text-xs text-slate-400">Add items from the catalog to get started.</p>
                        <button
                          type="button"
                          onClick={() => { setShowCart(false); setShowCheckout(false); }}
                          className="mt-4 rounded-2xl bg-[#0F1B3C] px-6 py-2.5 text-sm font-bold text-white"
                        >
                          Browse Catalog
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4">
                          {Object.entries(
                            selectedItems.reduce<Record<string, typeof selectedItems>>((acc, item) => {
                              (acc[item.leafCategory] ??= []).push(item);
                              return acc;
                            }, {})
                          ).map(([leafCat, items]) => {
                            const topCat = items[0].topCategory;
                            const Icon = TOP_CATEGORY_ICONS[topCat as keyof typeof TOP_CATEGORY_ICONS] ?? Salad;
                            return (
                              <div key={leafCat}>
                                <div className="mb-1.5 flex items-center gap-2">
                                  <div className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#FDF3D0] text-[#B8860B]">
                                    <Icon size={11} />
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-[#B8860B]">
                                    {leafCat}
                                  </span>
                                  <div className="h-px flex-1 bg-[#EDE8DF]" />
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    {items.length}
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center gap-3 rounded-2xl border border-[#EDE8DF] bg-[#FFFDF7] px-4 py-2.5"
                                    >
                                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                                        {item.name}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => onToggleItem(item)}
                                        className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  {selectedItems.length > 0 && (
                    <div className="border-t border-slate-100 bg-white p-4 pt-3">
                      <button
                        type="button"
                        onClick={() => { setShowCart(false); setShowCheckout(false); }}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#D4A017]/50 bg-[#FFFDF7] py-3 text-sm font-semibold text-[#B8860B] transition-all hover:border-[#B8860B]/70 hover:bg-[#FDF3D0] active:scale-[0.98]"
                      >
                        <span className="text-base font-black leading-none">+</span>
                        Add more items
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCheckout(true)}
                        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F1B3C] py-3.5 text-sm font-bold text-white transition-all hover:bg-[#1a2d5a] active:scale-[0.98]"
                      >
                        Continue to Event Details
                        <ArrowLeft size={15} className="rotate-180" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* ══ EVENT DETAILS VIEW ══ */
                <>
                  <div className="flex-1 overflow-y-auto p-5 space-y-5">

                  {/* ── Your Details ── */}
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-px flex-1 bg-[#EDE8DF]" />
                      <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.2em] text-[#B8860B]">Your Details</span>
                      <div className="h-px flex-1 bg-[#EDE8DF]" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {/* Full Name */}
                      <div className="flex flex-col gap-1">
                        <label className={`text-[11px] font-bold ${fieldErrors.customerName ? "text-rose-500" : "text-slate-600"}`}>
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          className={`h-11 text-sm transition-colors ${fieldErrors.customerName ? "border-rose-400 bg-rose-50 focus:border-rose-400 focus:ring-rose-100" : ""}`}
                          value={form.customerName}
                          onChange={(e) => setForm((s) => ({ ...s, customerName: sanitizeNameInput(e.target.value) }))}
                          placeholder="Enter your full name"
                        />
                        {fieldErrors.customerName && (
                          <p className="flex items-center gap-1 text-[10px] font-semibold text-rose-500">
                            <TriangleAlert size={10} /> {fieldErrors.customerName}
                          </p>
                        )}
                      </div>
                      {/* Phone */}
                      <div className="flex flex-col gap-1">
                        <label className={`text-[11px] font-bold ${fieldErrors.customerPhone ? "text-rose-500" : "text-slate-600"}`}>
                          Phone Number <span className="text-rose-500">*</span>
                          {authenticatedPhone && (
                            <span className="ml-1.5 font-normal text-slate-400">(auto-filled)</span>
                          )}
                        </label>
                        <Input
                          className={`h-11 text-sm transition-colors ${fieldErrors.customerPhone ? "border-rose-400 bg-rose-50 focus:border-rose-400 focus:ring-rose-100" : ""}`}
                          value={form.customerPhone}
                          onChange={(e) => setForm((s) => ({ ...s, customerPhone: sanitizePhoneInput(e.target.value) }))}
                          placeholder="10-digit mobile number"
                          inputMode="numeric"
                          pattern="\d{10}"
                          maxLength={10}
                          readOnly={Boolean(authenticatedPhone)}
                        />
                        {fieldErrors.customerPhone && (
                          <p className="flex items-center gap-1 text-[10px] font-semibold text-rose-500">
                            <TriangleAlert size={10} /> {fieldErrors.customerPhone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-600">
                        Address <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <Textarea
                        className="text-sm"
                        value={form.customerAddress}
                        onChange={(e) => setForm((s) => ({ ...s, customerAddress: e.target.value }))}
                        placeholder="Your full address including city and PIN code"
                      />
                    </div>
                  </div>

                  {/* ── Event Details ── */}
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-px flex-1 bg-[#EDE8DF]" />
                      <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.2em] text-[#B8860B]">Event Details</span>
                      <div className="h-px flex-1 bg-[#EDE8DF]" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {/* Event Date */}
                      <div className="flex flex-col gap-1">
                        <label className={`text-[11px] font-bold ${fieldErrors.eventDate ? "text-rose-500" : "text-slate-600"}`}>
                          Event Date <span className="text-rose-500">*</span>
                        </label>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            value={parseDateInput(form.eventDate)}
                            onChange={(value) => setForm((s) => ({ ...s, eventDate: formatDateInput(value) }))}
                            minDate={new Date()}
                            format="dd/MM/yyyy"
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                size: "small",
                                sx: {
                                  "& .MuiOutlinedInput-root": {
                                    borderRadius: "0.75rem",
                                    height: "44px",
                                    backgroundColor: fieldErrors.eventDate ? "#fff1f2" : "#FFFDF7",
                                    border: `1.5px solid ${fieldErrors.eventDate ? "#f87171" : "#EDE8DF"}`,
                                    "& fieldset": { border: "none" },
                                    "&:hover": { backgroundColor: fieldErrors.eventDate ? "#ffe4e6" : "#FDF3D0", borderColor: fieldErrors.eventDate ? "#f43f5e" : "#D4A017" },
                                    "&.Mui-focused": { backgroundColor: "#fff", border: `1.5px solid ${fieldErrors.eventDate ? "#f43f5e" : "#B8860B"}`, boxShadow: `0 0 0 3px ${fieldErrors.eventDate ? "rgba(244,63,94,0.10)" : "rgba(184,134,11,0.10)"}` },
                                  },
                                  "& .MuiInputLabel-root": { display: "none" },
                                  "& .MuiInputBase-input": { fontSize: "0.875rem", fontWeight: 500 },
                                },
                              },
                            }}
                          />
                        </LocalizationProvider>
                        {fieldErrors.eventDate && (
                          <p className="flex items-center gap-1 text-[10px] font-semibold text-rose-500">
                            <TriangleAlert size={10} /> {fieldErrors.eventDate}
                          </p>
                        )}
                      </div>
                      {/* Event Type */}
                      <div className="flex flex-col gap-1">
                        <label className={`text-[11px] font-bold ${fieldErrors.eventType ? "text-rose-500" : "text-slate-600"}`}>
                          Event Type <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={form.eventType}
                          onChange={(e) => setForm((s) => ({ ...s, eventType: e.target.value }))}
                          className={`h-11 w-full rounded-xl border-[1.5px] px-3 text-sm font-medium transition-all focus:outline-none focus:shadow-[0_0_0_3px_rgba(184,134,11,0.10)] ${
                            fieldErrors.eventType
                              ? "border-rose-400 bg-rose-50 text-rose-600 focus:border-rose-400"
                              : "border-[#EDE8DF] bg-[#FFFDF7] text-slate-800 focus:border-[#B8860B] focus:bg-white"
                          }`}
                        >
                          <option value="">— Select event type —</option>
                          {EVENT_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        {fieldErrors.eventType && (
                          <p className="flex items-center gap-1 text-[10px] font-semibold text-rose-500">
                            <TriangleAlert size={10} /> {fieldErrors.eventType}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {/* Venue */}
                      <div className="flex flex-col gap-1">
                        <label className={`text-[11px] font-bold ${fieldErrors.venue ? "text-rose-500" : "text-slate-600"}`}>
                          Venue <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={form.venue}
                          onChange={(e) => setForm((s) => ({ ...s, venue: e.target.value }))}
                          className={`h-11 w-full rounded-xl border-[1.5px] px-3 text-sm font-medium transition-all focus:outline-none focus:shadow-[0_0_0_3px_rgba(184,134,11,0.10)] ${
                            fieldErrors.venue
                              ? "border-rose-400 bg-rose-50 text-rose-600 focus:border-rose-400"
                              : "border-[#EDE8DF] bg-[#FFFDF7] text-slate-800 focus:border-[#B8860B] focus:bg-white"
                          }`}
                        >
                          <option value="">— Select venue type —</option>
                          {VENUE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        {fieldErrors.venue && (
                          <p className="flex items-center gap-1 text-[10px] font-semibold text-rose-500">
                            <TriangleAlert size={10} /> {fieldErrors.venue}
                          </p>
                        )}
                      </div>
                      {/* Guest Count */}
                      <div className="flex flex-col gap-1">
                        <label className={`text-[11px] font-bold ${fieldErrors.guestCount ? "text-rose-500" : "text-slate-600"}`}>
                          Guest Count <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={form.guestCount}
                          onChange={(e) => setForm((s) => ({ ...s, guestCount: e.target.value }))}
                          placeholder="e.g. 250"
                          className={`h-11 text-sm transition-colors ${fieldErrors.guestCount ? "border-rose-400 bg-rose-50 focus:border-rose-400 focus:ring-rose-100" : ""}`}
                        />
                        {fieldErrors.guestCount && (
                          <p className="flex items-center gap-1 text-[10px] font-semibold text-rose-500">
                            <TriangleAlert size={10} /> {fieldErrors.guestCount}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Special Requirements ── */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-600">
                      Special Requirements <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                      placeholder="Any dietary restrictions, decoration preferences, special arrangements…"
                      className="text-sm"
                    />
                  </div>

                  {/* Selected items summary */}
                  <div className="rounded-2xl border border-[#EDE8DF] bg-[#FFFDF7] px-4 py-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""} in cart
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {selectedItems.map((i) => i.name).join(" · ")}
                    </p>
                  </div>

                  </div>
                  <div className="border-t border-slate-100 bg-white p-4">
                    <button
                      type="button"
                      onClick={() => void onSubmit()}
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F1B3C] py-4 text-sm font-bold text-white transition-all hover:bg-[#1a2d5a] active:scale-[0.98] disabled:opacity-60"
                    >
                      {submitting ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Sparkles size={15} />
                      )}
                      {submitting
                        ? editingQuotationId ? "Updating…" : "Submitting…"
                        : editingQuotationId ? "Update Request" : "Submit Quotation Request"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <FormDialog
        title="Customer Login"
        description="Login or register with OTP to track your quotations."
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
      >
        <div className="space-y-5 px-1 pb-1">
          {/* ── Phone number field ── */}
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Phone Number
            </label>
            <div className={`flex overflow-hidden rounded-xl border-2 transition-all duration-200 ${authPhone.length === 10 ? "border-[#B8860B]/60 bg-white" : "border-[#EDE8DF] bg-[#FFFDF7] focus-within:border-[#B8860B] focus-within:bg-white"}`}>
              <div className="flex shrink-0 items-center gap-1.5 border-r border-[#EDE8DF] bg-[#FDF3D0] px-3.5">
                <span className="text-base leading-none">🇮🇳</span>
                <span className="text-sm font-bold text-[#B8860B]">+91</span>
              </div>
              <input
                type="tel"
                value={authPhone}
                onChange={(e) => setAuthPhone(sanitizePhoneInput(e.target.value))}
                placeholder="Enter 10-digit number"
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                className="flex-1 bg-transparent px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none"
              />
              {authPhone.length === 10 && (
                <div className="flex items-center pr-3">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                </div>
              )}
            </div>
          </div>

          {!authOtpRequested ? (
            <button
              type="button"
              onClick={() => void onRequestAuthOtp()}
              disabled={authLoading || authPhone.length !== 10}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F1B3C] py-3.5 text-sm font-bold text-white transition-all hover:bg-[#1a2d5a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {authLoading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {authLoading ? "Sending OTP…" : "Request OTP"}
            </button>
          ) : (
            <>
              {/* ── New user profile fields ── */}
              {!authExistingCustomer ? (
                <div className="space-y-3 rounded-xl border border-[#D4A017]/30 bg-[#FDF3D0] p-4">
                  <p className="text-xs font-semibold text-[#B8860B]">
                    New number detected — complete your profile to continue.
                  </p>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Name *</label>
                    <Input
                      value={authName}
                      onChange={(e) => setAuthName(sanitizeNameInput(e.target.value))}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Email</label>
                    <Input
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="Enter email address"
                    />
                  </div>
                </div>
              ) : null}

              {/* ── 6-box OTP input ── */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Enter OTP
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Sent to +91 {authPhone}
                  </span>
                </div>
                <div className="flex justify-center gap-2.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpInputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={authOtp[i] && authOtp[i] !== " " ? authOtp[i] : ""}
                      onChange={(e) => handleOtpDigit(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onFocus={(e) => e.target.select()}
                      className="h-13 w-11 rounded-xl border-2 border-[#EDE8DF] bg-[#FFFDF7] text-center text-xl font-black text-[#0F1B3C] transition-all duration-150 focus:border-[#B8860B] focus:bg-white focus:outline-none focus:shadow-[0_0_0_3px_rgba(184,134,11,0.12)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      style={{ height: "52px" }}
                    />
                  ))}
                </div>
              </div>

              {/* ── Action buttons ── */}
              <div className="grid gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void onRequestAuthOtp()}
                  disabled={authLoading}
                  className="rounded-xl border-2 border-[#EDE8DF] bg-white py-3 text-sm font-bold text-slate-700 transition-all hover:border-[#B8860B]/40 hover:text-[#B8860B] disabled:opacity-50"
                >
                  Resend OTP
                </button>
                <button
                  type="button"
                  onClick={() => void onVerifyAuthOtp()}
                  disabled={authLoading || authOtp.replace(/\s/g, "").length < 6}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#0F1B3C] py-3 text-sm font-bold text-white transition-all hover:bg-[#1a2d5a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {authLoading && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {authLoading ? "Verifying…" : "Verify OTP"}
                </button>
              </div>
            </>
          )}
        </div>
      </FormDialog>

      <FormDialog
        title="Notifications"
        description={
          isAuthenticated
            ? "Latest quotation and agreement updates."
            : "Login to view notifications."
        }
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        contentClassName="max-w-[min(96vw,760px)]"
        bodyClassName="px-4 py-4 sm:px-5"
      >
        {!isAuthenticated ? (
          <Button
            className="w-full"
            onClick={() => {
              setNotificationsOpen(false);
              setAuthRedirectTarget("quotation");
              setAuthModalOpen(true);
            }}
          >
            Login with OTP
          </Button>
        ) : notificationItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D4A017]/40 bg-[#FFFDF7] py-10 text-center">
            <Bell className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#EDE8DF] bg-[#FFFDF7] px-3 py-2.5">
              <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                {unreadNotificationCount} unread
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="h-8 rounded-xl px-3 text-xs"
                  onClick={markAllNotificationsRead}
                  disabled={unreadNotificationCount === 0}
                >
                  Mark all as read
                </Button>
                <Button
                  variant="outline"
                  className="h-8 rounded-xl px-3 text-xs text-rose-600 hover:text-rose-700"
                  onClick={clearNotifications}
                  disabled={notificationItems.length === 0}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="max-h-[58vh] space-y-3 overflow-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.45)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400/60 [&::-webkit-scrollbar-track]:bg-transparent">
            {notificationItems.map((item) => {
              const resolvedStatus = mapRequestStatus(item.requestStatus, item.status);
              const { bg, text, dot } = notificationStatusStyle(
                item.requestStatus,
                item.status,
                item.agreementStatus,
              );
              const showGrandTotal = item.grandTotal != null && item.grandTotal > 0;
              return (
                <div
                  key={item.id}
                  className={`cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${
                    item.read
                      ? "border-slate-200"
                      : "border-teal-200 ring-1 ring-teal-100"
                  }`}
                  onClick={() => {
                    markNotificationRead(item.id);
                    setNotificationsOpen(false);
                    navigate("/customer/track");
                  }}
                >
                  {/* Header bar */}
                  <div className={`flex items-center justify-between gap-2 px-4 py-2.5 ${bg}`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${dot}`} />
                      <span className={`text-sm font-bold tracking-wide ${text}`}>
                        {item.quotationNumber ?? item.title.split(" - ")[0]}
                      </span>
                    </div>
                    <span className={`rounded-full border border-white/70 bg-white/80 px-2.5 py-0.5 text-xs font-semibold ${text}`}>
                      {resolvedStatus}
                    </span>
                  </div>
                  {/* Body */}
                  <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-2">
                    {item.eventType && (
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate text-xs text-slate-700">{item.eventType}</span>
                      </div>
                    )}
                    {item.eventDate && (
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate text-xs text-slate-700">
                          {new Date(item.eventDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                    {item.venue && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate text-xs text-slate-700">{item.venue}</span>
                      </div>
                    )}
                    {item.guestCount != null && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="text-xs text-slate-700">{item.guestCount} guests</span>
                      </div>
                    )}
                    {showGrandTotal && (
                      <div className="flex items-center gap-1.5">
                        <IndianRupee className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-800">
                          {formatInr(item.grandTotal, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                    )}
                    {item.agreementStatus && item.agreementStatus !== "NOT_INITIATED" && (
                      <div className="flex items-center gap-1.5">
                        <FileCheck2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span className="text-xs text-emerald-700">
                          Agreement: {notificationAgreementLabel(item.agreementStatus)}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Items section */}
                  {item.items && item.items.length > 0 && (
                    <div className="border-t border-slate-100 px-4 py-2.5">
                      {(() => {
                        const split = splitNotificationItems(item.items);
                        const showItemWiseQuantity = shouldShowNotificationItemQuantity(item);
                        return (
                          <>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Items
                      </p>
                      {split.perPersonQuote ? (
                        <p className="mb-2 text-[11px] text-slate-500">
                          Item-wise quantity is hidden for per-person pricing.
                        </p>
                      ) : null}
                      <div className="max-h-[110px] space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.45)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400/60 [&::-webkit-scrollbar-track]:bg-transparent">
                        {split.regularItems.map((it) => (
                          <div key={it.id} className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs text-slate-600">{it.name}</span>
                            {split.perPersonQuote ? (
                              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Included
                              </span>
                            ) : showItemWiseQuantity ? (
                              <span className="shrink-0 text-xs text-slate-500">
                                {it.quantity} {it.unit || "unit"}
                              </span>
                            ) : null}
                          </div>
                        ))}
                        {split.perPersonQuote ? (
                          <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Per Person Split
                              </span>
                              <span className="text-[11px] font-semibold text-slate-700">
                                {formatInr(split.perPersonQuote.rate, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })}{" "}
                                x {split.perPersonQuote.guests}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <span className="text-xs text-slate-700">Per Person Quote</span>
                              <span className="text-xs font-bold text-slate-800">
                                {formatInr(split.perPersonQuote.total, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })}
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                  {/* Footer */}
                  {item.createdAt && (
                    <div className="flex items-center gap-1.5 border-t border-slate-100 px-4 py-2">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span className="text-[10px] text-slate-500">
                        {new Date(item.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        )}
      </FormDialog>

      <FormDialog
        title="My Profile"
        description={
          isAuthenticated
            ? "Manage your customer session and quick links."
            : "Login to access profile."
        }
        open={profileOpen}
        onOpenChange={setProfileOpen}
      >
        {!isAuthenticated ? (
          <Button
            className="w-full"
            onClick={() => {
              setProfileOpen(false);
              setAuthRedirectTarget("quotation");
              setAuthModalOpen(true);
            }}
          >
            Login with OTP
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-[#EDE8DF] bg-[#FFFDF7] p-3">
              <p className="text-sm font-semibold text-slate-900">
                {profileName || "Customer"}
              </p>
              <p className="text-xs text-slate-500">
                {profilePhone || "Phone not available"}
              </p>
              {profileEmail ? (
                <p className="text-xs text-slate-500">{profileEmail}</p>
              ) : null}
            </div>
            <FormDialogFooter className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/customer/track");
                  }}
                >
                  My Quotations
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/customer/agreement");
                  }}
                >
                  My Agreements
                </Button>
              </div>
              <Button variant="danger" className="w-full" onClick={onLogout}>
                Logout
              </Button>
            </FormDialogFooter>
          </div>
        )}
      </FormDialog>

      <div className="fixed inset-x-0 bottom-0 z-50 overflow-visible border-t border-[#EDE8DF] bg-white shadow-[0_-4px_24px_rgba(15,27,60,0.08)]">
        <div
          className={`relative mx-auto grid h-16 w-full max-w-5xl px-2 ${
            isAuthenticated ? "grid-cols-5" : "grid-cols-3"
          }`}
        >
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-[#B8860B]"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <Home size={16} />
            Home
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-slate-600"
              onClick={openTrackRequests}
            >
              <FileText size={16} />
              Quotation
            </button>
          ) : null}

          <div className="relative flex items-center justify-center">
            <button
              type="button"
              className="absolute bottom-3 flex h-[58px] w-[58px] flex-col items-center justify-center rounded-full bg-[#0F1B3C] text-white shadow-[0_4px_20px_rgba(15,27,60,0.45)]"
              onClick={() => {
                openCartWithLoginGuard();
              }}
            >
              <ShoppingCart size={22} />
            </button>
            {selectedItems.length > 0 ? (
              <span className="absolute bottom-[44px] left-[calc(50%+10px)] grid h-5 min-w-5 place-items-center rounded-full bg-[#B8860B] px-1 text-[10px] font-bold text-white shadow">
                {selectedItems.length}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-slate-600"
            onClick={() => {
              window.location.href = "tel:+919207606150";
            }}
          >
            <Phone size={16} />
            Call
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-slate-600"
              onClick={openAgreementRequests}
            >
              <FileCheck2 size={16} />
              Agreement
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function sanitizePhoneInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function sanitizeNameInput(value: string) {
  return value.replace(/[^A-Za-z\s]/g, "").replace(/\s{2,}/g, " ");
}

function parseDateInput(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDateInput(value: Date | null) {
  if (!value) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readPersistedCart() {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(CUSTOMER_PORTAL_CART_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, qty]) =>
          typeof key === "string" && Number.isFinite(qty) && Number(qty) > 0,
      ),
    ) as Record<string, number>;
  } catch {
    return {};
  }
}

function readPersistedNotifications(): NotificationItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(CUSTOMER_PORTAL_NOTIFICATIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === "string")
      .map((item) => ({
        id: String(item.id),
        title: String(item.title ?? ""),
        subtitle: String(item.subtitle ?? ""),
        quotationNumber:
          typeof item.quotationNumber === "string" ? item.quotationNumber : undefined,
        status: typeof item.status === "string" ? item.status : undefined,
        requestStatus:
          typeof item.requestStatus === "string" ? item.requestStatus : undefined,
        eventType: typeof item.eventType === "string" ? item.eventType : undefined,
        eventDate: typeof item.eventDate === "string" ? item.eventDate : undefined,
        venue: typeof item.venue === "string" ? item.venue : undefined,
        guestCount:
          typeof item.guestCount === "number" ? item.guestCount : undefined,
        grandTotal:
          typeof item.grandTotal === "number" ? item.grandTotal : undefined,
        agreementStatus:
          typeof item.agreementStatus === "string"
            ? item.agreementStatus
            : undefined,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : undefined,
        isSocketEvent:
          typeof item.isSocketEvent === "boolean" ? item.isSocketEvent : undefined,
        read: Boolean(item.read),
        items: Array.isArray(item.items)
          ? item.items
              .filter((line: any) => line && typeof line.id === "string")
              .map((line: any) => ({
                id: String(line.id),
                name: String(line.name ?? ""),
                quantity: Number(line.quantity ?? 0),
                unit: typeof line.unit === "string" ? line.unit : undefined,
                unitPrice:
                  typeof line.unitPrice === "number" ? line.unitPrice : undefined,
                amount: typeof line.amount === "number" ? line.amount : undefined,
              }))
          : undefined,
      }))
      .slice(0, 50);
  } catch {
    return [];
  }
}

function mapRequestStatus(
  status?: string | null,
  quotationStatus?: string | null,
) {
  if (quotationStatus?.toUpperCase() === "FINALIZED") return "Finalized";
  return requestStatusLabel(status);
}

function notificationStatusStyle(
  requestStatus?: string | null,
  quotationStatus?: string | null,
  agreementStatus?: string,
): { bg: string; text: string; dot: string } {
  if (agreementStatus === "ACCEPTED")
    return { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" };
  if (quotationStatus?.toUpperCase() === "FINALIZED")
    return { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" };
  return getRequestStatusTone(requestStatus);
}

function notificationAgreementLabel(agreementStatus?: string): string {
  if (!agreementStatus) return "";
  switch (agreementStatus.toUpperCase()) {
    case "INITIATED": return "Pending your review";
    case "ACCEPTED": return "Accepted";
    case "REJECTED": return "Rejected";
    default: return "";
  }
}

function shouldShowNotificationItemQuantity(item: NotificationItem): boolean {
  if (item.status?.toUpperCase() === "FINALIZED") return true;
  const requestStatus = String(item.requestStatus ?? "").trim().toUpperCase();
  return requestStatus === "QUOTED" || requestStatus === "ACCEPTED";
}

function splitNotificationItems(
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit?: string;
    unitPrice?: number;
    amount?: number;
  }>,
) {
  const perPersonLine = items.find((item) => isPerPersonQuoteLine(item));
  const regularItems = items.filter((item) => !isPerPersonQuoteLine(item));
  const rate = Number(perPersonLine?.unitPrice ?? 0);
  const guests = Number(perPersonLine?.quantity ?? 0);
  const totalFromAmount = Number(perPersonLine?.amount ?? 0);
  const total = totalFromAmount > 0 ? totalFromAmount : Number((rate * guests).toFixed(2));

  return {
    regularItems,
    perPersonQuote: perPersonLine
      ? {
          rate,
          guests,
          total,
        }
      : null,
  };
}

function isPerPersonQuoteLine(item: { name?: string; unit?: string }) {
  const unit = String(item.unit ?? "").trim().toLowerCase();
  if (unit === "person") return true;
  const name = String(item.name ?? "").trim().toLowerCase();
  return name === "per person quote";
}

function extractPhoneFromPortalToken(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return "";
    if (typeof window === "undefined") return "";
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = window.atob(normalized);
    const payload = JSON.parse(decoded) as { phone?: string };
    return payload.phone ?? "";
  } catch {
    return "";
  }
}

function flattenCatalogItems(
  nodes: CategoryNode[],
  path: string[] = [],
): CatalogItem[] {
  const result: CatalogItem[] = [];

  for (const node of nodes) {
    const nextPath = [...path, node.name];
    for (const item of node.items) {
      const topCategory = nextPath[0] ?? node.name;
      const subCategory =
        nextPath.length > 1 ? nextPath[1] : nextPath[nextPath.length - 1];
      result.push({
        id: item.id,
        name: item.name,
        unit: item.unit,
        basePrice: Number(item.basePrice ?? 0),
        imageUrl: item.imageUrl,
        topCategory,
        subCategory,
        leafCategory: node.name,
        categoryPath: nextPath.join(" > "),
      });
    }
    result.push(...flattenCatalogItems(node.children, nextPath));
  }

  return result;
}

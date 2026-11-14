import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  FileCheck2,
  FileText,
  IndianRupee,
  Mail,
  MapPin,
  MessageSquare,
  PartyPopper,
  Phone,
  Search,
  SendHorizontal,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Star,
  Trash2,
  TriangleAlert,
  User,
  UserRound,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FormDialog, FormDialogFooter } from "@/components/common/form-dialog";
import {
  LocationPinMap,
  type LocationPinValue,
} from "@/components/common/location-pin-map";
import { Input } from "@/components/ui/input";
import { LuxurySelect } from "@/components/ui/luxury-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CategoryNode } from "@/features/categories/categories.service";
import { QuotationPayload } from "@/features/quotations/quotations.service";
import { customerPortalService } from "@/features/customer-portal/customer-portal.service";
import { createWorkflowSocket } from "@/features/quotations/workflow-socket";
import { formatInr } from "@/utils/currency";
import { cn } from "@/utils/cn";
import { isVegDish } from "@/utils/dietary";
import { toMediaUrl } from "@/utils/media-url";
import { toUiRequestStatus } from "@/utils/request-status";

/* ─── Types ──────────────────────────────────────────────────── */

type CustomerForm = {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  alternateName?: string;
  alternatePhone?: string;
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
  imageUrl?: string;
  topCategory: string;
  subCategory: string;
  leafCategory: string;
  categoryPath: string;
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
  read?: boolean;
};

/* ─── Constants ──────────────────────────────────────────────── */

const DEFAULT_GST = 5;
const CUSTOMER_PORTAL_OTP_LENGTH = 4;
const CUSTOMER_PORTAL_TOKEN_KEY = "customer_portal_token";
const CUSTOMER_PORTAL_PROFILE_KEY = "customer_portal_profile";
const CUSTOMER_PORTAL_CART_KEY = "customer_portal_cart";
const CUSTOMER_PORTAL_NOTIFICATIONS_KEY = "customer_portal_notifications";

const EVENT_TYPE_OPTIONS = [
  "Grand Wedding (Vivaham)",
  "Engagement & Betrothal (Nischayam)",
  "Wedding Reception & Banquet",
  "Nikkah & Malabar Feast",
  "Christian Holy Matrimony & Reception",
  "Traditional Kerala Sadya Feast",
  "House Warming (Grihapravesham)",
  "Milestone Birthday & Jubilee",
  "Baby Shower & Naming Ceremony (Choroonu / Noolukettu)",
  "Corporate Conference & Annual Gala",
  "Cultural & Temple Festival Feast",
  "Anniversary Celebration",
  "Cocktail, Mocktail & Sangeet Evening",
  "Intimate Family Banquet",
  "Memorial / Prayer Gathering",
  "Other Special Celebration",
];

const VENUE_OPTIONS = [
  "Home / Tharavadu / Private Residence",
  "Convention Center / Grand Hall",
  "Auditorium / Kalyana Mandapam",
  "Luxury Hotel / Ballroom",
  "Heritage Palace / Resort",
  "Beachfront / Lakefront Waterfront Venue",
  "Temple Auditorium / Temple Premises",
  "Church Parish Hall / Community Center",
  "Open Lawn / Garden Ground",
  "Club House / Banquet Hall",
  "Outdoor Thattukada & Live Counter Setup",
  "Corporate Campus / Office",
  "Other Custom Venue",
];

const NON_FOOD_CATEGORIES = new Set([
  "Stage Decoration",
  "Seating & Furniture",
  "Audio & Visual",
  "Hospitality & Service",
  "Photography & Media",
]);

/* ─── Thankam Food Helpers ────────────────────────────────────── */

function isVegItem(item: CatalogItem): boolean {
  return isVegDish(item.name, `${item.topCategory} ${item.subCategory} ${item.leafCategory} ${item.categoryPath}`);
}

function getItemDescription(item: CatalogItem): string {
  const n = item.name.toLowerCase();
  if (n.includes("sadya") || n.includes("sadhya")) {
    return "Grand plantain leaf feast prepared with pure ghee, Parippu, Sambar, Avial, Thoran, Olan and 2 payasams.";
  }
  if (n.includes("biriyani") || n.includes("biryani")) {
    return "Slow-cooked fragrant kaima rice dum biryani steeped in Malabar spices, served with dates pickle and raita.";
  }
  if (n.includes("payasam") || n.includes("pradhaman")) {
    return "Traditional Kerala sweet dessert slow-simmered in rich condensed milk, cardamoms and ghee cashew nuts.";
  }
  if (n.includes("chicken")) {
    return "Tender cuts prepared with authentic Kerala shallots, curry leaves, cracked black pepper and coconut oil.";
  }
  if (n.includes("beef")) {
    return "Slow-roasted tender meat chunks tossed with crunchy coconut slivers, garlic and Malabar spices.";
  }
  if (n.includes("fish") || n.includes("prawn")) {
    return "Fresh coastal catch cooked to golden perfection with turmeric, crushed chili and kokum essence.";
  }
  if (n.includes("appam") || n.includes("porotta")) {
    return "Freshly made hot bread with crisp lacy edges, ideal accompaniment for rich banquet gravies.";
  }
  return `Authentic Thankam banquet recipe, prepared fresh using premium traditional ingredients.`;
}

/* ─── Veg / Non-Veg Icon Component ───────────────────────────── */

function VegNonVegIcon({ isVeg, size = 15 }: { isVeg: boolean; size?: number }) {
  if (isVeg) {
    return (
      <div
        className="inline-flex shrink-0 items-center justify-center rounded-[4px] border-[1.5px] border-emerald-600 p-[2px] bg-white shadow-2xs"
        style={{ width: size + 3, height: size + 3 }}
        title="Pure Vegetarian"
      >
        <span
          className="rounded-full bg-emerald-600 shrink-0"
          style={{ width: size - 5, height: size - 5 }}
        />
      </div>
    );
  }
  return (
    <div
      className="inline-flex shrink-0 items-center justify-center rounded-[4px] border-[1.5px] border-rose-600 p-[2px] bg-white shadow-2xs"
      style={{ width: size + 3, height: size + 3 }}
      title="Non-Vegetarian"
    >
      <span
        className="rounded-full bg-rose-600 shrink-0"
        style={{ width: size - 5, height: size - 5 }}
      />
    </div>
  );
}

/* ─── Quotation Notification Helpers ─────────────────────────── */

function formatEventDate(dateStr?: string | null): string {
  if (!dateStr) return "Date TBD";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getQuotationStatusBadge(rawStatus?: string | null, rawReqStatus?: string | null) {
  const ui = toUiRequestStatus(rawReqStatus || rawStatus);
  switch (ui) {
    case "REQUESTED":
      return {
        label: "Submitted",
        color: "text-amber-800",
        bg: "bg-amber-50",
        border: "border-amber-200",
        dot: "bg-amber-500",
      };
    case "UNDER_REVIEW":
      return {
        label: "Under Review",
        color: "text-orange-800",
        bg: "bg-orange-50",
        border: "border-orange-200",
        dot: "bg-orange-500 animate-pulse",
      };
    case "QUOTED":
      return {
        label: "Quote Ready",
        color: "text-[#B8860B]",
        bg: "bg-amber-50",
        border: "border-[#D4AF37]/60",
        dot: "bg-[#B8860B] animate-pulse",
      };
    case "ACCEPTED":
      return {
        label: "Accepted",
        color: "text-emerald-800",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        dot: "bg-emerald-600",
      };
    case "DECLINED":
      return {
        label: "Declined",
        color: "text-rose-800",
        bg: "bg-rose-50",
        border: "border-rose-200",
        dot: "bg-rose-500",
      };
    default:
      return {
        label: "Active",
        color: "text-slate-800",
        bg: "bg-slate-50",
        border: "border-slate-200",
        dot: "bg-slate-400",
      };
  }
}

/* ─── Main Customer Portal Component ─────────────────────────── */

export function CustomerPortalPage() {
  const navigate = useNavigate();
  const [catalogTree, setCatalogTree] = useState<CategoryNode[]>([]);
  const [companyLogo, setCompanyLogo] = useState("");
  const [companyName, setCompanyName] = useState("Thankam Events");
  const [search, setSearch] = useState("");
  const [foodTypeFilter, setFoodTypeFilter] = useState<"ALL" | "VEG" | "NON_VEG">("ALL");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Selected dishes set (dish ID -> 1)
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>(() => readPersistedCart());

  const [activeSubCategory, setActiveSubCategory] = useState("");
  const [activeLeafCategory, setActiveLeafCategory] = useState("");

  const [showCartModal, setShowCartModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [authRedirectTarget, setAuthRedirectTarget] = useState<"quotation" | "agreement" | "cart">("quotation");
  const [authLoading, setAuthLoading] = useState(false);
  const [authPhone, setAuthPhone] = useState("");
  const [adminPhoneAlert, setAdminPhoneAlert] = useState(false);
  const [authChannel, setAuthChannel] = useState<'12' | '11'>('12');
  const [authOtp, setAuthOtp] = useState("");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authOtpRequested, setAuthOtpRequested] = useState(false);
  const [authExistingCustomer, setAuthExistingCustomer] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
  const [liveQuotations, setLiveQuotations] = useState<any[]>([]);
  const [quotationsLoading, setQuotationsLoading] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const datePickerContainerRef = useRef<HTMLDivElement | null>(null);

  const [hasAlternateContact, setHasAlternateContact] = useState(false);
  const [hasAddress, setHasAddress] = useState(false);

  const [form, setForm] = useState<CustomerForm>({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    alternateName: "",
    alternatePhone: "",
    eventDate: "",
    eventType: "",
    venue: "",
    guestCount: "100",
    notes: "",
  });

  const [locationPin, setLocationPin] = useState<LocationPinValue | null>(null);

  /* Prevent background scroll when cart modal is open */
  useEffect(() => {
    document.body.style.overflow = showCartModal ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showCartModal]);

  /* Outside click dismiss for calendar */
  useEffect(() => {
    if (!isCalendarOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        datePickerContainerRef.current?.contains(target) ||
        target.closest(".MuiPickersPopper-root") ||
        target.closest(".MuiPickersLayout-root") ||
        target.closest(".MuiDateCalendar-root")
      ) {
        return;
      }
      setIsCalendarOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => window.removeEventListener("pointerdown", handlePointerDown, true);
  }, [isCalendarOpen]);

  /* ── Load Catalog & Branding ── */
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
        if (c?.logoUrl) setCompanyLogo(toMediaUrl(c.logoUrl));
        if (c?.name) setCompanyName(c.name);
      })
      .catch(() => null);
  }, []);

  /* URL query param checks */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "1") setAuthModalOpen(true);
    if (params.get("cart") === "1") {
      const token = localStorage.getItem(CUSTOMER_PORTAL_TOKEN_KEY);
      if (token) {
        setShowCartModal(true);
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
            if (item.itemId) preCart[item.itemId] = 1;
          }
          setSelectedQty(preCart);
          setShowCartModal(true);
        });
      }
    }
  }, []);

  /* Persist Cart */
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(CUSTOMER_PORTAL_CART_KEY, JSON.stringify(selectedQty));
  }, [selectedQty]);

  /* Stored Profile & Notifications */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(CUSTOMER_PORTAL_PROFILE_KEY);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        const name = p.name ?? "";
        const phone = p.phone ?? "";
        const email = p.email ?? "";
        setProfileName(name);
        setProfilePhone(phone);
        if (email) setAuthEmail(email);
        setForm((prev) => ({
          ...prev,
          customerName: prev.customerName || name,
          customerPhone: prev.customerPhone || phone,
        }));
      } catch {
        /* empty */
      }
    }
    const persistedNotes = readPersistedNotifications();
    if (persistedNotes.length > 0) setNotificationItems(persistedNotes);
  }, []);

  /* Flatten all food items */
  const allItems = useMemo(() => flattenCatalogItems(catalogTree), [catalogTree]);

  /* Subcategories (e.g. Traditional Kerala Sadya vs General Feast Menu) */
  const subCategories = useMemo(() => {
    return Array.from(new Set(allItems.map((i) => i.subCategory)));
  }, [allItems]);

  useEffect(() => {
    if (subCategories.length === 0) return;
    if (!subCategories.includes(activeSubCategory)) {
      setActiveSubCategory(subCategories[0]);
      setActiveLeafCategory("");
    }
  }, [subCategories, activeSubCategory]);

  /* Leaf categories within active subcategory (e.g. Starters, Biryani, Curries, Payasam) */
  const leafSubCategories = useMemo(() => {
    if (!activeSubCategory) return [];
    return Array.from(
      new Set(
        allItems
          .filter((i) => i.subCategory === activeSubCategory)
          .map((i) => i.leafCategory),
      ),
    );
  }, [allItems, activeSubCategory]);

  /* Filtered Items based on search, Veg/Non-Veg, Subcat & Leaf category */
  const filteredItems = useMemo(() => {
    let scoped = allItems;

    if (activeSubCategory) {
      scoped = scoped.filter((i) => i.subCategory === activeSubCategory);
    }
    if (activeLeafCategory) {
      scoped = scoped.filter((i) => i.leafCategory === activeLeafCategory);
    }
    if (foodTypeFilter === "VEG") {
      scoped = scoped.filter((i) => isVegItem(i));
    } else if (foodTypeFilter === "NON_VEG") {
      scoped = scoped.filter((i) => !isVegItem(i));
    }
    const needle = search.trim().toLowerCase();
    if (!needle) return scoped;

    return scoped.filter(
      (i) =>
        i.name.toLowerCase().includes(needle) ||
        i.leafCategory.toLowerCase().includes(needle) ||
        i.subCategory.toLowerCase().includes(needle),
    );
  }, [
    allItems,
    activeSubCategory,
    activeLeafCategory,
    foodTypeFilter,
    search,
  ]);

  /* Selected items list */
  const selectedItems = useMemo(
    () =>
      allItems
        .filter((item) => (selectedQty[item.id] || 0) > 0)
        .map((item) => ({ ...item, quantity: 1 })),
    [allItems, selectedQty],
  );

  /* Thankam Add / Remove Dish Toggle */
  const onToggleItem = (item: CatalogItem) => {
    setSelectedQty((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = 1;
      }
      return next;
    });
  };

  const onRemoveItem = (itemId: string) => {
    setSelectedQty((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  /* Auth & Session */
  const isAuthenticated =
    typeof window !== "undefined" && Boolean(localStorage.getItem(CUSTOMER_PORTAL_TOKEN_KEY));

  const authenticatedPhone = useMemo(() => {
    if (typeof window === "undefined") return "";
    const token = localStorage.getItem(CUSTOMER_PORTAL_TOKEN_KEY);
    return token ? extractPhoneFromPortalToken(token) : profilePhone || "";
  }, [profilePhone]);

  /* Ensure form contact fields are automatically kept in sync with user profile */
  useEffect(() => {
    const effectivePhone = authenticatedPhone || profilePhone;
    if (effectivePhone || profileName) {
      setForm((prev) => {
        let changed = false;
        const next = { ...prev };
        if (!next.customerName && profileName) {
          next.customerName = profileName;
          changed = true;
        }
        if (!next.customerPhone && effectivePhone) {
          next.customerPhone = effectivePhone;
          changed = true;
        }
        return changed ? next : prev;
      });
    }
  }, [profileName, profilePhone, authenticatedPhone]);

  /* Live Quotations for Notifications & Tracking */
  const loadLiveQuotations = async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(CUSTOMER_PORTAL_TOKEN_KEY);
    if (!token) return;
    try {
      setQuotationsLoading(true);
      const data = await customerPortalService.myQuotations(token);
      if (Array.isArray(data)) {
        setLiveQuotations(data);
      }
    } catch {
      /* silent fallback */
    } finally {
      setQuotationsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void loadLiveQuotations();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (notificationsOpen) {
      void loadLiveQuotations();
    }
  }, [notificationsOpen]);

  /* Real-time WebSocket Status Sync & Polling */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(CUSTOMER_PORTAL_TOKEN_KEY);
    if (!token || !isAuthenticated) return;
    const socket = createWorkflowSocket({ token });
    const handleUpdate = () => {
      void loadLiveQuotations();
    };

    socket.on("workflow:request.created", handleUpdate);
    socket.on("workflow:request.updated", handleUpdate);
    socket.on("workflow:request.status", handleUpdate);
    socket.on("workflow:quotation.status", handleUpdate);
    socket.on("workflow:agreement.initiated", handleUpdate);
    socket.on("workflow:agreement.feedback", handleUpdate);
    socket.on("quotation:statusChanged", handleUpdate);

    const timer = setInterval(handleUpdate, 8000);

    return () => {
      clearInterval(timer);
      socket.disconnect();
    };
  }, [isAuthenticated]);

  /* Normalized quotation updates with rich data */
  const displayUpdates = useMemo(() => {
    if (liveQuotations.length > 0) {
      return liveQuotations.map((q) => {
        const uiSt = toUiRequestStatus(q.requestStatus || q.status);
        const grandNum = Number(q.grandTotal ?? 0);
        return {
          id: q.id,
          quotationNumber: q.quotationNumber,
          eventType: q.eventType || "Grand Catering Feast",
          eventDate: q.eventDate,
          venue: q.venue || "Custom Venue",
          guestCount: q.guestCount || 100,
          dishCount: Array.isArray(q.items) ? q.items.length : 0,
          grandTotal: grandNum > 0 ? grandNum : undefined,
          status: q.status,
          requestStatus: q.requestStatus,
          uiStatus: uiSt,
          agreementStatus: q.agreementStatus,
          createdAt: q.createdAt,
        };
      });
    }

    return notificationItems.map((n) => {
      const titleMatch = n.title?.match(/(Q-\d{4}-\d+)(?:\s*-\s*(\w+))?/);
      const qNum = n.quotationNumber || titleMatch?.[1] || "Quotation";
      const rawStatus = n.status || n.requestStatus || titleMatch?.[2] || "REQUESTED";
      const uiSt = toUiRequestStatus(rawStatus);

      let evType = n.eventType;
      let evDate = n.eventDate;
      if ((!evType || !evDate) && n.subtitle) {
        const parts = n.subtitle.split("•").map((s) => s.trim());
        if (parts.length >= 2) {
          evType = evType || parts[0];
          evDate = evDate || parts[1];
        } else {
          evType = evType || n.subtitle;
        }
      }

      return {
        id: n.id,
        quotationNumber: qNum,
        eventType: evType || "Grand Catering Feast",
        eventDate: evDate,
        venue: n.venue || "Custom Venue",
        guestCount: n.guestCount || 100,
        dishCount: 0,
        grandTotal: n.grandTotal,
        status: rawStatus,
        requestStatus: rawStatus,
        uiStatus: uiSt,
        agreementStatus: n.agreementStatus,
        createdAt: n.createdAt,
      };
    });
  }, [liveQuotations, notificationItems]);

  const unreadNotificationCount = useMemo(
    () => displayUpdates.length,
    [displayUpdates],
  );

  const openCartWithLoginGuard = () => {
    if (!isAuthenticated) {
      setAuthRedirectTarget("cart");
      setAuthModalOpen(true);
      return;
    }
    const effectivePhone = authenticatedPhone || profilePhone;
    setForm((prev) => ({
      ...prev,
      customerName: prev.customerName || profileName,
      customerPhone: prev.customerPhone || effectivePhone,
    }));
    setShowCartModal(true);
  };

  /* Validation errors */
  const fieldErrors = useMemo(() => {
    if (!submitAttempted) return {} as Record<string, string>;
    const errs: Record<string, string> = {};
    if (!sanitizeNameInput(form.customerName).trim()) errs.customerName = "Full name is required";
    const phone = sanitizePhoneInput(authenticatedPhone || form.customerPhone);
    if (!/^\d{10}$/.test(phone)) errs.customerPhone = "Enter a valid 10-digit number";
    if (!form.eventDate) errs.eventDate = "Event date is required";
    if (!form.eventType) errs.eventType = "Please select an event type";
    if (!form.venue) errs.venue = "Please select a venue";
    const gc = Number.parseInt(form.guestCount, 10);
    if (!Number.isInteger(gc) || gc < 1) errs.guestCount = "Enter a valid guest count";
    return errs;
  }, [submitAttempted, form, authenticatedPhone]);

  /* ── Submit Banquet Quotation Request ── */
  const onSubmit = async () => {
    setSubmitAttempted(true);

    const accessToken =
      typeof window !== "undefined" ? localStorage.getItem(CUSTOMER_PORTAL_TOKEN_KEY) : null;

    if (!accessToken) {
      toast.error("Please login to submit quotation request");
      setAuthRedirectTarget("quotation");
      setAuthModalOpen(true);
      return;
    }

    const customerName = sanitizeNameInput(form.customerName).trim();
    const submitPhone = sanitizePhoneInput(form.customerPhone || authenticatedPhone);
    let customerAddress = hasAddress ? form.customerAddress.trim() : "";
    if (locationPin && !customerAddress.includes(locationPin.mapUrl)) {
      customerAddress = customerAddress
        ? `${customerAddress}\n📍 Pinned Location: ${locationPin.mapUrl}`
        : `📍 Pinned Location: ${locationPin.mapUrl}`;
    }

    let finalNotes = form.notes.trim();

    // Attach Customer Email from Login/Profile if provided
    let profileEmail = authEmail.trim();
    if (!profileEmail) {
      try {
        const raw = localStorage.getItem(CUSTOMER_PORTAL_PROFILE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.email) profileEmail = String(parsed.email).trim();
        }
      } catch {
        /* empty */
      }
    }
    if (profileEmail && !finalNotes.includes(profileEmail)) {
      finalNotes = finalNotes ? `${finalNotes}\n[Email: ${profileEmail}]` : `[Email: ${profileEmail}]`;
    }

    if (hasAlternateContact && (form.alternateName?.trim() || form.alternatePhone?.trim())) {
      const altParts: string[] = [];
      if (form.alternateName?.trim()) altParts.push(`Alternate Contact: ${form.alternateName.trim()}`);
      if (form.alternatePhone?.trim()) altParts.push(`Alt Phone: ${sanitizePhoneInput(form.alternatePhone)}`);
      const altSummary = altParts.join(" • ");
      finalNotes = finalNotes ? `${finalNotes}\n[${altSummary}]` : `[${altSummary}]`;
      if (customerAddress) {
        customerAddress = `${customerAddress} | ${altSummary}`;
      } else {
        customerAddress = altSummary;
      }
    }

    const guestCount = Number.parseInt(form.guestCount, 10);

    if (!customerName || !submitPhone || !form.eventDate || !form.eventType || !form.venue) {
      toast.error("Please fill all required customer and event fields");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Please select at least one dish for your menu");
      return;
    }

    // Pass unitPrice: 0 so admin determines the official pricing upon quoting
    const payload: QuotationPayload = {
      customerName,
      customerPhone: submitPhone,
      customerAddress: customerAddress || undefined,
      eventDate: form.eventDate,
      eventType: form.eventType.trim(),
      venue: form.venue.trim(),
      guestCount,
      notes: finalNotes || undefined,
      gstPercent: DEFAULT_GST,
      items: selectedItems.map((item) => ({
        itemId: item.id,
        name: item.name,
        quantity: guestCount,
        unit: item.unit || "Guests",
        unitPrice: 0,
      })),
    };

    try {
      setSubmitting(true);
      try {
        const raw = localStorage.getItem(CUSTOMER_PORTAL_PROFILE_KEY);
        const existing = raw ? JSON.parse(raw) : {};
        localStorage.setItem(
          CUSTOMER_PORTAL_PROFILE_KEY,
          JSON.stringify({
            ...existing,
            name: customerName,
            phone: submitPhone,
            ...(profileEmail ? { email: profileEmail } : {}),
          }),
        );
        setProfileName(customerName);
        setProfilePhone(submitPhone);
      } catch {
        /* empty */
      }
      if (editingQuotationId) {
        const response = await customerPortalService.updateMyQuotation(
          accessToken,
          editingQuotationId,
          payload,
        );
        toast.success(`Request updated: ${response.quotationNumber}`);
        setEditingQuotationId(null);
        navigate("/customer/track");
      } else {
        const response = await customerPortalService.submitQuotationRequest(accessToken, payload);
        toast.success(`Quotation request submitted: ${response.quotationNumber}`);
      }
      setSelectedQty({});
      if (typeof window !== "undefined") {
        localStorage.removeItem(CUSTOMER_PORTAL_CART_KEY);
      }
      setShowCartModal(false);
      setShowCheckout(false);
      setSubmitAttempted(false);
      navigate("/customer/track");
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  /* OTP Resend Timer */
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  /* OTP Handlers */
  const onRequestAuthOtp = async (preferredChannel: '11' | '12' = authChannel) => {
    const sanitizedPhone = sanitizePhoneInput(authPhone);
    if (!sanitizedPhone || !/^\d{10}$/.test(sanitizedPhone)) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    try {
      setAdminPhoneAlert(false);
      setAuthLoading(true);
      setAuthChannel(preferredChannel);
      const res = await customerPortalService.requestOtp(sanitizedPhone, preferredChannel);
      setAuthOtpRequested(true);
      setAuthExistingCustomer(res.existingCustomer);
      setAuthPhone(sanitizedPhone);
      setAuthOtp("");
      setResendCooldown(30);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      if (res.otp) toast.success(`Dev OTP: ${res.otp}`);
      else toast.success(preferredChannel === '12' ? 'Verification code sent via WhatsApp' : 'Verification code sent via SMS');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to send OTP";
      if (/Admin\/Staff/i.test(msg) || /admin/i.test(msg)) {
        setAdminPhoneAlert(true);
      }
      toast.error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const onResendOtp = async (channel: '11' | '12' = '12') => {
    const sanitizedPhone = sanitizePhoneInput(authPhone);
    if (!sanitizedPhone) return;
    try {
      setAuthLoading(true);
      setAuthChannel(channel);
      await customerPortalService.retryOtp(sanitizedPhone, channel);
      setResendCooldown(30);
      toast.success(channel === '12' ? 'OTP sent via WhatsApp' : 'OTP resent via SMS');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to resend OTP');
    } finally {
      setAuthLoading(false);
    }
  };

  const onVerifyAuthOtp = async () => {
    const sanitizedOtp = authOtp.replace(/\D/g, "").slice(0, CUSTOMER_PORTAL_OTP_LENGTH);
    const sanitizedPhone = sanitizePhoneInput(authPhone);
    const sanitizedName = sanitizeNameInput(authName).trim();

    if (!sanitizedOtp || sanitizedOtp.length < CUSTOMER_PORTAL_OTP_LENGTH) {
      toast.error(`Enter the 4-digit OTP`);
      return;
    }
    if (!authExistingCustomer && !sanitizedName) {
      toast.error("Please enter your full name to proceed");
      return;
    }
    try {
      setAuthLoading(true);
      const res = await customerPortalService.verifyOtp(
        sanitizedPhone,
        sanitizedOtp,
        authExistingCustomer ? undefined : sanitizedName,
        authExistingCustomer ? undefined : authEmail,
      );
      localStorage.setItem(CUSTOMER_PORTAL_TOKEN_KEY, res.accessToken);
      const stored = {
        name: res.customerName ?? sanitizedName,
        email: res.customerEmail ?? authEmail,
        phone: sanitizedPhone,
      };
      localStorage.setItem(CUSTOMER_PORTAL_PROFILE_KEY, JSON.stringify(stored));
      setProfileName(stored.name);
      setProfilePhone(stored.phone);
      setForm((prev) => ({
        ...prev,
        customerName: prev.customerName || stored.name,
        customerPhone: stored.phone,
      }));
      toast.success("Login successful");
      setAuthModalOpen(false);
      if (authRedirectTarget === "cart") {
        setShowCartModal(true);
        return;
      }
      navigate(authRedirectTarget === "agreement" ? "/customer/agreement" : "/customer/track");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Invalid OTP");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOtpDigit = (index: number, val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length > 1) {
      const arr = authOtp.padEnd(CUSTOMER_PORTAL_OTP_LENGTH, " ").split("");
      for (let i = 0; i < digits.length && index + i < CUSTOMER_PORTAL_OTP_LENGTH; i++) {
        arr[index + i] = digits[i];
      }
      setAuthOtp(arr.join("").trimEnd());
      const nextIdx = Math.min(index + digits.length, CUSTOMER_PORTAL_OTP_LENGTH - 1);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }
    const arr = authOtp.padEnd(CUSTOMER_PORTAL_OTP_LENGTH, " ").split("");
    arr[index] = digits;
    setAuthOtp(arr.join("").trimEnd());
    if (digits && index < CUSTOMER_PORTAL_OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && (!authOtp[index] || authOtp[index] === " ") && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] pb-32 text-slate-900 font-sans">
      {/* ── STICKY Thankam TOP HEADER ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          {/* Left: Back & Brand */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Back to home"
              onClick={() => navigate("/")}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 active:scale-95 shadow-2xs"
            >
              <ArrowLeft size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-xl p-[1.5px] bg-gradient-to-tr from-amber-600 via-[#F3CA52] to-amber-500 shadow-sm flex items-center justify-center">
                <div className="w-full h-full rounded-[10px] bg-white p-0.5 flex items-center justify-center overflow-hidden">
                  {companyLogo ? (
                    <img src={companyLogo} alt={companyName} className="h-full w-full object-contain" />
                  ) : (
                    <img src="/assets/img/Thankam_Logo.png" alt={companyName} className="h-full w-full object-contain" />
                  )}
                </div>
              </div>
              <div>
                <span className="block font-serif text-sm sm:text-base font-bold tracking-tight text-slate-900 leading-tight">
                  {companyName}
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#B8860B]">
                  Kollam &bull; Luxury Catering
                </span>
              </div>
            </div>
          </div>

          {/* Center: Search input */}
          <div className="relative hidden md:block flex-1 max-w-md mx-4">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes (e.g. Biriyani, Appam, Sadya, Fish)..."
              className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-9 text-xs font-semibold text-slate-800 outline-none transition focus:bg-white focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Right: Quick actions */}
          <div className="flex items-center gap-2.5">
            {/* Notification Bell */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setNotificationsOpen(true)}
                className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
                title="Notifications"
              >
                <Bell size={16} />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>
            )}

            {/* Profile or Login */}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white pl-1.5 pr-3 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-2xs"
              >
                <div className="grid h-7 w-7 place-items-center rounded-full bg-[#080C14] text-[10px] font-black text-[#F3CA52]">
                  {profileName ? profileName.charAt(0).toUpperCase() : "U"}
                </div>
                <span className="hidden sm:inline">{profileName ? profileName.split(" ")[0] : "Account"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthRedirectTarget("quotation");
                  setAuthModalOpen(true);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-900 px-4 text-xs font-bold text-amber-300 hover:bg-black transition shadow-xs"
              >
                <UserRound size={13} />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="border-t border-slate-100 px-4 py-2 md:hidden bg-slate-50">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes (e.g. Biriyani, Sadya, Fish)..."
              className="h-9 w-full rounded-full border border-slate-200 bg-white pl-9 pr-8 text-xs font-medium text-slate-800 outline-none focus:border-[#D4AF37]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN Thankam RESTAURANT / CATERING CONTENT ── */}
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 pt-4 space-y-5">
        {/* 1. Thankam RESTAURANT HERO CARD */}
        <div className="space-y-3">
          {/* Thankam Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 px-1">
            <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate("/")}>Home</span>
            <span>/</span>
            <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate("/customer/portal")}>Kollam</span>
            <span>/</span>
            <span className="text-slate-700 font-bold">{companyName} Catering Kitchen</span>
          </div>

          {/* Restaurant Title Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-2xl p-[2px] bg-gradient-to-tr from-amber-600 via-[#F3CA52] to-amber-500 shadow-sm flex items-center justify-center">
                <div className="w-full h-full rounded-[14px] bg-white p-1 flex items-center justify-center overflow-hidden">
                  {companyLogo ? (
                    <img src={companyLogo} alt={companyName} className="h-full w-full object-contain" />
                  ) : (
                    <img src="/assets/img/Thankam_Logo.png" alt={companyName} className="h-full w-full object-contain" />
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-slate-900 tracking-tight">
                    {companyName} Catering Kitchen
                  </h1>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Premier Wedding, Reception &amp; Traditional Banquet Catering in Kerala
                </p>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              <a
                href="https://wa.me/919207606150?text=Hi%20Thankam%20Events%2C%20I%20would%20like%20to%20inquire%20about%20catering%20services."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/80 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
              >
                <MessageSquare size={13} />
                <span>WhatsApp</span>
              </a>
              <a
                href="tel:+919207606150"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Phone size={13} />
                <span>Call Kitchen</span>
              </a>
            </div>
          </div>

          {/* The Iconic Thankam Inner Specification Box */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            {/* Middle Row: Cuisines & Offerings */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Culinary Specialties
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">
                Traditional Kerala Sadya &bull; Malabar Dum Biryani &bull; Grand Reception Feasts &bull; Live Tandoor &amp; Thattukada Counters &bull; Desserts &amp; Welcome Drinks
              </p>
            </div>

            {/* Bottom Row: Thankam 2-Node Route Logistics (Outlet -> Fleet) */}
            <div className="rounded-2xl bg-[#FAF9F6] border border-slate-100 p-3.5 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="flex sm:flex-row flex-col items-start sm:items-center gap-1 text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-slate-800 shrink-0" />
                      <span className="text-xs font-bold text-slate-900">
                        Outlet: <span className="font-medium text-slate-600">Central Kitchen, Kollam</span>
                      </span>
                    </div>
                    <span className="text-slate-300 hidden sm:inline mx-1">──</span>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0 animate-pulse" />
                      <span className="text-xs font-bold text-slate-900">
                        Fleet Service: <span className="font-medium text-slate-600">All 14 Districts of Kerala (On-Site Live Cooking)</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 self-start sm:self-auto shrink-0">
                  ✓ Free Tasting Session on Request
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Thankam FILTER & SELECTION BAR */}
        <div className="sticky top-16 z-30 -mx-3 px-3 sm:-mx-6 sm:px-6 py-2 bg-[#F4F5F7]/95 backdrop-blur-md border-b border-slate-200/80">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
            {/* Left: Thankam Veg/Non-Veg Toggles */}
            <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {/* Veg Only Toggle */}
              <button
                type="button"
                onClick={() => setFoodTypeFilter((prev) => (prev === "VEG" ? "ALL" : "VEG"))}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                  foodTypeFilter === "VEG"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <VegNonVegIcon isVeg={true} size={13} />
                <span>Veg</span>
              </button>

              {/* Non-Veg Toggle */}
              <button
                type="button"
                onClick={() => setFoodTypeFilter((prev) => (prev === "NON_VEG" ? "ALL" : "NON_VEG"))}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                  foodTypeFilter === "NON_VEG"
                    ? "border-rose-600 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <VegNonVegIcon isVeg={false} size={13} />
                <span>Non-Veg</span>
              </button>

              {/* Reset Filter if active */}
              {foodTypeFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setFoodTypeFilter("ALL")}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline px-1 ml-1"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Right: Subcategory style tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {subCategories.map((subcat) => {
                const active = subcat === activeSubCategory;
                const isSadya = subcat.toLowerCase().includes("sadya") || subcat.toLowerCase().includes("sadhya");
                return (
                  <button
                    key={subcat}
                    type="button"
                    onClick={() => {
                      setActiveSubCategory(subcat);
                      setActiveLeafCategory("");
                    }}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                      active
                        ? "bg-[#080C14] text-[#F3CA52] border border-[#D4AF37] shadow-xs"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <span>{isSadya ? "Traditional Sadya" : "General Feast"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Leaf Course pills */}
          {leafSubCategories.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto px-1" style={{ scrollbarWidth: "none" }}>
              <button
                type="button"
                onClick={() => setActiveLeafCategory("")}
                className={`shrink-0 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                  !activeLeafCategory
                    ? "bg-[#B8860B] text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                All ({filteredItems.length})
              </button>
              {leafSubCategories.map((leaf) => {
                const count = allItems.filter(
                  (i) => i.subCategory === activeSubCategory && i.leafCategory === leaf,
                ).length;
                const active = leaf === activeLeafCategory;
                return (
                  <button
                    key={leaf}
                    type="button"
                    onClick={() => setActiveLeafCategory(leaf)}
                    className={`shrink-0 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                      active
                        ? "bg-[#B8860B] text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{leaf}</span>
                    <span className="ml-1 text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. RESPONSIVE Thankam 2-COLUMN LAYOUT (DESKTOP: DISHES LEFT 65%, STICKY MENU SUMMARY RIGHT 35%) */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          {/* ══ LEFT COLUMN: Thankam DISH SELECTION (NO BASE PRICES) ══ */}
          <main className="lg:col-span-8 space-y-4">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900">
                  {activeLeafCategory || activeSubCategory || "Recommended Menu"} ({filteredItems.length})
                </h2>
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => navigate("/customer/track")}
                    className="text-xs font-bold text-[#B8860B] hover:underline"
                  >
                    Track Quotations &rarr;
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-20 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#B8860B]" />
                  <p className="mt-3 text-xs font-bold text-slate-500">Loading Thankam Menu...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-16 text-center">
                  <UtensilsCrossed size={32} className="mx-auto text-slate-300" />
                  <p className="mt-2 text-sm font-bold text-slate-700">No dishes match your filters</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try clearing the search query or selecting another course.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setFoodTypeFilter("ALL");
                      setActiveLeafCategory("");
                    }}
                    className="mt-3 inline-flex items-center rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-bold text-amber-300"
                  >
                    View Full Menu
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-150">
                  {filteredItems.map((item) => {
                    const selected = Boolean(selectedQty[item.id]);
                    const isVeg = isVegItem(item);

                    return (
                      <article
                        key={item.id}
                        className={`flex items-start justify-between gap-4 py-5 transition-colors px-2 rounded-2xl ${
                          selected ? "bg-amber-50/20" : "hover:bg-slate-50/50"
                        }`}
                      >
                        {/* Dish Details (Thankam layout - NO PRICES SHOWN) */}
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2 mb-1.5">
                            <VegNonVegIcon isVeg={isVeg} size={14} />
                            <span className="text-[11px] font-medium text-slate-400">
                              {item.leafCategory}
                            </span>
                          </div>

                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                            {item.name}
                          </h3>

                          {/* Catering Menu inclusion badge (Replaces price) */}
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                            <Check size={11} className="text-[#B8860B]" />
                            <span>Included in Custom Banquet Selection</span>
                          </div>

                          <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {getItemDescription(item)}
                          </p>
                        </div>

                        {/* Dish Image & Thankam Overlaid ADD / Stepper Button */}
                        <div className="relative shrink-0 flex flex-col items-center pb-2">
                          <div className="relative h-24 w-28 sm:h-28 sm:w-36 overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-2xs">
                            {item.imageUrl ? (
                              <img
                                src={toMediaUrl(item.imageUrl)}
                                alt={item.name}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-300 bg-slate-50">
                                <UtensilsCrossed size={28} />
                              </div>
                            )}
                          </div>

                          {/* Overlaid ADD / REMOVE Button */}
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10">
                            {selected ? (
                              <button
                                type="button"
                                onClick={() => onToggleItem(item)}
                                className="group/btn flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 border border-emerald-700 text-white font-black text-xs uppercase px-4 py-1.5 shadow-md hover:bg-rose-600 hover:border-rose-700 active:scale-95 transition-all min-w-[96px]"
                                title="Click to remove from menu"
                              >
                                <Check size={13} className="stroke-[3] group-hover/btn:hidden" />
                                <span className="group-hover/btn:hidden">ADDED</span>
                                <span className="hidden group-hover/btn:inline text-[11px]">REMOVE ✕</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onToggleItem(item)}
                                className="flex items-center justify-center rounded-xl bg-white border border-slate-300 text-emerald-600 font-black text-xs uppercase px-5 py-1.5 shadow-md hover:bg-emerald-50 hover:border-emerald-500 active:scale-95 transition-all min-w-[90px]"
                              >
                                ADD <span className="ml-1 text-[11px] font-normal text-emerald-500">+</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </main>

          {/* ══ RIGHT COLUMN: Thankam DESKTOP STICKY QUOTATION CART ══ */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-20 space-y-4">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#080C14] text-[#F3CA52] border border-[#D4AF37]/40">
                    <ShoppingCart size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Menu Proposal</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {selectedItems.length} {selectedItems.length === 1 ? "dish" : "dishes"} selected
                    </p>
                  </div>
                </div>
                {selectedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedQty({})}
                    className="text-[11px] font-bold text-rose-600 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {selectedItems.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-[#B8860B] border border-[#D4AF37]/30">
                    <UtensilsCrossed size={20} />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Your Menu is Empty</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Click &quot;ADD&quot; on any dish from the menu to build your feast proposal.
                  </p>
                </div>
              ) : (
                <>
                  {/* Itemized Dish List */}
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: "thin" }}>
                    {selectedItems.map((item) => {
                      const isVeg = isVegItem(item);
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-2 text-xs py-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <VegNonVegIcon isVeg={isVeg} size={11} />
                            <span className="font-bold text-slate-800 truncate" title={item.name}>
                              {item.name}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title={`Remove ${item.name}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Dishes Summary Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        Selected Menu
                      </h4>
                      <span className="font-bold text-xs text-slate-900 font-mono">
                        {selectedItems.length} {selectedItems.length === 1 ? "Dish" : "Dishes"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Next, add your event date and guest count to request an official per-guest quotation from our catering desk.
                    </p>
                  </div>

                  {/* CTA Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated) {
                        setAuthRedirectTarget("cart");
                        setAuthModalOpen(true);
                        return;
                      }
                      const effectivePhone = authenticatedPhone || profilePhone;
                      setForm((prev) => ({
                        ...prev,
                        customerName: prev.customerName || profileName,
                        customerPhone: prev.customerPhone || effectivePhone,
                      }));
                      setShowCartModal(true);
                      setShowCheckout(true);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#080C14] py-3.5 text-xs font-black uppercase tracking-wider text-[#F3CA52] border border-[#D4AF37] hover:bg-[#121927] transition shadow-md active:scale-98"
                  >
                    <span>Proceed to Event Details</span>
                    <ArrowRight size={14} />
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* ── MOBILE FLOATING Thankam BOTTOM BAR ── */}
      {selectedItems.length > 0 && !showCartModal && (
        <aside
          aria-label="Floating cart summary"
          className="fixed inset-x-0 bottom-4 z-40 px-3 sm:px-6 lg:hidden pointer-events-none"
        >
          <div
            onClick={openCartWithLoginGuard}
            className="pointer-events-auto mx-auto flex w-full max-w-lg cursor-pointer items-center justify-between gap-3 rounded-2xl bg-[#080C14] px-4 py-3.5 text-white shadow-2xl border border-[#D4AF37]/50 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F3CA52] text-slate-950 font-black text-xs shadow-sm">
                <ShoppingCart size={18} />
                <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 text-[10px] font-black text-white shadow">
                  {selectedItems.length}
                </span>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-[#F3CA52]">
                  {selectedItems.length} {selectedItems.length === 1 ? "Dish" : "Dishes"} Selected
                </p>
                <p className="text-xs font-bold text-white flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-[#F3CA52]" />
                  <span>Ready for Quotation Request</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3CA52] px-4 py-2 text-xs font-black uppercase text-slate-950 shadow-md">
              <span>Review Menu</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </aside>
      )}

      {/* ── Thankam CART & CHECKOUT SLIDE-UP MODAL ── */}
      {showCartModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/65 backdrop-blur-md md:items-center md:p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCartModal(false);
              setIsCalendarOpen(false);
            }
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-t-[32px] bg-white shadow-2xl border border-[#D4AF37]/40 md:rounded-[28px] transition-all flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#D4AF37]/30 bg-[#080C14] px-6 py-4 relative shrink-0">
              <div className="flex items-center gap-3">
                {showCheckout && (
                  <button
                    type="button"
                    onClick={() => setShowCheckout(false)}
                    className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F3CA52]">
                    {showCheckout ? "Step 2: Event & Delivery" : "Step 1: Review Selected Dishes"}
                  </p>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
                    {showCheckout ? "Event & Venue Details" : "Your Banquet Proposal"}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCartModal(false);
                  setShowCheckout(false);
                }}
                className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white/80 hover:bg-rose-500/20 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#F8FAFC]">
              {!showCheckout ? (
                /* ── STEP 1: REVIEW MENU (NO PRICES) ── */
                <>
                  {/* Selected Items List */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Selected Dishes ({selectedItems.length})
                    </h4>

                    <div className="divide-y divide-slate-100">
                      {selectedItems.map((item) => {
                        const isVeg = isVegItem(item);
                        return (
                          <div key={item.id} className="flex items-center justify-between py-2.5 gap-3">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <VegNonVegIcon isVeg={isVeg} size={12} />
                              <div className="min-w-0">
                                <p className="text-xs font-extrabold text-slate-900 truncate">
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {item.leafCategory}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => onRemoveItem(item.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title={`Remove ${item.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Dishes Summary Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Selected Menu
                      </h4>
                      <span className="font-bold text-xs text-slate-900 font-mono">
                        {selectedItems.length} {selectedItems.length === 1 ? "Dish" : "Dishes"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      Next, enter your event date, venue, and guest count to request an official per-guest quote from our catering desk.
                    </p>
                  </div>

                  {/* Add more dishes button */}
                  <button
                    type="button"
                    onClick={() => setShowCartModal(false)}
                    className="w-full py-2.5 text-center text-xs font-bold text-[#B8860B] hover:underline"
                  >
                    + Add more dishes from menu
                  </button>
                </>
              ) : (
                /* ── STEP 2: EVENT & DELIVERY DETAILS ── */
                <>
                  {/* Customer Details */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <UserRound size={14} className="text-[#B8860B]" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Your Contact Information
                        </h4>
                      </div>
                      {authenticatedPhone && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          Verified
                        </span>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Full Name *</label>
                        <Input
                          value={form.customerName}
                          onChange={(e) =>
                            setForm((s) => ({ ...s, customerName: sanitizeNameInput(e.target.value) }))
                          }
                          placeholder="Your full name"
                          className={`h-10 text-xs rounded-xl mt-1 ${fieldErrors.customerName ? "border-rose-400 ring-1 ring-rose-400" : ""}`}
                        />
                        {fieldErrors.customerName && (
                          <p className="text-[10px] text-rose-500 font-bold mt-1">{fieldErrors.customerName}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Phone Number *</label>
                        <Input
                          value={form.customerPhone || authenticatedPhone}
                          onChange={(e) =>
                            setForm((s) => ({ ...s, customerPhone: sanitizePhoneInput(e.target.value) }))
                          }
                          placeholder="10-digit number"
                          className={`h-10 text-xs rounded-xl mt-1 ${fieldErrors.customerPhone ? "border-rose-400 ring-1 ring-rose-400" : ""}`}
                        />
                        {fieldErrors.customerPhone && (
                          <p className="text-[10px] text-rose-500 font-bold mt-1">{fieldErrors.customerPhone}</p>
                        )}
                      </div>
                    </div>

                    {/* Checkboxes: Alternate Contact & Address */}
                    <div className="pt-2 border-t border-slate-100 space-y-2.5">
                      {/* Checkbox 1: Alternate Contact Person or Number */}
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={hasAlternateContact}
                          onChange={(e) => setHasAlternateContact(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-[#B8860B] focus:ring-[#D4AF37]"
                        />
                        <span>Add alternate contact person or phone number</span>
                      </label>

                      {hasAlternateContact && (
                        <div className="grid gap-3 sm:grid-cols-2 rounded-xl bg-slate-50/80 p-3 border border-slate-200/80 animate-in fade-in slide-in-from-top-1">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600">
                              Alternate Contact Person Name
                            </label>
                            <Input
                              value={form.alternateName || ""}
                              onChange={(e) =>
                                setForm((s) => ({ ...s, alternateName: sanitizeNameInput(e.target.value) }))
                              }
                              placeholder="e.g. Event Coordinator, Spouse, Sibling"
                              className="h-9 text-xs rounded-lg mt-1 bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600">
                              Alternate Phone Number
                            </label>
                            <Input
                              value={form.alternatePhone || ""}
                              onChange={(e) =>
                                setForm((s) => ({ ...s, alternatePhone: sanitizePhoneInput(e.target.value) }))
                              }
                              placeholder="10-digit number"
                              className="h-9 text-xs rounded-lg mt-1 bg-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* Checkbox 2: Full Postal / Venue Delivery Address */}
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={hasAddress}
                          onChange={(e) => setHasAddress(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-[#B8860B] focus:ring-[#D4AF37]"
                        />
                        <span>Add postal / billing address (Optional)</span>
                      </label>

                      {hasAddress && (
                        <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-200/80 animate-in fade-in slide-in-from-top-1">
                          <label className="text-[10px] font-bold text-slate-600">
                            Full Postal / Venue Address
                          </label>
                          <Textarea
                            value={form.customerAddress}
                            onChange={(e) =>
                              setForm((s) => ({ ...s, customerAddress: e.target.value }))
                            }
                            placeholder="House / Hall Name, Street, Landmark, City, Pincode..."
                            className="text-xs rounded-lg mt-1 bg-white"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <CalendarDays size={14} className="text-[#B8860B]" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Event Schedule &amp; Venue
                      </h4>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {/* Event Date */}
                      <div ref={datePickerContainerRef}>
                        <label className="text-[11px] font-bold text-slate-700">Event Date *</label>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            open={isCalendarOpen}
                            onOpen={() => setIsCalendarOpen(true)}
                            onClose={() => setIsCalendarOpen(false)}
                            closeOnSelect={true}
                            value={parseDateInput(form.eventDate)}
                            onChange={(value) => {
                              setForm((s) => ({ ...s, eventDate: formatDateInput(value) }));
                              setIsCalendarOpen(false);
                            }}
                            minDate={new Date()}
                            format="dd/MM/yyyy"
                            slotProps={{
                              popper: { sx: { zIndex: 99999 } },
                              textField: {
                                onClick: () => setIsCalendarOpen((prev) => !prev),
                                fullWidth: true,
                                size: "small",
                                sx: {
                                  mt: 0.5,
                                  "& .MuiOutlinedInput-root": {
                                    borderRadius: "0.75rem",
                                    height: "40px",
                                    backgroundColor: "#fff",
                                  },
                                },
                              },
                            }}
                          />
                        </LocalizationProvider>
                      </div>

                      {/* Guest Count */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Guest Count (Number of Guests) *</label>
                        <Input
                          type="number"
                          min={1}
                          value={form.guestCount}
                          onChange={(e) => setForm((s) => ({ ...s, guestCount: e.target.value }))}
                          placeholder="e.g. 250"
                          className="h-10 text-xs rounded-xl mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 mt-2">
                      {/* Event Type */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Event Type *</label>
                        <div className="mt-1">
                          <LuxurySelect
                            value={form.eventType}
                            onChange={(val) => setForm((s) => ({ ...s, eventType: val }))}
                            options={EVENT_TYPE_OPTIONS}
                            placeholder="Select celebration type"
                          />
                        </div>
                      </div>

                      {/* Venue Type */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Venue *</label>
                        <div className="mt-1">
                          <LuxurySelect
                            value={form.venue}
                            onChange={(val) => setForm((s) => ({ ...s, venue: val }))}
                            options={VENUE_OPTIONS}
                            placeholder="Select venue"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Digital Proposal & Invoices Email */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Mail size={13} className="text-[#B8860B]" />
                        Email for Digital Proposal &amp; Invoices
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">Recommended</span>
                    </div>
                    <Input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="h-10 text-xs rounded-xl mt-1"
                    />
                    <p className="text-[10px] text-slate-400">
                      We&apos;ll email the official PDF proposal, agreement, and booking confirmations to this address.
                    </p>
                  </div>

                  {/* Cooking & Catering Instructions */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <FileText size={13} className="text-[#B8860B]" />
                      Cooking &amp; Catering Instructions (Optional)
                    </label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                      placeholder="Special requests, banana leaf service preference, welcome drink timing, dietary allergies..."
                      className="text-xs rounded-xl mt-1"
                      rows={2}
                    />
                  </div>

                  {/* Location Pin Drop */}
                  <LocationPinMap value={locationPin} onChange={setLocationPin} />
                </>
              )}
            </div>

            {/* Modal Sticky Bottom Action Footer */}
            <div className="border-t border-slate-200 bg-white p-4 shrink-0 shadow-lg flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">
                  {selectedItems.length} {selectedItems.length === 1 ? "Dish" : "Dishes"} Selected
                  {showCheckout && form.guestCount ? ` • ${form.guestCount} Guests` : ""}
                </p>
                <p className="text-xs font-bold text-slate-800">
                  {showCheckout ? "Official Quotation Request" : "Custom Quote on Next Step"}
                </p>
              </div>

              {!showCheckout ? (
                <button
                  type="button"
                  onClick={() => {
                    const effectivePhone = authenticatedPhone || profilePhone;
                    setForm((prev) => ({
                      ...prev,
                      customerName: prev.customerName || profileName,
                      customerPhone: prev.customerPhone || effectivePhone,
                    }));
                    setShowCheckout(true);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-[#080C14] px-6 py-3 text-xs font-black uppercase tracking-wider text-[#F3CA52] border border-[#D4AF37] hover:bg-black transition shadow-md active:scale-98"
                >
                  <span>Continue to Event Details</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void onSubmit()}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-[#080C14] px-6 py-3 text-xs font-black uppercase tracking-wider text-[#F3CA52] border border-[#D4AF37] hover:bg-black transition shadow-md active:scale-98 disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#F3CA52] border-t-transparent" />
                  ) : (
                    <SendHorizontal size={14} />
                  )}
                  <span>{submitting ? "Submitting Request..." : "Confirm & Request Quotation"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOMER LOGIN MODAL ── */}
      <FormDialog
        title={authOtpRequested ? "Verify & Sign In" : "Customer Sign In"}
        description={
          authOtpRequested
            ? `Enter the 4-digit verification code sent to +91 ${authPhone}`
            : "Enter your 10-digit mobile number to track catering quotations."
        }
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        contentClassName="max-w-md w-[95vw] rounded-3xl overflow-hidden shadow-2xl"
        bodyClassName="p-5 sm:p-6"
      >
        <div className="space-y-4">
          {!authOtpRequested ? (
            /* STEP 1: PHONE NUMBER ENTRY */
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>
                    Mobile Number <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">Direct SMS OTP</span>
                </label>
                <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-[#D4AF37] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#D4AF37]/20">
                  <div className="flex items-center gap-1.5 border-r border-slate-200 bg-slate-100/90 px-3.5 text-xs font-bold text-slate-700 select-none">
                    <span className="text-sm">🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    value={authPhone}
                    onChange={(e) => {
                      setAuthPhone(sanitizePhoneInput(e.target.value));
                      if (adminPhoneAlert) setAdminPhoneAlert(false);
                    }}
                    placeholder="Enter 10-digit number"
                    maxLength={10}
                    autoFocus
                    className="flex-1 bg-transparent px-3.5 py-3 text-sm font-semibold tracking-wider text-slate-900 placeholder:text-slate-400 outline-none"
                  />
                  {authPhone.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthPhone("");
                        setAdminPhoneAlert(false);
                      }}
                      className="px-3 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {adminPhoneAlert && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-950 shadow-sm animate-in fade-in duration-200">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert size={17} className="text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1.5 flex-1">
                      <p className="font-bold text-amber-950">Staff / Admin Account Detected</p>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        This phone number is registered to Thankam Events administration. To manage events, log in through the management dashboard. For customer bookings, please use a customer mobile number.
                      </p>
                      <a
                        href="/admin"
                        className="inline-flex items-center gap-1 font-bold text-[#B8860B] hover:text-[#9A7009] hover:underline text-[11px] pt-1"
                      >
                        Go to Admin Portal →
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Channel Selector Pills */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Deliver Verification Code Via
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthChannel('12')}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition-all cursor-pointer",
                      authChannel === '12'
                        ? "bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-400/20 shadow-2xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                    )}
                  >
                    <MessageSquare size={14} className={authChannel === '12' ? "text-emerald-600" : "text-slate-400"} />
                    <span>WhatsApp</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-emerald-600 text-white">
                      Instant
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthChannel('11')}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition-all cursor-pointer",
                      authChannel === '11'
                        ? "bg-amber-50 text-[#B8860B] border-[#D4AF37] ring-2 ring-[#D4AF37]/20 shadow-2xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                    )}
                  >
                    <Smartphone size={14} className={authChannel === '11' ? "text-[#B8860B]" : "text-slate-400"} />
                    <span>SMS</span>
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 p-3 text-xs text-amber-900">
                <ShieldCheck size={16} className="text-[#B8860B] shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px] text-amber-800">
                  Instant OTP login. View custom quotes, download signed catering agreements, and track preparations in real time.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void onRequestAuthOtp(authChannel)}
                disabled={authLoading || authPhone.length !== 10}
                className={cn(
                  "flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                  authPhone.length === 10 && !authLoading
                    ? authChannel === '12'
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md active:scale-98 cursor-pointer"
                      : "bg-[#080C14] text-[#F3CA52] border border-[#D4AF37] hover:bg-black shadow-md active:scale-98 cursor-pointer"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed",
                )}
              >
                {authLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    {authChannel === '12' ? (
                      <>
                        <MessageSquare size={14} />
                        <span>Get OTP via WhatsApp</span>
                      </>
                    ) : (
                      <>
                        <Smartphone size={14} />
                        <span>Get OTP via SMS</span>
                      </>
                    )}
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* STEP 2: OTP VERIFICATION & PROFILE DETAILS */
            <div className="space-y-4">
              {/* Target Phone Pill with Change Option */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "grid h-8 w-8 place-items-center rounded-xl",
                    authChannel === '12' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-[#B8860B]"
                  )}>
                    {authChannel === '12' ? <MessageSquare size={16} /> : <Smartphone size={16} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                      OTP Sent via {authChannel === '12' ? 'WhatsApp' : 'SMS'} To
                    </p>
                    <p className="text-xs font-black text-slate-800 mt-1 leading-none">
                      +91 {authPhone}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthOtpRequested(false);
                    setAuthOtp("");
                  }}
                  className="text-xs font-bold text-[#B8860B] hover:text-[#9A7009] hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* OTP Digits Grid */}
              <div>
                <label className="mb-2 block text-center text-xs font-bold uppercase tracking-widest text-slate-500">
                  Enter 4-Digit Verification Code
                </label>
                <div className="flex justify-center gap-2.5">
                  {Array.from({ length: CUSTOMER_PORTAL_OTP_LENGTH }).map((_, i) => {
                    const hasVal = Boolean(authOtp[i] && authOtp[i] !== " ");
                    return (
                      <input
                        key={i}
                        ref={(el) => {
                          otpInputRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={hasVal ? authOtp[i] : ""}
                        onChange={(e) => handleOtpDigit(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={cn(
                          "h-12 w-11 sm:h-13 sm:w-12 rounded-xl border-2 text-center text-xl font-black transition-all outline-none",
                          hasVal
                            ? "border-[#D4AF37] bg-amber-50/20 text-slate-900 ring-2 ring-[#D4AF37]/20"
                            : "border-slate-200 bg-slate-50 text-slate-900 focus:border-[#D4AF37] focus:bg-white focus:ring-2 focus:ring-[#D4AF37]/20",
                        )}
                      />
                    );
                  })}
                </div>

                {/* Instant Alternate Channel / Resend Option */}
                <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200/70 p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">Didn&apos;t receive the code?</span>
                    {authChannel === '11' ? (
                      /* If sent via SMS, offer INSTANT switch to WhatsApp without waiting! */
                      <button
                        type="button"
                        onClick={() => void onResendOtp('12')}
                        disabled={authLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-700 transition cursor-pointer"
                      >
                        <MessageSquare size={12} />
                        <span>Send to WhatsApp Now</span>
                      </button>
                    ) : (
                      /* If sent via WhatsApp, offer SMS switch */
                      <button
                        type="button"
                        onClick={() => void onResendOtp('11')}
                        disabled={authLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-amber-300 shadow-2xs hover:bg-black transition cursor-pointer"
                      >
                        <Smartphone size={12} />
                        <span>Try SMS instead</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-200/60">
                    <span>Resend via {authChannel === '12' ? 'WhatsApp' : 'SMS'}:</span>
                    {resendCooldown > 0 ? (
                      <span className="font-semibold text-slate-400">
                        Wait <span className="font-mono text-slate-700 font-bold">{resendCooldown}s</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void onResendOtp(authChannel)}
                        disabled={authLoading}
                        className="font-bold text-[#B8860B] hover:underline cursor-pointer"
                      >
                        Resend now
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* New Customer Registration Profile Inputs */}
              {!authExistingCustomer && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Customer Profile
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 rounded-full px-2 py-0.5">
                      New Customer
                    </span>
                  </div>

                  {/* Name field (REQUIRED) */}
                  <div className="space-y-1">
                    <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>
                        Full Name <span className="text-rose-500">*</span>
                      </span>
                      {authOtp.replace(/\D/g, "").length === CUSTOMER_PORTAL_OTP_LENGTH && !authName.trim() && (
                        <span className="text-[10px] text-rose-500 font-bold animate-pulse">
                          Name is required
                        </span>
                      )}
                    </label>
                    <div
                      className={cn(
                        "flex items-center rounded-xl border bg-slate-50 transition focus-within:bg-white",
                        authOtp.replace(/\D/g, "").length === CUSTOMER_PORTAL_OTP_LENGTH && !authName.trim()
                          ? "border-rose-300 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-200"
                          : "border-slate-200 focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/20",
                      )}
                    >
                      <div className="pointer-events-none pl-3 text-slate-400">
                        <User size={15} />
                      </div>
                      <input
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(sanitizeNameInput(e.target.value))}
                        placeholder="Enter your full name"
                        className="h-10 w-full bg-transparent pl-2.5 pr-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
                      />
                    </div>
                  </div>

                  {/* Email field (OPTIONAL) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Email Address</label>
                      <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                    </div>
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-[#D4AF37] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#D4AF37]/20">
                      <div className="pointer-events-none pl-3 text-slate-400">
                        <Mail size={15} />
                      </div>
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="Enter email for digital invoices"
                        className="h-10 w-full bg-transparent pl-2.5 pr-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              {(() => {
                const isOtpComplete = authOtp.replace(/\D/g, "").length === CUSTOMER_PORTAL_OTP_LENGTH;
                const isNameEntered = Boolean(authName.trim() && authName.trim().length >= 2);
                const canSubmit = !authLoading && isOtpComplete && (authExistingCustomer || isNameEntered);

                return (
                  <button
                    type="button"
                    onClick={() => void onVerifyAuthOtp()}
                    disabled={!canSubmit}
                    className={cn(
                      "flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                      canSubmit
                        ? "bg-[#080C14] text-[#F3CA52] border border-[#D4AF37] hover:bg-black shadow-md hover:shadow-lg active:scale-98 cursor-pointer"
                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed",
                    )}
                  >
                    {authLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#F3CA52] border-t-transparent" />
                        <span>Verifying & Signing In...</span>
                      </>
                    ) : !isOtpComplete ? (
                      <span>Enter 4-Digit OTP</span>
                    ) : !authExistingCustomer && !isNameEntered ? (
                      <span>Enter Full Name to Continue</span>
                    ) : (
                      <>
                        <CheckCircle2 size={14} className="text-[#F3CA52]" />
                        <span>Verify & Sign In</span>
                      </>
                    )}
                  </button>
                );
              })()}
            </div>
          )}
        </div>
      </FormDialog>

      {/* ── NOTIFICATIONS DIALOG (Quotation & Event Updates) ── */}
      <FormDialog
        title="Quotation Updates"
        description="Track your quotations, pricing, and agreements."
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        contentClassName="max-w-xl sm:max-w-2xl w-[95vw]"
        bodyClassName="p-4 sm:p-5"
      >
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {quotationsLoading && displayUpdates.length === 0 ? (
            <div className="space-y-3 py-2">
              <div className="h-28 animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
              <div className="h-28 animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
            </div>
          ) : displayUpdates.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-[#B8860B] border border-[#D4AF37]/30 shadow-xs">
                <UtensilsCrossed size={24} />
              </div>
              <h4 className="text-sm font-bold text-slate-900">No Quotation Requests Yet</h4>
              <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                Explore our menu to select dishes and request a quote.
              </p>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#080C14] px-4 py-2 text-xs font-bold text-[#F3CA52] border border-[#D4AF37]"
              >
                <span>Browse Menu</span>
              </button>
            </div>
          ) : (
            displayUpdates.map((item) => {
              const badge = getQuotationStatusBadge(item.status, item.requestStatus);
              const isQuoted = item.uiStatus === "QUOTED" || item.uiStatus === "ACCEPTED" || item.status === "FINALIZED";
              const isAccepted = item.uiStatus === "ACCEPTED";
              const hasAgreement = item.agreementStatus && item.agreementStatus !== "NOT_INITIATED";

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate("/customer/track");
                  }}
                  className="group relative rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 hover:border-[#D4AF37] hover:shadow-md transition-all cursor-pointer space-y-3"
                >
                  {/* Top Bar: Quotation Number + Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#080C14] text-[#F3CA52] border border-[#D4AF37]/40 shadow-xs">
                        <Crown size={14} />
                      </div>
                      <div>
                        <span className="font-mono text-xs sm:text-sm font-black text-slate-900 group-hover:text-[#B8860B] transition-colors">
                          {item.quotationNumber}
                        </span>
                        {item.createdAt && (
                          <p className="text-[10px] text-slate-400">
                            Requested {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.border} ${badge.color}`}
                    >
                      <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${badge.dot} align-middle`} />
                      {badge.label}
                    </span>
                  </div>

                  {/* Event Title */}
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug group-hover:text-slate-950">
                      {item.eventType}
                    </h4>
                  </div>

                  {/* 3 Metric Pills: Date, Guest Count, Menu Size */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 p-2 border border-slate-100">
                      <CalendarDays size={13} className="text-[#B8860B] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">Event Date</p>
                        <p className="font-semibold text-slate-800 text-[11px] truncate mt-0.5">
                          {formatEventDate(item.eventDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 p-2 border border-slate-100">
                      <Users size={13} className="text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">Guests</p>
                        <p className="font-semibold text-slate-800 text-[11px] truncate mt-0.5">
                          {item.guestCount} Guests
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 p-2 border border-slate-100 col-span-2 sm:col-span-1">
                      <UtensilsCrossed size={13} className="text-[#B8860B] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">Food Menu</p>
                        <p className="font-semibold text-slate-800 text-[11px] truncate mt-0.5">
                          {item.dishCount > 0 ? `${item.dishCount} Dishes` : "Menu Selected"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Venue Location if present */}
                  {item.venue && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-amber-50/40 rounded-xl px-2.5 py-1.5 border border-amber-200/40">
                      <MapPin size={12} className="text-[#B8860B] shrink-0" />
                      <span className="text-[11px] font-medium break-words leading-tight">{item.venue}</span>
                    </div>
                  )}

                  {/* Financial Pricing Status & Action Strip */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      {isQuoted && item.grandTotal && item.grandTotal > 0 ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B8860B]">
                            Total Price:
                          </span>
                          <span className="font-mono text-sm sm:text-base font-black text-slate-900">
                            {formatInr(item.grandTotal)}
                          </span>
                          <span className="text-[10px] text-slate-400">(5% GST incl.)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-medium">
                          <Clock size={12} className="text-[#B8860B] shrink-0" />
                          <span>Price will be quoted by admin</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {hasAgreement && (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {item.agreementStatus === "ACCEPTED" ? "✓ Agreement Signed" : "Agreement Ready"}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-[#F3CA52] group-hover:bg-[#B8860B] group-hover:text-white transition-colors shadow-2xs">
                        <span>{isQuoted && !isAccepted ? "Review Quote" : "Track"}</span>
                        <ArrowRight size={11} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary & Link to Tracker */}
        {displayUpdates.length > 0 && (
          <FormDialogFooter className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500">
              {displayUpdates.length} Active Quotation{displayUpdates.length > 1 ? "s" : ""}
            </span>
            <Button
              type="button"
              onClick={() => {
                setNotificationsOpen(false);
                navigate("/customer/track");
              }}
              className="bg-[#080C14] text-[#F3CA52] hover:bg-[#101622] text-xs font-bold border border-[#D4AF37]"
            >
              <span>View All Quotations</span>
              <ArrowRight size={13} className="ml-1" />
            </Button>
          </FormDialogFooter>
        )}
      </FormDialog>

      {/* ── PROFILE DIALOG ── */}
      <FormDialog
        title="My Profile"
        description="Customer account session."
        open={profileOpen}
        onOpenChange={setProfileOpen}
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <p className="font-bold text-slate-900">{profileName || "Client"}</p>
            <p className="text-slate-500">{profilePhone}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => { setProfileOpen(false); navigate("/customer/track"); }}>
              My Quotations
            </Button>
            <Button variant="outline" onClick={() => { setProfileOpen(false); navigate("/customer/agreement"); }}>
              Agreements
            </Button>
          </div>
          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              localStorage.removeItem(CUSTOMER_PORTAL_TOKEN_KEY);
              localStorage.removeItem(CUSTOMER_PORTAL_PROFILE_KEY);
              setProfileOpen(false);
              toast.success("Logged out");
            }}
          >
            Logout
          </Button>
        </div>
      </FormDialog>
    </div>
  );
}

/* ── Helper utilities ── */

function sanitizePhoneInput(val: string) {
  return val.replace(/\D/g, "").slice(0, 10);
}

function sanitizeNameInput(val: string) {
  return val.replace(/[^A-Za-z\s]/g, "").replace(/\s{2,}/g, " ");
}

function parseDateInput(val: string) {
  if (!val) return null;
  const [y, m, d] = val.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDateInput(date: Date | null) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readPersistedCart(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CUSTOMER_PORTAL_CART_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function readPersistedNotifications(): NotificationItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOMER_PORTAL_NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function extractPhoneFromPortalToken(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return "";
    const decoded = window.atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(decoded) as { phone?: string };
    return payload.phone ?? "";
  } catch {
    return "";
  }
}

function flattenCatalogItems(nodes: CategoryNode[], path: string[] = []): CatalogItem[] {
  const result: CatalogItem[] = [];
  for (const node of nodes) {
    if (NON_FOOD_CATEGORIES.has(node.name)) continue;
    const nextPath = [...path, node.name];
    for (const item of node.items) {
      const topCategory = nextPath[0] ?? node.name;
      if (NON_FOOD_CATEGORIES.has(topCategory)) continue;
      const subCategory = nextPath.length > 1 ? nextPath[1] : nextPath[nextPath.length - 1];
      result.push({
        id: item.id,
        name: item.name,
        unit: item.unit,
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

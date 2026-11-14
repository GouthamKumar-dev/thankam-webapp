import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Utensils,
  Users,
  FileCheck,
  ShieldCheck,
  Award,
  Phone,
  MapPin,
  ArrowRight,
  Star,
  Search,
  ChevronRight,
  Crown,
  Flame,
  Menu as MenuIcon,
  X,
  MessageCircle,
  Clock,
  CheckCircle2,
  Calendar,
  ChefHat,
  HeartHandshake,
  Soup,
  Coffee,
  Check,
} from "lucide-react";
import { customerPortalService } from "@/features/customer-portal/customer-portal.service";
import "./landing.css";

/**
 * Thankam Events — Modern Luxury Catering & Banquet Landing Page
 * Brand Palette:
 * - Clean Alabaster & Crisp White: #FFFFFF, #FAF9F6, #F8FAFC
 * - Imperial Kerala Gold & Amber: #B8860B, #D4AF37, #F3CA52, #EA580C
 * - Deep Charcoal / Obsidian Accent: #080C14, #101622
 *
 * Core Features:
 * - Official Thankam Events Crest & Logo
 * - Interactive Banquet Feast Formats (Traditional Kerala Sadya, Malabar Dum Biryani, Reception Feasts)
 * - Thankam-Style Menu Highlights (Veg/Non-Veg, 425+ Dishes)
 * - Transparent Quotation Flow: Customers curate menu, Central Desk quotes official per-plate pricing
 * - Occasions Gallery (Weddings, Betrothals, Receptions, Anniversaries, Corporate)
 * - 1-Click WhatsApp & Phone Connect
 */

/* ─── Veg / Non-Veg Indicator Component (Thankam Style) ─────── */
function VegBadge({ isVeg, size = 15 }: { isVeg: boolean; size?: number }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-sm border shrink-0 ${
        isVeg ? "border-emerald-600 bg-white" : "border-rose-600 bg-white"
      }`}
      style={{ width: size, height: size, borderWidth: 1.5 }}
      title={isVeg ? "Pure Vegetarian" : "Non-Vegetarian"}
    >
      <span
        className={`rounded-full ${isVeg ? "bg-emerald-600" : "bg-rose-600"}`}
        style={{ width: size * 0.45, height: size * 0.45 }}
      />
    </span>
  );
}

/* ─── Curated Feast Styles for Interactive Preview ─────────── */
const FEAST_FORMATS = [
  {
    id: "sadya",
    tab: "sadya",
    title: "Traditional Kerala Sadya",
    subtitle: "Travancore Royal Banquet",
    tagline: "Authentic 28-course feast served on fresh plantain leaves",
    image: "/assets/img/kerala-sadhya.jpg",
    fallbackImage: "/assets/img/kerala-sadhya.jpg",
    badge: "Most Celebrated Feast",
    badgeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    description:
      "Prepared in pure cow ghee and traditional clay pots. Featuring Palada Pradhaman, Parippu with Neyyu, Avial, Sambar, Olan, Kalan, Thoran, crunchy Upperi, and Sharkara Varatti.",
    highlights: [
      "28+ Course Plantain Leaf Presentation",
      "Pure Cow Ghee & Simmered Palada Pradhaman",
      "Traditional Kalan, Olan, Avial & Sambar",
      "Crispy Nendran Upperi & Sharkara Varatti",
    ],
    idealFor: "Weddings, Nischayam, Grihapravesham & Onam Feasts",
    portalLink: "/customer/portal?tab=sadya",
    buttonLabel: "Curate Sadya Menu",
  },
  {
    id: "malabar",
    tab: "general",
    title: "Malabar Dum Biriyani Feast",
    subtitle: "North Kerala Wedding Heritage",
    tagline: "Rich, aromatic wedding banquets slow-cooked on charcoal",
    image: "/assets/img/malabar-biriyani.jpg",
    fallbackImage: "/assets/img/malabar-biriyani.jpg",
    badge: "Crowd Favorite",
    badgeColor: "bg-amber-500/10 text-amber-800 border-amber-500/30",
    description:
      "Fragrant Kaima rice Thalassery Dum Biriyani slow-cooked on charcoal, paired with Chicken Roast, Malabar Porotta, Fish Pollichathu, Date Pickle, and fresh mint lime.",
    highlights: [
      "Thalassery Dum Biriyani (Chicken, Mutton, Fish)",
      "Flaky Malabar Porottas & Kerala Chicken Roast",
      "Banana Leaf Wrapped Karimeen Pollichathu",
      "Fresh Mint Lime, Shakes & Sulaimani Tea",
    ],
    idealFor: "Wedding Receptions, Nikkah Banquets & Gala Dinners",
    portalLink: "/customer/portal?tab=general&category=dum-biriyani",
    buttonLabel: "Explore Malabar Menu",
  },
  {
    id: "reception",
    tab: "general",
    title: "Grand Reception & Live Banquet",
    subtitle: "Contemporary Multi-Cuisine Spectacle",
    tagline: "Vibrant live action stations, sizzling grills & artisanal desserts",
    image: "/assets/img/event-marriage.jpg",
    fallbackImage: "/assets/img/event-marriage.jpg",
    badge: "Contemporary Luxury",
    badgeColor: "bg-purple-500/10 text-purple-800 border-purple-500/30",
    description:
      "A vibrant celebration experience with Live Appam & Stew counters, sizzling kebabs, mocktail bars, continental breads, Fried Rice, and artisanal dessert stations.",
    highlights: [
      "Live Appam & Stew Action Station",
      "Gourmet Mocktail & Welcome Drink Bar",
      "Sizzling Tandoor & Malabar Starters",
      "Artisanal Ice Cream Sundae & Dessert Counters",
    ],
    idealFor: "Evening Receptions, Cocktail Evenings & Corporate Galas",
    portalLink: "/customer/portal?tab=general",
    buttonLabel: "Design Reception Menu",
  },
];

/* ─── Signature Dishes Sample (Thankam UI Style) ────────────── */
const SIGNATURE_DISHES = [
  {
    id: "d1",
    name: "Thalassery Dum Biriyani",
    category: "Main Course",
    categorySlug: "dum-biriyani",
    isVeg: false,
    image: "/assets/img/malabar-biriyani.jpg",
    description:
      "Aromatic Jeerakasala rice, tender spiced meat, golden fried onions, cashews and sultanas dum-cooked in traditional degh.",
    tags: ["Bestseller", "Malabar Dum"],
  },
  {
    id: "d2",
    name: "Palada Pradhaman",
    category: "Dessert & Payasam",
    categorySlug: "desserts",
    isVeg: true,
    image: "/assets/img/kerala-sadhya.jpg",
    description:
      "The undisputed king of Kerala payasams: slow-simmered rice ada in thickened full-cream milk, pure ghee, and cardamom.",
    tags: ["Traditional", "Pure Ghee"],
  },
  {
    id: "d3",
    name: "Karimeen Pollichathu",
    category: "Starters & Seafood",
    categorySlug: "starters",
    isVeg: false,
    image: "/assets/img/event-custom.jpg",
    description:
      "Fresh backwater pearl spot marinated in roasted shallots, ginger, tomato masala and wrapped in banana leaves before slow grilling.",
    tags: ["Chef Special", "Backwater Catch"],
  },
  {
    id: "d4",
    name: "Avial & Parippu with Neyyu",
    category: "Sadya Course",
    categorySlug: "curries",
    isVeg: true,
    image: "/assets/img/kerala-sadhya.jpg",
    description:
      "Medley of country vegetables cooked in coconut paste and cumin, finished with virgin coconut oil and curry leaves.",
    tags: ["Classic Sadya", "Pure Veg"],
  },
  {
    id: "d5",
    name: "Live Appam & Stew Counter",
    category: "Live Counters",
    categorySlug: "breads",
    isVeg: true,
    image: "/assets/img/event-birthday.jpg",
    description:
      "Lacy hoppers made live before your guests, served piping hot with rich coconut milk vegetable or tender mutton stew.",
    tags: ["Live Station", "Interactive"],
  },
  {
    id: "d6",
    name: "Tender Coconut Punch & Shakes",
    category: "Welcome Drinks",
    categorySlug: "welcome-drinks",
    isVeg: true,
    image: "/assets/img/event-marriage.jpg",
    description:
      "Chilled refreshing beverage crafted with fresh tender coconut water, sweet coconut malai, and a hint of mint.",
    tags: ["Welcome Drink", "Refreshing"],
  },
];

/* ─── Occasions Catered ────────────────────────────────────── */
const OCCASIONS = [
  {
    title: "Grand Weddings & Vivaham",
    subtitle: "From morning traditional Sadyas to evening reception banquets",
    guests: "200 to 5,000+ Guests",
    image: "/assets/img/event-marriage.jpg",
    accent: "border-amber-400/80",
    link: "/customer/portal?event=wedding",
  },
  {
    title: "Engagements & Nischayam",
    subtitle: "Intimate family feasts celebrating the couple's special milestone",
    guests: "100 to 800 Guests",
    image: "/assets/img/event-custom.jpg",
    accent: "border-emerald-400/80",
    link: "/customer/portal?event=engagement",
  },
  {
    title: "Birthdays, Jubilees & Anniversaries",
    subtitle: "Curated multi-cuisine spreads with live counters and desserts",
    guests: "50 to 500 Guests",
    image: "/assets/img/event-birthday.jpg",
    accent: "border-sky-400/80",
    link: "/customer/portal?event=birthday",
  },
  {
    title: "Housewarming & Corporate Galas",
    subtitle: "Professional banquets and ceremonial feasts across Kerala",
    guests: "50 to 1,500 Guests",
    image: "/assets/img/event-custom.jpg",
    accent: "border-orange-400/80",
    link: "/customer/portal?event=corporate",
  },
];

/* ─── Verified Client Reviews ──────────────────────────────── */
const VERIFIED_REVIEWS = [
  {
    id: 1,
    client: "Dr. Arun & Meera Nair",
    event: "Grand Wedding Sadya • Kollam",
    guests: "850 Guests",
    rating: 5,
    quote:
      "Thankam Events delivered a 28-item Sadya that our family still talks about. Selecting dishes in their portal was so easy, and the admin sent our official quotation promptly with complete transparency.",
  },
  {
    id: 2,
    client: "Faisal & Shabana Rasheed",
    event: "Nikkah & Malabar Banquet • Ashtamudi",
    guests: "1,100 Guests",
    rating: 5,
    quote:
      "From the Karimeen Pollichathu and live appam counter to the Thalassery Dum Biriyani, every dish arrived piping hot. The catering agreement was crystal clear with zero unexpected charges.",
  },
  {
    id: 3,
    client: "Varghese Mathew, Managing Director",
    event: "Corporate Founders Gala • Trivandrum",
    guests: "420 Guests",
    rating: 5,
    quote:
      "We have trusted Thankam Events for all our company banquets in Kollam and Trivandrum. Their central kitchen quality is unmatched and their hospitality team took care of every detail.",
  },
];

export function PublicLandingPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeastTab, setActiveFeastTab] = useState<string>("sadya");
  const [dishFilter, setDishFilter] = useState<"ALL" | "VEG" | "NON_VEG">("ALL");

  const [companyInfo, setCompanyInfo] = useState<{
    phone?: string;
    email?: string;
    address?: string;
    name?: string;
  } | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch company details from portal settings
  useEffect(() => {
    customerPortalService
      .websiteContent()
      .then((data) => {
        if (data?.company) {
          setCompanyInfo({
            name: data.company.name || "Thankam Events",
            phone: data.company.contact || data.company.altContact,
            email: data.company.email,
            address: data.company.address,
          });
        }
      })
      .catch(() => null);
  }, []);

  const scrollToAnchor = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id.replace("#", ""));
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  const phoneDisplay = companyInfo?.phone || "+91 97456 84766";
  const emailDisplay = companyInfo?.email || "info@thankamevents.in";
  const addressDisplay =
    companyInfo?.address ||
    "Thankam Heritage Plaza, Residency Road, Chinnakada, Kollam, Kerala 691001";
  const companyName = companyInfo?.name || "Thankam Events";

  const selectedFeast =
    FEAST_FORMATS.find((f) => f.id === activeFeastTab) || FEAST_FORMATS[0];

  const filteredDishes = SIGNATURE_DISHES.filter((d) => {
    if (dishFilter === "VEG") return d.isVeg;
    if (dishFilter === "NON_VEG") return !d.isVeg;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-800 antialiased selection:bg-[#F3CA52] selection:text-slate-900 font-sans">
      {/* ═════════════════════════════════════════════════════════════════════
          1. REGAL Thankam STICKY NAVBAR (PROMINENT GRAND LOGO)
      ══════════════════════════════════════════════════════════════════════ */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md border-b border-amber-900/10 py-2 sm:py-2.5 shadow-md shadow-amber-950/5"
            : "bg-white/90 backdrop-blur-md border-b border-slate-200/80 py-3 sm:py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Brand Crest with Prominent Grand Logo */}
          <Link to="/" className="flex items-center gap-3.5 sm:gap-4 group shrink-0">
            <div className="relative flex items-center justify-center shrink-0">
              {/* Much Bigger Gold-Ringed Luxury Emblem */}
              <div
                className={`rounded-2xl p-[2.5px] bg-gradient-to-tr from-amber-600 via-[#F3CA52] to-amber-500 shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/35 group-hover:scale-105 transition-all duration-300 ${
                  isScrolled
                    ? "w-14 h-14 sm:w-16 sm:h-16"
                    : "w-16 h-16 sm:w-20 sm:h-20"
                }`}
              >
                <div className="w-full h-full rounded-[14px] sm:rounded-[18px] bg-white p-1 sm:p-1.5 flex items-center justify-center overflow-hidden">
                  <img
                    src="/assets/img/Thankam_Logo.png"
                    alt="Thankam Events Logo"
                    className="w-full h-full object-contain drop-shadow-sm"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "/assets/img/Thankam_Logo.png";
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif text-2xl sm:text-[1.85rem] font-black tracking-[0.07em] text-slate-950 group-hover:text-[#B8860B] transition-colors leading-none">
                  THANKAM
                </span>
                <span className="font-serif text-xs sm:text-sm font-bold tracking-[0.24em] text-[#B8860B] uppercase">
                  EVENTS
                </span>
              </div>
              <span className="text-[9.5px] sm:text-[11px] tracking-[0.26em] font-extrabold text-amber-900/85 uppercase mt-1 font-sans">
                Celebrations Crafted • Kollam
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links (Clean, Spacious, Single-Line) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-[13px] font-bold text-slate-600">
            <a
              href="#feasts"
              onClick={(e) => scrollToAnchor(e, "feasts")}
              className="px-3.5 py-2 rounded-full hover:bg-amber-50/80 hover:text-[#B8860B] transition-all whitespace-nowrap"
            >
              Feast Formats
            </a>
            <a
              href="#menu-highlights"
              onClick={(e) => scrollToAnchor(e, "menu-highlights")}
              className="px-3.5 py-2 rounded-full hover:bg-amber-50/80 hover:text-[#B8860B] transition-all whitespace-nowrap"
            >
              425+ Dishes
            </a>
            <a
              href="#occasions"
              onClick={(e) => scrollToAnchor(e, "occasions")}
              className="px-3.5 py-2 rounded-full hover:bg-amber-50/80 hover:text-[#B8860B] transition-all whitespace-nowrap"
            >
              Occasions
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToAnchor(e, "how-it-works")}
              className="px-3.5 py-2 rounded-full hover:bg-amber-50/80 hover:text-[#B8860B] transition-all whitespace-nowrap"
            >
              How It Works
            </a>
            <a
              href="#reviews"
              onClick={(e) => scrollToAnchor(e, "reviews")}
              className="px-3.5 py-2 rounded-full hover:bg-amber-50/80 hover:text-[#B8860B] transition-all whitespace-nowrap"
            >
              Reviews
            </a>
          </nav>

          {/* Right Action CTAs (Crisp Single-Line Luxury Buttons) */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            <Link
              to="/customer/track"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-slate-700 bg-white border border-slate-200/90 hover:border-[#D4AF37] hover:bg-amber-50/40 hover:text-slate-950 transition shadow-2xs whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5 text-[#B8860B]" />
              <span>Track Quote</span>
            </Link>

            <Link
              to="/customer/portal"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 via-[#F3CA52] to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-500/25 active:scale-95 transition-all whitespace-nowrap group"
            >
              <Utensils className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span>Curate Menu &amp; Quote</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-950 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shrink-0"
          >
            {mobileMenuOpen ? <X size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2">
            <a
              href="#feasts"
              onClick={(e) => scrollToAnchor(e, "feasts")}
              className="block py-2 text-sm font-bold text-slate-800 border-b border-slate-100"
            >
              Feast Formats &amp; Kerala Sadya
            </a>
            <a
              href="#menu-highlights"
              onClick={(e) => scrollToAnchor(e, "menu-highlights")}
              className="block py-2 text-sm font-bold text-slate-800 border-b border-slate-100"
            >
              425+ Dishes Catalog
            </a>
            <a
              href="#occasions"
              onClick={(e) => scrollToAnchor(e, "occasions")}
              className="block py-2 text-sm font-bold text-slate-800 border-b border-slate-100"
            >
              Occasions &amp; Event Types
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToAnchor(e, "how-it-works")}
              className="block py-2 text-sm font-bold text-slate-800 border-b border-slate-100"
            >
              How Quotations Work
            </a>
            <a
              href="#reviews"
              onClick={(e) => scrollToAnchor(e, "reviews")}
              className="block py-2 text-sm font-bold text-slate-800 border-b border-slate-100"
            >
              Client Reviews
            </a>

            <div className="pt-2 flex flex-col gap-2.5">
              <Link
                to="/customer/track"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl text-center text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-50 border border-slate-200"
              >
                Track Existing Quote
              </Link>
              <Link
                to="/customer/portal"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-xl text-center text-xs font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 via-[#F3CA52] to-amber-500 shadow-sm"
              >
                Curate Menu &amp; Request Quote →
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ═════════════════════════════════════════════════════════════════════
          2. MODERN HIGH-IMPACT HERO SECTION (GASTRONOMIC SHOWCASE)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="pt-28 sm:pt-36 pb-14 sm:pb-20 hero-ambient-glow border-b border-amber-900/10 relative overflow-hidden">
        {/* Subtle Luxury Ambient Radial Highlights */}
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-gradient-to-b from-[#F3CA52]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-b from-amber-600/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left 7 Columns: Core Value Proposition & Primary Funnel */}
            <div className="lg:col-span-7 space-y-6">
              {/* Trust Badge with Thankam Emblem */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-[#D4AF37]/50 text-slate-800 text-[11px] font-bold tracking-wide uppercase shadow-xs">
                <div className="w-5 h-5 rounded-full p-[1px] bg-gradient-to-tr from-amber-600 via-[#F3CA52] to-amber-500 shrink-0 overflow-hidden">
                  <img
                    src="/assets/img/Thankam_Logo.png"
                    alt="Thankam Events Logo"
                    className="w-full h-full object-contain bg-white rounded-full p-0.5"
                  />
                </div>
                <span className="text-[#B8860B] font-black tracking-wider">Thankam Heritage</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-700">Since 2006</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-semibold">Kollam Central Kitchen</span>
              </div>

              {/* Bold Editorial Serif Headline */}
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.75rem] font-black text-slate-950 tracking-tight leading-[1.1]">
                Kerala’s Celebrated Feasts,{" "}
                <span className="italic font-normal gold-gradient-text block sm:inline">
                  Crafted for Your Special Day.
                </span>
              </h1>

              {/* Subtitle with Honest Pricing Context */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl font-normal">
                Experience over 20 years of authentic Travancore and Malabar culinary heritage.
                Browse our <strong className="text-slate-900 font-bold">425+ authentic dishes</strong>—from
                pure ghee traditional plantain leaf Sadyas to charcoal-dum Thalassery Biriyanis and live counters.
                Curate your custom menu in minutes and receive an official personalized quotation from our catering desk.
              </p>

              {/* Dual Primary Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
                <Link
                  to="/customer/portal"
                  className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-[#d97706] to-[#b45309] px-7 py-4 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-amber-500/25 hover:brightness-105 active:scale-98 transition-all group"
                >
                  <Utensils size={16} />
                  <span>Curate Food Menu &amp; Get Quote</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/customer/track"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white border border-slate-300 hover:border-[#D4AF37] px-6 py-4 text-xs sm:text-sm font-bold text-slate-800 shadow-xs hover:bg-amber-50/40 transition"
                >
                  <Search size={15} className="text-[#B8860B]" />
                  <span>Track Existing Quote</span>
                </Link>
              </div>

              {/* Instant WhatsApp / Phone Consultation */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 pt-1">
                <a
                  href="https://wa.me/919745684766?text=Hi%20Thankam%20Events,%20I%20would%20like%20to%20inquire%20about%20catering%20for%20my%20event."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                >
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <MessageCircle size={15} className="text-emerald-600" />
                  <span>WhatsApp Central Desk</span>
                </a>
                <span className="text-slate-300">•</span>
                <a
                  href={`tel:${phoneDisplay.replace(/[^0-9+]/g, "")}`}
                  className="inline-flex items-center gap-1.5 text-slate-800 hover:text-[#B8860B] font-bold"
                >
                  <Phone size={13} className="text-[#B8860B]" />
                  <span>{phoneDisplay}</span>
                </a>
              </div>

              {/* 4 Trust Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200">
                <div className="bg-white/90 rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs">
                  <div className="font-serif text-2xl font-black text-slate-900">425+</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Authentic Dishes</div>
                </div>
                <div className="bg-white/90 rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs">
                  <div className="font-serif text-2xl font-black text-slate-900">20+ Yrs</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Kollam Legacy</div>
                </div>
                <div className="bg-white/90 rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs">
                  <div className="font-serif text-2xl font-black text-slate-900">3,500+</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Feasts Catered</div>
                </div>
                <div className="bg-amber-50/70 rounded-2xl p-3.5 border border-amber-300/80 shadow-2xs">
                  <div className="font-serif text-2xl font-black text-[#B8860B]">100%</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 mt-0.5">Pure Ghee Sadya</div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Visual Feast Experience Showcase Card */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-amber-200/80 bg-white p-5 sm:p-6 shadow-xl shadow-amber-900/5 space-y-4 relative overflow-hidden">
                {/* Header with Switcher Tabs */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-1.5">
                    <ChefHat size={14} className="text-[#B8860B]" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                      Popular Feast Styles
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl">
                    {FEAST_FORMATS.map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setActiveFeastTab(fmt.id)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                          activeFeastTab === fmt.id
                            ? "bg-slate-950 text-[#F3CA52] shadow-xs"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        {fmt.id === "sadya" ? "Sadya" : fmt.id === "malabar" ? "Biriyani" : "Reception"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cinematic Food Photo Card with Gradient Overlay */}
                <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-950 shadow-md group">
                  <img
                    src={selectedFeast.image}
                    alt={selectedFeast.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = selectedFeast.fallbackImage;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                  {/* Top Floating Badge on Image */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md bg-white/95 text-slate-900 border border-amber-300 shadow-xs">
                      <Crown size={11} className="text-[#B8860B]" />
                      {selectedFeast.badge}
                    </span>
                    <span className="text-[10px] font-bold text-amber-200 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/30">
                      Kollam Central Kitchen
                    </span>
                  </div>

                  {/* Bottom Info on Image */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                      {selectedFeast.subtitle}
                    </span>
                    <h4 className="font-serif text-xl sm:text-2xl font-black text-white leading-tight">
                      {selectedFeast.title}
                    </h4>
                    <p className="text-[11px] text-slate-200 mt-0.5 line-clamp-1">
                      {selectedFeast.tagline}
                    </p>
                  </div>
                </div>

                {/* Highlights Grid (Clean, Untruncated) */}
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedFeast.highlights.map((h) => (
                      <div
                        key={h}
                        className="flex items-start gap-2 text-xs font-semibold text-slate-800 bg-amber-50/40 rounded-xl p-2.5 border border-amber-200/50"
                      >
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug text-slate-700">{h}</span>
                      </div>
                    ))}
                  </div>

                  {/* Ideal For Badge */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                      Ideal For:
                    </span>
                    <span className="font-bold text-[#B8860B] text-right truncate pl-2">
                      {selectedFeast.idealFor}
                    </span>
                  </div>

                  {/* 1-Click Action to Portal */}
                  <Link
                    to={selectedFeast.portalLink}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3.5 text-xs font-black uppercase tracking-wider text-[#F3CA52] hover:bg-slate-900 border border-[#D4AF37]/50 hover:border-[#D4AF37] transition-all shadow-md group"
                  >
                    <span>{selectedFeast.buttonLabel} in Portal</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <div className="text-center">
                    <p className="text-[11px] text-slate-400">
                      Official per-plate quotation formulated by Thankam Admin upon review
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          3. Thankam-INSPIRED 425+ DISH EXPLORER (APPETITE APPEAL)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="menu-highlights" className="py-16 sm:py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header with Thankam Veg/Non-Veg Filter */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#B8860B]">
                Culinary Highlights
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-black text-slate-900 mt-1">
                Curate from 425+ Traditional Dishes
              </h2>
              <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
                Explore a taste of our central kitchen favorites. Use our interactive portal to add your favorites, set guest count, and receive your personalized quotation.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDishFilter("ALL")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                  dishFilter === "ALL"
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                All (425+)
              </button>
              <button
                type="button"
                onClick={() => setDishFilter("VEG")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                  dishFilter === "VEG"
                    ? "bg-emerald-50 text-emerald-800 border-2 border-emerald-600"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <VegBadge isVeg={true} size={12} />
                <span>Pure Veg</span>
              </button>
              <button
                type="button"
                onClick={() => setDishFilter("NON_VEG")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                  dishFilter === "NON_VEG"
                    ? "bg-rose-50 text-rose-800 border-2 border-rose-600"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <VegBadge isVeg={false} size={12} />
                <span>Non-Veg</span>
              </button>
            </div>
          </div>

          {/* Dish Grid: Clean White Cards with Veg Dot & Thankam Add Trigger */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDishes.map((dish) => (
              <div
                key={dish.id}
                className="group rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-[#D4AF37] hover:shadow-lg hover:shadow-amber-900/5 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Dish Photograph Card */}
                  {dish.image && (
                    <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-900 shadow-xs">
                      <img
                        src={dish.image}
                        alt={dish.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/assets/img/event-marriage.jpg';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                      <div className="absolute top-2.5 left-2.5">
                        <VegBadge isVeg={dish.isVeg} size={15} />
                      </div>
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                        {dish.tags.slice(0, 1).map((t) => (
                          <span
                            key={t}
                            className="rounded-md bg-black/60 backdrop-blur-xs border border-amber-400/40 px-2 py-0.5 text-[9px] font-bold text-amber-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="absolute bottom-2.5 left-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          {dish.category}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-serif text-xl font-bold text-slate-900 group-hover:text-[#B8860B] transition-colors">
                      {dish.name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-2">
                      {dish.description}
                    </p>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Official Quote by Admin
                  </span>
                  <Link
                    to={`/customer/portal?tab=${dish.isVeg ? "sadya" : "general"}&category=${dish.categorySlug}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-1.5 text-xs font-black text-slate-800 shadow-2xs group-hover:border-[#D4AF37] group-hover:bg-[#080C14] group-hover:text-[#F3CA52] transition-all"
                  >
                    <span>+ ADD</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Notice: Admin Quoted Pricing */}
          <div className="mt-8 rounded-2xl bg-[#FAF9F6] border border-amber-300/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-100/80 border border-amber-300 flex items-center justify-center text-[#B8860B]">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Transparent Event Quotations &bull; No Misleading Base Prices
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  We don't publish rigid base prices because event catering depends on guest count, course selections, and service logistics. Our central desk prepares an exact, itemized per-plate quote for you.
                </p>
              </div>
            </div>
            <Link
              to="/customer/portal"
              className="inline-flex items-center gap-2 rounded-xl bg-[#080C14] px-5 py-2.5 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] hover:bg-[#121927] transition shrink-0"
            >
              <span>Open Menu Builder</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          4. OCCASIONS WE CATER
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="occasions" className="py-16 sm:py-20 bg-[#FAF9F6] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#B8860B]">
              Every Celebration Deserves Great Taste
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              Events We Cater Across Kerala
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              From grand 3,000-guest wedding banquets to intimate 50-person family milestone gatherings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {OCCASIONS.map((occ) => (
              <div
                key={occ.title}
                className="group rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:border-[#D4AF37] hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Image Header with Fallback */}
                <div className="h-44 w-full overflow-hidden bg-slate-900 relative">
                  <img
                    src={occ.image}
                    alt={occ.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "/assets/img/event-marriage.jpg";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <span className="inline-flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/40">
                      <Users size={11} /> {occ.guests}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-slate-900 group-hover:text-[#B8860B] transition-colors leading-snug">
                      {occ.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {occ.subtitle}
                    </p>
                  </div>

                  <Link
                    to={occ.link}
                    className="inline-flex items-center justify-between w-full rounded-xl bg-slate-50 hover:bg-[#080C14] hover:text-[#F3CA52] px-3.5 py-2 text-xs font-bold text-slate-700 border border-slate-200 transition-all"
                  >
                    <span>Request Event Quote</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          5. 3-STEP DIGITAL QUOTATION (HOW IT WORKS)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#B8860B]">
              Seamless Self-Service Ordering
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              How Your Catering Quote Works
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              No back-and-forth phone tag. Build your dream banquet menu online in 3 simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: Utensils,
                title: "Select Your Dishes",
                desc: "Browse our 425+ authentic items in the Thankam-style customer portal. Pick traditional Kerala Sadya courses, biriyanis, live counters, welcome drinks, and desserts.",
              },
              {
                step: "02",
                icon: Calendar,
                title: "Enter Event & Guest Details",
                desc: "Specify your guest count, event date, and banquet venue across any of Kerala's 14 districts. Add any dietary preferences or custom chef notes.",
              },
              {
                step: "03",
                icon: FileCheck,
                title: "Receive Official Quote via OTP",
                desc: "Verify your phone via SMS OTP. Our central catering desk reviews your custom requirements and delivers an official itemized per-plate quote & formal catering agreement.",
              },
            ].map((st) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.step}
                  className="rounded-3xl border border-slate-200/90 bg-[#FAF9F6] p-6 sm:p-7 shadow-xs hover:border-[#D4AF37] transition-all space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#080C14] text-[#F3CA52] border border-[#D4AF37]/50 flex items-center justify-center shadow-xs">
                      <Icon size={20} />
                    </div>
                    <span className="font-serif text-3xl font-black text-[#D4AF37]/40">
                      {st.step}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-slate-900">
                    {st.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Quick CTA to Portal */}
          <div className="mt-10 text-center">
            <Link
              to="/customer/portal"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-[#fc8019] px-8 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:brightness-105 active:scale-98 transition-all"
            >
              <span>Start Curating Your Menu Now</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          6. WHY FAMILIES CHOOSE THANKAM (HERITAGE & KITCHEN PILLARS)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-[#080C14] text-white kasavu-pattern border-b border-amber-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#F3CA52]">
              The Thankam Distinction
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-black text-white mt-1.5">
              20+ Years Serving Unforgettable Feasts in Kollam
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              We take pride in preparing pure, uncompromising flavors rooted in traditional South Kerala cooking methods.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Award,
                badge: "EST. 2006",
                title: "20+ Years Legacy",
                desc: "Over 2,500 weddings, betrothals, and corporate galas successfully catered across Kollam, Trivandrum, and Central Kerala.",
              },
              {
                icon: Flame,
                badge: "PURE GHEE",
                title: "Pure Cow Ghee & Oils",
                desc: "Every Sadya and feast dish is prepared fresh using pure cow ghee, cold-pressed coconut oil, and authentic Kerala spices.",
              },
              {
                icon: ChefHat,
                badge: "425+ DISHES",
                title: "Master Banquet Chefs",
                desc: "Experienced culinary teams specializing in traditional Travancore Sadya, Malabar Dum Biriyani, and live counter theatrics.",
              },
              {
                icon: ShieldCheck,
                badge: "FSSAI CERTIFIED",
                title: "Official Compliance",
                desc: "Hygienic central kitchen, temperature-controlled catering logistics, and legally binding agreements with 5% GST transparency.",
              },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-3xl border border-amber-500/25 bg-[#101622] p-6 hover:border-[#D4AF37] transition-all space-y-3"
                >
                  <div className="w-11 h-11 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#F3CA52]">
                    <Icon size={20} />
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#D4AF37] uppercase block">
                    {p.badge}
                  </span>
                  <h3 className="font-serif text-xl font-bold text-white">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          7. VERIFIED REVIEWS & BANQUET TESTIMONIALS
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="reviews" className="py-16 sm:py-20 bg-[#FAF9F6] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#B8860B]">
              Verified Feedback
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              Loved by Hosts &amp; Guests Across Kerala
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Read how Thankam Events helped families create unforgettable dining memories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {VERIFIED_REVIEWS.map((rev) => (
              <div
                key={rev.id}
                className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                      {rev.guests}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
                    &ldquo;{rev.quote}&rdquo;
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="font-serif text-base font-bold text-slate-900">
                    {rev.client}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {rev.event}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Call-to-Action Banner */}
          <div className="rounded-3xl bg-gradient-to-br from-[#080C14] to-[#121927] p-8 sm:p-10 border border-[#D4AF37]/50 shadow-xl text-center text-white space-y-5">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-[#F3CA52] text-[11px] font-bold uppercase tracking-wider">
              2026 &amp; 2027 Banquet Bookings Open
            </span>
            <h3 className="font-serif text-3xl sm:text-4xl font-black">
              Ready to Formulate Your Event Menu?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Enter our interactive self-service portal to browse dishes, specify your guests, and receive your transparent quotation directly from our central catering desk.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/customer/portal"
                className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-amber-500 to-[#fc8019] px-8 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Utensils size={15} />
                <span>Open Menu Builder</span>
                <ArrowRight size={14} />
              </Link>
              <a
                href={`tel:${phoneDisplay.replace(/[^0-9+]/g, "")}`}
                className="w-full sm:w-auto rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 px-6 py-3.5 text-xs font-bold text-white transition flex items-center justify-center gap-2"
              >
                <Phone size={14} className="text-[#F3CA52]" />
                <span>Call Catering Desk: {phoneDisplay}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          8. CLEAN FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="bg-white border-t border-slate-200/90 pt-12 pb-24 text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-100">
            {/* Col 1: Brand Info */}
            <div className="space-y-3.5 md:col-span-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl p-[1.5px] bg-gradient-to-tr from-amber-600 via-[#F3CA52] to-amber-500 shadow-sm shrink-0">
                  <div className="w-full h-full rounded-[14px] bg-white p-1 flex items-center justify-center overflow-hidden">
                    <img
                      src="/assets/img/Thankam_Logo.png"
                      alt="Thankam Events Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-lg font-bold text-slate-950 tracking-[0.06em]">
                      THANKAM
                    </span>
                    <span className="font-serif text-xs font-semibold text-[#B8860B] tracking-[0.2em]">
                      EVENTS
                    </span>
                  </div>
                  <span className="text-[9px] font-bold tracking-[0.22em] text-amber-900/80 uppercase font-sans">
                    Celebrations Crafted • Kollam
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Kollam’s premier catering kitchen delivering authentic Kerala Sadyas, Malabar Dum Biriyanis, and complete event banquet services since 2006.
              </p>
            </div>

            {/* Col 2: Navigation Links */}
            <div className="space-y-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-900 block mb-2">
                Quick Navigation
              </span>
              <ul className="space-y-1.5">
                <li>
                  <Link to="/customer/portal?tab=sadya" className="hover:text-[#B8860B] transition">
                    Traditional Kerala Sadya
                  </Link>
                </li>
                <li>
                  <Link to="/customer/portal?tab=general" className="hover:text-[#B8860B] transition">
                    General Feast &amp; Biriyani Menu
                  </Link>
                </li>
                <li>
                  <Link to="/customer/track" className="hover:text-[#B8860B] transition">
                    Track Existing Quote
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-[#B8860B] transition">
                    Staff &amp; Admin Sign In
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Central Kitchen & Desk */}
            <div className="space-y-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-900 block mb-2">
                Central Kitchen &amp; Office
              </span>
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin size={14} className="text-[#B8860B] shrink-0 mt-0.5" />
                <span>{addressDisplay}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 pt-1">
                <Phone size={14} className="text-[#B8860B] shrink-0" />
                <span>{phoneDisplay}</span>
              </div>
              <div className="text-[11px] text-slate-400 pt-0.5">
                Catering across all 14 Kerala districts
              </div>
            </div>

            {/* Col 4: Quality & Compliance */}
            <div className="space-y-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-900 block mb-2">
                Quality &amp; Standards
              </span>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                  <ShieldCheck size={15} className="text-emerald-600" />
                  <span>FSSAI Certified Kitchen</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Standard 5% GST applicable on all catering services. Pure cow ghee &amp; cold-pressed cooking oils.
                </p>
              </div>
            </div>
          </div>

          {/* Copyright Row */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <div>
              &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <Link to="/customer/portal" className="hover:text-[#B8860B] transition">
                Customer Portal
              </Link>
              <span>&bull;</span>
              <Link to="/customer/track" className="hover:text-[#B8860B] transition">
                Status Tracker
              </Link>
              <span>&bull;</span>
              <Link to="/login" className="hover:text-[#B8860B] transition">
                Admin Panel
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ═════════════════════════════════════════════════════════════════════
          9. FLOATING CONCIERGE (NON-INTRUSIVE BOTTOM RIGHT)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5">
        <a
          href="https://wa.me/919745684766?text=Hi%20Thankam%20Events,%20I%20would%20like%20to%20inquire%20about%20catering%20for%20my%20event."
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 sm:py-3 shadow-xl shadow-emerald-900/25 text-xs font-bold transition-all hover:scale-105 active:scale-95"
          title="Chat with Catering Desk"
        >
          <MessageCircle size={17} />
          <span className="hidden sm:inline">WhatsApp Desk</span>
        </a>
        <Link
          to="/customer/portal"
          className="hidden sm:flex items-center gap-2 rounded-full bg-slate-950 text-[#F3CA52] border border-[#D4AF37]/70 hover:border-[#F3CA52] px-4 py-2.5 sm:py-3 shadow-xl text-xs font-bold hover:bg-slate-900 transition-all hover:scale-105 active:scale-95"
          title="Open Menu Builder"
        >
          <Utensils size={15} />
          <span>Curate Menu</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

export default PublicLandingPage;

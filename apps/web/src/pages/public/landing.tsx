import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Utensils,
  Users,
  FileCheck,
  ShieldCheck,
  Award,
  Phone,
  ArrowRight,
  Star,
  Search,
  Crown,
  Flame,
  Menu as MenuIcon,
  X,
  MessageCircle,
  Calendar,
  ChefHat,
  Sparkles,
} from "lucide-react";
import { customerPortalService } from "@/features/customer-portal/customer-portal.service";
import "./landing.css";

/* ─── Veg / Non-Veg Indicator ─────────────────────────────────── */
function VegBadge({ isVeg, size = 14 }: { isVeg: boolean; size?: number }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xs border shrink-0 ${
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

/* ─── Feast Styles ─────────────────────────────────────────── */
const FEAST_FORMATS = [
  {
    id: "sadya",
    title: "Traditional Kerala Sadya",
    subtitle: "Travancore Royal Banquet",
    tagline: "28-Course Plantain Leaf Banquet in Pure Cow Ghee",
    image: "/assets/img/kerala-sadhya.jpg",
    fallbackImage: "/assets/img/kerala-sadhya.jpg",
    badge: "Most Celebrated Feast",
    description:
      "Prepared in pure cow ghee and traditional clay pots. Featuring Palada Pradhaman, Parippu with Neyyu, Avial, Sambar, Olan, Kalan, and crispy Upperi.",
    idealFor: "Weddings, Nischayam & Grihapravesham",
    portalLink: "/customer/portal?tab=sadya",
  },
  {
    id: "malabar",
    title: "Malabar Dum Biriyani Feast",
    subtitle: "North Kerala Heritage",
    tagline: "Charcoal Slow-Cooked Kaima Rice Wedding Banquet",
    image: "/assets/img/malabar-biriyani.jpg",
    fallbackImage: "/assets/img/malabar-biriyani.jpg",
    badge: "Crowd Favorite",
    description:
      "Fragrant Kaima rice Thalassery Dum Biriyani paired with Malabar Porotta, Chicken Roast, Fish Pollichathu, and fresh mint lime.",
    idealFor: "Receptions, Nikkah & Evening Dinners",
    portalLink: "/customer/portal?tab=general&category=dum-biriyani",
  },
  {
    id: "reception",
    title: "Grand Reception & Live Banquet",
    subtitle: "Contemporary Multi-Cuisine",
    tagline: "Live Appam Counters, Sizzling Grills & Dessert Bars",
    image: "/assets/img/event-marriage.jpg",
    fallbackImage: "/assets/img/event-marriage.jpg",
    badge: "Contemporary Luxury",
    description:
      "A vibrant celebration with live Appam & Stew stations, sizzling tandoor, mocktail bars, continental breads, and artisanal dessert stations.",
    idealFor: "Cocktail Receptions & Corporate Galas",
    portalLink: "/customer/portal?tab=general",
  },
];

/* ─── Signature Dishes (Clean Minimal Presentation) ─────────── */
const SIGNATURE_DISHES = [
  {
    id: "d1",
    name: "Thalassery Dum Biriyani",
    category: "Main Course",
    categorySlug: "dum-biriyani",
    isVeg: false,
    image: "/assets/img/malabar-biriyani.jpg",
    description: "Aromatic Jeerakasala rice, spiced meat, golden cashews and sultanas dum-cooked on charcoal.",
  },
  {
    id: "d2",
    name: "Palada Pradhaman",
    category: "Dessert & Payasam",
    categorySlug: "desserts",
    isVeg: true,
    image: "/assets/img/kerala-sadhya.jpg",
    description: "Slow-simmered rice flakes in thickened full-cream milk, pure ghee, and fragrant cardamom.",
  },
  {
    id: "d3",
    name: "Karimeen Pollichathu",
    category: "Seafood Starter",
    categorySlug: "starters",
    isVeg: false,
    image: "/assets/img/event-custom.jpg",
    description: "Fresh pearl spot fish marinated in roasted shallot masala, wrapped in banana leaf and pan-grilled.",
  },
  {
    id: "d4",
    name: "Avial & Parippu with Neyyu",
    category: "Sadya Classic",
    categorySlug: "curries",
    isVeg: true,
    image: "/assets/img/kerala-sadhya.jpg",
    description: "Country vegetables in coconut paste and cumin, finished with virgin coconut oil and curry leaves.",
  },
  {
    id: "d5",
    name: "Live Appam & Stew Counter",
    category: "Live Counter",
    categorySlug: "breads",
    isVeg: true,
    image: "/assets/img/event-birthday.jpg",
    description: "Lacy hoppers prepared live before your guests, served with rich coconut milk vegetable or meat stew.",
  },
  {
    id: "d6",
    name: "Tender Coconut Punch",
    category: "Welcome Drink",
    categorySlug: "welcome-drinks",
    isVeg: true,
    image: "/assets/img/event-marriage.jpg",
    description: "Chilled beverage crafted with fresh tender coconut water, sweet coconut malai, and a hint of mint.",
  },
];

/* ─── Occasions Catered ────────────────────────────────────── */
const OCCASIONS = [
  {
    title: "Weddings & Vivaham",
    subtitle: "Grand plantain-leaf Sadyas to evening wedding banquets",
    guests: "200 to 5,000+ Guests",
    image: "/assets/img/event-marriage.jpg",
    link: "/customer/portal?event=wedding",
  },
  {
    title: "Engagements & Nischayam",
    subtitle: "Celebrated family feasts marking the couple's special day",
    guests: "100 to 800 Guests",
    image: "/assets/img/event-custom.jpg",
    link: "/customer/portal?event=engagement",
  },
  {
    title: "Milestones & Jubilees",
    subtitle: "Complete spreads with live food stations and dessert bars",
    guests: "50 to 500 Guests",
    image: "/assets/img/event-birthday.jpg",
    link: "/customer/portal?event=birthday",
  },
  {
    title: "Corporate & Banquets",
    subtitle: "Professional event dining and corporate gala dinners",
    guests: "50 to 1,500 Guests",
    image: "/assets/img/event-custom.jpg",
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
      "Thankam Events delivered a 28-item Sadya that our family still talks about. Selecting dishes in their online portal was effortless, and the quotation was completely transparent.",
  },
  {
    id: 2,
    client: "Faisal & Shabana Rasheed",
    event: "Nikkah & Malabar Banquet • Ashtamudi",
    guests: "1,100 Guests",
    rating: 5,
    quote:
      "From the Karimeen Pollichathu and live appams to the Thalassery Biriyani, every dish arrived piping hot. The catering agreement was crystal clear with zero unexpected charges.",
  },
  {
    id: 3,
    client: "Varghese Mathew, Managing Director",
    event: "Founders Gala • Trivandrum",
    guests: "420 Guests",
    rating: 5,
    quote:
      "We trust Thankam Events for all our company banquets in Kollam and Trivandrum. Central kitchen quality is unmatched and their hospitality team was flawless.",
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
          1. CLEAN LUXURY NAVBAR
      ══════════════════════════════════════════════════════════════════════ */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md border-b border-amber-900/10 py-2.5 shadow-sm"
            : "bg-white/90 backdrop-blur-md border-b border-slate-200/80 py-3.5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Logo & Brand Name */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-12 h-12 rounded-2xl p-[2px] bg-gradient-to-tr from-amber-600 via-[#F3CA52] to-amber-500 shadow-sm shrink-0">
              <div className="w-full h-full rounded-[14px] bg-white p-1 flex items-center justify-center overflow-hidden">
                <img
                  src="/assets/img/Thankam_Logo.png"
                  alt="Thankam Events Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/assets/img/Thankam_Logo.png";
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif text-xl sm:text-2xl font-black tracking-[0.06em] text-slate-950 group-hover:text-[#B8860B] transition-colors leading-none">
                  THANKAM
                </span>
                <span className="font-serif text-[11px] sm:text-xs font-bold tracking-[0.24em] text-[#B8860B] uppercase">
                  EVENTS
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] tracking-[0.24em] font-bold text-amber-900/80 uppercase mt-0.5 font-sans">
                Celebrations Crafted • Kollam
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-2 text-[13px] font-bold text-slate-600">
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
              href="#how-it-works"
              onClick={(e) => scrollToAnchor(e, "how-it-works")}
              className="px-3.5 py-2 rounded-full hover:bg-amber-50/80 hover:text-[#B8860B] transition-all whitespace-nowrap"
            >
              How It Works
            </a>
            <a
              href="#occasions"
              onClick={(e) => scrollToAnchor(e, "occasions")}
              className="px-3.5 py-2 rounded-full hover:bg-amber-50/80 hover:text-[#B8860B] transition-all whitespace-nowrap"
            >
              Occasions
            </a>
            <a
              href="#reviews"
              onClick={(e) => scrollToAnchor(e, "reviews")}
              className="px-3.5 py-2 rounded-full hover:bg-amber-50/80 hover:text-[#B8860B] transition-all whitespace-nowrap"
            >
              Reviews
            </a>
          </nav>

          {/* Header Action Buttons */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            <Link
              to="/customer/track"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:border-[#D4AF37] hover:bg-amber-50/50 transition shadow-2xs whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5 text-[#B8860B]" />
              <span>Track Quote</span>
            </Link>

            <Link
              to="/customer/portal"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 via-[#F3CA52] to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-sm active:scale-95 transition-all whitespace-nowrap group"
            >
              <Utensils className="w-3.5 h-3.5 text-slate-950" />
              <span>Select Menu &amp; Get Quote</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-950 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shrink-0"
          >
            {mobileMenuOpen ? <X size={20} /> : <MenuIcon size={20} />}
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
              href="#how-it-works"
              onClick={(e) => scrollToAnchor(e, "how-it-works")}
              className="block py-2 text-sm font-bold text-slate-800 border-b border-slate-100"
            >
              How It Works
            </a>
            <a
              href="#occasions"
              onClick={(e) => scrollToAnchor(e, "occasions")}
              className="block py-2 text-sm font-bold text-slate-800 border-b border-slate-100"
            >
              Occasions &amp; Event Types
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
                to="/customer/portal"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-xl text-center text-xs font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 via-[#F3CA52] to-amber-500 shadow-sm"
              >
                Select Menu &amp; Get Quote →
              </Link>
              <Link
                to="/customer/track"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl text-center text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-50 border border-slate-200"
              >
                Track Existing Quote
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ═════════════════════════════════════════════════════════════════════
          2. MINIMALIST LUXURY HERO (ELEGANT & UNCLUTTERED)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 hero-ambient-glow border-b border-amber-900/10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left 7 Columns: Sharp, Punchy Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              {/* Minimal Heritage Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-amber-300/80 text-slate-800 text-xs font-bold tracking-wide shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#B8860B]" />
                <span className="text-[#B8860B] font-extrabold">Thankam Heritage</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600">Central Kitchen, Kollam</span>
              </div>

              {/* Editorial Serif Headline */}
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.85rem] font-black text-slate-950 tracking-tight leading-[1.12]">
                Kerala’s Celebrated Feasts,{" "}
                <span className="italic font-normal gold-gradient-text block sm:inline">
                  Crafted for Your Special Day.
                </span>
              </h1>

              {/* Crisp 1-Sentence Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-xl">
                Authentic banana-leaf Sadyas, slow-cooked Thalassery Dum Biriyanis, and complete banquet catering across all 14 districts of Kerala.
              </p>

              {/* Clear Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <Link
                  to="/customer/portal"
                  className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-[#d97706] to-[#b45309] px-7 py-4 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-md shadow-amber-500/20 hover:brightness-105 active:scale-98 transition-all group"
                >
                  <Utensils size={16} />
                  <span>Select Menu &amp; Get Quote</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/customer/track"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white border border-slate-300 hover:border-[#D4AF37] px-6 py-4 text-xs sm:text-sm font-bold text-slate-800 shadow-2xs hover:bg-amber-50/50 transition"
                >
                  <Search size={15} className="text-[#B8860B]" />
                  <span>Track Quote</span>
                </Link>
              </div>

              {/* Clean Trust Strip */}
              <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <Award size={15} className="text-[#B8860B]" />
                  <span>20+ Years Legacy</span>
                </div>
                <div className="flex items-center gap-2">
                  <Utensils size={15} className="text-[#B8860B]" />
                  <span>425+ Dishes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flame size={15} className="text-[#B8860B]" />
                  <span>100% Pure Cow Ghee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-[#B8860B]" />
                  <span>All 14 Districts</span>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Visual Feast Showcase */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-amber-200/80 bg-white p-4 sm:p-5 shadow-lg shadow-amber-950/5 space-y-4">
                {/* Feast Switcher Tabs */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Signature Feasts
                  </span>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    {FEAST_FORMATS.map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setActiveFeastTab(fmt.id)}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                          activeFeastTab === fmt.id
                            ? "bg-slate-950 text-[#F3CA52] shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {fmt.id === "sadya" ? "Sadya" : fmt.id === "malabar" ? "Biriyani" : "Reception"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Magazine Photo Display */}
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-950 shadow-sm group">
                  <img
                    src={selectedFeast.image}
                    alt={selectedFeast.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = selectedFeast.fallbackImage;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />

                  {/* Top Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-white/95 text-slate-900 border border-amber-300">
                      <Crown size={11} className="text-[#B8860B]" />
                      {selectedFeast.badge}
                    </span>
                  </div>

                  {/* Bottom Info */}
                  <div className="absolute bottom-3 left-3 right-3 text-white space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                      {selectedFeast.subtitle}
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl font-black text-white leading-tight">
                      {selectedFeast.title}
                    </h3>
                    <p className="text-xs text-slate-200 line-clamp-1 font-normal">
                      {selectedFeast.tagline}
                    </p>
                  </div>
                </div>

                {/* Direct Action */}
                <Link
                  to={selectedFeast.portalLink}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-xs font-black uppercase tracking-wider text-[#F3CA52] hover:bg-slate-900 border border-[#D4AF37]/50 transition shadow-xs group"
                >
                  <span>Select This Feast Menu</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          3. SIGNATURE FEAST FORMATS (CLEAN 3-CARD SHOWCASE)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="feasts" className="py-16 sm:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#B8860B]">
              Banquets &amp; Traditions
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              Popular Feast Menus
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Select a signature style to start building your customized menu in our self-service portal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEAST_FORMATS.map((fmt) => (
              <div
                key={fmt.id}
                className="group rounded-3xl border border-slate-200/90 bg-[#FAF9F6] overflow-hidden shadow-xs hover:border-[#D4AF37] hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div className="aspect-[16/10] w-full overflow-hidden bg-slate-950 relative">
                  <img
                    src={fmt.image}
                    alt={fmt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = fmt.fallbackImage;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      {fmt.subtitle}
                    </span>
                    <h3 className="font-serif text-xl font-bold text-white leading-snug">
                      {fmt.title}
                    </h3>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {fmt.description}
                  </p>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {fmt.idealFor}
                    </span>
                    <Link
                      to={fmt.portalLink}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8860B] hover:text-amber-800 group-hover:translate-x-1 transition-all"
                    >
                      <span>Explore</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          4. 425+ DISH EXPLORER (CLEAN APPETITE APPEAL)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="menu-highlights" className="py-16 sm:py-24 bg-[#FAF9F6] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#B8860B]">
                Culinary Highlights
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-black text-slate-900 mt-1">
                Choose from 425+ Traditional Dishes
              </h2>
              <p className="text-sm text-slate-600 mt-1.5 max-w-xl">
                A preview of our central kitchen specialties. Add items to your menu and receive an itemized per-plate quote.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDishFilter("ALL")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  dishFilter === "ALL"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                All Dishes
              </button>
              <button
                type="button"
                onClick={() => setDishFilter("VEG")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  dishFilter === "VEG"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-600 shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <VegBadge isVeg={true} size={12} />
                <span>Pure Veg</span>
              </button>
              <button
                type="button"
                onClick={() => setDishFilter("NON_VEG")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  dishFilter === "NON_VEG"
                    ? "bg-rose-50 text-rose-800 border border-rose-600 shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <VegBadge isVeg={false} size={12} />
                <span>Non-Veg</span>
              </button>
            </div>
          </div>

          {/* Minimal Dish Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDishes.map((dish) => (
              <div
                key={dish.id}
                className="group rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-[#D4AF37] hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Photo Card */}
                  <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-900">
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/assets/img/event-marriage.jpg";
                      }}
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <VegBadge isVeg={dish.isVeg} size={15} />
                    </div>
                    <div className="absolute bottom-2.5 left-3">
                      <span className="rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                        {dish.category}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-serif text-lg font-bold text-slate-900 group-hover:text-[#B8860B] transition-colors">
                      {dish.name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                      {dish.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500">Available across Kerala</span>
                  <Link
                    to={`/customer/portal?tab=${dish.isVeg ? "sadya" : "general"}&category=${dish.categorySlug}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 group-hover:text-[#B8860B] transition"
                  >
                    <span>Add in Planner</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Direct CTA to Full Menu */}
          <div className="mt-12 text-center">
            <Link
              to="/customer/portal"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-8 py-3.5 text-xs font-black uppercase tracking-wider text-[#F3CA52] border border-[#D4AF37]/50 hover:bg-slate-900 shadow-md transition-all group"
            >
              <span>Explore All 425+ Dishes in Menu Planner</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          5. HOW IT WORKS (CLEAN 3-STEP FLOW)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#B8860B]">
              Simple &amp; Transparent
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              How Your Catering Quote Works
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Build your custom banquet menu online in 3 simple steps without sales pressure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Utensils,
                title: "1. Pick Your Dishes",
                desc: "Browse 425+ authentic items in our self-service portal: plantain-leaf sadyas, biriyanis, live stations, and payasams.",
              },
              {
                step: "02",
                icon: Calendar,
                title: "2. Set Event Details",
                desc: "Enter your estimated guest count, event date, and banquet venue across any of Kerala's 14 districts.",
              },
              {
                step: "03",
                icon: FileCheck,
                title: "3. Receive Official Proposal",
                desc: "Verify your phone via OTP. Our central desk delivers an itemized per-plate quote & formal catering agreement directly.",
              },
            ].map((st) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.step}
                  className="rounded-3xl border border-slate-200/90 bg-[#FAF9F6] p-7 shadow-xs hover:border-[#D4AF37] transition-all space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950 text-[#F3CA52] border border-[#D4AF37]/50 flex items-center justify-center shadow-xs">
                      <Icon size={20} />
                    </div>
                    <span className="font-serif text-3xl font-black text-[#D4AF37]/40">
                      {st.step}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-slate-900">
                    {st.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {st.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          6. OCCASIONS WE CATER (CLEAN VISUAL CARDS)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="occasions" className="py-16 sm:py-24 bg-[#FAF9F6] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#B8860B]">
              Every Milestone Celebrated
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              Events We Cater Across Kerala
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              From intimate 50-guest family gatherings to grand 5,000-guest wedding banquets.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {OCCASIONS.map((occ) => (
              <Link
                key={occ.title}
                to={occ.link}
                className="group rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:border-[#D4AF37] hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="h-44 w-full overflow-hidden bg-slate-900 relative">
                  <img
                    src={occ.image}
                    alt={occ.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/assets/img/event-marriage.jpg";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <span className="inline-flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/40">
                      <Users size={11} /> {occ.guests}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-slate-900 group-hover:text-[#B8860B] transition-colors leading-snug">
                      {occ.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {occ.subtitle}
                    </p>
                  </div>

                  <div className="inline-flex items-center justify-between w-full text-xs font-bold text-[#B8860B] group-hover:text-amber-800 transition">
                    <span>Plan Menu</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          7. THE THANKAM DISTINCTION (CLEAN HERITAGE STRIP)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-24 bg-[#080C14] text-white kasavu-pattern border-b border-amber-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#F3CA52]">
              The Thankam Distinction
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-black text-white mt-1.5">
              20+ Years Serving Unforgettable Feasts in Kollam
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Uncompromising culinary standards rooted in authentic South Kerala traditions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Award,
                badge: "EST. 2006",
                title: "20+ Years Legacy",
                desc: "Thousands of celebrated weddings and milestones hosted across Kerala.",
              },
              {
                icon: Flame,
                badge: "PURE GHEE",
                title: "Pure Cow Ghee & Oils",
                desc: "Every Sadya prepared fresh with pure cow ghee and virgin coconut oil.",
              },
              {
                icon: ChefHat,
                badge: "425+ DISHES",
                title: "Master Banquet Chefs",
                desc: "Dedicated culinary masters specializing in Travancore and Malabar recipes.",
              },
              {
                icon: ShieldCheck,
                badge: "FSSAI CERTIFIED",
                title: "Official Compliance",
                desc: "Hygienic central kitchen, temperature-controlled transit, and transparent 5% GST.",
              },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-3xl border border-amber-500/20 bg-[#101622] p-6 hover:border-[#D4AF37] transition-all space-y-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#F3CA52]">
                    <Icon size={18} />
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#D4AF37] uppercase block">
                    {p.badge}
                  </span>
                  <h3 className="font-serif text-lg font-bold text-white">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    {p.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          8. CLIENT REVIEWS
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="reviews" className="py-16 sm:py-24 bg-[#FAF9F6] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#B8860B]">
              Verified Feedback
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              Loved by Hosts &amp; Guests Across Kerala
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Authentic reviews from families and corporate hosts we have served.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
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

          {/* Minimal Final Call to Action */}
          <div className="rounded-3xl bg-gradient-to-br from-[#080C14] to-[#121927] p-8 sm:p-12 border border-[#D4AF37]/50 shadow-xl text-center text-white space-y-5">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-[#F3CA52] text-xs font-bold uppercase tracking-wider">
              2026 &amp; 2027 Banquet Bookings Open
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-black">
              Ready to Plan Your Event Menu?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              Select your favorite dishes online, specify your guest count, and receive an itemized proposal directly from our catering desk.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Link
                to="/customer/portal"
                className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-amber-500 to-[#fc8019] px-8 py-4 text-xs font-black uppercase tracking-wider text-white shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Utensils size={15} />
                <span>Open Menu Builder</span>
                <ArrowRight size={14} />
              </Link>
              <a
                href={`tel:${phoneDisplay.replace(/[^0-9+]/g, "")}`}
                className="w-full sm:w-auto rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 px-6 py-4 text-xs font-bold text-white transition flex items-center justify-center gap-2"
              >
                <Phone size={14} className="text-[#F3CA52]" />
                <span>Call Catering Desk: {phoneDisplay}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          9. CLEAN FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="bg-white border-t border-slate-200/90 pt-12 pb-20 text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-100">
            {/* Col 1: Brand Info */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl p-[1.5px] bg-gradient-to-tr from-amber-600 via-[#F3CA52] to-amber-500 shadow-sm shrink-0">
                  <div className="w-full h-full rounded-[10px] bg-white p-1 flex items-center justify-center overflow-hidden">
                    <img
                      src="/assets/img/Thankam_Logo.png"
                      alt="Thankam Events Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-serif text-base font-bold text-slate-950 tracking-[0.06em]">
                    THANKAM EVENTS
                  </span>
                  <span className="text-[9px] font-bold tracking-[0.2em] text-amber-900/80 uppercase font-sans">
                    Celebrations Crafted • Kollam
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Kollam’s premier catering kitchen delivering authentic Kerala Sadyas, Malabar Dum Biriyanis, and complete banquet services since 2006.
              </p>
            </div>

            {/* Col 2: Navigation Links */}
            <div className="space-y-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-900 block mb-2">
                Quick Navigation
              </span>
              <ul className="space-y-1.5 font-medium">
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

            {/* Col 3: Contact & Kitchen */}
            <div className="space-y-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-900 block mb-2">
                Central Kitchen
              </span>
              <p className="text-slate-500 leading-relaxed font-medium">
                Chinnakada, Residency Road, Kollam, Kerala 691001
              </p>
              <div className="pt-1 space-y-1">
                <a href={`tel:${phoneDisplay.replace(/[^0-9+]/g, "")}`} className="block hover:text-[#B8860B] font-bold text-slate-800">
                  {phoneDisplay}
                </a>
                <a href="mailto:info@thankamevents.in" className="block text-slate-500 hover:text-[#B8860B]">
                  info@thankamevents.in
                </a>
              </div>
            </div>

            {/* Col 4: Assurance Badge */}
            <div className="space-y-2.5 text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-900 block mb-2">
                Official Assurance
              </span>
              <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <ShieldCheck size={14} className="text-[#B8860B]" />
                  <span>Licensed &amp; Compliant</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
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

      {/* Floating Concierge (Clean & Modern) */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5">
        <a
          href="https://wa.me/919745684766?text=Hi%20Thankam%20Events,%20I%20would%20like%20to%20inquire%20about%20catering%20for%20my%20event."
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 shadow-lg shadow-emerald-900/20 text-xs font-bold transition-all hover:scale-105 active:scale-95"
          title="Chat with Catering Desk"
        >
          <MessageCircle size={16} />
          <span className="hidden sm:inline">WhatsApp Desk</span>
        </a>
      </div>
    </div>
  );
}

export default PublicLandingPage;

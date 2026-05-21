import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customerPortalService } from '@/features/customer-portal/customer-portal.service';
import { toMediaUrl } from '@/utils/media-url';
import { SelfieDialog, ReviewDialog } from './event-dialogs';
import './landing.css';

type Content = Awaited<ReturnType<typeof customerPortalService.websiteContent>>;

const NAV = [
  { id: 'lp-plan',       label: 'Plan Event' },
  { id: 'lp-events',     label: 'Events' },
  { id: 'lp-gallery',    label: 'Gallery' },
  { id: 'lp-community',  label: 'Community' },
  { id: 'lp-about',      label: 'About' },
  { id: 'lp-contact',    label: 'Contact' },
];

const EVENT_CARDS = [
  { img: '/assets/img/event-marriage.jpg',  icon: 'bi-heart',    title: 'Weddings'       },
  { img: '/assets/img/event-birthday.jpg',  icon: 'bi-balloon',  title: 'Birthdays'      },
  { img: '/assets/img/event-custom.jpg',    icon: 'bi-stars',    title: 'Engagements'    },
  { img: '/assets/img/event-funeral.jpeg',  icon: 'bi-flower2',  title: 'Memorials'      },
];

const EVENT_TYPES = ['Wedding', 'Birthday Party', 'Engagement', 'Anniversary', 'House Warming', 'Corporate Event', 'Memorial Service'];

/* ─── Testimonial Carousel (isolated component — its state never re-renders the parent) ─── */
const POS_CLASSES = ['cp-n2', 'cp-n1', 'cp-0', 'cp-p1', 'cp-p2'] as const;

const TestimonialCarousel = memo(({ reviews }: { reviews: any[] }) => {
  const total = reviews.length;
  const [activeSlide, setActiveSlide] = useState(0);
  const [isMuted, setIsMuted]         = useState(true);
  const videoMapRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  /* Only the center slot (key '0') respects isMuted; side slots are always muted */
  const syncMuted = useCallback(() => {
    videoMapRef.current.forEach((v, key) => { v.muted = key !== '0' || isMuted; });
  }, [isMuted]);

  useEffect(() => { syncMuted(); }, [syncMuted]);
  useEffect(() => { syncMuted(); }, [activeSlide, syncMuted]);

  const goSlide = useCallback((idx: number) => {
    const next = (idx + total) % total;
    setActiveSlide(prev => (next === prev ? prev : next));
  }, [total]);

  return (
    <>
      <div className="lp-sh" style={{ marginTop: 56, marginBottom: 20 }}>
        <span className="lp-sh-eye">Client Stories</span>
        <h2>What Our Clients Say</h2>
        <div className="lp-sh-rule" />
      </div>
      <div className="lp-carousel-wrap">
        <button className="lp-carousel-arrow lp-carousel-arrow-prev"
          onClick={() => goSlide(activeSlide - 1)} aria-label="Previous">
          <i className="bi bi-chevron-left" />
        </button>

        <div className="lp-carousel-track">
          {[-2, -1, 0, 1, 2].map(offset => {
            const idx    = (activeSlide + offset + total * 10) % total;
            const r      = reviews[idx];
            const rating = Math.max(1, Math.min(5, Number(r.rating ?? 5)));
            const isVideo = r.mediaUrl && r.mediaType === 'VIDEO';
            const posKey  = `pos-${offset}`; /* stable key — no DOM remounting on slide change */

            return (
              <div
                key={posKey}
                className={`lp-carousel-card ${POS_CLASSES[offset + 2]}`}
                onClick={() => { if (offset !== 0) goSlide(activeSlide + offset); }}
              >
                {/* Media */}
                {isVideo ? (
                  <video
                    ref={el => {
                      const k = `${offset}`;
                      if (el) {
                        el.muted = k !== '0' || isMuted; /* side slots always muted */
                        videoMapRef.current.set(k, el);
                      } else { videoMapRef.current.delete(k); }
                    }}
                    src={toMediaUrl(r.mediaUrl)}
                    className="lp-carousel-card-img"
                    autoPlay muted loop playsInline
                  />
                ) : r.mediaUrl ? (
                  <img src={toMediaUrl(r.mediaUrl)} alt={r.clientName ?? ''} className="lp-carousel-card-img" loading="lazy" />
                ) : (
                  <div className="lp-carousel-card-placeholder">
                    <span className="lp-carousel-placeholder-initial">
                      {(r.clientName ?? 'CL').trim().split(/\s+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                )}

                {/* Volume toggle — shown on every video card */}
                {isVideo && (
                  <button
                    className="lp-carousel-vol-btn"
                    onClick={e => { e.stopPropagation(); setIsMuted(m => !m); }}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    <i className={`bi bi-${isMuted ? 'volume-mute-fill' : 'volume-up-fill'}`} />
                  </button>
                )}

                <div className="lp-carousel-card-overlay" />
                <div className="lp-carousel-card-body">
                  <p className="lp-carousel-card-quote">
                    "{(r.testimonial || 'Outstanding service and perfect coordination.').slice(0, 80)}{(r.testimonial ?? '').length > 80 ? '…' : ''}"
                  </p>
                  <div className="lp-carousel-card-stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <i key={i} className={`bi bi-star-fill${i >= rating ? ' dim' : ''}`} />
                    ))}
                  </div>
                  <span className="lp-carousel-card-name">{r.clientName || 'Happy Client'}</span>
                  <span className="lp-carousel-card-role">{r.title || 'Event Client'}</span>
                </div>
              </div>
            );
          })}
        </div>

        <button className="lp-carousel-arrow lp-carousel-arrow-next"
          onClick={() => goSlide(activeSlide + 1)} aria-label="Next">
          <i className="bi bi-chevron-right" />
        </button>
      </div>

      <div className="lp-carousel-dots">
        {reviews.map((_: any, i: number) => (
          <button key={i} className={`lp-carousel-dot${i === activeSlide ? ' on' : ''}`}
            onClick={() => goSlide(i)} />
        ))}
      </div>
    </>
  );
});
TestimonialCarousel.displayName = 'TestimonialCarousel';

export function PublicLandingPage() {
  const navigate = useNavigate();
  const [content, setContent]       = useState<Content | null>(null);
  const [ready, setReady]           = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const [selfieOpen, setSelfieOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [topbarGone, setTopbarGone] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showBtt, setShowBtt]       = useState(false);
  const [activeId, setActiveId]     = useState('hero');
  const [counted, setCounted]       = useState(false);
  const [counts, setCounts]         = useState({ events: 0, years: 0, guests: 0 });
  const statsRef                    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void customerPortalService.websiteContent().then(setContent);
    const t = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const fn = () => {
      const y = window.scrollY;
      setScrolled(y > 60);
      setTopbarGone(y > 60);
      setShowBtt(y > 400);
      for (const n of [...NAV].reverse()) {
        const el = document.getElementById(n.id);
        if (el && y >= el.offsetTop - 120) { setActiveId(n.id.replace('lp-', '')); break; }
      }
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const ob = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !counted) {
        setCounted(true);
        run('events', 1500, 2000);
        run('years',  13,   1400);
        run('guests', 100000, 2600);
      }
    }, { threshold: 0.4 });
    if (statsRef.current) ob.observe(statsRef.current);
    return () => ob.disconnect();
  }, [counted]);

  function run(key: keyof typeof counts, target: number, ms: number) {
    const steps = 50, dt = ms / steps, inc = target / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur = Math.min(cur + inc, target);
      setCounts(p => ({ ...p, [key]: Math.ceil(cur) }));
      if (cur >= target) clearInterval(t);
    }, dt);
  }

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    const hdr = document.getElementById('lp-header');
    if (el && hdr) window.scrollTo({ top: el.offsetTop - hdr.offsetHeight, behavior: 'smooth' });
    setMobileOpen(false);
  }

  const co       = content?.company;
  const logoSrc  = co?.logoUrl ? toMediaUrl(co.logoUrl) : '/assets/img/Thankam_Logo.png';
  const rawGallery = (content?.gallery ?? []).filter((g: any) => g.isWebsiteGallery !== false).slice(0, 9);
  const displayReviews = useMemo(
    () => (content?.reviews ?? []).filter((r: any) => r.isFeatured === true).slice(0, 6),
    [content?.reviews],
  );


  return (
    <div className="lp-root">
      {/* Preloader */}
      {!ready && <div className="lp-preloader"><div className="lp-preloader-ring" /></div>}

      {/* ── Topbar ── */}
      <div className={`lp-topbar${topbarGone ? ' gone' : ''}`}>
        <div className="lp-container lp-topbar-inner">
          <div className="lp-topbar-left">
            <a href="tel:+919745684766"><i className="bi bi-telephone-fill" /><span>+91 97456 84766</span></a>
            <a href="mailto:info@thankamevents.in"><i className="bi bi-envelope-fill" /><span>info@thankamevents.in</span></a>
          </div>
          <div className="lp-topbar-right">
            <a href="https://www.instagram.com/thankam.events" target="_blank" rel="noreferrer"><i className="bi bi-instagram" /></a>
            <a href="https://www.facebook.com/" target="_blank" rel="noreferrer"><i className="bi bi-facebook" /></a>
            <a href="https://wa.me/919745684766" target="_blank" rel="noreferrer"><i className="bi bi-whatsapp" /></a>
          </div>
        </div>
      </div>

      {/* ── Header ── */}
      <header id="lp-header" className={`lp-header${scrolled ? ' scrolled' : ''}`}>
        <div className="lp-container lp-header-inner">
          <a href="#lp-hero" onClick={e => { e.preventDefault(); scrollTo('lp-hero'); }} className="lp-logo">
            <img src={logoSrc} alt="Thankam Events" />
          </a>
          <nav className="lp-nav">
            {NAV.map(n => (
              <a key={n.id} href={`#${n.id}`}
                className={activeId === n.id.replace('lp-', '') ? 'active' : ''}
                onClick={e => { e.preventDefault(); scrollTo(n.id); }}>{n.label}</a>
            ))}
          </nav>
          <div className="lp-header-actions">
            <button className="lp-btn-quote" onClick={() => navigate('/customer/portal')}>
              <i className="bi bi-calendar-check" style={{ marginRight: 6 }} /> Get Quote
            </button>
            <button className="lp-mob-toggle" onClick={() => setMobileOpen(true)}>
              <i className="bi bi-list" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      <div className={`lp-mob-overlay${mobileOpen ? ' open' : ''}`}>
        <button className="lp-mob-close" onClick={() => setMobileOpen(false)}><i className="bi bi-x" /></button>
        {NAV.map(n => (
          <a key={n.id} href={`#${n.id}`} className={activeId === n.id.replace('lp-', '') ? 'active' : ''}
            onClick={e => { e.preventDefault(); scrollTo(n.id); }}>{n.label}</a>
        ))}
        <button className="lp-btn-primary" style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
          onClick={() => { setMobileOpen(false); navigate('/customer/portal'); }}>
          <i className="bi bi-calendar-check" /> Get Free Quote
        </button>
      </div>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section id="lp-hero" className="lp-hero">
        <div className="lp-hero-glow-1" />
        <div className="lp-hero-glow-2" />
        <div className="lp-container lp-hero-inner">
          <div className="lp-hero-split">

            {/* ── Left: Content ── */}
            <div className="lp-hero-left">
              <div className="lp-hero-eyebrow">
                <i className="bi bi-award-fill" /> Premier Event Management · Since 2012
              </div>
              <h1>
                <span className="lp-h1-plain">Crafting</span>
                <span className="lp-h1-accent">Unforgettable</span>
                <span className="lp-h1-plain">Moments</span>
              </h1>
              <p className="lp-hero-sub">
                Kollam's most trusted catering &amp; event management —
                elegance and warmth in every celebration.
              </p>
              <div className="lp-hero-actions">
                <button className="lp-btn-primary" onClick={() => navigate('/customer/portal')}>
                  <i className="bi bi-calendar-check" /> Get Free Quote
                </button>
                <button className="lp-btn-outline-white" onClick={() => scrollTo('lp-gallery')}>
                  View Gallery <i className="bi bi-arrow-right" />
                </button>
              </div>
              <div className="lp-hero-stats" ref={statsRef}>
                {[
                  { num: `${counts.events.toLocaleString('en-IN')}+`, label: 'Events Done' },
                  { num: `${counts.years}+`,                          label: 'Years' },
                  { num: `${Math.round(counts.guests / 1000)}K+`,    label: 'Guests Served' },
                  { num: '100%',                                       label: 'Satisfaction' },
                ].map(s => (
                  <div key={s.label} className="lp-hero-stat">
                    <span className="lp-hero-stat-num">{s.num}</span>
                    <span className="lp-hero-stat-label">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Photo mosaic ── */}
            <div className="lp-hero-right">
              {/* Experience badge — bottom-left */}
              <div className="lp-hero-badge">
                <div className="lp-hero-badge-icon"><i className="bi bi-trophy-fill" /></div>
                <div>
                  <span className="lp-hero-badge-num">13+ Years</span>
                  <span className="lp-hero-badge-label">of Excellence</span>
                </div>
              </div>
              {/* Verified badge — top-right */}
              <div className="lp-hero-badge-2">
                <i className="bi bi-patch-check-fill" />
                <span>Trusted Choice</span>
              </div>
              <div className="lp-hero-mosaic">
                <div className="lp-hero-mosaic-item">
                  <img src="/assets/img/event-marriage.jpg" alt="Wedding event" />
                </div>
                <div className="lp-hero-mosaic-item">
                  <img src="/assets/img/event-birthday.jpg" alt="Birthday event" />
                </div>
                <div className="lp-hero-mosaic-item">
                  <img src="/assets/img/event-custom.jpg" alt="Special event" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <main>
        {/* ══════════════════════════════════════════
            PLAN YOUR EVENT (Quotation CTA)
        ══════════════════════════════════════════ */}
        <section id="lp-plan" className="lp-plan">
          <div className="lp-container lp-plan-inner">
            <div>
              <p className="lp-plan-label"><i className="bi bi-lightning-fill" style={{ marginRight: 6 }} />Instant Quotation</p>
              <h2>Plan Your Event<br />in Minutes</h2>
              <p className="lp-plan-sub">
                Browse our full menu catalog, select items for your event,
                and receive a detailed quote — all in one place.
              </p>
              <button className="lp-btn-primary" onClick={() => navigate('/customer/portal')}>
                <i className="bi bi-list-check" /> Explore Menu &amp; Quote
              </button>
            </div>
            <div>
              <div className="lp-plan-chips">
                {EVENT_TYPES.map(t => (
                  <button key={t} className="lp-plan-chip" onClick={() => navigate('/customer/portal')}>
                    {t}
                  </button>
                ))}
                <button className="lp-plan-chip" onClick={() => navigate('/customer/portal')}>
                  + More
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            EVENTS WE DO
        ══════════════════════════════════════════ */}
        <section id="lp-events" className="lp-section" style={{ background: 'var(--cream)' }}>
          <div className="lp-container">
            <div className="lp-sh">
              <span className="lp-sh-eye">What We Do</span>
              <h2>Events We Manage</h2>
              <div className="lp-sh-rule" />
            </div>
            <div className="lp-events-grid">
              {EVENT_CARDS.map(ev => (
                <div key={ev.title} className="lp-ev-card">
                  <img src={ev.img} alt={ev.title} loading="lazy" />
                  <div className="lp-ev-card-overlay" />
                  <div className="lp-ev-card-body">
                    <i className={`bi ${ev.icon} lp-ev-card-icon`} />
                    <p className="lp-ev-card-title">{ev.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            GALLERY
        ══════════════════════════════════════════ */}
        <section id="lp-gallery" className="lp-gallery-sec">
          <div className="lp-container">
            <div className="lp-sh">
              <span className="lp-sh-eye">Our Portfolio</span>
              <h2>Event Gallery</h2>
              <div className="lp-sh-rule" />
            </div>
          </div>
          {rawGallery.length === 0 ? (
            <div className="lp-container lp-gal-empty">
              <i className="bi bi-images" />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>Gallery coming soon</p>
            </div>
          ) : (
            <div className="lp-container">
              <div className="lp-gal-grid">
                {rawGallery.map((g: any, i: number) => (
                  <div key={g.id ?? i} className="lp-gal-item">
                    {g.type === 'VIDEO' ? (
                      <video
                        src={toMediaUrl(g.url)}
                        autoPlay muted loop playsInline
                        preload="auto"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <img src={toMediaUrl(g.url)} alt={g.title ?? ''} loading="lazy" />
                    )}
                    {g.type !== 'VIDEO' && (
                      <div className="lp-gal-overlay">
                        <i className="bi bi-zoom-in" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════
            CUSTOMER CORNER — Selfie + Review + Testimonials
        ══════════════════════════════════════════ */}
        <section id="lp-community" className="lp-customer-corner lp-section">
          <div className="lp-container">
            <div className="lp-sh">
              <span className="lp-sh-eye">Community</span>
              <h2>Be Part of Our Story</h2>
              <div className="lp-sh-rule" />
            </div>

            {/* Feature cards */}
            <div className="lp-corner-cards">
              {/* Selfie Point */}
              <div className="lp-corner-card" onClick={() => setSelfieOpen(true)}
                style={{ cursor: 'pointer' }}>
                <div className="lp-corner-card-bg" style={{ background: 'linear-gradient(135deg, #0F1B3C, #1a3a6e)' }} />
                <div className="lp-corner-card-overlay" style={{ background: 'linear-gradient(to top, rgba(15,27,60,0.9), rgba(15,27,60,0.3))' }} />
                <div className="lp-corner-card-body">
                  <i className="bi bi-camera lp-corner-card-icon" style={{ color: '#F0C040' }} />
                  <h3>Selfie Point</h3>
                  <p>Attended our event? Share your selfie and we'll feature it!</p>
                  <span className="lp-corner-card-btn">
                    Upload Selfie <i className="bi bi-arrow-right" style={{ marginLeft: 4 }} />
                  </span>
                </div>
              </div>

              {/* Review Portal */}
              <div className="lp-corner-card" onClick={() => setReviewOpen(true)}
                style={{ cursor: 'pointer' }}>
                <div className="lp-corner-card-bg" style={{ background: 'linear-gradient(135deg, #B8860B, #8a6200)' }} />
                <div className="lp-corner-card-overlay" style={{ background: 'linear-gradient(to top, rgba(90,58,0,0.92), rgba(90,58,0,0.3))' }} />
                <div className="lp-corner-card-body">
                  <i className="bi bi-star-fill lp-corner-card-icon" style={{ color: '#FDF3D0' }} />
                  <h3>Share Your Review</h3>
                  <p>Your experience matters — help others discover Thankam Events.</p>
                  <span className="lp-corner-card-btn">
                    Write a Review <i className="bi bi-arrow-right" style={{ marginLeft: 4 }} />
                  </span>
                </div>
              </div>
            </div>

            {/* Testimonials — isolated component; its state never re-renders this page */}
            {displayReviews.length > 0 && <TestimonialCarousel reviews={displayReviews} />}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ABOUT
        ══════════════════════════════════════════ */}
        <section id="lp-about" className="lp-section" style={{ background: 'var(--white)' }}>
          <div className="lp-container">
            <div className="lp-about-grid">
              <div className="lp-about-logo-wrap">
                <img src={logoSrc} alt="Thankam Events" />
                <div className="lp-about-stats">
                  {[
                    { num: '13+', label: 'Years' },
                    { num: '1500+', label: 'Events' },
                    { num: '100K+', label: 'Guests' },
                    { num: '100%', label: 'Satisfaction' },
                  ].map(s => (
                    <div key={s.label} className="lp-abt-stat">
                      <span className="lp-abt-stat-num">{s.num}</span>
                      <span className="lp-abt-stat-label">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="lp-sh" style={{ textAlign: 'left', marginBottom: 32 }}>
                  <span className="lp-sh-eye">About Us</span>
                  <h2>Celebrations Crafted<br />with Passion</h2>
                  <div className="lp-sh-rule" style={{ margin: '12px 0 0' }} />
                </div>
                <div className="lp-about-features">
                  {[
                    { icon: 'bi-gem',    title: 'Premium Quality',  desc: 'Exceptional standards across catering, décor, and coordination.' },
                    { icon: 'bi-heart',  title: 'Personal Touch',   desc: 'Every event treated with warmth — because it matters to you.' },
                    { icon: 'bi-people', title: 'Expert Team',      desc: 'Seasoned professionals with 13+ years of celebration expertise.' },
                  ].map(f => (
                    <div key={f.title} className="lp-abt-feat">
                      <div className="lp-abt-feat-icon"><i className={`bi ${f.icon}`} /></div>
                      <div>
                        <h4>{f.title}</h4>
                        <p>{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CONTACT
        ══════════════════════════════════════════ */}
        <section id="lp-contact" className="lp-section" style={{ background: 'var(--cream)' }}>
          <div className="lp-container">
            <div className="lp-sh">
              <span className="lp-sh-eye">Get In Touch</span>
              <h2>Contact Us</h2>
              <div className="lp-sh-rule" />
            </div>
            <div className="lp-contact-cards">
              {[
                { icon: 'bi-geo-alt', title: 'Location', body: 'Uliyacovil, Kollam, Kerala', href: 'https://maps.google.com/?q=Kollam,Kerala', target: '_blank' },
                { icon: 'bi-telephone', title: 'Call Us', body: '+91 9745684766', href: 'tel:+919745684766', target: undefined },
                { icon: 'bi-whatsapp', title: 'WhatsApp', body: 'Chat with us instantly', href: 'https://wa.me/919745684766', target: '_blank' },
                { icon: 'bi-envelope', title: 'Email', body: 'info@thankamevents.in', href: 'mailto:info@thankamevents.in', target: undefined },
              ].map(c => (
                <a key={c.title} href={c.href} target={c.target} rel="noreferrer" className="lp-contact-card">
                  <div className="lp-contact-icon"><i className={`bi ${c.icon}`} /></div>
                  <h4>{c.title}</h4>
                  <p>{c.body}</p>
                </a>
              ))}
            </div>
            <div className="lp-map-wrap">
              <iframe
                title="Thankam Events Location"
                style={{ border: 0, width: '100%', height: 300, display: 'block' }}
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d63067.77133186785!2d76.5538736891122!3d8.90414483313437!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b05fc5bdda9c621%3A0x8bf03195267372f7!2sKollam%2C%20Kerala!5e0!3m2!1sen!2sin!4v1729931651864!5m2!1sen!2sin"
                allowFullScreen loading="lazy"
              />
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            <div>
              <div className="lp-ft-logo"><img src={logoSrc} alt="Thankam Events" /></div>
              <p className="lp-ft-desc">Creating unforgettable moments since 2012 — Kollam's trusted name for events and catering.</p>
              <div className="lp-ft-info">
                <span><i className="bi bi-geo-alt" /> Uliyacovil, Kollam, Kerala</span>
                <a href="tel:+919745684766"><i className="bi bi-telephone" /> +91 9745684766</a>
                <a href="mailto:info@thankamevents.in"><i className="bi bi-envelope" /> info@thankamevents.in</a>
              </div>
              <div className="lp-ft-socials">
                <a href="https://www.instagram.com/thankam.events" target="_blank" rel="noreferrer"><i className="bi bi-instagram" /></a>
                <a href="https://www.facebook.com/" target="_blank" rel="noreferrer"><i className="bi bi-facebook" /></a>
                <a href="https://wa.me/919745684766" target="_blank" rel="noreferrer"><i className="bi bi-whatsapp" /></a>
              </div>
            </div>
            <div className="lp-ft-links">
              <h4>Quick Links</h4>
              <ul>
                {[['lp-hero','Home'],['lp-plan','Plan Event'],['lp-events','Events'],['lp-gallery','Gallery'],['lp-community','Community'],['lp-contact','Contact']].map(([id, label]) => (
                  <li key={id}><a href={`#${id}`} onClick={e => { e.preventDefault(); scrollTo(id); }}>{label}</a></li>
                ))}
              </ul>
            </div>
            <div className="lp-ft-links">
              <h4>Services</h4>
              <ul>
                {['Wedding Planning','Birthday Parties','Catering Services','Décor & Design','Memorial Services'].map(s => (
                  <li key={s}><a href="#lp-plan" onClick={e => { e.preventDefault(); scrollTo('lp-plan'); }}>{s}</a></li>
                ))}
              </ul>
            </div>
            <div className="lp-ft-links">
              <h4>Community</h4>
              <ul>
                <li><a href="/event/selfie" onClick={e => { e.preventDefault(); navigate('/event/selfie'); }}>Upload Selfie</a></li>
                <li><a href="/event/review" onClick={e => { e.preventDefault(); navigate('/event/review'); }}>Leave a Review</a></li>
                <li><a href="#lp-community" onClick={e => { e.preventDefault(); scrollTo('lp-community'); }}>Testimonials</a></li>
                <li><a href="/customer/portal" onClick={e => { e.preventDefault(); navigate('/customer/portal'); }}>Get a Quote</a></li>
              </ul>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <p>&copy; 2012–{new Date().getFullYear()} <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Thankam Events</strong>. All rights reserved.</p>
            <p>Crafted with <i className="bi bi-heart-fill" style={{ color: 'var(--gold)', margin: '0 4px' }} /> in Kollam, Kerala</p>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      <button className={`lp-btt${showBtt ? ' on' : ''}`}
        onClick={() => scrollTo('lp-hero')} aria-label="Back to top">
        <i className="bi bi-arrow-up-short" />
      </button>

      {/* Hidden admin link */}
      <div style={{ display: 'none' }}><Link to="/login">Admin</Link></div>

      {/* Dialogs */}
      {selfieOpen && <SelfieDialog onClose={() => setSelfieOpen(false)} />}
      {reviewOpen && <ReviewDialog onClose={() => setReviewOpen(false)} />}
    </div>
  );
}

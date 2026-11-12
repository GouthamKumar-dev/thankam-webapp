import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  Crown,
  Film,
  Image as ImageIcon,
  PlayCircle,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerPortalService } from '@/features/customer-portal/customer-portal.service';
import { toMediaUrl } from '@/utils/media-url';

type WebsiteContent = Awaited<ReturnType<typeof customerPortalService.websiteContent>>;
type GalleryItem = WebsiteContent['gallery'][number];
type GalleryFilter = 'ALL' | 'IMAGE' | 'VIDEO';

const FILTERS: Array<{ value: GalleryFilter; label: string; icon: LucideIcon }> = [
  { value: 'ALL', label: 'All', icon: Camera },
  { value: 'IMAGE', label: 'Photos', icon: ImageIcon },
  { value: 'VIDEO', label: 'Videos', icon: Film },
];

export function CustomerGalleryPage() {
  const navigate = useNavigate();
  const [company, setCompany] = useState<WebsiteContent['company'] | null>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [filter, setFilter] = useState<GalleryFilter>('ALL');
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;

    void customerPortalService
      .websiteContent()
      .then((content) => {
        if (!active) return;
        setCompany(content.company);
        setItems(content.gallery);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(
    () => items.filter((item) => filter === 'ALL' || item.type === filter),
    [filter, items],
  );
  const photoCount = items.filter((item) => item.type === 'IMAGE').length;
  const videoCount = items.filter((item) => item.type === 'VIDEO').length;

  useEffect(() => {
    if (!selected) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected(null);
      } else if (event.key === 'ArrowRight') {
        setSelected((current) => adjacentItem(visibleItems, current, 1));
      } else if (event.key === 'ArrowLeft') {
        setSelected((current) => adjacentItem(visibleItems, current, -1));
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [selected, visibleItems]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900">
      <header className="bg-[#080C14] border-b border-[#D4AF37]/30 px-4 py-4 text-white shadow-xl md:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Back to customer portal"
              onClick={() => navigate('/customer/portal')}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-500/20 bg-white/5 text-slate-300 transition-all hover:border-[#D4AF37] hover:text-[#F3CA52]"
            >
              <ArrowLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Go to home page"
              className="flex min-w-0 items-center gap-3 rounded-xl p-1 text-left transition-colors hover:bg-white/5"
            >
              <div className="h-11 w-11 shrink-0 rounded-xl p-[1.5px] bg-gradient-to-tr from-amber-600 via-[#F3CA52] to-amber-500 shadow-sm flex items-center justify-center overflow-hidden">
                <div className="w-full h-full rounded-[10px] bg-white p-0.5 flex items-center justify-center overflow-hidden">
                  <img
                    src={company?.logoUrl ? toMediaUrl(company.logoUrl) : '/assets/img/Thankam_Logo.png'}
                    alt={company?.name ?? 'Thankam Events'}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-[#F3CA52]">
                  {company?.name ?? 'Thankam Events'}
                </p>
                <h1 className="text-lg font-black leading-tight text-white font-serif">Event Gallery</h1>
              </div>
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate('/customer/portal')}
            className="hidden h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3CA52] hover:brightness-110 px-4 text-xs font-bold text-slate-950 shadow-md transition-all sm:inline-flex"
          >
            <UtensilsCrossed size={14} />
            Plan Feast &amp; Event
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-6 md:px-6">
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0c121e] to-[#080C14] border border-amber-500/30 px-6 py-8 text-white shadow-2xl md:px-10 md:py-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#F3CA52]">
                Our Celebrations
              </p>
              <h2 className="text-3xl font-black tracking-tight font-serif text-white md:text-4xl">
                Event Photography &amp; Video Reels
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Explore magnificent banquets, royal stage decor, and authentic traditional Kerala Sadhyas crafted by {company?.name ?? 'Thankam Events'}.
              </p>
            </div>
            <div className="flex gap-3 text-center">
              <CountCard
                value={photoCount}
                label="Photos"
                active={filter === 'IMAGE'}
                onClick={() => {
                  setFilter('IMAGE');
                  setSelected(null);
                }}
              />
              <CountCard
                value={videoCount}
                label="Videos"
                active={filter === 'VIDEO'}
                onClick={() => {
                  setFilter('VIDEO');
                  setSelected(null);
                }}
              />
            </div>
          </div>
        </section>

        <div className="sticky top-0 z-20 mt-6 border-b border-amber-900/10 bg-[#FAF9F6]/95 py-3 backdrop-blur-sm">
          <div className="flex gap-2 overflow-x-auto">
            {FILTERS.map(({ value, label, icon: Icon }) => {
              const active = filter === value;
              const count = value === 'ALL' ? items.length : value === 'IMAGE' ? photoCount : videoCount;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setFilter(value);
                    setSelected(null);
                  }}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-xs font-bold transition-all ${
                    active
                      ? 'border-[#080C14] bg-[#080C14] text-[#F3CA52] shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-[#D4AF37] hover:text-[#B8860B]'
                  }`}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-amber-500/20 text-[#F3CA52]' : 'bg-slate-100 text-slate-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : loadFailed ? (
          <EmptyGallery
            icon={<Camera size={31} />}
            title="Gallery could not be loaded"
            description="Please refresh the page to try again."
          />
        ) : visibleItems.length === 0 ? (
          <EmptyGallery
            icon={filter === 'VIDEO' ? <Film size={31} /> : <ImageIcon size={31} />}
            title={items.length === 0 ? 'Gallery coming soon' : `No ${filter.toLowerCase()} items yet`}
            description={
              items.length === 0
                ? 'Published event moments will appear here.'
                : 'Try another filter to see available moments.'
            }
          />
        ) : (
          <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                aria-haspopup="dialog"
                aria-label={`View ${item.type === 'VIDEO' ? 'video' : 'photo'}${item.title ? `: ${item.title}` : ''}`}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-900 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
              >
                {item.type === 'VIDEO' ? (
                  item.thumbnailUrl ? (
                    <img
                      src={toMediaUrl(item.thumbnailUrl)}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <video
                      src={toMediaUrl(item.url)}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )
                ) : (
                  <img
                    src={toMediaUrl(item.thumbnailUrl ?? item.url)}
                    alt={item.title ?? 'Event gallery photo'}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080C14]/80 via-transparent to-transparent" />
                {item.type === 'VIDEO' ? (
                  <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-950 shadow-xl transition-transform group-hover:scale-110">
                    <PlayCircle size={25} />
                  </span>
                ) : null}
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                    {item.type === 'VIDEO' ? <Film size={11} /> : <ImageIcon size={11} />}
                    {item.type === 'VIDEO' ? 'Video' : 'Photo'}
                  </span>
                  {item.title ? (
                    <p className="mt-2 truncate text-sm font-semibold text-white">{item.title}</p>
                  ) : null}
                </div>
              </button>
            ))}
          </section>
        )}
      </main>

      {selected ? (
        <GalleryViewer
          item={selected}
          hasMultiple={visibleItems.length > 1}
          onClose={() => setSelected(null)}
          onPrevious={() => setSelected((current) => adjacentItem(visibleItems, current, -1))}
          onNext={() => setSelected((current) => adjacentItem(visibleItems, current, 1))}
        />
      ) : null}
    </div>
  );
}

function CountCard({
  value,
  label,
  active,
  onClick,
}: {
  value: number;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-w-[76px] rounded-2xl border px-4 py-3 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
        active
          ? 'border-amber-300 bg-amber-300/15'
          : 'border-white/10 bg-white/10 hover:border-amber-300/55 hover:bg-white/15'
      }`}
    >
      <p className="text-2xl font-black text-amber-300">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">{label}</p>
    </button>
  );
}

function EmptyGallery({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-5 rounded-3xl border border-dashed border-[#E4D9C7] bg-white px-6 py-16 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#FDF3D0] text-[#B8860B]">
        {icon}
      </div>
      <p className="font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function GalleryViewer({
  item,
  hasMultiple,
  onClose,
  onPrevious,
  onNext,
}: {
  item: GalleryItem;
  hasMultiple: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 px-3 py-5 backdrop-blur-md md:px-16"
      role="dialog"
      aria-modal="true"
      aria-label={item.title ?? 'Gallery media viewer'}
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close media viewer"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X size={21} />
      </button>
      {hasMultiple ? (
        <>
          <button
            type="button"
            aria-label="Previous media"
            onClick={(event) => {
              event.stopPropagation();
              onPrevious();
            }}
            className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:left-6"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            aria-label="Next media"
            onClick={(event) => {
              event.stopPropagation();
              onNext();
            }}
            className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:right-6"
          >
            <ChevronRight size={22} />
          </button>
        </>
      ) : null}
      <div
        className="flex max-h-full max-w-5xl flex-col items-center gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        {item.type === 'VIDEO' ? (
          <video
            key={item.id}
            src={toMediaUrl(item.url)}
            poster={item.thumbnailUrl ? toMediaUrl(item.thumbnailUrl) : undefined}
            controls
            autoPlay
            playsInline
            className="max-h-[78vh] max-w-full rounded-2xl bg-black shadow-2xl"
          />
        ) : (
          <img
            src={toMediaUrl(item.url)}
            alt={item.title ?? 'Event gallery photo'}
            className="max-h-[78vh] max-w-full rounded-2xl object-contain shadow-2xl"
          />
        )}
        {item.title || item.description ? (
          <div className="max-w-xl text-center text-white">
            {item.title ? <p className="font-bold">{item.title}</p> : null}
            {item.description ? <p className="mt-1 text-sm text-white/65">{item.description}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function adjacentItem(items: GalleryItem[], selected: GalleryItem | null, offset: number) {
  if (!selected || items.length === 0) return selected;
  const currentIndex = items.findIndex((item) => item.id === selected.id);
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + offset + items.length) % items.length;
  return items[nextIndex];
}

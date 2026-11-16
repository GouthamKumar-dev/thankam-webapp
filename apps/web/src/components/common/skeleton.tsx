import { cn } from '@/utils/cn';

/* ─── Base Shimmering Primitive ───────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-slate-200/80',
        className,
      )}
    />
  );
}

/* ─── Table Skeleton (Header + Row Data Skeletons) ────────────── */
export function TableSkeleton({
  rows = 6,
  cols = 6,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs', className)}>
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5 flex items-center justify-between gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn('h-3.5', i === 0 ? 'w-24' : i === 1 ? 'w-40' : 'w-20')}
          />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="px-5 py-4 flex items-center justify-between gap-4">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div key={cIdx} className="flex items-center gap-2.5">
                {cIdx === 1 && <Skeleton className="h-9 w-9 rounded-xl shrink-0" />}
                <Skeleton
                  className={cn(
                    'h-4',
                    cIdx === 0
                      ? 'w-24 font-mono'
                      : cIdx === 1
                      ? 'w-32'
                      : cIdx === cols - 1
                      ? 'h-8 w-28 rounded-xl'
                      : 'w-16',
                  )}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Card List Skeleton (Tablet & Mobile Stacked Views) ──────── */
export function CardListSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28 rounded-lg" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-28 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── KPI Metric Cards Grid Skeleton ──────────────────────────── */
export function KpiGridSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2.5 sm:gap-4',
        count === 4 ? 'lg:grid-cols-4' : count === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4',
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-2xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-7 rounded-xl" />
          </div>
          <Skeleton className="h-6 sm:h-8 w-28 sm:w-36" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/* ─── Grid Cards Skeleton (Menus, Dishes, Media Showcase) ─────── */
export function CardGridSkeleton({
  count = 6,
  columns = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  className,
}: {
  count?: number;
  columns?: string;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4 sm:gap-6', columns, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Calendar & Agenda Hub Skeleton ──────────────────────────── */
export function CalendarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xs space-y-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-44 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-2 text-center">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-48" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-20 w-full rounded-xl bg-white" />
            <Skeleton className="h-20 w-full rounded-xl bg-white" />
            <Skeleton className="h-20 w-full rounded-xl bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Premium Thankam Page Loader ─────────────────────────────── */
export function PageLoader({
  message = 'Loading Thankam Events...',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[380px] w-full flex-col items-center justify-center p-8',
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-amber-400 via-[#F3CA52] to-amber-600 opacity-20 blur-md animate-pulse" />
        <div className="h-14 w-14 rounded-full border-[3px] border-amber-200/60 border-t-[#D4AF37] animate-spin" />
        <div className="absolute grid h-8 w-8 place-items-center rounded-full bg-white shadow-2xs">
          <span className="font-serif font-black text-amber-800 text-sm">T</span>
        </div>
      </div>
      <p className="mt-4 font-serif text-xs font-bold uppercase tracking-widest text-slate-700">
        {message}
      </p>
      <p className="mt-1 text-[11px] text-slate-400 font-medium">
        Celebrations Crafted &bull; Central Kitchen Kollam
      </p>
    </div>
  );
}

/* ─── Form / Settings Page Skeleton ───────────────────────────── */
export function FormSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs space-y-6', className)}>
      <div className="space-y-2 border-b border-slate-100 pb-5">
        <Skeleton className="h-6 w-48 rounded-lg" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
      <div className="flex justify-end pt-4 border-t border-slate-100">
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
    </div>
  );
}

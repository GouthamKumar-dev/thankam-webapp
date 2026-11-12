import { ReactNode } from 'react';

export function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-white px-4 sm:px-6 py-3.5 sm:py-4 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight text-slate-800">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs font-medium text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

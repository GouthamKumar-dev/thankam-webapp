import { ReactNode } from 'react';

export function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-5 shadow-[0_8px_28px_rgba(15,23,42,0.05)] backdrop-blur">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

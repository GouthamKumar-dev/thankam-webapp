import { ReactNode } from 'react';
import { Card } from '../ui/card';

export function StatCard({ title, value, icon }: { title: string; value: string | number; icon?: ReactNode }) {
  return (
    <Card className="flex items-center justify-between bg-gradient-to-b from-white to-slate-50/50">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
      </div>
      <div className="rounded-xl border border-border bg-white p-2.5 text-primary shadow-sm">{icon}</div>
    </Card>
  );
}

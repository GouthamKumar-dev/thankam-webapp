import { cn } from '@/utils/cn';
import { ReactNode } from 'react';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

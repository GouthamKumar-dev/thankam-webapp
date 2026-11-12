import * as React from 'react';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-slate-900 text-white shadow-xs hover:bg-black hover:ring-1 hover:ring-[#B8860B] active:scale-[0.99] transition-all',
  outline: 'border border-border bg-white/95 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300',
  ghost: 'hover:bg-muted text-slate-700 hover:text-slate-900',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

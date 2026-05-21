import * as React from 'react';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-[0_10px_25px_rgba(13,148,136,0.3)] hover:brightness-110',
  outline: 'border border-border bg-white/95 hover:bg-white',
  ghost: 'hover:bg-muted',
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

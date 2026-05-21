import { cn } from '@/utils/cn';

export function Badge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700',
        className,
      )}
    >
      {label}
    </span>
  );
}

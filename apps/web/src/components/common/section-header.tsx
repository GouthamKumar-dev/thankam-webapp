import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
};

export function SectionHeader({ title, subtitle, actionLabel, onAction, actionIcon }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-xl font-bold tracking-tight">{title}</h3>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>

      {actionLabel && onAction ? (
        <Button onClick={onAction}>
          {actionIcon}
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

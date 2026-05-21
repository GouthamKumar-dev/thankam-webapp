import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type FormDialogProps = {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  contentClassName?: string;
  bodyClassName?: string;
};

export function FormDialog({
  title,
  description,
  open,
  onOpenChange,
  children,
  contentClassName,
  bodyClassName,
}: FormDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_60px_rgba(15,23,42,0.24)]',
            contentClassName,
          )}
        >
          <div className="sticky top-0 z-10 border-b border-border bg-white/95 px-5 py-4 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="text-xl font-bold tracking-tight">
                  {title}
                </Dialog.Title>
                {description ? (
                  <Dialog.Description className="mt-1 text-sm text-slate-500">
                    {description}
                  </Dialog.Description>
                ) : null}
              </div>
              <Dialog.Close className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                <X size={16} />
              </Dialog.Close>
            </div>
          </div>
          <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', bodyClassName)}>
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type FormDialogFooterProps = {
  children: ReactNode;
  className?: string;
};

export function FormDialogFooter({ children, className }: FormDialogFooterProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-20 -mx-5 mt-4 border-t border-slate-200 bg-white px-5 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.08)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

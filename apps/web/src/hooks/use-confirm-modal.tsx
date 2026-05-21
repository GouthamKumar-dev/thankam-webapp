import { useCallback, useRef, useState } from 'react';
import { FormDialog, FormDialogFooter } from '@/components/common/form-dialog';
import { Button } from '@/components/ui/button';

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmState = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
};

const initialState: ConfirmState = {
  open: false,
  title: '',
  description: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  destructive: false,
};

export function useConfirmModal() {
  const [state, setState] = useState<ConfirmState>(initialState);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((result: boolean) => {
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({
        open: true,
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        destructive: options.destructive ?? false,
      });
    });
  }, []);

  const confirmModal = (
    <FormDialog
      title={state.title || 'Please Confirm'}
      description={state.description}
      open={state.open}
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
      contentClassName="max-w-md"
    >
      <FormDialogFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => close(false)}>
          {state.cancelLabel}
        </Button>
        <Button
          variant={state.destructive ? 'danger' : undefined}
          onClick={() => close(true)}
        >
          {state.confirmLabel}
        </Button>
      </FormDialogFooter>
    </FormDialog>
  );

  return { confirm, confirmModal };
}

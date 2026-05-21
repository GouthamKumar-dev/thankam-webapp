import { TriangleAlert } from 'lucide-react';
import { Button } from '../ui/button';

type ConfirmDialogProps = {
  title: string;
  description: string;
  onConfirm: () => void;
};

export function ConfirmDialog({ title, description, onConfirm }: ConfirmDialogProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-amber-800">
        <TriangleAlert size={18} />
        <p className="font-semibold">{title}</p>
      </div>
      <p className="mb-3 text-sm text-amber-700">{description}</p>
      <Button variant="danger" onClick={onConfirm}>
        Confirm
      </Button>
    </div>
  );
}

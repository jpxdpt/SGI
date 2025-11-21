import { AlertTriangle, X } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning',
  isLoading = false,
}: ConfirmDialogProps) => {
  if (!open) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal title="" open={open} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-full ${
              variant === 'danger'
                ? 'bg-rose-100 dark:bg-rose-900/30'
                : variant === 'warning'
                  ? 'bg-amber-100 dark:bg-amber-900/30'
                  : 'bg-blue-100 dark:bg-blue-900/30'
            }`}
          >
            <AlertTriangle
              className={`h-6 w-6 ${
                variant === 'danger'
                  ? 'text-rose-600 dark:text-rose-400'
                  : variant === 'warning'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-blue-600 dark:text-blue-400'
              }`}
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};






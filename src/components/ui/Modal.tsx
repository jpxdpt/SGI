import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const Modal = ({ title, open, onClose, children }: ModalProps) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-2xl transition-all duration-200">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-brand-500">Formulário</p>
            <h3 className="text-xl font-semibold">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
};


import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'large' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md sm:max-w-lg md:max-w-2xl',
  lg: 'max-w-2xl sm:max-w-3xl md:max-w-4xl',
  large: 'max-w-4xl sm:max-w-5xl md:max-w-6xl',
  xl: 'max-w-6xl sm:max-w-7xl',
};

export const Modal = ({ title, open, onClose, children, size = 'md' }: ModalProps) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (open) {
      // Prevenir scroll do body quando o modal está aberto
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const modalContent = (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-fade-in"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div 
        className={`bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl sm:rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto flex flex-col transition-all duration-200 animate-scale-in focus:outline-none`}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[var(--color-border)] shrink-0">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-brand-500">Formulário</p>
            <h3 id="modal-title" className="text-lg sm:text-xl font-semibold">{title}</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};


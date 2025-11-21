import clsx from 'clsx';
import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export const Card = ({
  title,
  description,
  actions,
  className,
  children,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: CardProps) => (
  <section
    className={clsx(
      'bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl sm:rounded-2xl shadow-card p-4 sm:p-6 flex flex-col gap-3 sm:gap-4',
      'transition-all duration-200 hover:border-brand-500/60 hover:shadow-lg/60',
      'w-full min-w-0 animate-fade-in',
      draggable && 'cursor-move',
      className,
    )}
    draggable={draggable}
    onDragStart={onDragStart}
    onDragOver={(e) => {
      if (draggable) {
        e.preventDefault();
        onDragOver?.(e);
      }
    }}
    onDrop={(e) => {
      if (draggable) {
        e.preventDefault();
        onDrop?.(e);
      }
    }}
  >
    {(title || description || actions) && (
      <header className="flex items-start justify-between gap-4">
        <div>
          {title && <h3 className="font-semibold text-lg">{title}</h3>}
          {description && <p className="text-sm text-slate-500 dark:text-slate-300">{description}</p>}
        </div>
        {actions}
      </header>
    )}
    {children}
  </section>
);


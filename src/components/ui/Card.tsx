import clsx from 'clsx';
import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export const Card = ({ title, description, actions, className, children }: CardProps) => (
  <section
    className={clsx(
      'bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-card p-6 flex flex-col gap-4',
      className,
    )}
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


import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export const PageHeader = ({ title, subtitle, actions }: PageHeaderProps) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 min-w-0 animate-fade-in">
    <div className="min-w-0 flex-1">
      <p className="text-xs uppercase tracking-[0.3em] text-brand-500">SGI</p>
      <h2 className="font-display text-xl sm:text-2xl md:text-3xl truncate">{title}</h2>
      {subtitle && <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">{actions}</div>}
  </div>
);

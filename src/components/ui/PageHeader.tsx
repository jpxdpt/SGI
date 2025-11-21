import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export const PageHeader = ({ title, subtitle, actions }: PageHeaderProps) => (
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-brand-500">SGI</p>
      <h2 className="font-display text-2xl">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 dark:text-slate-300">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </div>
);



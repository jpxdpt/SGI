import clsx from 'clsx';

const variants: Record<string, string> = {
  default: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
  info: 'bg-brand-500/15 text-brand-600 dark:text-brand-200',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-200',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-200',
  danger: 'bg-rose-500/15 text-rose-600 dark:text-rose-200',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof variants;
}

export const Badge = ({ children, variant = 'default' }: BadgeProps) => (
  <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', variants[variant])}>
    {children}
  </span>
);



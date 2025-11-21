import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import { Card } from './Card';

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  iconBgColor?: string;
  description?: string;
  className?: string;
}

export const KpiCard = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconBgColor = 'bg-brand-500',
  description = 'Analytics for last week',
  className,
}: KpiCardProps) => {
  const hasPositiveChange = change !== undefined && change >= 0;
  const changeColor = hasPositiveChange ? 'text-green-500' : 'text-rose-500';
  const ChangeIcon = hasPositiveChange ? TrendingUp : TrendingDown;

  return (
    <Card className={clsx('relative overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            {title}
          </p>
          <div className="flex items-baseline gap-2 mb-1">
            <p className="text-3xl font-bold text-[var(--color-foreground)]">{value}</p>
            {change !== undefined && (
              <div className={clsx('flex items-center gap-1 text-sm font-medium', changeColor)}>
                <ChangeIcon className="h-3 w-3" />
                <span>{Math.abs(change)}%</span>
              </div>
            )}
          </div>
          {changeLabel && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{changeLabel}</p>
          )}
          {!changeLabel && description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
          )}
        </div>
        {icon && (
          <div
            className={clsx(
              'h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
              iconBgColor,
              'opacity-90',
            )}
          >
            <div className="text-white">{icon}</div>
          </div>
        )}
      </div>
    </Card>
  );
};


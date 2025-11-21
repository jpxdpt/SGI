import clsx from 'clsx';

interface KPICardProps {
  label: string;
  value: number | string;
  delta?: string;
  detail?: string;
  accent?: 'primary' | 'secondary';
}

export const KPICard = ({ label, value, delta, detail, accent = 'primary' }: KPICardProps) => {
  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm',
        'dark:border-slate-700/80 dark:bg-slate-900',
      )}
    >
      <p className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
        {value}
        {delta && (
          <span
            className={clsx(
              'ml-3 rounded-full px-2 py-1 text-xs font-semibold',
              accent === 'primary'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
            )}
          >
            {delta}
          </span>
        )}
      </p>
      {detail && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
  );
};

import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface TableColumn<T> {
  key: keyof T | string;
  title: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  emptyState?: string;
}

export const Table = <T,>({ columns, data, emptyState = 'Sem registos' }: TableProps<T>) => (
  <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] w-full animate-fade-in">
    <table className="w-full text-xs sm:text-sm border-collapse" role="table" aria-label="Tabela de dados">
      <thead className="bg-slate-50/80 dark:bg-slate-900/40">
        <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-500">
          {columns.map((column) => (
            <th 
              key={String(column.key)} 
              scope="col"
              className={clsx('px-2 sm:px-4 py-2 sm:py-3 font-semibold', column.className)}
            >
              {column.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500" role="status" aria-live="polite">
              {emptyState}
            </td>
          </tr>
        ) : (
          data.map((row, index) => (
            <tr
              key={index}
              className={clsx(
                'border-t border-[var(--color-border)] transition-all duration-200',
                index % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/40 dark:bg-slate-900/20',
                'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:shadow-sm',
                'animate-fade-in',
              )}
              style={{ animationDelay: `${index * 20}ms` }}
            >
              {columns.map((column) => (
                <td key={String(column.key)} className={clsx('px-2 sm:px-4 py-2 sm:py-3 transition-colors', column.className)}>
                  {column.render ? column.render(row) : (row as never)[column.key as keyof T]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);



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
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
          {columns.map((column) => (
            <th key={String(column.key)} className={clsx('px-4 py-3', column.className)}>
              {column.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-4 py-6 text-center text-slate-500">
              {emptyState}
            </td>
          </tr>
        ) : (
          data.map((row, index) => (
            <tr key={index} className="border-t border-[var(--color-border)]">
              {columns.map((column) => (
                <td key={String(column.key)} className={clsx('px-4 py-3', column.className)}>
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



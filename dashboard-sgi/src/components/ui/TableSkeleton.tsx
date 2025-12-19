import { Skeleton } from './Skeleton';

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export const TableSkeleton = ({ columns, rows = 5 }: TableSkeletonProps) => (
  <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] w-full animate-fade-in">
    <table className="w-full text-sm border-collapse">
      <thead className="bg-slate-50/80 dark:bg-slate-900/40">
        <tr>
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i} className="px-4 py-3">
              <Skeleton className="h-4 w-20" variant="text" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex} className="border-t border-[var(--color-border)]">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <td key={colIndex} className="px-4 py-3">
                <Skeleton
                  className={colIndex === 0 ? 'h-4 w-24' : colIndex === columns - 1 ? 'h-6 w-20' : 'h-4 w-full'}
                  variant="text"
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);












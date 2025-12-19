import type { ReactNode } from 'react';
import clsx from 'clsx';

interface BaseSelectProps {
  error?: string;
  label?: string;
  helperText?: string;
  options?: { value: string; label: string }[];
}

export const Select = ({
  error,
  label,
  helperText,
  className,
  id,
  children,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & BaseSelectProps) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-[var(--color-foreground)]">
          {label}
          {props.required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={clsx(
          'w-full px-4 py-2 border rounded-lg bg-[var(--color-bg)] text-[var(--color-foreground)]',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error
            ? 'border-rose-500 focus:ring-rose-500'
            : 'border-[var(--color-border)] hover:border-brand-500/50',
          className,
        )}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
        {...props}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="text-sm text-rose-500" role="alert" aria-live="polite">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${selectId}-helper`} className="text-sm text-slate-600 dark:text-slate-300">
          {helperText}
        </p>
      )}
    </div>
  );
};










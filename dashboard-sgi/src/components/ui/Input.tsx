import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

interface BaseInputProps {
  error?: string;
  label?: string;
  helperText?: string;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, BaseInputProps {}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, BaseInputProps {}

export const Input = ({ error, label, helperText, className, id, ...props }: InputProps) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-foreground)]">
          {label}
          {props.required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
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
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-rose-500" role="alert" aria-live="polite">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="text-sm text-slate-600 dark:text-slate-300">
          {helperText}
        </p>
      )}
    </div>
  );
};

export const Textarea = ({ error, label, helperText, className, id, ...props }: TextareaProps) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-[var(--color-foreground)]">
          {label}
          {props.required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        className={clsx(
          'w-full px-4 py-2 border rounded-lg bg-[var(--color-bg)] text-[var(--color-foreground)]',
          'transition-colors duration-200 resize-y',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error
            ? 'border-rose-500 focus:ring-rose-500'
            : 'border-[var(--color-border)] hover:border-brand-500/50',
          className,
        )}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
        {...props}
      />
      {error && (
        <p id={`${textareaId}-error`} className="text-sm text-rose-500" role="alert" aria-live="polite">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${textareaId}-helper`} className="text-sm text-slate-600 dark:text-slate-300">
          {helperText}
        </p>
      )}
    </div>
  );
};

// Select removido pois agora tem seu próprio arquivo em Select.tsx


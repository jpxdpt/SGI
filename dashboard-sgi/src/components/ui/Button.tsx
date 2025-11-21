import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: ReactNode;
  icon?: ReactNode;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  icon,
  ...props
}: ButtonProps) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
  
  const variants = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm hover:shadow-md',
    secondary: 'border border-[var(--color-border)] bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700 shadow-sm hover:shadow-md',
    ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800',
    outline: 'border border-[var(--color-border)] bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800',
  };

  const sizes = {
    sm: 'px-2 sm:px-3 py-1 sm:py-1.5 text-xs',
    md: 'px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm',
    lg: 'px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base',
  };

  return (
    <button
      className={clsx(
        baseStyles, 
        variants[variant], 
        sizes[size],
        'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
        className
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span className="sr-only">A carregar...</span>
        </>
      )}
      {icon && !isLoading && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};


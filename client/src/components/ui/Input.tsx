import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, iconLeft, iconRight, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-[13px] font-medium text-text-secondary">
            {label}
            {required && <span className="text-danger-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {iconLeft && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary [&>svg]:size-4">
              {iconLeft}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full h-[38px] px-3 py-2 bg-white border rounded-[var(--radius-sm)] text-[14px] text-text-primary placeholder:text-text-tertiary',
              'outline-none transition-all duration-150 ease-in-out',
              'focus:border-primary-500 focus:ring-3 focus:ring-primary-100',
              'disabled:bg-surface-sunken disabled:opacity-60 disabled:cursor-not-allowed',
              error
                ? 'border-danger-500 focus:ring-danger-100'
                : 'border-border',
              iconLeft && 'pl-9',
              iconRight && 'pr-9',
              className,
            )}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary [&>svg]:size-4">
              {iconRight}
            </span>
          )}
        </div>
        {error && (
          <p className="text-[11px] text-danger-600 flex items-center gap-1">
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-[11px] text-text-tertiary">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white shadow-xs hover:bg-primary-700 hover:shadow-sm active:bg-primary-800 active:scale-[0.99] focus-visible:ring-3 focus-visible:ring-primary-200',
  secondary:
    'bg-white border border-border-strong text-text-primary hover:bg-surface-sunken focus-visible:ring-3 focus-visible:ring-primary-100',
  ghost:
    'bg-transparent text-text-secondary hover:bg-surface-sunken hover:text-text-primary',
  danger:
    'bg-danger-600 text-white shadow-xs hover:bg-danger-700 hover:shadow-sm active:scale-[0.99] focus-visible:ring-3 focus-visible:ring-danger-100',
  'danger-ghost':
    'bg-transparent text-danger-600 hover:bg-danger-50',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-[7px] text-[11px]',
  md: 'px-[18px] py-[10px] text-[13px]',
  lg: 'px-[22px] py-3 text-[15px]',
  icon: 'p-[10px]',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-sm)] transition-all duration-150 ease-in-out outline-none cursor-pointer',
          'disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : icon ? (
          <span className="shrink-0 [&>svg]:size-4">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;

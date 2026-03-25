import { clsx } from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeStyles = {
  sm: 'w-4 h-4 border-[1.5px]',
  md: 'w-5 h-5 border-2',
  lg: 'w-8 h-8 border-[2.5px]',
};

export default function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <div className={clsx('flex items-center justify-center gap-3', className)}>
      <div
        className={clsx(
          'rounded-full border-border border-t-primary-500 animate-spin',
          sizeStyles[size],
        )}
      />
      {label && <span className="text-[13px] text-text-secondary">{label}</span>}
    </div>
  );
}

export function PageSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size="lg" label={label} />
    </div>
  );
}

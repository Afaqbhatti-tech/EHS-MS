import { clsx } from 'clsx';
import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-700',
  info: 'bg-info-50 text-info-600',
  neutral: 'bg-[#F3F4F6] text-[#6B7280]',
  primary: 'bg-primary-50 text-primary-700',
};

const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
  neutral: 'bg-[#9CA3AF]',
  primary: 'bg-primary-500',
};

// Map status strings to badge variants
const STATUS_MAP: Record<string, BadgeVariant> = {
  // Success states
  Approved: 'success', Active: 'success', Valid: 'success', Compliant: 'success',
  Verified: 'success', Closed: 'neutral', Completed: 'success',
  // Warning states
  Pending: 'warning', Draft: 'warning', 'In Progress': 'warning',
  'In Review': 'warning', 'Under Review': 'warning',
  // Danger states
  Expired: 'danger', Rejected: 'danger', Critical: 'danger',
  Overdue: 'danger', Suspended: 'danger', Cancelled: 'danger',
  // Info states
  Open: 'info', Submitted: 'info', New: 'info',
  // Neutral
  Inactive: 'neutral', 'N/A': 'neutral', Superseded: 'neutral',
};

export function statusVariant(status: string): BadgeVariant {
  return STATUS_MAP[status] || 'neutral';
}

export default function Badge({ variant = 'neutral', children, dot, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-medium leading-tight',
        variantStyles[variant],
        className,
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotStyles[variant])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, dot = true }: { status: string; dot?: boolean }) {
  return (
    <Badge variant={statusVariant(status)} dot={dot}>
      {status}
    </Badge>
  );
}

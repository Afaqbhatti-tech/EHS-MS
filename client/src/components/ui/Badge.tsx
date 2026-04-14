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
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-800',
  primary: 'bg-indigo-100 text-indigo-800',
};

const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-gray-500',
  primary: 'bg-indigo-500',
};

// Map status strings to badge variants
const STATUS_MAP: Record<string, BadgeVariant> = {
  // Success states
  Approved: 'success', Active: 'success', Valid: 'success', Compliant: 'success',
  Verified: 'success', Closed: 'neutral', Completed: 'success', Resolved: 'success',
  Implemented: 'success', Conducted: 'success', Received: 'success',
  'Partially Compliant': 'warning', 'Comments Resolved': 'success',
  // Warning states
  Pending: 'warning', Draft: 'warning', 'In Progress': 'warning',
  'In Review': 'warning', 'Under Review': 'warning', 'In Transit': 'warning',
  Planned: 'warning', Prepared: 'warning', 'Ready for Dispatch': 'warning',
  'Approved with Comments': 'warning', 'Action Assigned': 'warning',
  Assigned: 'warning', Acknowledged: 'warning',
  'Expiring Soon': 'warning', 'Due Soon': 'warning',
  // Danger states
  Expired: 'danger', Rejected: 'danger', Critical: 'danger',
  Overdue: 'danger', Suspended: 'danger', Cancelled: 'danger',
  Reopened: 'danger', Escalated: 'danger', Blacklisted: 'danger',
  'Non-Compliant': 'danger', 'Not Effective': 'danger',
  // Info states
  Open: 'info', Submitted: 'info', New: 'info', Dispatched: 'info',
  'Submitted for Review': 'info', 'Re-submitted': 'info',
  'Under Investigation': 'info', Reported: 'info',
  // Primary states
  Investigating: 'primary',
  // Neutral
  Inactive: 'neutral', 'N/A': 'neutral', Superseded: 'neutral',
  Obsolete: 'neutral', Archived: 'neutral',
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

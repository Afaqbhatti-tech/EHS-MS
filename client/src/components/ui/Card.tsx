import { clsx } from 'clsx';
import type { ReactNode, HTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export default function Card({ children, hover, padding = 'lg', className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-surface border border-border rounded-[var(--radius-lg)] shadow-sm',
        hover && 'cursor-pointer hover:shadow-md hover:border-border-strong transition-all duration-150',
        paddingStyles[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────

type StatColor = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const iconBgStyles: Record<StatColor, string> = {
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-600',
  info: 'bg-info-50 text-info-600',
  neutral: 'bg-[#F3F4F6] text-[#6B7280]',
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: StatColor;
  trend?: { value: string; up: boolean };
  subtext?: string;
}

export function StatCard({ icon: Icon, label, value, color = 'primary', trend, subtext }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconBgStyles[color])}>
          <Icon size={20} />
        </div>
        {trend && (
          <span
            className={clsx(
              'inline-flex items-center text-[11px] font-medium rounded-full px-2 py-0.5',
              trend.up ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700',
            )}
          >
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-[24px] sm:text-[30px] leading-[30px] sm:leading-[38px] font-bold text-text-primary tracking-tight">{value}</p>
        <p className="text-[12px] sm:text-[13px] font-medium text-text-secondary mt-1">{label}</p>
        {subtext && <p className="text-[11px] text-text-tertiary mt-0.5">{subtext}</p>}
      </div>
    </Card>
  );
}

// ─── Section Card ──────────────────────────────────

interface SectionCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, action, children, className }: SectionCardProps) {
  return (
    <Card padding="none" className={className}>
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border gap-2">
        <h3 className="text-[14px] sm:text-[15px] font-semibold text-text-primary truncate">{title}</h3>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </Card>
  );
}

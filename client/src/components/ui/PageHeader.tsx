import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}

export default function PageHeader({ title, subtitle, icon, actions, breadcrumb }: PageHeaderProps) {
  return (
    <div className="pb-6 mb-6 border-b border-border">
      {breadcrumb && <div className="mb-2 text-[11px] text-text-tertiary">{breadcrumb}</div>}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {icon && <span className="text-primary-600 shrink-0 [&>svg]:size-6">{icon}</span>}
          <div className="min-w-0">
            <h1 className="text-[24px] leading-[32px] font-bold text-text-primary tracking-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[13px] text-text-secondary mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

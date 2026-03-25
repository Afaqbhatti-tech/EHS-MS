import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-sunken flex items-center justify-center mb-4">
        <Icon size={28} className="text-border-strong" />
      </div>
      <h3 className="text-[15px] font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="text-[13px] text-text-tertiary mt-1.5 max-w-[320px]">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}

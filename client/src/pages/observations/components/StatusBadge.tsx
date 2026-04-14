const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Open': { bg: 'bg-status-open', text: 'text-status-open-text', border: 'border-status-open-border' },
  'In Progress': { bg: 'bg-status-inprogress', text: 'text-status-inprogress-text', border: 'border-status-inprogress-border' },
  'Closed': { bg: 'bg-status-closed', text: 'text-status-closed-text', border: 'border-status-closed-border' },
  'Verified': { bg: 'bg-status-verified', text: 'text-status-verified-text', border: 'border-status-verified-border' },
  'Overdue': { bg: 'bg-status-overdue', text: 'text-status-overdue-text', border: 'border-status-overdue-border' },
  'Reopened': { bg: 'bg-status-reopened', text: 'text-status-reopened-text', border: 'border-status-reopened-border' },
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Low': { bg: 'bg-info-50', text: 'text-info-600', border: 'border-info-100' },
  'Medium': { bg: 'bg-warning-50', text: 'text-warning-600', border: 'border-warning-100' },
  'High': { bg: 'bg-danger-50', text: 'text-danger-600', border: 'border-danger-100' },
  'Critical': { bg: 'bg-danger-100', text: 'text-danger-700', border: 'border-danger-500' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || { bg: 'bg-surface-sunken', text: 'text-text-secondary', border: 'border-border' };
  return (
    <span className={`inline-flex items-center gap-[5px] px-2.5 py-[3px] rounded-full text-[11px] font-semibold border whitespace-nowrap transition-colors ${s.bg} ${s.text} ${s.border}`}>
      <span className="w-[6px] h-[6px] rounded-full flex-shrink-0 bg-current" />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const s = PRIORITY_STYLES[priority] || { bg: 'bg-surface-sunken', text: 'text-text-secondary', border: 'border-border' };
  return (
    <span className={`inline-flex items-center gap-[5px] px-2.5 py-[3px] rounded-full text-[11px] font-semibold border whitespace-nowrap ${s.bg} ${s.text} ${s.border}`}>
      <span className="w-[6px] h-[6px] rounded-full flex-shrink-0 bg-current" />
      {priority}
    </span>
  );
}

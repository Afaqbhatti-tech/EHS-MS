interface InductionBadgeProps {
  status: 'Done' | 'Not Done' | 'Pending' | string;
}

const INDUCTION_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  Done: { bg: 'var(--color-health-good)', text: 'var(--color-health-good-text)', border: 'var(--color-health-good-border)', label: 'Inducted' },
  'Not Done': { bg: 'var(--color-health-poor)', text: 'var(--color-health-poor-text)', border: 'var(--color-health-poor-border)', label: 'Not Inducted' },
  Pending: { bg: 'var(--color-health-fair)', text: 'var(--color-health-fair-text)', border: 'var(--color-health-fair-border)', label: 'Pending' },
};

export function InductionBadge({ status }: InductionBadgeProps) {
  const s = INDUCTION_STYLES[status] || INDUCTION_STYLES['Not Done'];
  return (
    <span
      className="inline-flex items-center gap-[5px] px-2.5 py-[3px] text-[11px] font-semibold rounded-full border whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
    >
      <span
        className="w-[6px] h-[6px] rounded-full flex-shrink-0"
        style={{ backgroundColor: 'currentColor' }}
      />
      {s.label}
    </span>
  );
}

interface WorkerStatusBadgeProps {
  status: 'Active' | 'Inactive' | 'Demobilised' | 'Suspended' | string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Active:      { bg: 'var(--color-item-active)', text: 'var(--color-item-active-text)', border: 'var(--color-item-active-border)' },
  Inactive:    { bg: 'var(--color-item-inactive)', text: 'var(--color-item-inactive-text)', border: 'var(--color-item-inactive-border)' },
  Demobilised: { bg: 'var(--color-status-closed)', text: 'var(--color-status-closed-text)', border: 'var(--color-status-closed-border)' },
  Suspended:   { bg: 'var(--color-health-quarantined)', text: 'var(--color-health-quarantined-text)', border: 'var(--color-health-quarantined-border)' },
};

export function WorkerStatusBadge({ status }: WorkerStatusBadgeProps) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Inactive;
  return (
    <span
      className="inline-flex items-center gap-[5px] px-2.5 py-[3px] text-[11px] font-semibold rounded-full border whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
    >
      <span
        className="w-[6px] h-[6px] rounded-full flex-shrink-0"
        style={{ backgroundColor: 'currentColor' }}
      />
      {status}
    </span>
  );
}

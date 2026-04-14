interface TrainingStatusBadgeProps {
  status: 'Valid' | 'Expired' | 'Expiring Soon' | 'Pending' | 'Not Required' | string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Valid: { bg: 'var(--color-health-good)', text: 'var(--color-health-good-text)', border: 'var(--color-health-good-border)' },
  Expired: { bg: 'var(--color-health-poor)', text: 'var(--color-health-poor-text)', border: 'var(--color-health-poor-border)' },
  'Expiring Soon': { bg: 'var(--color-health-fair)', text: 'var(--color-health-fair-text)', border: 'var(--color-health-fair-border)' },
  Pending: { bg: 'var(--color-neutral-100)', text: 'var(--color-neutral-600)', border: 'var(--color-neutral-200)' },
  'Not Required': { bg: 'var(--color-neutral-50)', text: 'var(--color-neutral-500)', border: 'var(--color-neutral-200)' },
};

export function TrainingStatusBadge({ status }: TrainingStatusBadgeProps) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Pending;
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

interface TopicBadgeProps {
  label: string;
  color: string | null;
  lightColor: string | null;
}

export function TopicBadge({ label, color, lightColor }: TopicBadgeProps) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border whitespace-nowrap"
      style={{
        backgroundColor: lightColor || '#F3F4F6',
        color: color || '#374151',
        borderColor: color ? `${color}33` : '#D1D5DB',
      }}
    >
      {label}
    </span>
  );
}

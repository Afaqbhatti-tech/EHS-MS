import { getPermitType } from '../config/permitTypes';

export function PermitTypeBadge({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' | 'lg' }) {
  const config = getPermitType(type);
  if (!config) return <span className="text-[11px] text-text-tertiary">{type}</span>;

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-[3px] text-[11px] gap-1.5',
    lg: 'px-3 py-1 text-[12px] gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold border whitespace-nowrap transition-colors ${sizes[size]}`}
      style={{
        backgroundColor: config.lightColor,
        color: config.textColor,
        borderColor: `${config.color}33`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: config.color }}
      />
      {config.abbr} · {config.label}
    </span>
  );
}

export function PermitTypeAbbr({ type }: { type: string }) {
  const config = getPermitType(type);
  if (!config) return null;

  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white"
      style={{ backgroundColor: config.color }}
    >
      {config.abbr}
    </span>
  );
}

const PERMIT_STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Draft:     { bg: 'var(--color-permit-draft)', text: 'var(--color-permit-draft-text)', border: 'var(--color-permit-draft-border)' },
  Active:    { bg: 'var(--color-permit-active)', text: 'var(--color-permit-active-text)', border: 'var(--color-permit-active-border)' },
  Expired:   { bg: 'var(--color-permit-expired)', text: 'var(--color-permit-expired-text)', border: 'var(--color-permit-expired-border)' },
  Closed:    { bg: 'var(--color-permit-closed)', text: 'var(--color-permit-closed-text)', border: 'var(--color-permit-closed-border)' },
  Cancelled: { bg: 'var(--color-permit-cancelled)', text: 'var(--color-permit-cancelled-text)', border: 'var(--color-permit-cancelled-border)' },
};

export function PermitStatusBadge({ status }: { status: string }) {
  const s = PERMIT_STATUS_STYLES[status] || PERMIT_STATUS_STYLES.Draft;
  return (
    <span
      className="inline-flex items-center gap-[5px] px-2.5 py-[3px] rounded-full text-[11px] font-semibold border whitespace-nowrap transition-colors"
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

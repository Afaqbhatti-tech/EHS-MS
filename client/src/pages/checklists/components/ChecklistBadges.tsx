const HEALTH_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Good':           { bg: 'var(--color-health-good)', text: 'var(--color-health-good-text)', border: 'var(--color-health-good-border)' },
  'Fair':           { bg: 'var(--color-health-fair)', text: 'var(--color-health-fair-text)', border: 'var(--color-health-fair-border)' },
  'Poor':           { bg: 'var(--color-health-poor)', text: 'var(--color-health-poor-text)', border: 'var(--color-health-poor-border)' },
  'Out of Service': { bg: 'var(--color-health-poor)', text: 'var(--color-health-poor-text)', border: 'var(--color-health-poor-border)' },
  'Quarantined':    { bg: 'var(--color-health-quarantined)', text: 'var(--color-health-quarantined-text)', border: 'var(--color-health-quarantined-border)' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Active':             { bg: 'var(--color-item-active)', text: 'var(--color-item-active-text)', border: 'var(--color-item-active-border)' },
  'Inactive':           { bg: 'var(--color-item-inactive)', text: 'var(--color-item-inactive-text)', border: 'var(--color-item-inactive-border)' },
  'Out of Service':     { bg: 'var(--color-item-oos)', text: 'var(--color-item-oos-text)', border: 'var(--color-item-oos-border)' },
  'Quarantined':        { bg: 'var(--color-item-quarantined)', text: 'var(--color-item-quarantined-text)', border: 'var(--color-item-quarantined-border)' },
  'Removed from Site':  { bg: 'var(--color-item-removed)', text: 'var(--color-item-removed-text)', border: 'var(--color-item-removed-border)' },
};

const RESULT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Pass':             { bg: 'var(--color-result-pass)', text: 'var(--color-result-pass-text)', border: 'var(--color-result-pass-border)' },
  'Fail':             { bg: 'var(--color-result-fail)', text: 'var(--color-result-fail-text)', border: 'var(--color-result-fail-border)' },
  'Pass with Issues': { bg: 'var(--color-result-issues)', text: 'var(--color-result-issues-text)', border: 'var(--color-result-issues-border)' },
  'Requires Action':  { bg: 'var(--color-result-action)', text: 'var(--color-result-action-text)', border: 'var(--color-result-action-border)' },
};

function DotBadge({ label, styles }: { label: string; styles: { bg: string; text: string; border: string } }) {
  return (
    <span
      className="inline-flex items-center gap-[5px] px-2.5 py-[3px] text-[11px] font-semibold rounded-full border whitespace-nowrap"
      style={{ backgroundColor: styles.bg, color: styles.text, borderColor: styles.border }}
    >
      <span
        className="w-[6px] h-[6px] rounded-full flex-shrink-0"
        style={{ backgroundColor: 'currentColor' }}
      />
      {label}
    </span>
  );
}

export function HealthBadge({ condition }: { condition: string }) {
  const s = HEALTH_STYLES[condition] || HEALTH_STYLES['Good'];
  return <DotBadge label={condition} styles={s} />;
}

export function ItemStatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['Active'];
  return <DotBadge label={status} styles={s} />;
}

export function InspectionResultBadge({ result }: { result: string }) {
  const s = RESULT_STYLES[result] || RESULT_STYLES['Pass'];
  return <DotBadge label={result} styles={s} />;
}

export function CategoryBadge({ label, color, lightColor, textColor }: {
  label: string; color: string; lightColor: string; textColor: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-[3px] text-[11px] font-semibold rounded-full border"
      style={{ backgroundColor: lightColor, color: textColor, borderColor: color + '30' }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function OverdueBadge({ daysOver }: { daysOver: number }) {
  return (
    <span
      className="inline-flex items-center gap-[5px] px-2 py-[2px] text-[10px] font-bold rounded-full border whitespace-nowrap mt-0.5"
      style={{ backgroundColor: 'var(--color-health-poor)', color: 'var(--color-health-poor-text)', borderColor: 'var(--color-health-poor-border)' }}
    >
      <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ backgroundColor: 'currentColor', animation: 'dotPulse 1.5s infinite' }} />
      {daysOver}d overdue
    </span>
  );
}

export function DueSoonBadge({ daysUntil }: { daysUntil: number }) {
  return (
    <span
      className="inline-flex items-center gap-[5px] px-2 py-[2px] text-[10px] font-bold rounded-full border whitespace-nowrap mt-0.5"
      style={{ backgroundColor: 'var(--color-health-fair)', color: 'var(--color-health-fair-text)', borderColor: 'var(--color-health-fair-border)' }}
    >
      <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ backgroundColor: 'currentColor' }} />
      {daysUntil === 0 ? 'Due today' : `${daysUntil}d left`}
    </span>
  );
}

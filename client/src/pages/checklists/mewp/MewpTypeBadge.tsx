import { getMewpType } from '../config/mewpTypes';

interface Props {
  mewpType: string;
  size?: 'sm' | 'md';
}

export function MewpTypeBadge({ mewpType, size = 'sm' }: Props) {
  const type = getMewpType(mewpType);
  if (!type) return null;

  const sizeClasses = size === 'sm'
    ? 'text-[11px] px-2 py-0.5 gap-1'
    : 'text-[12px] px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${sizeClasses}`}
      style={{
        backgroundColor: type.lightColor,
        color: type.textColor,
        border: `1px solid ${type.color}30`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: type.color }}
      />
      {type.abbr} — {type.label}
    </span>
  );
}

export function CertExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return <span className="text-[11px] text-text-tertiary">No cert</span>;

  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let bg: string, text: string, label: string;

  if (diffDays < 0) {
    bg = 'var(--color-health-poor)'; text = 'var(--color-health-poor-text)'; label = 'Expired';
  } else if (diffDays <= 60) {
    bg = 'var(--color-health-fair)'; text = 'var(--color-health-fair-text)'; label = `${diffDays}d left`;
  } else {
    bg = 'var(--color-health-good)'; text = 'var(--color-health-good-text)'; label = 'Valid';
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: bg, color: text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'currentColor' }} />
      {label}
    </span>
  );
}

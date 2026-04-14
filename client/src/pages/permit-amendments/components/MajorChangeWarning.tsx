import { AlertTriangle } from 'lucide-react';

interface Props {
  note: string | null;
  variant?: 'danger' | 'warning';
}

export function MajorChangeWarning({ note, variant = 'danger' }: Props) {
  if (!note) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      className="major-change-warning"
      style={{
        background: isDanger ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
        border: `1px solid ${isDanger ? 'var(--color-danger-200)' : 'var(--color-warning-200)'}`,
        borderLeft: `3px solid ${isDanger ? 'var(--color-danger-500)' : 'var(--color-warning-500)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
      }}
    >
      <AlertTriangle
        size={16}
        style={{
          color: isDanger ? 'var(--color-danger-600)' : 'var(--color-warning-600)',
          flexShrink: 0,
          marginTop: 1,
        }}
      />
      <div>
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: isDanger ? 'var(--color-danger-700)' : 'var(--color-warning-700)',
            margin: 0,
          }}
        >
          {isDanger ? 'Major Change Warning' : 'Advisory Notice'}
        </p>
        <p
          style={{
            fontSize: 11,
            color: isDanger ? 'var(--color-danger-600)' : 'var(--color-warning-600)',
            margin: '2px 0 0',
          }}
        >
          {note}
        </p>
      </div>
    </div>
  );
}

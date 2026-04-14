interface Props {
  status: string;
  size?: 'sm' | 'md';
}

const MAP: Record<string, { cls: string; label: string; pulse?: boolean }> = {
  'Open':             { cls: 'point-status--open',        label: 'Open',          pulse: true },
  'In Progress':      { cls: 'point-status--in-progress', label: 'In Progress' },
  'Resolved':         { cls: 'point-status--resolved',    label: 'Resolved' },
  'Closed':           { cls: 'point-status--closed',      label: 'Closed' },
  'Pending':          { cls: 'point-status--pending',     label: 'Pending' },
  'Blocked':          { cls: 'point-status--blocked',     label: 'Blocked',       pulse: true },
  'Carried Forward':  { cls: 'point-status--carried',     label: 'Carried' },
};

export function PointStatusBadge({ status, size = 'md' }: Props) {
  const cfg = MAP[status] || { cls: 'point-status--open', label: status };
  return (
    <span className={`point-status-badge ${cfg.cls}`} style={size === 'sm' ? { fontSize: 10, padding: '1px 7px' } : undefined}>
      <span className={`point-status-dot ${cfg.pulse ? 'point-status-dot--pulse' : ''}`} />
      {cfg.label}
    </span>
  );
}

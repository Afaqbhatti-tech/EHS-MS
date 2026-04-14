interface Props {
  status: 'Open' | 'In Progress' | 'Closed' | string;
}

const MAP: Record<string, { cls: string; label: string }> = {
  Open:          { cls: 'mom-status--open',        label: 'Open' },
  'In Progress': { cls: 'mom-status--in-progress', label: 'In Progress' },
  Closed:        { cls: 'mom-status--closed',      label: 'Closed' },
};

export function MomStatusBadge({ status }: Props) {
  const cfg = MAP[status] || MAP.Open;
  return <span className={`mom-status-badge ${cfg.cls}`}>{cfg.label}</span>;
}

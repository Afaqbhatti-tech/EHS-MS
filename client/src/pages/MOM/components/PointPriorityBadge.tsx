interface Props {
  priority: string;
}

const MAP: Record<string, string> = {
  Low:      'point-priority--low',
  Medium:   'point-priority--medium',
  High:     'point-priority--high',
  Critical: 'point-priority--critical',
};

export function PointPriorityBadge({ priority }: Props) {
  return (
    <span className={`point-priority-badge ${MAP[priority] || MAP.Medium}`}>
      {priority}
    </span>
  );
}

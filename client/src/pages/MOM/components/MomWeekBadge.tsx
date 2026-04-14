interface Props {
  week_number: number;
  year: number;
  size?: 'sm' | 'md' | 'lg';
}

export function MomWeekBadge({ week_number, year, size = 'md' }: Props) {
  const cls = size === 'sm' ? 'mom-week-badge--sm' : size === 'lg' ? 'mom-week-badge--lg' : '';
  return (
    <span className={`mom-week-badge ${cls}`}>
      W{week_number} · {year}
    </span>
  );
}

interface Props { data: any[] }

const COLORS: Record<string, string> = {
  Electricity: '#3B82F6', Water: '#06B6D4', Diesel: '#F59E0B',
  Petrol: '#EF4444', 'Natural Gas': '#8B5CF6', LPG: '#10B981',
  'Compressed Air': '#6366F1', Other: '#9CA3AF',
};

export default function ResourceTrendChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>No resource data available</div>;
  }

  // Group by resource_type
  const types = [...new Set(data.map((d: any) => d.resource_type))];
  const months = [...new Set(data.map((d: any) => d.month))].sort();

  // Find max per type for bar scaling
  const maxByType: Record<string, number> = {};
  types.forEach(type => {
    const vals = data.filter((d: any) => d.resource_type === type).map((d: any) => Number(d.total));
    maxByType[type] = Math.max(...vals, 1);
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {types.map(type => (
          <span key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[type] || '#9CA3AF', display: 'inline-block' }} />
            {type}
          </span>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Type</th>
              {months.map(m => (
                <th key={m} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)', minWidth: 100 }}>
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map(type => (
              <tr key={type}>
                <td style={{ padding: '8px', fontWeight: 600, whiteSpace: 'nowrap', color: COLORS[type] || 'var(--color-text-primary)' }}>{type}</td>
                {months.map(month => {
                  const entry = data.find((d: any) => d.resource_type === type && d.month === month);
                  const val = entry ? Number(entry.total) : 0;
                  const pct = (val / maxByType[type]) * 100;
                  return (
                    <td key={month} style={{ padding: '6px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 16, background: 'var(--color-surface-sunken)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: COLORS[type] || '#9CA3AF', borderRadius: 3, transition: 'width 0.3s ease' }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', minWidth: 45, textAlign: 'right' }}>{val.toLocaleString()}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

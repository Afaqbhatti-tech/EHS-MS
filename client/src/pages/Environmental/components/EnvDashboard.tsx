import React, { useEffect } from 'react';
import type { useEnvironmental } from '../hooks/useEnvironmental';
import EnvKPICards from './EnvKPICards';
import EnvStatusBadge from './EnvStatusBadge';

// ─── Props ──────────────────────────────────────

interface EnvDashboardProps {
  env: ReturnType<typeof useEnvironmental>;
}

// ─── Color palette for chart bars ───────────────

const BAR_COLORS = [
  '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED',
  '#0891B2', '#EA580C', '#4338CA', '#BE185D', '#15803D',
];

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  low:      { bg: '#D1FAE5', text: '#065F46' },
  minor:    { bg: '#D1FAE5', text: '#065F46' },
  medium:   { bg: '#FEF3C7', text: '#92400E' },
  moderate: { bg: '#FEF3C7', text: '#92400E' },
  high:     { bg: '#FEE2E2', text: '#991B1B' },
  major:    { bg: '#FEE2E2', text: '#991B1B' },
  critical: { bg: '#991B1B', text: '#FFFFFF' },
  severe:   { bg: '#991B1B', text: '#FFFFFF' },
};

const COMPLIANCE_COLORS: Record<string, string> = {
  compliant:         '#059669',
  'partially compliant': '#D97706',
  'non-compliant':   '#DC2626',
  'not assessed':    '#6B7280',
  pending:           '#2563EB',
};

const STATUS_PROGRESS_COLORS: Record<string, string> = {
  'on track':   '#059669',
  'at risk':    '#D97706',
  delayed:      '#DC2626',
  achieved:     '#2563EB',
  completed:    '#2563EB',
  active:       '#0891B2',
  'not started': '#9CA3AF',
};

// ─── Component ──────────────────────────────────

export default function EnvDashboard({ env }: EnvDashboardProps) {
  // Fetch stats on mount if not yet loaded
  useEffect(() => {
    if (!env.stats) {
      env.fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Loading state ──────────────────────────────

  if (env.statsLoading && !env.stats) {
    return (
      <div className="env-card" style={{ padding: '48px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            width: 36,
            height: 36,
            border: '3px solid #E5E7EB',
            borderTopColor: '#2563EB',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ marginTop: 12, color: '#6B7280', fontSize: 14 }}>Loading dashboard data...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const stats = env.stats;
  const kpis = stats?.kpis ?? null;

  // Safe accessors with fallback empty arrays
  const wasteByType = stats?.waste_by_type ?? [];
  const incidentTrend = stats?.incident_trend ?? [];
  const resourceByType = stats?.resource_by_type ?? [];
  const complianceByStatus = stats?.compliance_by_status ?? [];
  const objectiveProgress = stats?.objective_progress ?? [];
  const actionSummary = stats?.action_summary ?? [];

  // Derived: max values for bar scaling
  const maxWaste = Math.max(...wasteByType.map((w) => w.total_quantity), 1);
  const maxResource = Math.max(...resourceByType.map((r) => r.total_consumption), 1);

  // Compliance totals for percentage calc
  const complianceTotal = complianceByStatus.reduce((sum, c) => sum + c.total, 0) || 1;

  // Open/overdue actions from action_summary
  const openActions = actionSummary.filter((a) =>
    ['open', 'in progress', 'pending', 'overdue'].includes(a.status?.toLowerCase()),
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ─── Row 1: KPI Cards ─────────────────────── */}
      <EnvKPICards kpis={kpis} />

      {/* ─── Row 2: Waste by Type + Incidents by Severity ─── */}
      <div className="env-chart-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Waste by Type (Horizontal Bar Chart) */}
        <div className="env-card env-chart-container">
          <h3 style={sectionTitleStyle}>Waste by Type</h3>
          {wasteByType.length === 0 ? (
            <p style={emptyStyle}>No waste data available</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {wasteByType.map((item, idx) => {
                const pct = Math.round((item.total_quantity / maxWaste) * 100);
                return (
                  <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#374151', fontWeight: 500 }}>{item.label}</span>
                      <span style={{ color: '#6B7280' }}>
                        {item.total_quantity.toLocaleString()} {item.unit}
                      </span>
                    </div>
                    <div className="env-progress-bar" style={barTrackStyle}>
                      <div
                        style={{
                          ...barFillBase,
                          width: `${pct}%`,
                          backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Incidents by Severity (Stat cards) */}
        <div className="env-card env-chart-container">
          <h3 style={sectionTitleStyle}>Incidents by Severity</h3>
          {incidentTrend.length === 0 ? (
            <p style={emptyStyle}>No incident data available</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Summary cards from trend data */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                {(() => {
                  const totalIncidents = incidentTrend.reduce((s, t) => s + t.incidents, 0);
                  const totalHigh = incidentTrend.reduce((s, t) => s + t.severity_high, 0);
                  const totalOther = totalIncidents - totalHigh;

                  const items = [
                    { label: 'Total', value: totalIncidents, bg: '#DBEAFE', text: '#1D4ED8' },
                    { label: 'High Severity', value: totalHigh, bg: '#FEE2E2', text: '#991B1B' },
                    { label: 'Other', value: totalOther, bg: '#D1FAE5', text: '#065F46' },
                  ];

                  return items.map((item) => (
                    <div
                      key={item.label}
                      style={{
                        background: item.bg,
                        borderRadius: '10px',
                        padding: '16px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '24px', fontWeight: 700, color: item.text }}>
                        {item.value}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: item.text, marginTop: 4 }}>
                        {item.label}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Monthly breakdown table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Month</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Incidents</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>High Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidentTrend.slice(-6).map((row) => (
                      <tr key={row.month}>
                        <td style={tdStyle}>{row.month}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{row.incidents}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: row.severity_high > 0 ? '#DC2626' : '#374151' }}>
                          {row.severity_high}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Row 3: Resource Trend + Compliance Status ─── */}
      <div className="env-chart-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Resource Consumption (Table of last 6 entries) */}
        <div className="env-card env-chart-container">
          <h3 style={sectionTitleStyle}>Resource Consumption</h3>
          {resourceByType.length === 0 ? (
            <p style={emptyStyle}>No resource data available</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {resourceByType.map((item, idx) => {
                const pct = Math.round((item.total_consumption / maxResource) * 100);
                return (
                  <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#374151', fontWeight: 500 }}>{item.label}</span>
                      <span style={{ color: '#6B7280' }}>
                        {item.total_consumption.toLocaleString()} {item.unit}
                      </span>
                    </div>
                    <div className="env-progress-bar" style={barTrackStyle}>
                      <div
                        style={{
                          ...barFillBase,
                          width: `${pct}%`,
                          backgroundColor: BAR_COLORS[(idx + 3) % BAR_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Compliance Status (Donut-like stat cards with percentages) */}
        <div className="env-card env-chart-container">
          <h3 style={sectionTitleStyle}>Compliance Status</h3>
          {complianceByStatus.length === 0 ? (
            <p style={emptyStyle}>No compliance data available</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
              {complianceByStatus.map((item) => {
                const pct = Math.round((item.total / complianceTotal) * 100);
                const color = COMPLIANCE_COLORS[item.label?.toLowerCase()] ?? '#6B7280';

                return (
                  <div
                    key={item.label}
                    style={{
                      background: '#F9FAFB',
                      borderRadius: '10px',
                      padding: '16px',
                      textAlign: 'center',
                      borderLeft: `4px solid ${color}`,
                    }}
                  >
                    <div style={{ fontSize: '24px', fontWeight: 700, color }}>{pct}%</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color, marginTop: 2 }}>
                      {item.total} items
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280', marginTop: 6, textTransform: 'capitalize' }}>
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Row 4: Objectives Progress + Top Open Actions ─── */}
      <div className="env-chart-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Objectives Progress (Horizontal progress bars) */}
        <div className="env-card env-chart-container">
          <h3 style={sectionTitleStyle}>Objectives Progress</h3>
          {objectiveProgress.length === 0 ? (
            <p style={emptyStyle}>No objectives defined yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {objectiveProgress.map((obj) => {
                const pct = Math.min(Math.max(obj.progress_percentage ?? 0, 0), 100);
                const barColor = STATUS_PROGRESS_COLORS[obj.status?.toLowerCase()] ?? '#2563EB';

                return (
                  <div key={obj.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#111827',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={obj.title}
                        >
                          {obj.objective_code} - {obj.title}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 8 }}>
                        <EnvStatusBadge status={obj.status} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: barColor }}>{pct}%</span>
                      </div>
                    </div>
                    <div className="env-progress-bar" style={barTrackStyle}>
                      <div
                        style={{
                          ...barFillBase,
                          width: `${pct}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Open Actions */}
        <div className="env-card env-chart-container">
          <h3 style={sectionTitleStyle}>Top Open Actions</h3>
          {openActions.length === 0 && actionSummary.length === 0 ? (
            <p style={emptyStyle}>No open actions</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Summary bar */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {actionSummary.map((a, idx) => {
                  const isHighlight =
                    ['open', 'overdue', 'in progress', 'pending'].includes(a.status?.toLowerCase());
                  return (
                    <div
                      key={`${a.status}-${idx}`}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        background: isHighlight ? '#FEF3C7' : '#F3F4F6',
                        color: isHighlight ? '#92400E' : '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ fontSize: '18px', fontWeight: 700 }}>{a.total}</span>
                      <span style={{ textTransform: 'capitalize' }}>{a.status}</span>
                    </div>
                  );
                })}
              </div>

              {/* Action status breakdown bars */}
              {actionSummary.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', marginBottom: 8 }}>
                    Status Distribution
                  </div>
                  {actionSummary.map((a, idx) => {
                    const totalActions = actionSummary.reduce((s, x) => s + x.total, 0) || 1;
                    const pct = Math.round((a.total / totalActions) * 100);
                    const color = STATUS_PROGRESS_COLORS[a.status?.toLowerCase()] ?? '#6B7280';
                    return (
                      <div key={`${a.status}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 8 }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#374151',
                            width: '90px',
                            textTransform: 'capitalize',
                            flexShrink: 0,
                          }}
                        >
                          {a.status}
                        </span>
                        <div style={{ ...barTrackStyle, flex: 1 }}>
                          <div style={{ ...barFillBase, width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color, width: '36px', textAlign: 'right' }}>
                          {a.total}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared inline styles ───────────────────────

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  color: '#111827',
  marginBottom: '16px',
  paddingBottom: '10px',
  borderBottom: '1px solid #F3F4F6',
};

const emptyStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#9CA3AF',
  textAlign: 'center',
  padding: '24px 0',
};

const barTrackStyle: React.CSSProperties = {
  width: '100%',
  height: '8px',
  backgroundColor: '#F3F4F6',
  borderRadius: '4px',
  overflow: 'hidden',
};

const barFillBase: React.CSSProperties = {
  height: '100%',
  borderRadius: '4px',
  transition: 'width 0.5s ease',
  minWidth: '2px',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  fontWeight: 600,
  color: '#6B7280',
  borderBottom: '2px solid #E5E7EB',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 10px',
  color: '#374151',
  borderBottom: '1px solid #F3F4F6',
};

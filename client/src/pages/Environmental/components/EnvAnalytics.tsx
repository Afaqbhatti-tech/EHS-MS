import { useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { useToast } from '../../../components/ui/Toast';

interface Props { env: any }

const CHART_COLORS = ['#1F8034', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1', '#F97316', '#059669', '#0EA5E9', '#EC4899'];

function HBar({ data, labelKey, valueKey, title, unit }: { data: any[]; labelKey: string; valueKey: string; title: string; unit?: string }) {
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);
  return (
    <div className="env-card" style={{ padding: 16 }}>
      <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--color-text-primary)' }}>{title}</h4>
      {data.length === 0 && <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>No data</p>}
      {data.slice(0, 10).map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ width: 120, fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(d[labelKey] || 'N/A')}</span>
          <div style={{ flex: 1, height: 18, background: 'var(--color-surface-sunken)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(Number(d[valueKey]) / max) * 100}%`, height: '100%', background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, minWidth: 40, textAlign: 'right' }}>{Number(d[valueKey])}{unit ? ` ${unit}` : ''}</span>
        </div>
      ))}
    </div>
  );
}

export default function EnvAnalytics({ env }: Props) {
  const toast = useToast();
  const [exportingPath, setExportingPath] = useState<string | null>(null);
  useEffect(() => { if (!env.stats) env.fetchStats(); }, []);

  if (env.statsLoading) return <div className="env-empty-state"><div className="env-spinner" /></div>;
  if (!env.stats) return <div className="env-empty-state">No analytics data available</div>;

  const s = env.stats;
  const kpis = s.kpis || {};

  return (
    <div>
      <div className="env-section-header">
        <h2>Reports / Analytics</h2>
        <button className="env-btn env-btn--secondary" onClick={() => env.fetchStats()}>Refresh</button>
      </div>

      {/* Export Buttons */}
      <div className="env-card" style={{ padding: 16, marginBottom: 20 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--color-text-primary)' }}>Export Data (CSV)</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { label: 'Aspects', path: 'aspects' },
            { label: 'Risks', path: 'risks' },
            { label: 'Waste Records', path: 'waste' },
            { label: 'Monitoring', path: 'monitoring' },
            { label: 'Resources', path: 'resources' },
            { label: 'Incidents', path: 'incidents' },
            { label: 'Inspections', path: 'inspections' },
            { label: 'Compliance', path: 'compliance' },
            { label: 'Objectives', path: 'objectives' },
            { label: 'Actions', path: 'actions' },
          ].map(item => (
            <button
              key={item.path}
              className="env-btn--secondary"
              disabled={exportingPath === item.path}
              style={exportingPath === item.path ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
              onClick={async () => {
                if (exportingPath) return;
                setExportingPath(item.path);
                try {
                  await api.download(`/environmental/${item.path}/export`);
                } catch (err: any) {
                  toast.error(err?.message || `Failed to export ${item.label}`);
                } finally {
                  setExportingPath(null);
                }
              }}
            >
              {exportingPath === item.path ? 'Exporting...' : item.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Aspects', value: kpis.total_aspects, color: '#1F8034' },
          { label: 'Significant Aspects', value: kpis.significant_aspects, color: '#F59E0B' },
          { label: 'High Risks', value: kpis.high_risks, color: '#EF4444' },
          { label: 'Open Incidents', value: kpis.open_incidents, color: '#DC2626' },
          { label: 'Pending Inspections', value: kpis.pending_inspections, color: '#3B82F6' },
          { label: 'Compliance Rate', value: `${kpis.compliance_rate ?? 0}%`, color: '#059669' },
          { label: 'Open Actions', value: kpis.open_actions, color: '#F97316' },
          { label: 'Overdue Actions', value: kpis.overdue_actions, color: '#991B1B' },
          { label: 'Active Objectives', value: kpis.active_objectives, color: '#8B5CF6' },
          { label: 'Waste This Month', value: kpis.waste_this_month, color: '#6366F1' },
          { label: 'Exceedances', value: kpis.exceedances_this_month, color: '#EC4899' },
        ].map((kpi, i) => (
          <div key={i} className="env-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{kpi.label}</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>{kpi.value ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {(s.by_category?.length ?? 0) > 0 && (
          <HBar data={s.by_category} labelKey="label" valueKey="total" title="Aspects by Category" />
        )}
        {(s.compliance_by_status?.length ?? 0) > 0 && (
          <HBar data={s.compliance_by_status} labelKey="label" valueKey="total" title="Compliance by Status" />
        )}
        {(s.action_summary?.length ?? 0) > 0 && (
          <HBar data={s.action_summary} labelKey="status" valueKey="total" title="Actions by Status" />
        )}
        {(s.waste_by_type?.length ?? 0) > 0 && (
          <HBar data={s.waste_by_type} labelKey="label" valueKey="total_quantity" title="Waste by Type" />
        )}
        {(s.resource_by_type?.length ?? 0) > 0 && (
          <HBar data={s.resource_by_type} labelKey="label" valueKey="total_consumption" title="Resource Consumption" />
        )}
      </div>

      {/* Objective Progress */}
      {(s.objective_progress?.length ?? 0) > 0 && (
        <div className="env-card" style={{ padding: 16, marginBottom: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Objective Progress</h4>
          {s.objective_progress.map((o: any) => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ width: 90, fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)' }}>{o.objective_code}</span>
              <span style={{ width: 200, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</span>
              <div style={{ flex: 1, height: 14, background: 'var(--color-surface-sunken)', borderRadius: 7, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(o.progress_percentage || 0, 100)}%`, height: '100%',
                  background: (o.progress_percentage || 0) >= 100 ? '#16A34A' : (o.progress_percentage || 0) >= 50 ? '#3B82F6' : '#F59E0B',
                  borderRadius: 7, transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{o.progress_percentage || 0}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Monitoring Trends */}
      {(s.monitoring_trends?.length ?? 0) > 0 && (
        <div className="env-card" style={{ padding: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Monthly Monitoring Trends</h4>
          <table className="env-table">
            <thead>
              <tr><th>Month</th><th>Total Readings</th><th>Exceedances</th><th>Rate</th></tr>
            </thead>
            <tbody>
              {s.monitoring_trends.map((m: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{m.month}</td>
                  <td>{m.readings}</td>
                  <td style={m.exceedances > 0 ? { color: 'var(--color-danger)', fontWeight: 700 } : {}}>{m.exceedances}</td>
                  <td>{m.readings > 0 ? `${((m.exceedances / m.readings) * 100).toFixed(1)}%` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Incident Trend */}
      {(s.incident_trend?.length ?? 0) > 0 && (
        <div className="env-card" style={{ padding: 16, marginTop: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Incident Trend</h4>
          <table className="env-table">
            <thead>
              <tr><th>Month</th><th>Total Incidents</th><th>High Severity</th></tr>
            </thead>
            <tbody>
              {s.incident_trend.map((m: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{m.month}</td>
                  <td>{m.incidents}</td>
                  <td style={m.severity_high > 0 ? { color: 'var(--color-danger)', fontWeight: 700 } : {}}>{m.severity_high}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

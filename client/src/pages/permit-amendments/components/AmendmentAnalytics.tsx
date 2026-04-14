import { BarChart3, PieChart, TrendingUp, Award } from 'lucide-react';
import type { AmendmentStats } from '../hooks/useAmendments';

interface Props {
  stats: AmendmentStats | null;
  loading: boolean;
}

function BarItem({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-text-secondary truncate max-w-[200px]">{label}</span>
        <span className="font-semibold text-text-primary">{value}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-sunken)' }}>
        <div
          style={{
            height: '100%', borderRadius: 3, background: color,
            width: `${pct}%`, transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

export function AmendmentAnalytics({ stats, loading }: Props) {
  if (loading || !stats) {
    return (
      <div className="amendment-analytics">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="amendment-analytics__chart" style={{ height: 200 }}>
            <div className="amendment-kpi-skeleton" style={{ height: '100%' }} />
          </div>
        ))}
      </div>
    );
  }

  const maxType = Math.max(...(stats.by_type?.map(t => t.count) || [1]), 1);
  const maxArea = Math.max(...(stats.by_area?.map(a => a.count) || [1]), 1);
  const maxMonth = Math.max(...(stats.monthly_trend?.map(m => m.total) || [1]), 1);

  const statusColors: Record<string, string> = {
    Draft: '#9CA3AF', Submitted: '#3B82F6', 'Under Review': '#F59E0B',
    Approved: '#22C55E', Rejected: '#EF4444', 'Approved with Comments': '#D97706',
    Cancelled: '#6B7280', Superseded: '#D1D5DB',
  };

  return (
    <div className="amendment-analytics">
      {/* By Type */}
      <div className="amendment-analytics__chart">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} className="text-text-tertiary" />
          <h3 className="text-[13px] font-semibold text-text-primary">By Amendment Type</h3>
        </div>
        {stats.by_type?.length ? (
          stats.by_type.map(t => (
            <BarItem key={t.amendment_type} label={t.amendment_type} value={t.count} max={maxType} color="var(--color-primary-500)" />
          ))
        ) : (
          <p className="text-[11px] text-text-tertiary">No data</p>
        )}
      </div>

      {/* By Status */}
      <div className="amendment-analytics__chart">
        <div className="flex items-center gap-2 mb-3">
          <PieChart size={14} className="text-text-tertiary" />
          <h3 className="text-[13px] font-semibold text-text-primary">By Status</h3>
        </div>
        {stats.by_status?.length ? (
          stats.by_status.map(s => (
            <BarItem key={s.status} label={s.status} value={s.count}
              max={Math.max(...stats.by_status.map(x => x.count), 1)}
              color={statusColors[s.status] || '#9CA3AF'}
            />
          ))
        ) : (
          <p className="text-[11px] text-text-tertiary">No data</p>
        )}
      </div>

      {/* Monthly Trend */}
      <div className="amendment-analytics__chart amendment-analytics__chart--full">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-text-tertiary" />
          <h3 className="text-[13px] font-semibold text-text-primary">Monthly Trend (12 months)</h3>
        </div>
        <div className="flex items-end gap-1" style={{ height: 120 }}>
          {stats.monthly_trend?.map((m, i) => {
            const h = maxMonth > 0 ? (m.total / maxMonth) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-[9px] text-text-tertiary font-semibold">{m.total || ''}</span>
                <div className="w-full flex flex-col justify-end" style={{ height: 100 }}>
                  <div
                    style={{
                      height: `${h}%`, minHeight: m.total > 0 ? 4 : 0,
                      background: 'var(--color-primary-400)', borderRadius: '3px 3px 0 0',
                      transition: 'height 0.3s ease',
                    }}
                  />
                </div>
                <span className="text-[8px] text-text-tertiary">{m.month.split(' ')[0]}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-primary-400)' }} />
            <span className="text-[10px] text-text-tertiary">Total</span>
          </div>
        </div>
      </div>

      {/* By Area */}
      <div className="amendment-analytics__chart">
        <div className="flex items-center gap-2 mb-3">
          <Award size={14} className="text-text-tertiary" />
          <h3 className="text-[13px] font-semibold text-text-primary">By Area</h3>
        </div>
        {stats.by_area?.length ? (
          stats.by_area.map(a => (
            <BarItem key={a.permit_area_snapshot} label={a.permit_area_snapshot || 'Unknown'}
              value={a.count} max={maxArea} color="var(--color-info-500)" />
          ))
        ) : (
          <p className="text-[11px] text-text-tertiary">No data</p>
        )}
      </div>

      {/* Most Amended Permits */}
      <div className="amendment-analytics__chart">
        <div className="flex items-center gap-2 mb-3">
          <Award size={14} className="text-text-tertiary" />
          <h3 className="text-[13px] font-semibold text-text-primary">Most Amended Permits</h3>
        </div>
        {stats.most_amended?.length ? (
          <div className="space-y-1.5">
            {stats.most_amended.map((p, i) => (
              <div key={p.permit_id || i} className="flex items-center justify-between py-1">
                <div>
                  <span className="text-[11px] font-mono font-medium text-text-primary">
                    {p.permit_number_snapshot || '—'}
                  </span>
                  <span className="text-[10px] text-text-tertiary ml-2">{p.permit_type_snapshot}</span>
                </div>
                <span className="text-[11px] font-semibold text-primary-600">{p.amendment_count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-text-tertiary">No data</p>
        )}
      </div>

      {/* Category Split + Avg Days */}
      <div className="amendment-analytics__chart">
        <div className="flex items-center gap-2 mb-3">
          <PieChart size={14} className="text-text-tertiary" />
          <h3 className="text-[13px] font-semibold text-text-primary">Category Split</h3>
        </div>
        {stats.by_category?.map(c => (
          <BarItem key={c.amendment_category} label={c.amendment_category}
            value={c.count}
            max={Math.max(...stats.by_category.map(x => x.count), 1)}
            color={c.amendment_category === 'Major' ? 'var(--color-danger-500)' : 'var(--color-info-500)'}
          />
        ))}
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Avg. Approval Time</p>
          <p className="text-[18px] font-bold text-text-primary mt-0.5">{stats.avg_approval_days} <span className="text-[12px] font-normal text-text-tertiary">days</span></p>
        </div>
      </div>
    </div>
  );
}

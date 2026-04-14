import { getCategoryByKey } from '../../../../config/trackerCategories';
import { InspectionResultBadge, OverdueBadge, DueSoonBadge } from '../../components/TrackerBadges';
import { format } from 'date-fns';
import type { InspectionStats } from '../../hooks/useTracker';

interface Props {
  stats: InspectionStats | null;
  loading: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const RESULT_COLORS: Record<string, string> = {
  'Pass': '#16A34A',
  'Fail': '#DC2626',
  'Pass with Issues': '#EA580C',
  'Requires Action': '#D97706',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
}

export function InspectionAnalytics({ stats, loading }: Props) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-surface border border-border rounded-[var(--radius-md)] p-5">
            <div className="skeleton h-5 w-32 mb-4" />
            <div className="skeleton h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const maxMonthly = Math.max(...stats.monthly.map(m => m.total), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Monthly Trend */}
      <div className="bg-surface border border-border rounded-[var(--radius-md)] p-5">
        <h3 className="text-[13px] font-semibold text-text-primary mb-4">Monthly Inspection Trend</h3>
        {stats.monthly.length === 0 ? (
          <p className="text-[12px] text-text-tertiary text-center py-8">No inspection data yet</p>
        ) : (
          <div className="space-y-2">
            {stats.monthly.map(m => (
              <div key={m.month} className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-text-tertiary w-8">{MONTHS[m.month - 1]}</span>
                <div className="flex-1 h-6 bg-surface-sunken rounded-[var(--radius-sm)] overflow-hidden relative">
                  <div
                    className="h-full rounded-[var(--radius-sm)] transition-all duration-300"
                    style={{ width: `${(m.total / maxMonthly) * 100}%`, backgroundColor: 'var(--color-primary-500)' }}
                  />
                  {m.fail_count > 0 && (
                    <div
                      className="h-full rounded-r-[var(--radius-sm)] absolute top-0 transition-all duration-300"
                      style={{
                        left: `${((m.total - m.fail_count) / maxMonthly) * 100}%`,
                        width: `${(m.fail_count / maxMonthly) * 100}%`,
                        backgroundColor: '#DC2626',
                      }}
                    />
                  )}
                </div>
                <span className="text-[11px] font-semibold text-text-primary w-8 text-right">{m.total}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* By Category */}
      <div className="bg-surface border border-border rounded-[var(--radius-md)] p-5">
        <h3 className="text-[13px] font-semibold text-text-primary mb-4">Inspections by Category</h3>
        {stats.byCategory.length === 0 ? (
          <p className="text-[12px] text-text-tertiary text-center py-8">No data</p>
        ) : (
          <div className="space-y-2.5">
            {stats.byCategory.map(cat => {
              const config = getCategoryByKey(cat.category_key);
              const maxCat = Math.max(...stats.byCategory.map(c => c.total), 1);
              return (
                <div key={cat.category_key} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: config?.color || '#666' }} />
                  <span className="text-[11px] font-medium text-text-secondary w-[100px] truncate">{config?.label || cat.category_key}</span>
                  <div className="flex-1 h-5 bg-surface-sunken rounded-[var(--radius-sm)] overflow-hidden">
                    <div
                      className="h-full rounded-[var(--radius-sm)] transition-all duration-300"
                      style={{ width: `${(cat.total / maxCat) * 100}%`, backgroundColor: config?.color || '#666' }}
                    />
                  </div>
                  <div className="text-[11px] w-16 text-right">
                    <span className="font-semibold text-text-primary">{cat.total}</span>
                    {cat.fail_count > 0 && <span className="text-danger-600 ml-1">({cat.fail_count}F)</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Result Distribution */}
      <div className="bg-surface border border-border rounded-[var(--radius-md)] p-5">
        <h3 className="text-[13px] font-semibold text-text-primary mb-4">Result Distribution</h3>
        {stats.byResult.length === 0 ? (
          <p className="text-[12px] text-text-tertiary text-center py-8">No data</p>
        ) : (
          <div className="space-y-3">
            {stats.byResult.map(r => {
              const totalAll = stats.byResult.reduce((s, x) => s + x.total, 0);
              const pct = totalAll > 0 ? Math.round((r.total / totalAll) * 100) : 0;
              return (
                <div key={r.result} className="flex items-center gap-3">
                  <div className="w-[120px]">
                    <InspectionResultBadge result={r.result} />
                  </div>
                  <div className="flex-1 h-6 bg-surface-sunken rounded-[var(--radius-sm)] overflow-hidden">
                    <div
                      className="h-full rounded-[var(--radius-sm)] transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: RESULT_COLORS[r.result] || '#666' }}
                    />
                  </div>
                  <span className="text-[12px] font-semibold text-text-primary w-14 text-right">
                    {r.total} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Inspectors */}
      <div className="bg-surface border border-border rounded-[var(--radius-md)] p-5">
        <h3 className="text-[13px] font-semibold text-text-primary mb-4">Top Inspectors</h3>
        {stats.byInspector.length === 0 ? (
          <p className="text-[12px] text-text-tertiary text-center py-8">No data</p>
        ) : (
          <div className="space-y-2">
            {stats.byInspector.map((insp, i) => (
              <div key={insp.inspector_name} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-primary-50 text-primary-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-[12px] text-text-primary truncate">{insp.inspector_name}</span>
                <span className="text-[12px] font-semibold text-text-primary">{insp.total}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Inspections */}
      <div className="bg-surface border border-border rounded-[var(--radius-md)] p-5 lg:col-span-2">
        <h3 className="text-[13px] font-semibold text-text-primary mb-4">Upcoming Inspections (Next 7 Days)</h3>
        {stats.upcoming.length === 0 ? (
          <p className="text-[12px] text-text-tertiary text-center py-6">No upcoming inspections in the next 7 days</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-text-tertiary uppercase">Code</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-text-tertiary uppercase">Equipment</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-text-tertiary uppercase">Category</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-text-tertiary uppercase">Due Date</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-text-tertiary uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.upcoming.map(item => {
                  const config = getCategoryByKey(item.category_key);
                  return (
                    <tr key={item.id} className="border-b border-border hover:bg-canvas transition-colors">
                      <td className="px-3 py-2 text-[11px] font-mono text-text-tertiary">{item.record_code}</td>
                      <td className="px-3 py-2 text-[12px] text-text-primary">{item.equipment_name}</td>
                      <td className="px-3 py-2">
                        <span className="text-[11px]" style={{ color: config?.color }}>{config?.label || item.category_key}</span>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-text-primary">{formatDate(item.next_internal_inspection_date)}</td>
                      <td className="px-3 py-2">
                        {item.is_overdue && item.days_until_due !== null
                          ? <OverdueBadge daysOver={Math.abs(item.days_until_due)} />
                          : item.days_until_due !== null
                            ? <DueSoonBadge daysUntil={item.days_until_due} />
                            : null
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { useDrills } from '../useDrills';
import type { DrillStats } from '../useDrills';

// ─── Helpers ─────────────────────────────────────

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_BAR_COLORS: Record<string, string> = {
  Planned:        'bg-neutral-400',
  Scheduled:      'bg-blue-500',
  'In Progress':  'bg-amber-500',
  Conducted:      'bg-purple-500',
  'Under Review': 'bg-amber-400',
  Closed:         'bg-green-500',
  Cancelled:      'bg-neutral-300',
  Completed:      'bg-green-500',
};

const TYPE_BAR_COLORS = [
  'bg-[var(--color-chart-1,#6366F1)]',
  'bg-[var(--color-chart-2,#3B82F6)]',
  'bg-[var(--color-chart-3,#10B981)]',
  'bg-[var(--color-chart-4,#F59E0B)]',
  'bg-[var(--color-chart-5,#EF4444)]',
  'bg-[var(--color-chart-6,#8B5CF6)]',
  'bg-[var(--color-chart-7,#EC4899)]',
  'bg-[var(--color-chart-8,#14B8A6)]',
  'bg-[var(--color-chart-9,#F97316)]',
  'bg-[var(--color-chart-10,#06B6D4)]',
];

const OBSERVATION_BAR_COLORS = [
  'bg-amber-500',
  'bg-orange-500',
  'bg-rose-500',
  'bg-red-500',
  'bg-pink-500',
  'bg-fuchsia-500',
  'bg-violet-500',
  'bg-purple-500',
];

const PRIORITY_STYLES: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-orange-100 text-orange-700',
  Medium:   'bg-amber-100 text-amber-700',
  Low:      'bg-green-100 text-green-700',
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMonthLabel(monthStr: string): string {
  // monthStr is "YYYY-MM" format
  const parts = monthStr.split('-');
  if (parts.length === 2) {
    const monthNum = parseInt(parts[1], 10);
    const yearStr = parts[0].slice(-2);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${MONTHS_SHORT[monthNum - 1]} ${yearStr}`;
    }
  }
  return monthStr;
}

// ─── Chart Card Wrapper ──────────────────────────

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-[var(--radius-md)] shadow-sm p-5 ${className}`}>
      <h3 className="text-[13px] font-semibold text-text-primary mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ─── Horizontal Bar Chart ────────────────────────

function HorizontalBarChart({
  items,
  colorFn,
  emptyMessage = 'No data available',
}: {
  items: Array<{ label: string; value: number }>;
  colorFn: (label: string, index: number) => string;
  emptyMessage?: string;
}) {
  const maxValue = Math.max(...items.map(i => i.value), 1);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-[120px] text-[13px] text-text-tertiary">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => {
        const percentage = Math.max((item.value / maxValue) * 100, 2);
        const barColor = colorFn(item.label, idx);
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-32 text-[12px] text-text-secondary truncate" title={item.label}>
              {item.label}
            </span>
            <div className="flex-1 h-6 bg-surface-sunken rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-[12px] font-semibold text-text-primary w-8 text-right">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Skeleton Loader ─────────────────────────────

function SkeletonBars({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-32 h-4 bg-surface-sunken animate-pulse rounded" />
          <div className="flex-1 h-6 bg-surface-sunken animate-pulse rounded-full" />
          <div className="w-8 h-4 bg-surface-sunken animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Monthly Trend (Vertical Bars) ───────────────

function MonthlyTrendChart({ data }: { data: DrillStats['monthly_trend'] }) {
  // Sort chronologically (month is "YYYY-MM" string)
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => a.month.localeCompare(b.month));
  }, [data]);

  const maxVal = Math.max(...sorted.map(d => Math.max(d.total, d.conducted, d.cancelled ?? 0)), 1);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-[13px] text-text-tertiary">
        No monthly data available
      </div>
    );
  }

  return (
    <div>
      {/* Chart */}
      <div className="flex items-end gap-1.5 h-[200px] px-2">
        {sorted.map((d) => {
          const totalH = maxVal > 0 ? (d.total / maxVal) * 100 : 0;
          const conductedH = maxVal > 0 ? (d.conducted / maxVal) * 100 : 0;
          const cancelledH = maxVal > 0 ? ((d.cancelled ?? 0) / maxVal) * 100 : 0;
          const label = formatMonthLabel(d.month);

          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              {/* Bar group */}
              <div className="w-full flex items-end justify-center gap-[2px] h-[170px]">
                {/* Total (planned) bar */}
                <div className="flex-1 max-w-[18px] flex flex-col justify-end h-full">
                  <div
                    className="bg-blue-400 rounded-t-sm transition-all duration-500 min-h-[2px]"
                    style={{ height: `${Math.max(totalH, 1)}%` }}
                    title={`Total: ${d.total}`}
                  />
                </div>
                {/* Conducted bar */}
                <div className="flex-1 max-w-[18px] flex flex-col justify-end h-full">
                  <div
                    className="bg-green-500 rounded-t-sm transition-all duration-500 min-h-[2px]"
                    style={{ height: `${Math.max(conductedH, 1)}%` }}
                    title={`Conducted: ${d.conducted}`}
                  />
                </div>
                {/* Cancelled bar */}
                {(d.cancelled ?? 0) > 0 && (
                  <div className="flex-1 max-w-[18px] flex flex-col justify-end h-full">
                    <div
                      className="bg-neutral-300 rounded-t-sm transition-all duration-500 min-h-[2px]"
                      style={{ height: `${Math.max(cancelledH, 1)}%` }}
                      title={`Cancelled: ${d.cancelled}`}
                    />
                  </div>
                )}
              </div>
              {/* Label */}
              <span className="text-[9px] sm:text-[10px] text-text-tertiary font-medium truncate w-full text-center">
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-400" />
          <span className="text-[11px] text-text-secondary font-medium">Total</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span className="text-[11px] text-text-secondary font-medium">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-neutral-300" />
          <span className="text-[11px] text-text-secondary font-medium">Cancelled</span>
        </div>
      </div>
    </div>
  );
}

// ─── KPI Mini Card ───────────────────────────────

function KPIMini({ label, value, accent }: { label: string; value: string | number; accent?: 'danger' | 'warning' | 'success' | 'info' }) {
  const accentClasses = {
    danger:  'border-danger-200 bg-danger-50/30',
    warning: 'border-warning-200 bg-warning-50/30',
    success: 'border-green-200 bg-green-50/30',
    info:    'border-blue-200 bg-blue-50/30',
  };
  const valueClasses = {
    danger:  'text-danger-600',
    warning: 'text-warning-600',
    success: 'text-green-600',
    info:    'text-blue-600',
  };
  return (
    <div className={`rounded-[var(--radius-md)] border p-3 ${accent ? accentClasses[accent] : 'border-border bg-surface'}`}>
      <div className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{label}</div>
      <div className={`text-xl font-bold mt-0.5 ${accent ? valueClasses[accent] : 'text-text-primary'}`}>{value}</div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────

export default function DrillAnalytics() {
  const { stats, isStatsLoading } = useDrills();

  // ─── Loading State ─────────────────────────────

  if (isStatsLoading || !stats) {
    return (
      <div className="space-y-4">
        {/* KPI skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-[var(--radius-md)] border border-border p-3">
              <div className="h-3 w-16 bg-surface-sunken animate-pulse rounded mb-2" />
              <div className="h-7 w-12 bg-surface-sunken animate-pulse rounded" />
            </div>
          ))}
        </div>
        {/* Chart skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-[var(--radius-md)] p-5">
              <div className="h-4 w-1/3 bg-surface-sunken animate-pulse rounded mb-4" />
              <SkeletonBars count={4} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { kpis, by_status, by_type, monthly_trend, common_observations, top_open_actions } = stats;

  // ─── Prepare Data ──────────────────────────────

  const statusItems = by_status.map(s => ({ label: s.label, value: s.total }));
  const typeItems = by_type.map(t => ({ label: t.label, value: t.total }));
  const observationItems = common_observations.map(o => ({ label: o.category, value: o.total }));

  // Format avg response time (seconds → minutes)
  const avgResponseDisplay = kpis.avg_response_seconds
    ? `${(kpis.avg_response_seconds / 60).toFixed(1)} min`
    : '--';

  // Format avg evacuation time
  const avgEvacuationDisplay = kpis.avg_evacuation_seconds
    ? `${(kpis.avg_evacuation_seconds / 60).toFixed(1)} min`
    : '--';

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* ── KPI Summary Row ──────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPIMini label="Total Drills" value={kpis.total_drills} />
        <KPIMini label="Scheduled" value={kpis.scheduled} accent="info" />
        <KPIMini label="Conducted" value={kpis.conducted} accent="success" />
        <KPIMini label="Overdue" value={kpis.overdue_drills} accent={kpis.overdue_drills > 0 ? 'danger' : undefined} />
        <KPIMini label="This Month" value={kpis.drills_this_month} accent="warning" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPIMini label="Planned" value={kpis.planned} />
        <KPIMini label="Closed" value={kpis.closed} />
        <KPIMini label="Avg Response" value={avgResponseDisplay} />
        <KPIMini label="Avg Evacuation" value={avgEvacuationDisplay} />
      </div>

      {/* ── Charts Grid ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Drills by Status */}
        <ChartCard title="Drills by Status">
          <HorizontalBarChart
            items={statusItems}
            colorFn={(label) => STATUS_BAR_COLORS[label] ?? 'bg-primary-500'}
            emptyMessage="No status data"
          />
        </ChartCard>

        {/* Drills by Type */}
        <ChartCard title="Drills by Type">
          <HorizontalBarChart
            items={typeItems}
            colorFn={(_label, index) => TYPE_BAR_COLORS[index % TYPE_BAR_COLORS.length]}
            emptyMessage="No type data"
          />
        </ChartCard>
      </div>

      {/* ── Monthly Trend (Full Width) ───────── */}
      <ChartCard title="Monthly Trend">
        <MonthlyTrendChart data={monthly_trend} />
      </ChartCard>

      {/* ── Observations + Open Actions ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Common Observations */}
        <ChartCard title="Common Observations">
          <HorizontalBarChart
            items={observationItems}
            colorFn={(_label, index) => OBSERVATION_BAR_COLORS[index % OBSERVATION_BAR_COLORS.length]}
            emptyMessage="No observation data recorded yet"
          />
        </ChartCard>

        {/* Top Open Actions */}
        <ChartCard title="Top Open Actions">
          {top_open_actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[120px] text-center">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Clock size={18} className="text-green-600" />
              </div>
              <p className="text-[13px] text-text-secondary">All actions are on track</p>
              <p className="text-[11px] text-text-tertiary mt-0.5">No overdue or pending actions</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 text-text-tertiary font-semibold text-[11px] uppercase tracking-wider">Action</th>
                    <th className="text-left py-2 pr-3 text-text-tertiary font-semibold text-[11px] uppercase tracking-wider">Drill</th>
                    <th className="text-left py-2 pr-3 text-text-tertiary font-semibold text-[11px] uppercase tracking-wider">Due</th>
                    <th className="text-left py-2 text-text-tertiary font-semibold text-[11px] uppercase tracking-wider">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {top_open_actions.map((action) => {
                    // Calculate days overdue
                    const dueDate = action.due_date ? new Date(action.due_date + 'T00:00:00') : null;
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const daysOverdue = dueDate ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

                    return (
                      <tr key={action.id} className="hover:bg-surface-sunken/30 transition-colors">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-text-primary truncate max-w-[180px]" title={action.title}>
                            {action.title}
                          </p>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="text-primary-600 font-semibold">{action.drill_code}</span>
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          <span className="text-text-secondary">{formatDate(action.due_date)}</span>
                          {daysOverdue > 0 && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full text-[9px] font-bold bg-danger-100 text-danger-700">
                              <AlertTriangle size={9} />
                              {daysOverdue}d
                            </span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span className={`inline-block px-2 py-[2px] rounded-full text-[10px] font-medium ${PRIORITY_STYLES[action.priority] ?? 'bg-neutral-100 text-neutral-600'}`}>
                            {action.priority}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

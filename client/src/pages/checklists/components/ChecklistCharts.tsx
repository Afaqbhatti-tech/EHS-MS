import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import type { ChecklistStats } from '../hooks/useChecklists';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const HEALTH_COLORS: Record<string, string> = {
  'Good': 'var(--color-chart-3)', 'Fair': 'var(--color-chart-4)', 'Poor': 'var(--color-chart-5)',
  'Out of Service': 'var(--color-danger-600)', 'Quarantined': 'var(--color-chart-8)',
};

const STATUS_COLORS: Record<string, string> = {
  'Active': 'var(--color-chart-3)', 'Inactive': 'var(--color-neutral-400)', 'Out of Service': 'var(--color-chart-5)',
  'Quarantined': 'var(--color-chart-4)', 'Removed from Site': 'var(--color-neutral-500)',
};

interface Props {
  stats: ChecklistStats | null;
  loading: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1E293B] text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-white/10 text-[12px]">
      <p className="font-semibold text-white/90 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-white/70">{p.name}:</span>
          <span className="font-bold">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-[#1E293B] text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-white/10 text-[12px]">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.payload?.fill }} />
        <span className="font-semibold">{d.name}</span>
      </div>
      <p className="text-white/80 mt-0.5">{d.value} items</p>
    </div>
  );
}

function ChartCard({ title, subtitle, icon: Icon, children }: {
  title: string; subtitle?: string;
  icon?: React.ComponentType<{ size: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-2xl border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
              <Icon size={16} className="text-primary-600" />
            </div>
          )}
          <div>
            <h3 className="text-[14px] font-semibold text-text-primary leading-tight">{title}</h3>
            {subtitle && <p className="text-[11px] text-text-tertiary mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

export function ChecklistCharts({ stats, loading }: Props) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-surface border border-border/60 rounded-2xl p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="skeleton w-8 h-8 rounded-lg" />
              <div className="skeleton h-4 w-32" />
            </div>
            <div className="skeleton h-[260px] w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  const healthData = (stats.byHealth || []).filter(d => d.total > 0);
  const statusData = (stats.byStatus || []).filter(d => d.total > 0);
  const monthlyData = MONTHS.map((name, i) => {
    const m = (stats.monthlyInspections || []).find(r => r.month === i + 1);
    return { name, total: m?.total || 0, passed: m?.passed || 0, failed: m?.failed || 0 };
  });
  const categoryData = (stats.byCategory || []).filter(c => c.item_count > 0);
  const totalItems = stats.kpis?.total ?? 0;

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Health Distribution */}
        <ChartCard title="Health Condition" subtitle="Equipment condition breakdown" icon={PieChartIcon}>
          {healthData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={healthData.map(d => ({ name: d.condition, value: d.total }))}
                    cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={3}
                    dataKey="value" stroke="white" strokeWidth={2}>
                    {healthData.map(d => (
                      <Cell key={d.condition} fill={HEALTH_COLORS[d.condition] || '#9CA3AF'} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central"
                    className="text-[24px] font-bold" fill="#0F172A">{totalItems}</text>
                  <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central"
                    className="text-[10px] font-medium uppercase tracking-wider" fill="#94A3B8">Total</text>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-1">
                {healthData.map(d => (
                  <div key={d.condition} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: HEALTH_COLORS[d.condition] }} />
                    <span className="text-[11px] text-text-secondary font-medium">{d.condition}</span>
                    <span className="text-[11px] text-text-tertiary">({d.total})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart message="No health data yet" />
          )}
        </ChartCard>

        {/* Items by Category */}
        <ChartCard title="Items by Category" subtitle="Distribution across equipment types" icon={BarChart3}>
          {categoryData.length > 0 ? (
            <div className="space-y-2.5">
              {categoryData.map(cat => {
                const maxVal = Math.max(...categoryData.map(c => c.item_count), 1);
                const pct = (cat.item_count / maxVal) * 100;
                return (
                  <div key={cat.key} className="group rounded-xl p-2.5 hover:bg-slate-50/80 transition-all">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-[12px] font-semibold text-text-primary truncate">{cat.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-[12px] font-bold text-text-primary tabular-nums">{cat.item_count}</span>
                        {cat.overdue_count > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-danger-600">
                            <AlertTriangle size={10} />{cat.overdue_count}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: cat.color, opacity: 0.8 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyChart message="No category data yet" />
          )}
        </ChartCard>
      </div>

      {/* Monthly inspections */}
      <ChartCard title="Monthly Inspections" subtitle={`Inspection activity in ${new Date().getFullYear()}`} icon={TrendingUp}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="passGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" />
                <stop offset="100%" stopColor="#86EFAC" />
              </linearGradient>
              <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#FCA5A5" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="passed" fill="url(#passGrad)" name="Passed" radius={[4, 4, 0, 0]} barSize={16} />
            <Bar dataKey="failed" fill="url(#failGrad)" name="Failed" radius={[4, 4, 0, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-green-500" />
            <span className="text-[12px] text-text-secondary font-medium">Passed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-red-500" />
            <span className="text-[12px] text-text-secondary font-medium">Failed</span>
          </div>
        </div>
      </ChartCard>

      {/* Alerts panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Overdue items */}
        <ChartCard title="Overdue Items" subtitle="Requiring immediate attention" icon={AlertTriangle}>
          {(stats.overdueItems || []).length > 0 ? (
            <div className="space-y-2">
              {stats.overdueItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg bg-danger-50/50 border border-danger-100">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary truncate">{item.name}</p>
                    <p className="text-[11px] text-text-tertiary">{item.item_code} — {item.category}</p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 text-[11px] font-bold text-danger-700 bg-danger-100 rounded-full">
                    {item.days_over}d overdue
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <AlertTriangle size={28} className="mx-auto text-success-400 mb-2" />
              <p className="text-[13px] text-text-tertiary">No overdue items</p>
            </div>
          )}
        </ChartCard>

        {/* Upcoming inspections */}
        <ChartCard title="Upcoming Inspections" subtitle="Due within 7 days" icon={Clock}>
          {(stats.upcoming || []).length > 0 ? (
            <div className="space-y-2">
              {stats.upcoming.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg bg-warning-50/50 border border-warning-100">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary truncate">{item.name}</p>
                    <p className="text-[11px] text-text-tertiary">{item.item_code} — {item.category}</p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 text-[11px] font-bold text-warning-700 bg-warning-100 rounded-full">
                    {item.days_until === 0 ? 'Today' : `${item.days_until}d left`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Clock size={28} className="mx-auto text-text-tertiary mb-2" />
              <p className="text-[13px] text-text-tertiary">No upcoming inspections</p>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[260px] text-center">
      <div className="w-12 h-12 rounded-2xl bg-surface-sunken flex items-center justify-center mb-3">
        <BarChart3 size={20} className="text-text-tertiary" />
      </div>
      <p className="text-[13px] text-text-tertiary font-medium">{message}</p>
      <p className="text-[11px] text-text-tertiary/60 mt-1">Add items to see analytics</p>
    </div>
  );
}

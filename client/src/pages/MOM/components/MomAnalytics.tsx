import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { BarChart3, Users, Target, AlertTriangle } from 'lucide-react';
import type { MomStats } from '../hooks/useMom';

interface Props {
  stats: MomStats | null;
  loading: boolean;
}

/* ── Shared helpers ──────────────────────────────────── */

const TOOLTIP_COLORS: Record<string, string> = {
  open: '#EF4444',
  resolved: '#22C55E',
  Open: '#EF4444',
  Resolved: '#22C55E',
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1E293B] text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-white/10 text-[12px]">
      <p className="font-semibold text-white/90 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TOOLTIP_COLORS[p.dataKey] || TOOLTIP_COLORS[p.name] || p.color }} />
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
      <p className="text-white/80 mt-0.5">{d.value} points</p>
    </div>
  );
}

function ChartCard({ title, subtitle, icon: Icon, iconBg = 'bg-blue-50', iconColor = 'text-blue-600', children, className = '' }: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ size: number; className?: string }>;
  iconBg?: string;
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface rounded-2xl border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden ${className}`}>
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
              <Icon size={16} className={iconColor} />
            </div>
          )}
          <div>
            <h3 className="text-[14px] font-semibold text-text-primary leading-tight">{title}</h3>
            {subtitle && <p className="text-[11px] text-text-tertiary mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="px-5 pb-5">
        {children}
      </div>
    </div>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-text-tertiary">
      <BarChart3 size={32} className="mb-2 opacity-30" />
      <p className="text-[13px]">{message}</p>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────── */

export function MomAnalytics({ stats, loading }: Props) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`bg-surface border border-border/60 rounded-2xl p-6 ${i === 1 ? 'lg:col-span-2' : ''}`}>
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

  // Data prep
  const weeklyData = stats.weekly_trend.map(w => ({
    name: `W${w.week_number}`,
    open: w.open,
    resolved: w.resolved,
    total: w.total,
  }));

  const categoryData = stats.by_category.map(c => ({
    name: c.category,
    value: c.total,
  }));

  const assigneeData = stats.by_assignee.slice(0, 10).map(a => ({
    name: a.assigned_to,
    open: a.open,
    resolved: a.resolved,
    total: a.total,
  }));

  // Resolution rate
  const totalPts = stats.kpis.total_points;
  const resolvedPts = stats.kpis.resolved;
  const resolutionRate = totalPts ? Math.round((resolvedPts / totalPts) * 100) : 0;
  const rateColor = resolutionRate >= 70 ? '#22C55E' : resolutionRate >= 40 ? '#F59E0B' : '#EF4444';
  const rateTrackColor = resolutionRate >= 70 ? '#DCFCE7' : resolutionRate >= 40 ? '#FEF3C7' : '#FEE2E2';

  const CATEGORY_COLORS = [
    '#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Row 1: Weekly Trend (full width) */}
      <ChartCard
        title="Weekly Trend"
        subtitle="Open vs resolved points per week"
        icon={BarChart3}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
      >
        {weeklyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
              <defs>
                <linearGradient id="momOpenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" />
                  <stop offset="100%" stopColor="#FCA5A5" />
                </linearGradient>
                <linearGradient id="momResolvedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" />
                  <stop offset="100%" stopColor="#86EFAC" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.04)' }} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="open" fill="url(#momOpenGrad)" name="Open" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="resolved" fill="url(#momResolvedGrad)" name="Resolved" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartState message="No weekly data yet" />
        )}
      </ChartCard>

      {/* Row 2: By Category + By Assignee */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="By Category"
          subtitle="Point distribution across categories"
          icon={Target}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        >
          {categoryData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="white"
                    strokeWidth={2}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central"
                    className="text-[24px] font-bold" fill="#0F172A">
                    {totalPts}
                  </text>
                  <text x="50%" y="57%" textAnchor="middle" dominantBaseline="central"
                    className="text-[10px] font-medium uppercase tracking-wider" fill="#94A3B8">
                    Total Points
                  </text>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-1">
                {categoryData.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <span className="text-[11px] text-text-secondary font-medium">{c.name}</span>
                    <span className="text-[11px] text-text-tertiary">({c.value})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChartState message="No category data yet" />
          )}
        </ChartCard>

        <ChartCard
          title="By Assignee"
          subtitle="Top assignees with open vs resolved"
          icon={Users}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        >
          {assigneeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={Math.max(260, assigneeData.length * 40)}>
                <BarChart data={assigneeData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="momAssignOpenGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#EF4444" />
                      <stop offset="100%" stopColor="#FCA5A5" />
                    </linearGradient>
                    <linearGradient id="momAssignResolvedGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#22C55E" />
                      <stop offset="100%" stopColor="#86EFAC" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    width={100}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(34,197,94,0.04)' }} />
                  <Bar dataKey="open" fill="url(#momAssignOpenGrad)" name="Open" radius={[0, 4, 4, 0]} stackId="a" barSize={18} />
                  <Bar dataKey="resolved" fill="url(#momAssignResolvedGrad)" name="Resolved" radius={[0, 4, 4, 0]} stackId="a" barSize={18} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-5 mt-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-red-500" />
                  <span className="text-[12px] text-text-secondary font-medium">Open</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-green-500" />
                  <span className="text-[12px] text-text-secondary font-medium">Resolved</span>
                </div>
              </div>
            </>
          ) : (
            <EmptyChartState message="No assignee data yet" />
          )}
        </ChartCard>
      </div>

      {/* Row 3: Resolution Rate + Overdue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Resolution Rate"
          subtitle="Overall point completion"
          icon={Target}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        >
          <div className="flex flex-col items-center justify-center py-4">
            {/* SVG Ring Gauge */}
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="72" fill="none" stroke={rateTrackColor} strokeWidth="14" />
              <circle
                cx="90" cy="90" r="72" fill="none"
                stroke={rateColor} strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 72}`}
                strokeDashoffset={`${2 * Math.PI * 72 * (1 - resolutionRate / 100)}`}
                transform="rotate(-90 90 90)"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
              <text x="90" y="82" textAnchor="middle" dominantBaseline="central"
                fontSize="36" fontWeight="800" fill={rateColor}>
                {resolutionRate}%
              </text>
              <text x="90" y="108" textAnchor="middle" dominantBaseline="central"
                fontSize="11" fontWeight="500" fill="#94A3B8">
                {resolvedPts} of {totalPts} resolved
              </text>
            </svg>
            {/* Mini stats row */}
            <div className="flex gap-6 mt-4">
              <div className="text-center">
                <div className="text-[20px] font-bold text-red-500">{stats.kpis.open_points}</div>
                <div className="text-[11px] text-text-tertiary">Open</div>
              </div>
              <div className="text-center">
                <div className="text-[20px] font-bold text-amber-500">{stats.kpis.in_progress}</div>
                <div className="text-[11px] text-text-tertiary">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-[20px] font-bold text-green-500">{resolvedPts}</div>
                <div className="text-[11px] text-text-tertiary">Resolved</div>
              </div>
              <div className="text-center">
                <div className="text-[20px] font-bold text-red-600">{stats.kpis.overdue}</div>
                <div className="text-[11px] text-text-tertiary">Overdue</div>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* Overdue Items Table */}
        <ChartCard
          title="Overdue Items"
          subtitle={`${stats.recent_overdue.length} action${stats.recent_overdue.length !== 1 ? 's' : ''} past due date`}
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        >
          {stats.recent_overdue.length > 0 ? (
            <div className="max-h-[320px] overflow-y-auto -mx-1 px-1">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border/60 text-text-tertiary">
                    <th className="text-left py-2 font-medium">Point</th>
                    <th className="text-left py-2 font-medium">Assigned To</th>
                    <th className="text-right py-2 font-medium">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_overdue.map(o => (
                    <tr key={o.id} className="border-b border-border/30 hover:bg-surface-sunken/50 transition-colors">
                      <td className="py-2.5">
                        <div className="font-medium text-text-primary truncate max-w-[200px]">{o.title}</div>
                        <div className="text-[10px] text-text-tertiary mt-0.5">
                          {o.point_code} &middot; W{o.week_number}
                        </div>
                      </td>
                      <td className="py-2.5 text-text-secondary">{o.assigned_to || '—'}</td>
                      <td className="py-2.5 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          {o.days_overdue}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-text-tertiary">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                <Target size={20} className="text-green-500" />
              </div>
              <p className="text-[13px] font-medium text-green-600">All caught up!</p>
              <p className="text-[11px] text-text-tertiary mt-1">No overdue items</p>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

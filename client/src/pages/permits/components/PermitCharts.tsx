import { useState, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { PERMIT_TYPES } from '../config/permitTypes';
import type { PermitStats } from '../hooks/usePermits';

/* ── Custom Tooltip for Monthly Breakdown ── */
function MonthlyBreakdownTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
  return (
    <div className="bg-surface border border-border rounded-xl shadow-lg px-4 py-3 min-w-[160px]">
      <p className="text-[13px] font-semibold text-text-primary mb-2">{label} 2026</p>
      <div className="space-y-1.5">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LEGEND_COLORS[p.name] || p.color }} />
              <span className="text-[12px] text-text-secondary">{p.name}</span>
            </div>
            <span className="text-[12px] font-semibold text-text-primary">{p.value}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border mt-2 pt-2 flex items-center justify-between">
        <span className="text-[11px] text-text-tertiary">Total</span>
        <span className="text-[12px] font-bold text-text-primary">{total}</span>
      </div>
    </div>
  );
}

/* ── Custom Tooltip for Monthly Trend Line ── */
function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-xl shadow-lg px-4 py-3 min-w-[150px]">
      <p className="text-[13px] font-semibold text-text-primary mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.stroke }} />
              <span className="text-[12px] text-text-secondary">{p.name}</span>
            </div>
            <span className="text-[12px] font-semibold text-text-primary">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Legend color map (handles gradient fills) ── */
const LEGEND_COLORS: Record<string, string> = {
  Active: 'var(--color-chart-3)',
  Closed: 'var(--color-chart-2)',
  Expired: 'var(--color-chart-5)',
  Total: 'var(--color-chart-6)',
  Draft: 'var(--color-neutral-400)',
};

/* ── Custom Legend for Monthly Breakdown ── */
function MonthlyBreakdownLegend({ payload }: any) {
  if (!payload?.length) return null;
  return (
    <div className="flex items-center justify-center gap-5 mt-3">
      {payload.map((entry: any) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LEGEND_COLORS[entry.value] || entry.color }} />
          <span className="text-[11px] font-medium text-text-secondary">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_COLORS: Record<string, string> = {
  active: 'var(--color-chart-3)',
  closed: 'var(--color-chart-2)',
  expired: 'var(--color-chart-5)',
  draft: 'var(--color-neutral-400)',
};

const TYPE_COLORS = PERMIT_TYPES.map(t => t.color);

interface Props {
  stats: PermitStats | null;
  loading: boolean;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm p-5 chart-container">
      <h3 className="text-[13px] font-semibold text-text-primary mb-4">{title}</h3>
      {children}
    </div>
  );
}

export function PermitCharts({ stats, loading }: Props) {
  const [tab, setTab] = useState<'overview' | 'type' | 'location'>('overview');

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-surface border border-border rounded-[var(--radius-md)] p-5">
            <div className="skeleton h-5 w-1/3 mb-4" />
            <div className="skeleton h-[250px] w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Monthly trend data
  const monthlyData = MONTHS.map((name, i) => {
    const m = stats.monthly.find(r => r.month === i + 1);
    return {
      name,
      total: m?.total || 0,
      active: m?.active || 0,
      closed: m?.closed || 0,
      expired: m?.expired || 0,
    };
  });

  // Status pie data
  const statusData = [
    { name: 'Active', value: stats.kpis.active },
    { name: 'Draft', value: stats.kpis.draft },
    { name: 'Closed', value: stats.kpis.closed },
    { name: 'Expired', value: stats.kpis.expired },
    { name: 'Cancelled', value: stats.kpis.cancelled },
  ].filter(d => d.value > 0);

  const PIE_COLORS = ['var(--color-chart-3)', 'var(--color-neutral-400)', 'var(--color-chart-2)', 'var(--color-chart-5)', 'var(--color-neutral-500)'];

  // By type data
  const byTypeData = stats.byType.map(t => {
    const config = PERMIT_TYPES.find(pt => pt.key === t.permit_type);
    return {
      name: config?.abbr || t.permit_type,
      label: config?.label || t.permit_type,
      total: t.total,
      active: t.active,
      closed: t.closed,
      expired: t.expired,
    };
  });

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'type' as const, label: 'By Permit Type' },
    { key: 'location' as const, label: 'By Area & Contractor' },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0 mb-5 border-b-2 border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-[2px] transition-colors ${
              tab === t.key
                ? 'text-primary-600 border-primary-600 font-semibold'
                : 'text-text-tertiary border-transparent hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Monthly Permit Trend">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)', fontWeight: 500 }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} allowDecimals={false} dx={-4} />
                  <Tooltip content={<TrendTooltip />} />
                  <Legend content={<MonthlyBreakdownLegend />} />
                  <Line type="monotone" dataKey="total" stroke="var(--color-chart-6)" strokeWidth={2} strokeDasharray="6 3" name="Total" dot={{ r: 3, fill: 'var(--color-chart-6)', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                  <Line type="monotone" dataKey="closed" stroke={STATUS_COLORS.closed} strokeWidth={2.5} strokeDasharray="8 4" name="Closed" dot={{ r: 4, fill: STATUS_COLORS.closed, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
                  <Line type="monotone" dataKey="active" stroke={STATUS_COLORS.active} strokeWidth={3} name="Active" dot={{ r: 5, fill: STATUS_COLORS.active, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Status Distribution">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="Monthly Breakdown by Status">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyData} barSize={28} barGap={4}>
                <defs>
                  <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="gradClosed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60A5FA" stopOpacity={1} />
                    <stop offset="100%" stopColor="#1E40AF" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="gradExpired" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F87171" stopOpacity={1} />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)', fontWeight: 500 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                  allowDecimals={false}
                  dx={-4}
                />
                <Tooltip content={<MonthlyBreakdownTooltip />} cursor={{ fill: 'var(--color-border)', opacity: 0.3, radius: 4 }} />
                <Legend content={<MonthlyBreakdownLegend />} />
                <Bar dataKey="active" stackId="a" fill="url(#gradActive)" name="Active" radius={[0, 0, 0, 0]} />
                <Bar dataKey="closed" stackId="a" fill="url(#gradClosed)" name="Closed" radius={[0, 0, 0, 0]} />
                <Bar dataKey="expired" stackId="a" fill="url(#gradExpired)" name="Expired" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* By Type Tab */}
      {tab === 'type' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fadeIn">
          <ChartCard title="Permits by Type">
            <div className="space-y-3 mt-1">
              {(() => {
                const maxTotal = Math.max(...PERMIT_TYPES.map(t => stats.byType.find(bt => bt.permit_type === t.key)?.total || 0), 1);
                return PERMIT_TYPES.map(t => {
                  const bt = stats.byType.find(bt => bt.permit_type === t.key);
                  const total = bt?.total || 0;
                  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                  return (
                    <div key={t.key} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: t.color }} />
                          <span className="text-[12px] font-medium text-text-secondary">{t.label}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: t.lightColor, color: t.textColor }}>{t.abbr}</span>
                        </div>
                        <span className="text-[13px] font-bold text-text-primary">{total}</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${t.lightColor}, ${t.color})` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </ChartCard>

          <ChartCard title="Type Distribution">
            {(() => {
              const pieData = PERMIT_TYPES.map(t => ({
                name: t.abbr,
                label: t.label,
                value: stats.byType.find(bt => bt.permit_type === t.key)?.total || 0,
                color: t.color,
              })).filter(d => d.value > 0);
              const total = pieData.reduce((s, d) => s + d.value, 0);
              return (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : 0;
                        return (
                          <div className="bg-surface border border-border rounded-xl shadow-lg px-4 py-3">
                            <p className="text-[13px] font-semibold text-text-primary">{d.label}</p>
                            <p className="text-[12px] text-text-secondary mt-1">{d.value} permits ({pct}%)</p>
                          </div>
                        );
                      }} />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
                        <tspan x="50%" dy="-6" fontSize={20} fontWeight={700} fill="var(--color-text-primary)">{total}</tspan>
                        <tspan x="50%" dy="18" fontSize={10} fill="var(--color-text-tertiary)">Total</tspan>
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-2">
                    {pieData.map(d => {
                      const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : 0;
                      return (
                        <div key={d.name} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-[11px] font-medium text-text-secondary">{d.name}</span>
                          <span className="text-[11px] font-bold text-text-primary">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </ChartCard>
        </div>
      )}

      {/* Location Tab */}
      {tab === 'location' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fadeIn">
          <ChartCard title="Permits by Area">
            {stats.byArea.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-[13px] text-text-tertiary">No area data available</div>
            ) : (
              <div className="space-y-2.5 mt-1">
                {(() => {
                  const totalArea = stats.byArea.reduce((s, a) => s + a.total, 0) || 1;
                  const areaColors = ['var(--color-chart-1)', 'var(--color-chart-6)', 'var(--color-chart-10)', 'var(--color-chart-7)', 'var(--color-chart-6)'];
                  return stats.byArea.map((a, i) => {
                    const pct = ((a.total / totalArea) * 100).toFixed(1);
                    const color = areaColors[i % areaColors.length];
                    return (
                      <div key={a.area} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-transparent hover:border-border transition-colors">
                        <span className="flex items-center justify-center w-9 h-9 rounded-xl text-[11px] font-bold text-white shrink-0 shadow-sm" style={{ backgroundColor: color }}>
                          {a.area.substring(0, 2).toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12.5px] font-semibold text-text-primary truncate">{a.area}</span>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-[11px] font-medium text-text-tertiary">{pct}%</span>
                              <span className="text-[14px] font-bold text-text-primary">{a.total}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.85 }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-border">
                  <span className="text-[11px] font-medium text-text-tertiary">Total across all areas</span>
                  <span className="text-[13px] font-bold text-text-primary">{stats.byArea.reduce((s, a) => s + a.total, 0)}</span>
                </div>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Permits by Contractor">
            {stats.byContractor.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-[13px] text-text-tertiary">No contractor data available</div>
            ) : (
              <div className="space-y-2.5 mt-1">
                {(() => {
                  const totalCon = stats.byContractor.reduce((s, c) => s + c.total, 0) || 1;
                  const conColors = ['var(--color-chart-9)', 'var(--color-chart-10)', 'var(--color-chart-3)', 'var(--color-chart-10)', 'var(--color-chart-3)'];
                  return stats.byContractor.map((c, i) => {
                    const pct = ((c.total / totalCon) * 100).toFixed(1);
                    const color = conColors[i % conColors.length];
                    return (
                      <div key={c.contractor} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-transparent hover:border-border transition-colors">
                        <span className="flex items-center justify-center w-9 h-9 rounded-xl text-[11px] font-bold text-white shrink-0 shadow-sm" style={{ backgroundColor: color }}>
                          {c.contractor.substring(0, 2).toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12.5px] font-semibold text-text-primary truncate">{c.contractor}</span>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-[11px] font-medium text-text-tertiary">{pct}%</span>
                              <span className="text-[14px] font-bold text-text-primary">{c.total}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.85 }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-border">
                  <span className="text-[11px] font-medium text-text-tertiary">Total across all contractors</span>
                  <span className="text-[13px] font-bold text-text-primary">{stats.byContractor.reduce((s, c) => s + c.total, 0)}</span>
                </div>
              </div>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}

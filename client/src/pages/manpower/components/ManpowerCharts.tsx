import { useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Users, ShieldCheck, Clock as ClockIcon, TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import type { ManpowerStats } from '../hooks/useManpower';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PROFESSION_COLORS = [
  'var(--color-chart-2)', 'var(--color-chart-7)', 'var(--color-chart-6)', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', 'var(--color-chart-8)', '#EAB308', 'var(--color-chart-3)',
  '#14B8A6', '#06B6D4', 'var(--color-chart-10)', 'var(--color-chart-1)', '#4F46E5',
];

const COMPANY_COLORS = [
  'var(--color-chart-2)', 'var(--color-chart-6)', '#EC4899', 'var(--color-chart-8)', 'var(--color-chart-3)',
  '#06B6D4', 'var(--color-chart-7)', '#F43F5E',
];

interface Props {
  stats: ManpowerStats | null;
  loading: boolean;
}

// Custom tooltip component
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
      <p className="text-white/80 mt-0.5">{d.value} workers</p>
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

// Custom pie label that renders inside the chart
function renderCustomPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  if (percent < 0.08) return null; // Hide labels for tiny slices
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
      className="text-[11px] font-medium" fill="#64748B">
      {name} ({Math.round(percent * 100)}%)
    </text>
  );
}

export function ManpowerCharts({ stats, loading }: Props) {
  const [tab, setTab] = useState<'overview' | 'induction' | 'hours'>('overview');

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

  const professionData = (stats.byProfession || []).slice(0, 12);
  const companyData = (stats.byCompany || []).slice(0, 8);
  const monthlyData = MONTHS.map((name, i) => {
    const m = (stats.monthlyJoinings || []).find(r => r.month === i + 1);
    return { name, total: m?.total || 0 };
  });
  const inductionData = (stats.inductionBreakdown || [])
    .map(d => ({ name: d.induction_status, value: d.total }))
    .filter(d => d.value > 0);
  const profInductionData = professionData.map(p => ({
    name: p.profession,
    total: p.total,
    inducted: p.inducted,
    rate: p.total > 0 ? Math.round((p.inducted / p.total) * 100) : 0,
  }));
  const totalInducted = stats.kpis?.inducted ?? 0;
  const totalWorkers = stats.kpis?.total ?? 0;
  const inductionRate = stats.kpis?.induction_rate ?? 0;

  const tabs = [
    { key: 'overview' as const, label: 'Workforce Overview', icon: Users },
    { key: 'induction' as const, label: 'Induction Status', icon: ShieldCheck },
    { key: 'hours' as const, label: 'Hours Summary', icon: ClockIcon },
  ];

  return (
    <div>
      {/* Modern tab bar */}
      <div className="flex gap-1 mb-6 p-1 bg-surface-sunken rounded-xl w-fit">
        {tabs.map(t => {
          const TabIcon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
                tab === t.key
                  ? 'bg-surface text-primary-600 shadow-sm font-semibold'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <TabIcon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Workers by Profession" subtitle="Distribution across trades" icon={BarChart3} iconBg="bg-blue-50" iconColor="text-blue-600">
              {professionData.length > 0 ? (
                <ProfessionDistribution data={professionData} />
              ) : (
                <EmptyChartState message="No profession data yet" />
              )}
            </ChartCard>

            <ChartCard title="Workers by Company" subtitle="Subcontractor distribution" icon={PieChartIcon} iconBg="bg-violet-50" iconColor="text-violet-600">
              {companyData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <defs>
                        {companyData.map((_, i) => (
                          <linearGradient key={i} id={`pieGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COMPANY_COLORS[i % COMPANY_COLORS.length]} stopOpacity={1} />
                            <stop offset="100%" stopColor={COMPANY_COLORS[i % COMPANY_COLORS.length]} stopOpacity={0.7} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={companyData.map(c => ({ name: c.company, value: c.total }))}
                        cx="50%" cy="50%"
                        innerRadius={65} outerRadius={105}
                        paddingAngle={3}
                        dataKey="value"
                        label={renderCustomPieLabel}
                        labelLine={{ stroke: '#CBD5E1', strokeWidth: 1 }}
                        stroke="white"
                        strokeWidth={2}
                      >
                        {companyData.map((_, i) => (
                          <Cell key={i} fill={`url(#pieGrad${i})`} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      {/* Center text */}
                      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central"
                        className="text-[24px] font-bold" fill="#0F172A">
                        {totalWorkers}
                      </text>
                      <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central"
                        className="text-[10px] font-medium uppercase tracking-wider" fill="#94A3B8">
                        Total
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-1">
                    {companyData.map((c, i) => (
                      <div key={c.company} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COMPANY_COLORS[i % COMPANY_COLORS.length] }} />
                        <span className="text-[11px] text-text-secondary font-medium">{c.company}</span>
                        <span className="text-[11px] text-text-tertiary">({c.total})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyChartState message="No company data yet" />
              )}
            </ChartCard>
          </div>

          <ChartCard title="Monthly Joinings" subtitle={`New workers mobilised in ${new Date().getFullYear()}`} icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="joinGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" stroke="#22C55E" strokeWidth={2.5} fill="url(#joinGrad)" name="Joinings" dot={{ r: 4, fill: '#22C55E', stroke: 'white', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#22C55E', stroke: 'white', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Induction Tab */}
      {tab === 'induction' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Induction Status" subtitle="Breakdown across all workers" icon={ShieldCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600">
              {inductionData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={inductionData}
                        cx="50%" cy="50%"
                        innerRadius={70} outerRadius={110}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="white"
                        strokeWidth={3}
                      >
                        {inductionData.map((d) => {
                          const color = d.name === 'Done' ? '#22C55E' : d.name === 'Not Done' ? '#F43F5E' : '#F59E0B';
                          return <Cell key={d.name} fill={color} />;
                        })}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <text x="50%" y="44%" textAnchor="middle" dominantBaseline="central"
                        className="text-[28px] font-bold" fill="#0F172A">
                        {inductionRate}%
                      </text>
                      <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central"
                        className="text-[10px] font-medium uppercase tracking-wider" fill="#94A3B8">
                        Rate
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex gap-5 mt-1">
                    {inductionData.map(d => {
                      const color = d.name === 'Done' ? '#22C55E' : d.name === 'Not Done' ? '#F43F5E' : '#F59E0B';
                      return (
                        <div key={d.name} className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-[12px] text-text-secondary font-medium">{d.name}</span>
                          <span className="text-[12px] text-text-tertiary font-bold">({d.value})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <EmptyChartState message="No induction data yet" />
              )}
            </ChartCard>

            <ChartCard title="Induction by Profession" subtitle="Completion rate per trade" icon={BarChart3} iconBg="bg-blue-50" iconColor="text-blue-600">
              {profInductionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(280, profInductionData.length * 36)}>
                  <BarChart data={profInductionData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                    <defs>
                      <linearGradient id="rateGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#22C55E" />
                        <stop offset="100%" stopColor="#16A34A" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={110} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(34,197,94,0.04)' }}
                    />
                    <Bar dataKey="rate" fill="url(#rateGrad)" radius={[0, 6, 6, 0]} name="Rate %" barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="No profession data yet" />
              )}
            </ChartCard>
          </div>

          <ChartCard title="Total vs Inducted by Profession" subtitle="Side-by-side comparison" icon={BarChart3} iconBg="bg-indigo-50" iconColor="text-indigo-600">
            {profInductionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={profInductionData} margin={{ top: 8, right: 8, left: -8, bottom: 40 }}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#93C5FD" />
                      <stop offset="100%" stopColor="#BFDBFE" />
                    </linearGradient>
                    <linearGradient id="inductGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" />
                      <stop offset="100%" stopColor="#86EFAC" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} angle={-35} textAnchor="end" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill="url(#totalGrad)" name="Total" radius={[4, 4, 0, 0]} barSize={18} />
                  <Bar dataKey="inducted" fill="url(#inductGrad)" name="Inducted" radius={[4, 4, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState message="No data available" />
            )}
            {/* Custom legend */}
            {profInductionData.length > 0 && (
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-blue-300" />
                  <span className="text-[12px] text-text-secondary font-medium">Total Workers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-green-500" />
                  <span className="text-[12px] text-text-secondary font-medium">Inducted</span>
                </div>
              </div>
            )}
          </ChartCard>
        </div>
      )}

      {/* Hours Tab */}
      {tab === 'hours' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Hours metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <HoursMetricCard
              label="Regular Hours"
              sublabel="This Month"
              value={stats.hoursThisMonth?.total_regular ?? 0}
              icon={ClockIcon}
              gradient="from-blue-500 to-indigo-600"
              bg="bg-gradient-to-br from-blue-50 via-blue-50/50 to-indigo-50"
              border="border-blue-100"
              textColor="text-blue-700"
            />
            <HoursMetricCard
              label="Overtime Hours"
              sublabel="This Month"
              value={stats.hoursThisMonth?.total_overtime ?? 0}
              icon={TrendingUp}
              gradient="from-amber-500 to-orange-600"
              bg="bg-gradient-to-br from-amber-50 via-amber-50/50 to-orange-50"
              border="border-amber-100"
              textColor="text-amber-700"
            />
            <HoursMetricCard
              label="Workers Recorded"
              sublabel="With hour entries"
              value={stats.hoursThisMonth?.workers_recorded ?? 0}
              icon={Users}
              gradient="from-emerald-500 to-green-600"
              bg="bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-green-50"
              border="border-emerald-100"
              textColor="text-emerald-700"
            />
          </div>

          <ChartCard title="Monthly Workforce Trend" subtitle="Workers joining over time" icon={TrendingUp} iconBg="bg-sky-50" iconColor="text-sky-600">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2.5} fill="url(#trendGrad)" name="Joinings"
                  dot={{ r: 4, fill: '#3B82F6', stroke: 'white', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#3B82F6', stroke: 'white', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
              <ClockIcon size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-blue-900">Daily Hours Tracking</p>
              <p className="text-[12px] text-blue-700/80 mt-0.5">
                Record and manage daily hours from individual worker profiles. Open any worker's detail view and navigate to the Hours tab to add records.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components

function HoursMetricCard({ label, sublabel, value, icon: Icon, gradient, bg, border, textColor }: {
  label: string; sublabel: string; value: number;
  icon: React.ComponentType<{ size: number; className?: string }>;
  gradient: string; bg: string; border: string; textColor: string;
}) {
  return (
    <div className={`relative overflow-hidden ${bg} ${border} border rounded-2xl p-6`}>
      <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${gradient} rounded-full opacity-[0.07]`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl ${textColor.replace('text-', 'bg-').replace('700', '100')} flex items-center justify-center`}>
            <Icon size={18} className={textColor} />
          </div>
        </div>
        <p className={`text-[32px] font-extrabold ${textColor} leading-none tracking-tight`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-[12px] font-semibold text-text-secondary mt-1">{label}</p>
        <p className="text-[10px] text-text-tertiary">{sublabel}</p>
      </div>
    </div>
  );
}

function ProfessionDistribution({ data }: { data: { profession: string; total: number; inducted: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const totalWorkers = data.reduce((s, d) => s + d.total, 0);

  return (
    <div className="space-y-2.5">
      {data.map((item, i) => {
        const pct = (item.total / maxVal) * 100;
        const share = totalWorkers > 0 ? ((item.total / totalWorkers) * 100).toFixed(1) : '0';
        const color = PROFESSION_COLORS[i % PROFESSION_COLORS.length];
        return (
          <div
            key={item.profession}
            className="group relative rounded-xl p-3 hover:bg-slate-50/80 transition-all duration-200 cursor-default"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-2 h-2 rounded-full shrink-0 ring-[3px] ring-opacity-20"
                  style={{ backgroundColor: color, ringColor: color, boxShadow: `0 0 0 3px ${color}20` }}
                />
                <span className="text-[13px] font-semibold text-text-primary truncate">
                  {item.profession}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="text-[13px] font-bold text-text-primary tabular-nums">
                  {item.total.toLocaleString()}
                </span>
                <span className="text-[11px] font-medium text-text-tertiary bg-surface-sunken px-1.5 py-0.5 rounded-md tabular-nums">
                  {share}%
                </span>
              </div>
            </div>
            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}CC)`,
                  boxShadow: `0 1px 3px ${color}40`,
                }}
              />
            </div>
          </div>
        );
      })}
      {/* Total summary footer */}
      <div className="flex items-center justify-between pt-3 mt-1 border-t border-border/50 px-3">
        <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
          {data.length} Profession{data.length !== 1 ? 's' : ''}
        </span>
        <span className="text-[13px] font-bold text-text-primary">
          {totalWorkers.toLocaleString()} Total Workers
        </span>
      </div>
    </div>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[260px] text-center">
      <div className="w-12 h-12 rounded-2xl bg-surface-sunken flex items-center justify-center mb-3">
        <BarChart3 size={20} className="text-text-tertiary" />
      </div>
      <p className="text-[13px] text-text-tertiary font-medium">{message}</p>
      <p className="text-[11px] text-text-tertiary/60 mt-1">Add workers to see analytics</p>
    </div>
  );
}
